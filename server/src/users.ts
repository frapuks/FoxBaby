import { pool } from "./db.ts";

// Ligne brute de la table users.
export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  display_name: string;
  avatar: string;
  gender_filter: "boy" | "girl" | "both";
  link_code: string | null;
  email_verified: boolean;
};

// Forme publique renvoyée au front (jamais le hash de mot de passe).
export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  genderFilter: "boy" | "girl" | "both";
  hasPassword: boolean;
};

const COLS =
  "id, email, password_hash, google_sub, display_name, avatar, gender_filter, link_code, email_verified";

export const toPublicUser = (u: UserRow): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.display_name,
  avatar: u.avatar,
  genderFilter: u.gender_filter,
  hasPassword: u.password_hash != null,
});

export const findById = async (id: string): Promise<UserRow | null> => {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
};

export const findByEmail = async (email: string): Promise<UserRow | null> => {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLS} FROM users WHERE email = $1`, [email]);
  return rows[0] ?? null;
};

export const findByGoogleSub = async (sub: string): Promise<UserRow | null> => {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLS} FROM users WHERE google_sub = $1`, [
    sub,
  ]);
  return rows[0] ?? null;
};

export const createEmailUser = async (
  email: string,
  passwordHash: string,
  displayName: string,
): Promise<UserRow> => {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, display_name, email_verified)
     VALUES ($1, $2, $3, false) RETURNING ${COLS}`,
    [email, passwordHash, displayName],
  );
  return rows[0];
};

export const createGoogleUser = async (
  email: string,
  googleSub: string,
  displayName: string,
  emailVerified: boolean,
): Promise<UserRow> => {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, google_sub, display_name, email_verified)
     VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
    [email, googleSub, displayName, emailVerified],
  );
  return rows[0];
};

// Relie un compte email existant à une identité Google (première connexion Google
// avec une adresse déjà inscrite par mot de passe).
export const linkGoogleSub = async (id: string, googleSub: string): Promise<UserRow> => {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET google_sub = $2, email_verified = true, updated_at = now()
     WHERE id = $1 RETURNING ${COLS}`,
    [id, googleSub],
  );
  return rows[0];
};

export const updateProfile = async (
  id: string,
  fields: { displayName?: string; avatar?: string; genderFilter?: "boy" | "girl" | "both" },
): Promise<UserRow> => {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET
       display_name  = COALESCE($2, display_name),
       avatar        = COALESCE($3, avatar),
       gender_filter = COALESCE($4, gender_filter),
       updated_at    = now()
     WHERE id = $1 RETURNING ${COLS}`,
    [id, fields.displayName ?? null, fields.avatar ?? null, fields.genderFilter ?? null],
  );
  return rows[0];
};

export const updateEmail = async (id: string, email: string): Promise<UserRow> => {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET email = $2, email_verified = false, updated_at = now()
     WHERE id = $1 RETURNING ${COLS}`,
    [id, email],
  );
  return rows[0];
};

export const updatePasswordHash = async (id: string, passwordHash: string): Promise<void> => {
  await pool.query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [
    id,
    passwordHash,
  ]);
};
