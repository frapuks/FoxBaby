import { api } from "../api";
import type { NameDoc } from "./names";

export type Decision = "favorite" | "rejected";

export type Swipe = {
  nameId: string;
  name: string;
  gender: NameDoc["gender"];
  decision: Decision;
};

// Enregistre (ou met à jour) le choix de l'utilisateur pour un prénom.
export const recordSwipe = async (name: NameDoc, decision: Decision): Promise<void> => {
  await api.put(`/swipes/${encodeURIComponent(name.id)}`, { decision });
};

// Supprime le choix de l'utilisateur pour un prénom (le remet dans la pile).
export const deleteSwipe = async (nameId: string): Promise<void> => {
  await api.del(`/swipes/${encodeURIComponent(nameId)}`);
};

// Récupère les ids des prénoms déjà tranchés (favoris ou refusés).
export const fetchSwipedIds = async (): Promise<Set<string>> => {
  const { ids } = await api.get<{ ids: string[] }>("/swipes/ids");
  return new Set(ids);
};

// Récupère les prénoms mis en favori par l'utilisateur.
export const fetchFavorites = async (): Promise<Swipe[]> => {
  const { swipes } = await api.get<{ swipes: Swipe[] }>("/swipes/favorites");
  return swipes;
};

// Récupère les prénoms refusés par l'utilisateur (chargés à la demande).
export const fetchRejected = async (): Promise<Swipe[]> => {
  const { swipes } = await api.get<{ swipes: Swipe[] }>("/swipes/rejected");
  return swipes;
};

// Récupère les favoris du partenaire (pour les matchs). [] si non lié.
export const fetchPartnerFavorites = async (): Promise<Swipe[]> => {
  const { favorites } = await api.get<{ favorites: Omit<Swipe, "decision">[] }>(
    "/couple/partner-favorites",
  );
  return favorites.map((f) => ({ ...f, decision: "favorite" }));
};
