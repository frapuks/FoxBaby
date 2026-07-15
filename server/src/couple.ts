import { pool } from "./db.ts";
import type { Gender } from "./names.ts";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1 ambigus
const CODE_LENGTH = 6;

export type Couple = {
  id: string;
  partner: { id: string; displayName: string; avatar: string };
};

const randomCode = (): string => {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
};

// Garantit un code de liaison unique et persistant pour l'utilisateur, et le renvoie.
// (Remplace la collection Firestore linkCodes : le code est une colonne de users.)
export const ensureLinkCode = async (userId: string): Promise<string> => {
  const existing = await pool.query<{ link_code: string | null }>(
    "SELECT link_code FROM users WHERE id = $1",
    [userId],
  );
  if (existing.rows[0]?.link_code) return existing.rows[0].link_code;

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    try {
      await pool.query("UPDATE users SET link_code = $2 WHERE id = $1", [userId, code]);
      return code;
    } catch (err) {
      // Collision sur l'unicité de link_code : on retente avec un autre code.
      if ((err as { code?: string }).code === "23505") continue;
      throw err;
    }
  }
  throw new Error("Impossible de générer un code de liaison unique.");
};

// Renvoie le couple de l'utilisateur (avec le partenaire), ou null.
export const getMyCouple = async (userId: string): Promise<Couple | null> => {
  const { rows } = await pool.query<{
    id: string;
    partner_id: string;
    display_name: string;
    avatar: string;
  }>(
    `SELECT c.id,
            partner.id           AS partner_id,
            partner.display_name AS display_name,
            partner.avatar       AS avatar
       FROM couple_members me
       JOIN couples c            ON c.id = me.couple_id
       JOIN couple_members other ON other.couple_id = c.id AND other.user_id <> me.user_id
       JOIN users partner        ON partner.id = other.user_id
      WHERE me.user_id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    partner: { id: row.partner_id, displayName: row.display_name, avatar: row.avatar },
  };
};

// Relie le compte de l'utilisateur à celui correspondant au code saisi.
export const linkWithCode = async (userId: string, rawCode: string): Promise<Couple> => {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new HttpError(400, "Veuillez saisir un code.");

  const partner = await pool.query<{ id: string }>(
    "SELECT id FROM users WHERE link_code = $1",
    [code],
  );
  const partnerId = partner.rows[0]?.id;
  if (!partnerId) throw new HttpError(400, "Code invalide. Vérifiez et réessayez.");
  if (partnerId === userId) throw new HttpError(400, "Vous ne pouvez pas vous lier à vous-même.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Verrouille l'appartenance des deux comptes pour éviter les liaisons concurrentes.
    const taken = await client.query(
      "SELECT user_id FROM couple_members WHERE user_id = ANY($1::uuid[]) FOR UPDATE",
      [[userId, partnerId]],
    );
    if (taken.rows.some((r) => r.user_id === userId)) {
      throw new HttpError(409, "Votre compte est déjà lié à un partenaire.");
    }
    if (taken.rows.some((r) => r.user_id === partnerId)) {
      throw new HttpError(409, "Ce partenaire est déjà lié à un autre compte.");
    }
    const { rows } = await client.query<{ id: string }>(
      "INSERT INTO couples DEFAULT VALUES RETURNING id",
    );
    const coupleId = rows[0].id;
    await client.query(
      "INSERT INTO couple_members (couple_id, user_id) VALUES ($1, $2), ($1, $3)",
      [coupleId, userId, partnerId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const couple = await getMyCouple(userId);
  if (!couple) throw new HttpError(500, "Échec de la création du couple.");
  return couple;
};

// Supprime le lien de couple (accessible à chacun des deux membres).
export const unlinkCouple = async (userId: string): Promise<void> => {
  await pool.query(
    `DELETE FROM couples
      WHERE id = (SELECT couple_id FROM couple_members WHERE user_id = $1)`,
    [userId],
  );
};

// Favoris du partenaire (permet le calcul des matchs et l'alerte "match" au swipe).
// Renvoie [] si l'utilisateur n'est pas lié. Cohérent avec l'ancien modèle Firestore
// où un membre pouvait lire les swipes de son partenaire.
export const getPartnerFavorites = async (
  userId: string,
): Promise<{ nameId: string; name: string; gender: Gender }[]> => {
  const { rows } = await pool.query<{ nameId: string; name: string; gender: Gender }>(
    `SELECT n.slug AS "nameId", n.name, n.gender
       FROM couple_members me
       JOIN couple_members other ON other.couple_id = me.couple_id AND other.user_id <> me.user_id
       JOIN swipes s ON s.user_id = other.user_id AND s.decision = 'favorite'
       JOIN names n  ON n.id = s.name_id
      WHERE me.user_id = $1
      ORDER BY n.name`,
    [userId],
  );
  return rows;
};

// Favoris communs aux deux membres du couple (jointure des swipes 'favorite').
export const getMatches = async (
  userId: string,
): Promise<{ nameId: string; name: string; gender: Gender }[]> => {
  const { rows } = await pool.query<{ nameId: string; name: string; gender: Gender }>(
    `SELECT n.slug AS "nameId", n.name, n.gender
       FROM couple_members me
       JOIN couple_members other ON other.couple_id = me.couple_id AND other.user_id <> me.user_id
       JOIN swipes s1 ON s1.user_id = me.user_id    AND s1.decision = 'favorite'
       JOIN swipes s2 ON s2.user_id = other.user_id AND s2.decision = 'favorite'
                     AND s2.name_id = s1.name_id
       JOIN names n  ON n.id = s1.name_id
      WHERE me.user_id = $1
      ORDER BY n.name`,
    [userId],
  );
  return rows;
};

// Erreur portant un code HTTP, pour renvoyer un message propre au client.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
