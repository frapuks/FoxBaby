import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./config.ts";
import { pool } from "./db.ts";
import { HttpError } from "./couple.ts";
import { authRouter } from "./routes/auth.ts";
import { namesRouter } from "./routes/names.ts";
import { swipesRouter } from "./routes/swipes.ts";
import { coupleRouter } from "./routes/couple.ts";

const app = express();
app.use(express.json());
app.use(cookieParser());
// CORS avec cookies : on autorise l'origine du front et l'envoi des credentials.
app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Vérifie que le serveur répond et que la connexion Postgres fonctionne.
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "ok", db: "down" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/names", namesRouter);
app.use("/api/swipes", swipesRouter);
app.use("/api/couple", coupleRouter);

// Gestionnaire d'erreurs global : traduit une HttpError en son code, sinon 500.
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error("Erreur non gérée :", err);
    res.status(500).json({ error: "Erreur serveur." });
  },
);

app.listen(config.port, () =>
  console.log(`API FoxBaby à l'écoute sur http://localhost:${config.port}`),
);
