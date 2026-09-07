import { OAuth2Client } from "google-auth-library";
import { config } from "../config.ts";

const client = new OAuth2Client(config.googleClientId);

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

// Vérifie l'idToken renvoyé par Google Identity Services côté front et en extrait
// le profil. Lève une erreur si le token est invalide ou l'audience incorrecte.
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  if (!config.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID non configuré côté serveur.");
  }
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Token Google invalide.");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
    emailVerified: payload.email_verified ?? false,
  };
};
