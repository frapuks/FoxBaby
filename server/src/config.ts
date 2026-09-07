import "dotenv/config";

// Configuration centralisée, lue depuis l'environnement (server/.env).
export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
