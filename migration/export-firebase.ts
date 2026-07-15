import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Exporte les données Firebase (Auth + Firestore) vers firebase-dump.json.
// Nécessite une clé de compte de service (FIREBASE_SERVICE_ACCOUNT).
// Les mots de passe ne sont PAS exportés (choix auth maison) : les comptes email
// devront définir un nouveau mot de passe au premier login.

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT ?? "./service-account.json";
const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

const exportAuthUsers = async () => {
  const users: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      const google = u.providerData.find((p) => p.providerId === "google.com");
      const hasPassword = u.providerData.some((p) => p.providerId === "password");
      users.push({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        emailVerified: u.emailVerified,
        googleSub: google?.uid ?? null, // rawId Google = sub
        hasPassword, // provider "password" présent -> compte email
      });
    }
    pageToken = res.pageToken;
  } while (pageToken);
  return users;
};

const exportFirestore = async () => {
  const usersSnap = await db.collection("users").get();
  const fsUsers = usersSnap.docs.map((d) => ({
    uid: d.id,
    linkCode: (d.get("linkCode") as string) ?? null,
    genderFilter: (d.get("genderFilter") as string) ?? null,
    avatar: (d.get("avatar") as string) ?? null,
  }));

  // collectionGroup : récupère tous les swipes (sous-collections) d'un coup ;
  // l'uid propriétaire est l'id du document parent (users/{uid}/swipes/{nameId}).
  const swipesSnap = await db.collectionGroup("swipes").get();
  const swipes = swipesSnap.docs
    .map((d) => ({
      uid: d.ref.parent.parent?.id ?? null,
      nameId: (d.get("nameId") as string) ?? d.id,
      name: (d.get("name") as string) ?? null,
      gender: (d.get("gender") as string) ?? null,
      decision: (d.get("decision") as string) ?? null,
    }))
    .filter((s) => s.uid);

  const couplesSnap = await db.collection("couples").get();
  const couples = couplesSnap.docs.map((d) => ({
    id: d.id,
    members: (d.get("members") as string[]) ?? [],
    memberNames: (d.get("memberNames") as Record<string, string>) ?? {},
  }));

  return { fsUsers, swipes, couples };
};

const run = async () => {
  const authUsers = await exportAuthUsers();
  const { fsUsers, swipes, couples } = await exportFirestore();
  const dump = { exportedAt: new Date().toISOString(), authUsers, fsUsers, swipes, couples };
  writeFileSync("firebase-dump.json", JSON.stringify(dump, null, 2));
  console.log(
    `✅ Export → firebase-dump.json : ${authUsers.length} comptes, ${fsUsers.length} profils, ` +
      `${swipes.length} swipes, ${couples.length} couples.`,
  );
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Échec de l'export :", err);
    process.exit(1);
  });
