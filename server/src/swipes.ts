import { pool } from "./db.ts";
import type { Gender } from "./names.ts";

export type Decision = "favorite" | "rejected";

// Aligné sur le type Swipe du front (nameId = slug).
export type Swipe = { nameId: string; name: string; gender: Gender; decision: Decision };

// Enregistre (ou met à jour) le choix de l'utilisateur pour un prénom.
// Renvoie false si le slug n'existe pas dans le catalogue.
export const recordSwipe = async (
  userId: string,
  slug: string,
  decision: Decision,
): Promise<boolean> => {
  const { rowCount } = await pool.query(
    `INSERT INTO swipes (user_id, name_id, decision)
     SELECT $1, n.id, $2::decision FROM names n WHERE n.slug = $3
     ON CONFLICT (user_id, name_id)
       DO UPDATE SET decision = EXCLUDED.decision, updated_at = now()`,
    [userId, decision, slug],
  );
  return (rowCount ?? 0) > 0;
};

// Supprime le choix (remet le prénom dans la pile).
export const deleteSwipe = async (userId: string, slug: string): Promise<void> => {
  await pool.query(
    `DELETE FROM swipes
      WHERE user_id = $1 AND name_id = (SELECT id FROM names WHERE slug = $2)`,
    [userId, slug],
  );
};

// Renvoie les slugs de tous les prénoms déjà tranchés (favoris ou refusés).
export const listSwipedSlugs = async (userId: string): Promise<string[]> => {
  const { rows } = await pool.query<{ slug: string }>(
    `SELECT n.slug FROM swipes s JOIN names n ON n.id = s.name_id WHERE s.user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.slug);
};

// Liste les prénoms d'une décision donnée (favoris ou refusés), les plus récents d'abord.
export const listSwipes = async (userId: string, decision: Decision): Promise<Swipe[]> => {
  const { rows } = await pool.query<Swipe>(
    `SELECT n.slug AS "nameId", n.name, n.gender, s.decision
       FROM swipes s
       JOIN names n ON n.id = s.name_id
      WHERE s.user_id = $1 AND s.decision = $2::decision
      ORDER BY s.updated_at DESC`,
    [userId, decision],
  );
  return rows;
};
