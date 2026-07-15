-- Schéma initial FoxBaby (PostgreSQL).
-- Remplace le modèle Firestore par de vraies relations (clés étrangères + jointures),
-- ce qui supprime les dénormalisations imposées par Firestore :
--   - plus de `memberNames` recopié sur le couple (jointure vers users.display_name)
--   - plus de `coupleId` recopié sur linkCodes (dérivé via couple_members)
--   - plus de sous-collection swipes (table swipes avec FK vers users et names)

CREATE EXTENSION IF NOT EXISTS citext;    -- email insensible à la casse
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

CREATE TYPE gender AS ENUM ('boy', 'girl');
CREATE TYPE gender_filter AS ENUM ('boy', 'girl', 'both');
CREATE TYPE decision AS ENUM ('favorite', 'rejected');

-- Comptes. L'email/nom/mot de passe étaient gérés par Firebase Auth ; ils vivent
-- désormais ici. password_hash est NULL pour un compte connecté uniquement via Google.
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          citext UNIQUE NOT NULL,
  password_hash  text,
  google_sub     text UNIQUE,                    -- identifiant Google (sub)
  display_name   text NOT NULL,
  avatar         text NOT NULL DEFAULT '🦊',
  gender_filter  gender_filter NOT NULL DEFAULT 'both',
  link_code      text UNIQUE,                     -- remplace la collection linkCodes
  email_verified boolean NOT NULL DEFAULT false,
  firebase_uid   text UNIQUE,                      -- temporaire : jointure pour la migration
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Catalogue des prénoms. `slug` = 'boy-<slug>' / 'girl-<slug>', identique aux ids de
-- documents Firestore, pour que la migration des swipes fasse le lien sans ambiguïté.
-- `rand` reproduit le champ Firestore utilisé pour la pagination quasi aléatoire.
CREATE TABLE names (
  id     serial PRIMARY KEY,
  slug   text UNIQUE NOT NULL,
  name   text NOT NULL,
  gender gender NOT NULL,
  rand   double precision NOT NULL DEFAULT random()
);
CREATE INDEX names_gender_rand_idx ON names (gender, rand);

-- Choix d'un utilisateur pour un prénom (favori / refusé). Un seul choix par couple
-- (user, name) grâce à la clé primaire composite.
CREATE TABLE swipes (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name_id    integer NOT NULL REFERENCES names(id) ON DELETE CASCADE,
  decision   decision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, name_id)
);
CREATE INDEX swipes_user_decision_idx ON swipes (user_id, decision);

-- Un couple relie deux comptes. Les membres sont dans couple_members ; la contrainte
-- UNIQUE(user_id) garantit qu'un utilisateur appartient à au plus un couple.
CREATE TABLE couples (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE couple_members (
  couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id   uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (couple_id, user_id)
);
