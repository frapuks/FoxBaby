import type { Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";

const COOKIE_NAME = "token";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

// Options du cookie de session. SameSite=Lax suffit : en dev le front (localhost:5173)
// et l'API (localhost:3000) partagent le même site (le port n'entre pas en compte),
// et en prod ils seront servis sous la même origine par Caddy.
const cookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax" as const,
  path: "/",
};

export const signToken = (userId: string): string =>
  jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "30d" });

export const verifyToken = (token: string): string | null => {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return typeof payload === "object" && payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
};

export const setAuthCookie = (res: Response, userId: string): void => {
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOptions, maxAge: MAX_AGE_MS });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
};

export const readAuthCookie = (cookies: Record<string, string> | undefined): string | null =>
  cookies?.[COOKIE_NAME] ?? null;
