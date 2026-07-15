import { api } from "../api";

// Le couple, tel que renvoyé par le backend : le partenaire est directement inclus
// (plus de tableau `members` / map `memberNames` comme avec Firestore).
export type Couple = {
  id: string;
  partner: { id: string; displayName: string; avatar: string };
};

// Garantit un code de liaison unique et persisté pour l'utilisateur, et le renvoie.
export const ensureLinkCode = async (): Promise<string> => {
  const { code } = await api.get<{ code: string }>("/couple/link-code");
  return code;
};

// Renvoie le couple auquel appartient l'utilisateur, ou null.
export const getMyCouple = async (): Promise<Couple | null> => {
  const { couple } = await api.get<{ couple: Couple | null }>("/couple/me");
  return couple;
};

// Relie le compte de l'utilisateur à celui correspondant au code saisi.
export const linkWithCode = async (rawCode: string): Promise<Couple> => {
  const { couple } = await api.post<{ couple: Couple }>("/couple/link", { code: rawCode });
  return couple;
};

// Supprime le lien de couple.
export const unlinkCouple = async (): Promise<void> => {
  await api.del("/couple");
};
