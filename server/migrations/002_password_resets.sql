-- Jetons de réinitialisation de mot de passe.
--
-- Le jeton en clair n'est JAMAIS stocké : il ne vit que dans le lien envoyé par
-- email. On garde son SHA-256, ce qui suffit à le retrouver et empêche un accès
-- en lecture à la base de forger un lien valide. (SHA-256 et non bcrypt : le
-- jeton fait 32 octets aléatoires, il n'a pas besoin d'un hash lent anti-force
-- brute, et la recherche doit se faire par index.)
CREATE TABLE password_resets (
  token_hash text        PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,                        -- non NULL = jeton déjà consommé
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sert à invalider les jetons encore en vie d'un utilisateur (nouvelle demande,
-- ou changement de mot de passe) et au ménage périodique.
CREATE INDEX password_resets_user_id_idx ON password_resets (user_id);
CREATE INDEX password_resets_expires_at_idx ON password_resets (expires_at);
