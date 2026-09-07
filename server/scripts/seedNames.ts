import "dotenv/config";
import { pool } from "../src/db.ts";
import { NAMES } from "../../src/constants/names.ts";

// Seed de la table `names` à partir de la source unique du front (src/constants/names.ts).
// On reproduit exactement le slugify + la déduplication de l'ancien scripts/seedNames.ts
// pour que `slug` == ancien id de document Firestore ('boy-<slug>' / 'girl-<slug>').
//
// Idempotent et SÛR pour un démarrage de conteneur : si la table est déjà peuplée, on
// ne fait rien (surtout pas de TRUNCATE, qui effacerait les swipes en cascade).
// Passer SEED_FORCE=true pour forcer une réinitialisation complète (usage dev).

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const seed = async () => {
  const force = process.env.SEED_FORCE === "true";

  const { rows } = await pool.query<{ count: number }>("SELECT count(*)::int AS count FROM names");
  const existing = rows[0].count;
  if (existing > 0 && !force) {
    console.log(`Table "names" déjà peuplée (${existing}) — seed ignoré.`);
    return;
  }

  const usedIds = new Set<string>();
  const items: { slug: string; name: string; gender: string }[] = [];
  for (const item of NAMES) {
    let slug = `${item.gender}-${slugify(item.name)}`;
    let suffix = 2;
    while (usedIds.has(slug)) slug = `${item.gender}-${slugify(item.name)}-${suffix++}`;
    usedIds.add(slug);
    items.push({ slug, name: item.name, gender: item.gender });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (force) await client.query("TRUNCATE names RESTART IDENTITY CASCADE");
    const BATCH = 1000;
    for (let i = 0; i < items.length; i += BATCH) {
      const slice = items.slice(i, i + BATCH);
      // ON CONFLICT DO NOTHING : réinsertion sans écraser ni casser les FK des swipes.
      await client.query(
        `INSERT INTO names (slug, name, gender)
         SELECT * FROM UNNEST($1::text[], $2::text[], $3::gender[])
         ON CONFLICT (slug) DO NOTHING`,
        [slice.map((r) => r.slug), slice.map((r) => r.name), slice.map((r) => r.gender)],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log(`✅ ${items.length} prénoms insérés dans "names".`);
};

seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Échec du seed :", err);
    process.exit(1);
  });
