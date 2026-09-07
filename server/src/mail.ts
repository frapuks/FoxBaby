import nodemailer, { type Transporter } from "nodemailer";
import { config } from "./config.ts";

// Transport SMTP créé une seule fois, à la première utilisation. Si SMTP_HOST
// n'est pas renseigné on reste à null : l'envoi se contente alors d'écrire dans
// les logs, ce qui permet de développer sans serveur mail.
let transporter: Transporter | null = null;

export const mailEnabled = (): boolean => config.smtp.host !== "";

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      // Un relais local ouvert n'a pas de compte : on n'envoie `auth` que si
      // un identifiant est configuré.
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
};

type Mail = { to: string; subject: string; text: string; html: string };

const send = async (mail: Mail): Promise<void> => {
  if (!mailEnabled()) {
    console.warn(
      `[mail] SMTP non configuré, email non envoyé à ${mail.to}.\n` +
        `[mail] Sujet : ${mail.subject}\n${mail.text}`,
    );
    return;
  }
  await getTransporter().sendMail({ from: config.smtp.from, ...mail });
};

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39" }[c]};`);

// Email de réinitialisation. Le lien pointe vers la racine du front avec le jeton
// en paramètre (l'app n'a pas de routeur, elle lit `?reset=` au démarrage).
export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  const link = `${config.appUrl}/?reset=${encodeURIComponent(token)}`;
  const validity = `${config.passwordResetTtlMinutes} minutes`;

  await send({
    to,
    subject: "Réinitialisation de votre mot de passe FoxBaby",
    text: [
      "Bonjour,",
      "",
      "Vous avez demandé à réinitialiser votre mot de passe FoxBaby.",
      `Ouvrez ce lien pour en choisir un nouveau (valable ${validity}) :`,
      link,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email :",
      "votre mot de passe actuel reste valable.",
      "",
      "🦊 FoxBaby",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
                  color:#3f3f46;line-height:1.6;max-width:480px">
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe FoxBaby.</p>
        <p style="margin:28px 0">
          <a href="${escapeHtml(link)}"
             style="background:#f97316;color:#fff;text-decoration:none;font-weight:600;
                    padding:12px 24px;border-radius:999px;display:inline-block">
            Choisir un nouveau mot de passe
          </a>
        </p>
        <p style="color:#71717a;font-size:14px">
          Ce lien est valable ${validity}. Si vous n'êtes pas à l'origine de cette
          demande, ignorez cet email : votre mot de passe actuel reste valable.
        </p>
        <p style="color:#71717a;font-size:14px">🦊 FoxBaby</p>
      </div>`,
  });
};
