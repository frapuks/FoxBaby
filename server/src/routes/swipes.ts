import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.ts";
import { deleteSwipe, listSwipedSlugs, listSwipes, recordSwipe } from "../swipes.ts";

export const swipesRouter = Router();
swipesRouter.use(requireAuth);

// GET /api/swipes/ids — slugs de tous les prénoms déjà tranchés (pour filtrer le pager).
swipesRouter.get("/ids", async (req, res) => {
  res.json({ ids: await listSwipedSlugs(req.userId!) });
});

// GET /api/swipes/favorites — prénoms mis en favori.
swipesRouter.get("/favorites", async (req, res) => {
  res.json({ swipes: await listSwipes(req.userId!, "favorite") });
});

// GET /api/swipes/rejected — prénoms refusés.
swipesRouter.get("/rejected", async (req, res) => {
  res.json({ swipes: await listSwipes(req.userId!, "rejected") });
});

// PUT /api/swipes/:slug — enregistre/actualise un choix.
swipesRouter.put("/:slug", async (req, res) => {
  const parsed = z.object({ decision: z.enum(["favorite", "rejected"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Décision invalide." });
    return;
  }
  const ok = await recordSwipe(req.userId!, req.params.slug, parsed.data.decision);
  if (!ok) {
    res.status(404).json({ error: "Prénom inconnu." });
    return;
  }
  res.json({ ok: true });
});

// DELETE /api/swipes/:slug — retire un choix (remet le prénom dans la pile).
swipesRouter.delete("/:slug", async (req, res) => {
  await deleteSwipe(req.userId!, req.params.slug);
  res.json({ ok: true });
});
