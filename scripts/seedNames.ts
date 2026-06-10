import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { NAMES } from "../src/constants/names";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Identifiant de document stable et lisible (sans accents/espaces) -> idempotent
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Vide entièrement la collection "names" (par lots de 450).
const clearNames = async (db: Firestore): Promise<number> => {
  const snapshot = await getDocs(collection(db, "names"));
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + 450)) batch.delete(d.ref);
    await batch.commit();
  }
  return docs.length;
};

const seed = async () => {
  if (!firebaseConfig.projectId) {
    throw new Error(
      "Config Firebase manquante. Vérifiez votre fichier .env.local.",
    );
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const removed = await clearNames(db);

  // id = sexe + slug, dédupliqué (évite les collisions entre variantes/sexes)
  const usedIds = new Set<string>();
  const batch = writeBatch(db);
  for (const item of NAMES) {
    let id = `${item.gender}-${slugify(item.name)}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `${item.gender}-${slugify(item.name)}-${suffix++}`;
    usedIds.add(id);
    batch.set(doc(db, "names", id), {
      name: item.name,
      gender: item.gender,
    });
  }
  await batch.commit();

  console.log(
    `✅ ${removed} ancien(s) supprimé(s), ${NAMES.length} prénoms insérés dans "names".`,
  );
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Échec du seed :", err);
    process.exit(1);
  });
