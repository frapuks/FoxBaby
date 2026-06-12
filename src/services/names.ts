import {
  collection,
  documentId,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import type { BabyName, Gender } from "../constants/names";

export type NameDoc = BabyName & { id: string };
export type GenderFilter = "both" | Gender;
export type NamePage = { names: NameDoc[]; done: boolean };

const toNameDoc = (d: QueryDocumentSnapshot): NameDoc => {
  const data = d.data();
  return { id: d.id, name: data.name as string, gender: data.gender as Gender };
};

// Chargement complet de la collection (déprécié : préférer createNamePager).
export const fetchNames = async (): Promise<NameDoc[]> => {
  const snapshot = await getDocs(collection(db, "names"));
  return snapshot.docs.map(toNameDoc);
};

// Normalisation identique aux ids de documents (cf. scripts/seedNames.ts) :
// minuscules, sans accents, caractères non alphanumériques -> tirets.
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Recherche de prénoms par préfixe, sans charger toute la collection.
// On s'appuie sur l'id du document (`boy-<slug>` / `girl-<slug>`) : une simple
// plage sur l'id couvre tous les prénoms commençant par le terme saisi.
export const searchNames = async (
  term: string,
  max = 8,
): Promise<NameDoc[]> => {
  const slug = slugify(term);
  if (!slug) return [];
  const run = (gender: Gender) => {
    const prefix = `${gender}-${slug}`;
    return getDocs(
      query(
        collection(db, "names"),
        where(documentId(), ">=", prefix),
        where(documentId(), "<", `${prefix}`),
        fbLimit(max),
      ),
    );
  };
  const [boys, girls] = await Promise.all([run("boy"), run("girl")]);
  return [...boys.docs, ...girls.docs]
    .map(toNameDoc)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .slice(0, max);
};

// Pager aléatoire et paginé sur la collection "names".
// S'appuie sur un champ `rand` (0..1) présent sur chaque document : on démarre
// à une valeur aléatoire (seed) et on parcourt en deux tranches — `rand >= seed`
// puis `rand < seed` — pour voir chaque prénom une seule fois, dans un ordre
// quasi aléatoire, tout en chargeant les données par petits lots.
export const createNamePager = (genderFilter: GenderFilter, pageSize = 30) => {
  const seed = Math.random();
  let branch: "upper" | "lower" = "upper";
  let cursor: QueryDocumentSnapshot | null = null;
  let done = false;

  const buildQuery = () => {
    const constraints: QueryConstraint[] = [];
    if (genderFilter !== "both") {
      constraints.push(where("gender", "==", genderFilter));
    }
    constraints.push(where("rand", branch === "upper" ? ">=" : "<", seed));
    constraints.push(orderBy("rand"));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(fbLimit(pageSize));
    return query(collection(db, "names"), ...constraints);
  };

  // Renvoie le lot suivant. `done` passe à true quand tout a été parcouru.
  const next = async (): Promise<NamePage> => {
    if (done) return { names: [], done: true };
    const snap = await getDocs(buildQuery());
    if (snap.docs.length > 0) cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < pageSize) {
      // Tranche épuisée : on bascule sur la seconde, sinon c'est terminé.
      if (branch === "upper") {
        branch = "lower";
        cursor = null;
      } else {
        done = true;
      }
    }
    return { names: snap.docs.map(toNameDoc), done };
  };

  return { next };
};
