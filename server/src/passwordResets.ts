import { createHash, randomBytes } from "node:crypto";
import { pool } from "./db.ts";
import { config } from "./config.ts";

// Le jeton en clair part dans l'email ; seule son empreinte est stockée.
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");


// Crée un jeton pour `userId` et invalide les précédents : une seule demande
// vivante à la fois, pour qu'un ancien email ne reste pas exploitable.
export const createPasswordReset = async (userId: string): Promise<string> => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.passwordResetTtlMinutes * 60_000);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
      [userId],
    );
    await client.query(
      "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [hashToken(token), userId, expiresAt],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return token;
};

// Consomme un jeton et renvoie l'utilisateur associé, ou null s'il est inconnu,
// expiré ou déjà utilisé. La mise à jour conditionnelle rend l'opération atomique :
// deux requêtes concurrentes avec le même jeton, une seule repart avec un user_id.
export const consumePasswordReset = async (token: string): Promise<string | null> => {
  const { rows } = await pool.query<{ user_id: string }>(
    `UPDATE password_resets
        SET used_at = now()
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > now()
      RETURNING user_id`,
    [hashToken(token)],
  );
  return rows[0]?.user_id ?? null;
};

// Invalide les jetons en vie d'un utilisateur : appelé quand le mot de passe
// change par un autre chemin, pour qu'un email de reset en attente devienne inerte.
export const invalidatePasswordResets = async (userId: string): Promise<void> => {
  await pool.query(
    "UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
    [userId],
  );
};

// Supprime les lignes expirées ou consommées depuis plus d'un jour.
export const purgePasswordResets = async (): Promise<number> => {
  const { rowCount } = await pool.query(
    "DELETE FROM password_resets WHERE expires_at < now() - interval '1 day'",
  );
  return rowCount ?? 0;
};
