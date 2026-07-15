import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.ts";
import {
  ensureLinkCode,
  getMatches,
  getMyCouple,
  getPartnerFavorites,
  linkWithCode,
  unlinkCouple,
} from "../couple.ts";

export const coupleRouter = Router();
coupleRouter.use(requireAuth);

// GET /api/couple/me — couple courant (avec le partenaire) ou null.
coupleRouter.get("/me", async (req, res) => {
  res.json({ couple: await getMyCouple(req.userId!) });
});

// GET /api/couple/link-code — code de liaison de l'utilisateur (créé si absent).
coupleRouter.get("/link-code", async (req, res) => {
  res.json({ code: await ensureLinkCode(req.userId!) });
});

// POST /api/couple/link — relie l'utilisateur au partenaire via son code.
coupleRouter.post("/link", async (req, res) => {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Veuillez saisir un code." });
    return;
  }
  const couple = await linkWithCode(req.userId!, parsed.data.code);
  res.json({ couple });
});

// DELETE /api/couple — supprime le lien de couple.
coupleRouter.delete("/", async (req, res) => {
  await unlinkCouple(req.userId!);
  res.json({ ok: true });
});

// GET /api/couple/matches — favoris communs aux deux membres.
coupleRouter.get("/matches", async (req, res) => {
  res.json({ matches: await getMatches(req.userId!) });
});

// GET /api/couple/partner-favorites — favoris du partenaire ([] si non lié).
coupleRouter.get("/partner-favorites", async (req, res) => {
  res.json({ favorites: await getPartnerFavorites(req.userId!) });
});
