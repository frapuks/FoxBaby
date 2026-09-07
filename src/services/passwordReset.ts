import { api } from "../api";

// Réinitialisation de mot de passe. Ces deux appels sont volontairement hors du
// contexte d'authentification : ils s'utilisent sans session.

// Demande un lien. Le serveur répond toujours OK, même pour un email inconnu,
// afin de ne pas révéler quels comptes existent : ne promettez donc pas à
// l'utilisateur qu'un email est bien parti vers une adresse enregistrée.
export const requestPasswordReset = (email: string): Promise<{ ok: true }> =>
  api.post("/auth/forgot-password", { email });

// Consomme le jeton reçu par email et pose le nouveau mot de passe.
// Ne connecte pas : l'utilisateur repasse par l'écran de connexion.
export const resetPassword = (token: string, password: string): Promise<{ ok: true }> =>
  api.post("/auth/reset-password", { token, password });

// Jeton présent dans l'URL (`/?reset=<jeton>`), ou null. L'app n'ayant pas de
// routeur, c'est ce paramètre qui déclenche l'écran de réinitialisation.
export const readResetTokenFromUrl = (): string | null =>
  new URLSearchParams(window.location.search).get("reset");

// Retire le paramètre de l'URL sans recharger la page, pour que le jeton ne
// reste pas dans la barre d'adresse ni dans l'historique après usage.
export const clearResetTokenFromUrl = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete("reset");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
};
