import { pool } from "./db.ts";
import { slugify } from "./util/slug.ts";

export type Gender = "boy" | "girl";
export type GenderFilter = "boy" | "girl" | "both";

// Forme catalogue alignée sur le type NameDoc du front (id = slug).
export type NameDoc = { id: string; name: string; gender: Gender };
export type NamePage = { names: NameDoc[]; nextCursor: string | null };

// Curseur opaque du pager : porte le seed aléatoire, la branche en cours
// (rand >= seed puis rand < seed) et la dernière position (rand, id).
type Cursor = { s: number; b: "upper" | "lower"; r: number | null; i: number | null };

const encodeCursor = (c: Cursor): string =>
  Buffer.from(JSON.stringify(c)).toString("base64url");

const decodeCursor = (raw: string): Cursor => JSON.parse(Buffer.from(raw, "base64url").toString());

// Pager quasi aléatoire et paginé, excluant les prénoms déjà tranchés par l'utilisateur
// (jointure NOT EXISTS — remplace le filtrage client de l'ancienne version). On remplit
// la page en basculant si besoin de la branche "upper" (rand >= seed) vers "lower".
export const getNamesPage = async (
  userId: string,
  genderFilter: GenderFilter,
  rawCursor: string | null,
  limit: number,
): Promise<NamePage> => {
  const state: Cursor = rawCursor
    ? decodeCursor(rawCursor)
    : { s: Math.random(), b: "upper", r: null, i: null };

  const genderParam = genderFilter === "both" ? null : genderFilter;
  const names: NameDoc[] = [];
  let done = false;

  while (names.length < limit && !done) {
    const need = limit - names.length;
    const op = state.b === "upper" ? ">=" : "<";
    const { rows } = await pool.query<{
      num_id: number;
      slug: string;
      name: string;
      gender: Gender;
      rand: number;
    }>(
      `SELECT n.id AS num_id, n.slug, n.name, n.gender, n.rand
         FROM names n
        WHERE ($1::gender IS NULL OR n.gender = $1::gender)
          AND n.rand ${op} $2::float8
          AND ($3::float8 IS NULL OR (n.rand, n.id) > ($3::float8, $4::int))
          AND NOT EXISTS (
                SELECT 1 FROM swipes s WHERE s.user_id = $5 AND s.name_id = n.id
              )
        ORDER BY n.rand, n.id
        LIMIT $6`,
      [genderParam, state.s, state.r, state.i, userId, need],
    );

    for (const row of rows) names.push({ id: row.slug, name: row.name, gender: row.gender });

    if (rows.length < need) {
      // Branche épuisée : on passe à "lower", sinon c'est terminé.
      if (state.b === "upper") {
        state.b = "lower";
        state.r = null;
        state.i = null;
      } else {
        done = true;
      }
    } else {
      const last = rows[rows.length - 1];
      state.r = last.rand;
      state.i = last.num_id;
    }
  }

  return { names, nextCursor: done ? null : encodeCursor(state) };
};

// Recherche par préfixe sur le slug ('boy-<slug>' / 'girl-<slug>'), insensible aux accents.
export const searchNames = async (term: string, max = 8): Promise<NameDoc[]> => {
  const slug = slugify(term);
  if (!slug) return [];
  const { rows } = await pool.query<{ slug: string; name: string; gender: Gender }>(
    `SELECT slug, name, gender FROM names
      WHERE slug LIKE $1 OR slug LIKE $2
      ORDER BY name
      LIMIT $3`,
    [`boy-${slug}%`, `girl-${slug}%`, max],
  );
  return rows.map((r) => ({ id: r.slug, name: r.name, gender: r.gender }));
};
