import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.ts";

// Runner de migrations minimal : exécute dans l'ordre les fichiers migrations/*.sql
// non encore appliqués, chacun dans une transaction, et garde la trace dans une
// table schema_migrations. Idempotent : relancer ne rejoue que les nouveaux fichiers.

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const run = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename   text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );

  const applied = new Set(
    (await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations")).rows.map(
      (r) => r.filename,
    ),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✅ Migration appliquée : ${file}`);
      count++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`❌ Échec de la migration ${file} :`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(count === 0 ? "Aucune nouvelle migration." : `${count} migration(s) appliquée(s).`);
};

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
