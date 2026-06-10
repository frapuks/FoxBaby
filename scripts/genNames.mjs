// Génère src/constants/names.ts à partir du fichier INSEE nat2022.csv
// Usage : node scripts/genNames.mjs "<chemin vers nat2022.csv>"
import { readFileSync, writeFileSync } from "node:fs";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Chemin du CSV manquant.");
  process.exit(1);
}

const TOP_PER_SEX = 200;
const YEAR_MIN = 2010;
const YEAR_MAX = 2022;

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/(^|[-\s'])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase());

// Clé de regroupement « phonétique » pour fusionner les variantes proches :
// Raphaël/Raphael, Maël/Mael, Théo/Theo, Sofia/Sophia, Lina/Lyna, Anna/Ana...
const mergeKey = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/ph/g, "f") // ph -> f (Sophia/Sofia)
    .replace(/[^a-z]/g, "") // tirets, apostrophes, espaces
    .replace(/h/g, "") // h muet (Théo/Teo, Sarah/Sara)
    .replace(/y/g, "i") // y -> i (Lyna/Lina)
    .replace(/(.)\1+/g, "$1"); // lettres doublées (Emma/Ema, Matteo/Mateo)

const content = readFileSync(csvPath, "utf8");
const lines = content.split(/\r?\n/);

// Par variante : total récent (pour le classement) et total historique (pour
// choisir l'orthographe classique, la plus courante toutes années confondues).
const recent = new Map();
const allTime = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  const [sexe, preusuel, annais, nombre] = line.split(";");
  if (!preusuel || preusuel === "_PRENOMS_RARES" || preusuel.length < 2) continue;
  const n = Number(nombre);
  const key = `${sexe}|${preusuel}`;
  allTime.set(key, (allTime.get(key) ?? 0) + n);
  const year = Number(annais);
  if (Number.isFinite(year) && year >= YEAR_MIN && year <= YEAR_MAX) {
    recent.set(key, (recent.get(key) ?? 0) + n);
  }
}

// Orthographe canonique par groupe : la variante au plus grand total historique.
const canonical = new Map(); // "sexe|mergeKey" -> { best, bestCount }
for (const [key, total] of allTime) {
  const [sexe, preusuel] = key.split("|");
  const mKey = `${sexe}|${mergeKey(preusuel)}`;
  const entry = canonical.get(mKey);
  if (!entry || total > entry.bestCount) {
    canonical.set(mKey, { best: preusuel, bestCount: total });
  }
}

// Classement par popularité récente, fusionné par groupe.
const recentByGroup = new Map(); // "sexe|mergeKey" -> total récent cumulé
for (const [key, total] of recent) {
  const [sexe, preusuel] = key.split("|");
  const mKey = `${sexe}|${mergeKey(preusuel)}`;
  recentByGroup.set(mKey, (recentByGroup.get(mKey) ?? 0) + total);
}

const pickTop = (sexe) =>
  [...recentByGroup.entries()]
    .filter(([key]) => key.startsWith(`${sexe}|`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_PER_SEX)
    .map(([mKey]) => titleCase(canonical.get(mKey).best));

const boys = pickTop("1");
const girls = pickTop("2");

const fmt = (arr) => arr.map((n) => `  ${JSON.stringify(n)},`).join("\n");

const out = `export type Gender = "boy" | "girl";

export type BabyName = { name: string; gender: Gender };

const BOYS = [
${fmt(boys)}
];

const GIRLS = [
${fmt(girls)}
];

export const NAMES: BabyName[] = [
  ...BOYS.map((name): BabyName => ({ name, gender: "boy" })),
  ...GIRLS.map((name): BabyName => ({ name, gender: "girl" })),
];
`;

writeFileSync("src/constants/names.ts", out, "utf8");
console.log(`✅ ${boys.length} garçons + ${girls.length} filles écrits dans src/constants/names.ts`);
