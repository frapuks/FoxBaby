import type { NextFunction, Request, Response } from "express";
import { readAuthCookie, verifyToken } from "../auth/jwt.ts";

// Exige un cookie de session valide et renseigne req.userId. Répond 401 sinon.
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = readAuthCookie(req.cookies);
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }
  req.userId = userId;
  next();
};
