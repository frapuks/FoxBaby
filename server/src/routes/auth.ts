import { Router } from "express";
import { z } from "zod";
import { clearAuthCookie, setAuthCookie } from "../auth/jwt.ts";
import { verifyGoogleIdToken } from "../auth/google.ts";
import { hashPassword, verifyPassword } from "../auth/password.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { sendPasswordResetEmail } from "../mail.ts";
import {
  consumePasswordReset,
  createPasswordReset,
  invalidatePasswordResets,
} from "../passwordResets.ts";
import {
  createEmailUser,
  createGoogleUser,
  findByEmail,
  findByGoogleSub,
  findById,
  linkGoogleSub,
  toPublicUser,
  updateEmail,
  updatePasswordHash,
  updateProfile,
  type UserRow,
} from "../users.ts";

export const authRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(6, "Le mot de passe doit faire au moins 6 caractères.");

// Renvoie l'utilisateur public + pose le cookie de session.
const authSuccess = (res: import("express").Response, user: UserRow) => {
  setAuthCookie(res, user.id);
  res.json({ user: toPublicUser(user) });
};

// POST /api/auth/register — création d'un compte email/mot de passe.
authRouter.post("/register", async (req, res) => {
  const parsed = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      // Optionnel : à l'inscription le front ne demande pas le nom (défini plus tard
      // dans le profil). On dérive un nom par défaut de l'email.
      displayName: z.string().trim().min(1).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { email, password, displayName } = parsed.data;

  if (await findByEmail(email)) {
    res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    return;
  }
  const name = displayName ?? email.split("@")[0];
  const user = await createEmailUser(email, await hashPassword(password), name);
  authSuccess(res, user);
});

// POST /api/auth/login — connexion email/mot de passe.
authRouter.post("/login", async (req, res) => {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email ou mot de passe invalide." });
    return;
  }
  const { email, password } = parsed.data;

  const user = await findByEmail(email);
  if (!user || !user.password_hash) {
    // Pas de compte, ou compte créé via Google uniquement.
    res.status(401).json({
      error: user
        ? "Ce compte utilise la connexion Google."
        : "Email ou mot de passe incorrect.",
    });
    return;
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }
  authSuccess(res, user);
});

// POST /api/auth/google — connexion/inscription via un idToken Google.
authRouter.post("/google", async (req, res) => {
  const parsed = z.object({ idToken: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "idToken manquant." });
    return;
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(parsed.data.idToken);
  } catch {
    res.status(401).json({ error: "Connexion Google invalide." });
    return;
  }

  // 1) déjà connu via Google → connexion. 2) email déjà inscrit → on lie l'identité
  // Google au compte existant. 3) inconnu → création d'un compte Google.
  let user = await findByGoogleSub(profile.sub);
  if (!user) {
    const byEmail = await findByEmail(profile.email);
    user = byEmail
      ? await linkGoogleSub(byEmail.id, profile.sub)
      : await createGoogleUser(profile.email, profile.sub, profile.name, profile.emailVerified);
  }
  authSuccess(res, user);
});

// POST /api/auth/logout — supprime le cookie de session.
authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me — utilisateur courant (ou 401).
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await findById(req.userId!);
  if (!user) {
    clearAuthCookie(res);
    res.status(401).json({ error: "Compte introuvable." });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

// PATCH /api/auth/profile — nom, avatar, filtre de sexe (préférences).
authRouter.patch("/profile", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      displayName: z.string().trim().min(1).optional(),
      avatar: z.string().trim().min(1).optional(),
      genderFilter: z.enum(["boy", "girl", "both"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données de profil invalides." });
    return;
  }
  const user = await updateProfile(req.userId!, parsed.data);
  res.json({ user: toPublicUser(user) });
});

// PATCH /api/auth/email — changement d'email (ré-auth par mot de passe si le compte
// en a un). NB : l'envoi d'un email de vérification est différé (voir étape ultérieure).
authRouter.patch("/email", requireAuth, async (req, res) => {
  const parsed = z
    .object({ email: emailSchema, currentPassword: z.string().optional() })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email invalide." });
    return;
  }
  const user = await findById(req.userId!);
  if (!user) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }
  if (user.password_hash) {
    const ok =
      parsed.data.currentPassword &&
      (await verifyPassword(parsed.data.currentPassword, user.password_hash));
    if (!ok) {
      res.status(403).json({ error: "Mot de passe actuel incorrect." });
      return;
    }
  }
  const existing = await findByEmail(parsed.data.email);
  if (existing && existing.id !== user.id) {
    res.status(409).json({ error: "Cet email est déjà utilisé." });
    return;
  }
  const updated = await updateEmail(user.id, parsed.data.email);
  res.json({ user: toPublicUser(updated) });
});

// PATCH /api/auth/password — change (ou définit) le mot de passe.
authRouter.patch("/password", requireAuth, async (req, res) => {
  const parsed = z
    .object({ currentPassword: z.string().optional(), newPassword: passwordSchema })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const user = await findById(req.userId!);
  if (!user) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }
  // Si un mot de passe existe déjà, on exige le mot de passe actuel (ré-authentification).
  if (user.password_hash) {
    const ok =
      parsed.data.currentPassword &&
      (await verifyPassword(parsed.data.currentPassword, user.password_hash));
    if (!ok) {
      res.status(403).json({ error: "Mot de passe actuel incorrect." });
      return;
    }
  }
  await updatePasswordHash(user.id, await hashPassword(parsed.data.newPassword));
  // Un lien de réinitialisation encore en attente devient caduc.
  await invalidatePasswordResets(user.id);
  res.json({ ok: true });
});

// POST /api/auth/forgot-password — envoie un lien de réinitialisation.
//
// Répond toujours 200, même si l'email est inconnu ou rattaché à un compte
// Google : la réponse ne doit pas permettre d'énumérer les comptes existants.
authRouter.post("/forgot-password", async (req, res) => {
  const parsed = z.object({ email: emailSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email invalide." });
    return;
  }

  const user = await findByEmail(parsed.data.email);
  // Un compte Google sans mot de passe n'a rien à réinitialiser : on ne lui
  // envoie pas de lien, mais la réponse reste identique.
  if (user?.password_hash) {
    try {
      await sendPasswordResetEmail(user.email, await createPasswordReset(user.id));
    } catch (err) {
      // Échec SMTP : on le trace côté serveur sans le révéler à l'appelant.
      console.error("Envoi du lien de réinitialisation impossible :", err);
    }
  }

  res.json({ ok: true });
});

// POST /api/auth/reset-password — consomme un jeton et pose le nouveau mot de passe.
// Ne connecte pas l'utilisateur : il repasse par l'écran de connexion.
authRouter.post("/reset-password", async (req, res) => {
  const parsed = z
    .object({ token: z.string().min(1), password: passwordSchema })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const userId = await consumePasswordReset(parsed.data.token);
  if (!userId) {
    res.status(400).json({ error: "Ce lien est invalide ou a expiré. Refaites une demande." });
    return;
  }

  await updatePasswordHash(userId, await hashPassword(parsed.data.password));
  res.json({ ok: true });
});
