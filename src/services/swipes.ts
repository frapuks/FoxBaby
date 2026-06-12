import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { NameDoc } from "./names";

export type Decision = "favorite" | "rejected";

export type Swipe = {
  nameId: string;
  name: string;
  gender: NameDoc["gender"];
  decision: Decision;
};

const swipesCol = (uid: string) => collection(db, "users", uid, "swipes");

// Enregistre (ou met à jour) le choix de l'utilisateur pour un prénom
export const recordSwipe = async (
  uid: string,
  name: NameDoc,
  decision: Decision,
): Promise<void> => {
  await setDoc(doc(swipesCol(uid), name.id), {
    nameId: name.id,
    name: name.name,
    gender: name.gender,
    decision,
    updatedAt: serverTimestamp(),
  });
};

// Supprime le choix de l'utilisateur pour un prénom (le remet dans la pile)
export const deleteSwipe = async (
  uid: string,
  nameId: string,
): Promise<void> => {
  await deleteDoc(doc(swipesCol(uid), nameId));
};

// Récupère les ids des prénoms déjà tranchés (favoris ou refusés)
export const fetchSwipedIds = async (uid: string): Promise<Set<string>> => {
  const snapshot = await getDocs(swipesCol(uid));
  return new Set(snapshot.docs.map((d) => d.id));
};

const toSwipe = (data: Record<string, unknown>): Swipe => ({
  nameId: data.nameId as string,
  name: data.name as string,
  gender: data.gender as NameDoc["gender"],
  decision: data.decision as Decision,
});

// Récupère les prénoms mis en favoris par l'utilisateur
export const fetchFavorites = async (uid: string): Promise<Swipe[]> => {
  const q = query(swipesCol(uid), where("decision", "==", "favorite"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toSwipe(d.data()));
};

// Récupère les prénoms refusés par l'utilisateur (chargés à la demande)
export const fetchRejected = async (uid: string): Promise<Swipe[]> => {
  const q = query(swipesCol(uid), where("decision", "==", "rejected"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => toSwipe(d.data()));
};
