import "dotenv/config";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

// Importe firebase-dump.json dans Postgres. Idempotent (ON CONFLICT) et transactionnel.
// Ordre : comptes (Auth) → préférences (Firestore users) → swipes → couples.
// Le pont entre les mondes est la colonne temporaire users.firebase_uid.

type Dump = {
  authUsers: {
    uid: string;
    email: string | null;
    displayName: string | null;
    emailVerified: boolean;
    googleSub: string | null;
    hasPassword?: boolean;
  }[];
  fsUsers: { uid: string; linkCode: string | null; genderFilter: string | null; avatar: string | null }[];
  swipes: { uid: string | null; nameId: string; decision: string | null }[];
  couples: { id: string; members: string[] }[];
};

const dumpPath = process.env.DUMP ?? "./firebase-dump.json";
const dump: Dump = JSON.parse(readFileSync(dumpPath, "utf8"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const run = async () => {
  // Mot de passe par défaut attribué aux comptes email (hashé une seule fois).
  const defaultPassword = process.env.DEFAULT_PASSWORD || "change-me";
  const defaultHash = await bcrypt.hash(defaultPassword, 10);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Comptes (Auth). Les comptes email reçoivent le mot de passe par défaut ;
    // les comptes Google (google_sub, sans provider mot de passe) restent sans.
    // Un compte déjà présent avec un mot de passe défini n'est pas écrasé (COALESCE).
    let accounts = 0;
    let skippedNoEmail = 0;
    for (const u of dump.authUsers) {
      if (!u.email) {
        skippedNoEmail++;
        continue;
      }
      const isEmailAccount = u.hasPassword ?? !u.googleSub;
      const passwordHash = isEmailAccount ? defaultHash : null;
      await client.query(
        `INSERT INTO users (email, display_name, google_sub, email_verified, firebase_uid, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (firebase_uid) DO UPDATE SET
           email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           google_sub = EXCLUDED.google_sub,
           email_verified = EXCLUDED.email_verified,
           password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash)`,
        [
          u.email.toLowerCase(),
          u.displayName || u.email.split("@")[0],
          u.googleSub,
          u.emailVerified,
          u.uid,
          passwordHash,
        ],
      );
      accounts++;
    }

    // 2) Préférences (doc Firestore users/{uid}) : avatar, filtre de genre, code de liaison.
    for (const fu of dump.fsUsers) {
      await client.query(
        `UPDATE users SET
           avatar = COALESCE($2, avatar),
           gender_filter = COALESCE($3::gender_filter, gender_filter),
           link_code = COALESCE($4, link_code)
         WHERE firebase_uid = $1`,
        [fu.uid, fu.avatar, fu.genderFilter, fu.linkCode],
      );
    }

    // Tables de correspondance uid Firebase -> id Postgres, et slug -> id prénom.
    const usersRes = await client.query<{ id: string; firebase_uid: string }>(
      "SELECT id, firebase_uid FROM users WHERE firebase_uid IS NOT NULL",
    );
    const uidToId = new Map(usersRes.rows.map((r) => [r.firebase_uid, r.id]));
    const namesRes = await client.query<{ id: number; slug: string }>("SELECT id, slug FROM names");
    const slugToId = new Map(namesRes.rows.map((r) => [r.slug, r.id]));

    // 3) Swipes. On ignore ceux dont l'utilisateur ou le prénom est introuvable.
    let swipes = 0;
    let swipesSkipped = 0;
    for (const s of dump.swipes) {
      const userId = s.uid ? uidToId.get(s.uid) : undefined;
      const nameId = slugToId.get(s.nameId);
      if (!userId || !nameId || (s.decision !== "favorite" && s.decision !== "rejected")) {
        swipesSkipped++;
        continue;
      }
      await client.query(
        `INSERT INTO swipes (user_id, name_id, decision) VALUES ($1, $2, $3::decision)
         ON CONFLICT (user_id, name_id) DO UPDATE SET decision = EXCLUDED.decision`,
        [userId, nameId, s.decision],
      );
      swipes++;
    }

    // 4) Couples. On exige exactement 2 membres connus, aucun déjà lié.
    let couples = 0;
    let couplesSkipped = 0;
    for (const c of dump.couples) {
      const memberIds = (c.members ?? []).map((m) => uidToId.get(m)).filter((v): v is string => !!v);
      if (memberIds.length !== 2) {
        couplesSkipped++;
        continue;
      }
      const taken = await client.query("SELECT 1 FROM couple_members WHERE user_id = ANY($1::uuid[])", [
        memberIds,
      ]);
      if ((taken.rowCount ?? 0) > 0) {
        couplesSkipped++;
        continue;
      }
      const { rows } = await client.query<{ id: string }>("INSERT INTO couples DEFAULT VALUES RETURNING id");
      await client.query(
        "INSERT INTO couple_members (couple_id, user_id) VALUES ($1, $2), ($1, $3)",
        [rows[0].id, memberIds[0], memberIds[1]],
      );
      couples++;
    }

    await client.query("COMMIT");
    console.log(
      `✅ Import terminé :\n` +
        `   - comptes   : ${accounts}${skippedNoEmail ? ` (${skippedNoEmail} sans email ignorés)` : ""}\n` +
        `   - swipes    : ${swipes} (${swipesSkipped} ignorés)\n` +
        `   - couples   : ${couples} (${couplesSkipped} ignorés)`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Échec de l'import :", err);
    process.exit(1);
  });
