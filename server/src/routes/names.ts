import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.ts";
import { getNamesPage, searchNames, type GenderFilter } from "../names.ts";

export const namesRouter = Router();
namesRouter.use(requireAuth);

// GET /api/names?gender=&cursor=&limit= — page suivante du pager aléatoire,
// excluant les prénoms déjà tranchés par l'utilisateur.
namesRouter.get("/", async (req, res) => {
  const g = req.query.gender;
  const gender: GenderFilter = g === "boy" || g === "girl" ? g : "both";
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
  const page = await getNamesPage(req.userId!, gender, cursor, limit);
  res.json(page);
});

// GET /api/names/search?q= — recherche par préfixe.
namesRouter.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  res.json({ names: await searchNames(q) });
});
