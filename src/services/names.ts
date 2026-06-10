import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { BabyName, Gender } from "../constants/names";

export type NameDoc = BabyName & { id: string };

export const fetchNames = async (): Promise<NameDoc[]> => {
  const snapshot = await getDocs(collection(db, "names"));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name as string,
      gender: data.gender as Gender,
    };
  });
};
