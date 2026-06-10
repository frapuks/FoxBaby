import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../firebase";

export type Couple = {
  id: string;
  members: string[];
  memberNames: Record<string, string>;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1 ambigus
const CODE_LENGTH = 6;

const displayNameOf = (user: User) =>
  user.displayName || user.email?.split("@")[0] || "Parent";

const randomCode = () => {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
};

// Garantit que l'utilisateur a un code de liaison unique et persisté, et le renvoie
export const ensureLinkCode = async (user: User): Promise<string> => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.data()?.linkCode as string | undefined;
  if (existing) {
    return existing;
  }

  // Génère un code libre (quelques tentatives en cas de collision)
  let code = randomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const codeSnap = await getDoc(doc(db, "linkCodes", code));
    if (!codeSnap.exists()) break;
    code = randomCode();
  }

  await setDoc(
    doc(db, "linkCodes", code),
    { uid: user.uid, name: displayNameOf(user) },
    { merge: true },
  );
  await setDoc(userRef, { linkCode: code }, { merge: true });
  return code;
};

// Met à jour le drapeau "coupleId" sur le code de liaison de l'utilisateur,
// afin que les autres puissent savoir s'il est déjà lié (via linkCodes, lisible).
const reconcileLinkStatus = async (
  uid: string,
  coupleId: string | null,
): Promise<void> => {
  const userSnap = await getDoc(doc(db, "users", uid));
  const code = userSnap.data()?.linkCode as string | undefined;
  if (!code) return;
  await setDoc(
    doc(db, "linkCodes", code),
    { coupleId },
    { merge: true },
  ).catch((err) => console.error("Échec de la synchro du statut de liaison :", err));
};

// Renvoie le couple auquel appartient l'utilisateur, ou null.
// Réconcilie au passage le drapeau de liaison et le nom du membre.
export const getMyCouple = async (
  uid: string,
  selfName?: string,
): Promise<Couple | null> => {
  const q = query(
    collection(db, "couples"),
    where("members", "array-contains", uid),
  );
  const snapshot = await getDocs(q);
  const docSnap = snapshot.docs[0];

  if (!docSnap) {
    // Plus de couple : on s'assure que le drapeau est effacé.
    await reconcileLinkStatus(uid, null);
    return null;
  }

  const data = docSnap.data();
  const couple: Couple = {
    id: docSnap.id,
    members: data.members as string[],
    memberNames: (data.memberNames as Record<string, string>) ?? {},
  };

  // Marque ce compte comme lié.
  await reconcileLinkStatus(uid, couple.id);

  // Rafraîchit le nom du membre s'il a changé (#5).
  if (selfName && couple.memberNames[uid] !== selfName) {
    couple.memberNames = { ...couple.memberNames, [uid]: selfName };
    await setDoc(
      doc(db, "couples", couple.id),
      { memberNames: { [uid]: selfName } },
      { merge: true },
    ).catch((err) => console.error("Échec de la mise à jour du nom :", err));
  }

  return couple;
};

// Relie le compte de l'utilisateur à celui correspondant au code saisi
export const linkWithCode = async (
  user: User,
  rawCode: string,
): Promise<Couple> => {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Veuillez saisir un code.");

  const codeSnap = await getDoc(doc(db, "linkCodes", code));
  if (!codeSnap.exists()) {
    throw new Error("Code invalide. Vérifiez et réessayez.");
  }

  const partnerUid = codeSnap.data().uid as string;
  const partnerName = (codeSnap.data().name as string) ?? "Partenaire";
  const partnerCoupleId = codeSnap.data().coupleId as string | null | undefined;

  if (partnerUid === user.uid) {
    throw new Error("Vous ne pouvez pas vous lier à vous-même.");
  }

  if (partnerCoupleId) {
    throw new Error("Ce partenaire est déjà lié à un autre compte.");
  }

  const existing = await getMyCouple(user.uid);
  if (existing) {
    throw new Error("Votre compte est déjà lié à un partenaire.");
  }

  const members = [user.uid, partnerUid].sort();
  const id = members.join("_");
  const couple: Couple = {
    id,
    members,
    memberNames: {
      [user.uid]: displayNameOf(user),
      [partnerUid]: partnerName,
    },
  };

  await setDoc(doc(db, "couples", id), {
    members: couple.members,
    memberNames: couple.memberNames,
    createdAt: serverTimestamp(),
  });

  // Marque mon propre code comme lié (le partenaire le fera à son chargement).
  await reconcileLinkStatus(user.uid, id);

  return couple;
};

// Supprime le lien de couple (accessible à chacun des deux membres)
export const unlinkCouple = async (coupleId: string): Promise<void> => {
  await deleteDoc(doc(db, "couples", coupleId));
};
