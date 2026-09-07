import "dotenv/config";

// Configuration centralisée, lue depuis l'environnement (server/.env).
export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",

  // URL publique du front, utilisée pour construire le lien de réinitialisation.
  // Par défaut l'origine CORS, qui est déjà le domaine du front.
  appUrl: (process.env.APP_URL || process.env.CORS_ORIGIN || "http://localhost:5173").replace(
    /\/+$/,
    "",
  ),

  // Durée de validité d'un lien de réinitialisation.
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60),

  // SMTP. Si `host` est vide, aucun email n'est envoyé : le lien est écrit dans
  // les logs du serveur (pratique en dev, jamais suffisant en production).
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT || 587),
    // true = TLS implicite (port 465). false = STARTTLS (port 587).
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    // Gmail impose que l’expéditeur soit le compte authentifié : par défaut on
    // reprend donc SMTP_USER plutôt qu’une adresse qui serait refusée.
    // (`||` et non `??` : docker-compose transmet une chaîne vide, pas undefined,
    // quand la variable est absente du fichier .env.)
    from:
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `FoxBaby <${process.env.SMTP_USER}>` : ""),
  },
};
