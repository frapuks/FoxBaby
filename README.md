# 🦊 FoxBaby

FoxBaby est une application mobile de choix de prénom pour un bébé à naître, où les deux parents découvrent des prénoms sous forme de « Tinder ».

## Concept

- Chaque parent fait défiler des prénoms un par un.
- **Swipe à gauche** pour refuser un prénom.
- **Swipe à droite** pour le mettre en favori.
- Le bouton central (horloge) permet de **passer** un prénom sans donner d'avis.
- Quand les **deux parents mettent le même prénom en favori**, cela crée un **match** ! 🎉

## Fonctionnalités

- **Swipe de prénoms** : carte glissable (tactile) inspirée de Tinder, avec animation et indicateurs.
- **Favoris / refusés** : chaque choix est enregistré par utilisateur ; un prénom refusé peut être remis dans la pile.
- **Page Favoris** : liste des favoris (et option d'afficher les refusés), regroupée et filtrable par sexe.
- **Liaison de couple** : chaque parent a un code de liaison à partager ; l'autre saisit ce code pour relier les deux comptes.
- **Page Couple** : stats du couple (matchs, favoris de chacun) et liste des prénoms matchés, filtrable par sexe.
- **Profil** : avatar (animal au choix), nom, email, mot de passe, filtre de genre des prénoms, gestion de la liaison.
- **Authentification** : email/mot de passe (JWT en cookie httpOnly) et Google (OAuth).
- **Mot de passe oublié** : lien de réinitialisation à usage unique envoyé par email (valable 1 h par défaut). Nécessite un serveur SMTP, voir plus bas.

## Architecture

Application self-hosted (Raspberry Pi), 100 % conteneurisée :

```
Internet ─HTTPS→ Cloudflare ─→ Nginx Proxy Manager ─→ [ Caddy ] ─→ front statique + /api
                                (HTTPS, hôte)          (conteneur)      │
                                                                   [ Node/Express ] ─→ [ PostgreSQL ]
```

- **Front** : React + TypeScript + Vite, Material UI (MUI), police Quicksand.
- **Backend** : Node + Express + TypeScript, `pg` (SQL brut), auth maison JWT (bcrypt + Google OAuth).
- **Base** : PostgreSQL (schéma relationnel, vraies clés étrangères).
- **Reverse-proxy interne** : Caddy (sert le front + proxifie `/api` vers le backend).
- **Exposition** : Nginx Proxy Manager (HTTPS) + Cloudflare, en frontal sur le Pi.

## Structure du dépôt

```
/                 front React (Vite)
  src/            code du front (pages, composants, services, contexte auth)
  server/         backend Node/Express + migrations SQL + seed  (voir server/README.md)
  migration/      scripts one-shot Firebase → Postgres           (voir migration/README.md)
  docker/         Caddyfile, Dockerfile front, vhost Nginx d'exemple
  docker-compose.yml         stack : postgres + backend + caddy
  docker-compose.npm.yml     override : branche Caddy au réseau de Nginx Proxy Manager
  deploy.env.example         variables de déploiement (à copier en deploy.env)
```

## Modèle de données (PostgreSQL)

- `users` — `id, email, password_hash?, google_sub?, display_name, avatar, gender_filter, link_code?`
- `names` — `id, slug, name, gender, rand`
- `swipes` — `user_id → users, name_id → names, decision (favorite|rejected)` (PK composite)
- `couples` + `couple_members` — un couple relie exactement deux `users` (unicité : un user dans au plus un couple)
- `password_resets` — `token_hash (PK), user_id → users, expires_at, used_at?` : jetons de réinitialisation. Seul le SHA-256 du jeton est stocké, jamais sa valeur en clair.

Les matchs, favoris du partenaire et exclusion des prénoms déjà vus sont calculés en SQL (jointures).

## Développement local

Prérequis : Node 22+ et Docker.

### Option A — boucle rapide (front & back lancés à la main)

```bash
# 1) Postgres seul
docker compose up -d postgres

# 2) Backend (dossier server/) : voir server/README.md pour le détail
cd server && npm install && npm run migrate && npm run seed:names && npm run dev
# API sur http://localhost:3000

# 3) Front (à la racine, autre terminal)
npm install && npm run dev
# Front sur http://localhost:5173
```

Config front : copier `.env.example` → `.env.local` (`VITE_API_BASE_URL=http://localhost:3000/api`, `VITE_GOOGLE_CLIENT_ID` optionnel).
Config back : `server/.env` (voir `server/.env.example`).

### Option B — stack complète en conteneurs

```bash
docker compose up -d --build          # → http://localhost:8080
```

Pour activer Google en local et régler les ports/secrets, utiliser un fichier d'env :
`docker compose --env-file deploy.env.local up -d --build` (voir `deploy.env.example`).

## Variables d'environnement

**Backend** (`server/.env`) : `DATABASE_URL`, `PORT`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `COOKIE_SECURE`, `CORS_ORIGIN`, `APP_URL`, `PASSWORD_RESET_TTL_MINUTES`, `SMTP_*`.
**Front** (`.env.local`, injecté au build) : `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`.


### Emails (mot de passe oublié)

La réinitialisation de mot de passe passe par un email. Le backend utilise un
serveur SMTP quelconque, configuré par les variables `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` et `SMTP_FROM`.

Tant que `SMTP_HOST` est vide, **aucun email n'est envoyé** : le lien est simplement
écrit dans les logs du backend. C'est le mode de développement ; en production,
sans SMTP configuré, la fonctionnalité est inutilisable pour les utilisateurs.

`APP_URL` doit pointer sur l'URL publique du front : c'est elle qui construit le
lien `https://…/?reset=<jeton>` contenu dans l'email.

## Déploiement (Raspberry Pi)

Le Pi héberge déjà d'autres sites derrière **Nginx Proxy Manager** ; FoxBaby s'y branche sans y toucher.

1. `cp deploy.env.example deploy.env` et renseigner les secrets (Postgres, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `NPM_NETWORK`, ports…).
2. Lancer la stack en la connectant au réseau de NPM :
   ```bash
   docker compose --env-file deploy.env -f docker-compose.yml -f docker-compose.npm.yml up -d --build
   ```
3. Dans Nginx Proxy Manager, créer un **Proxy Host** : domaine → `foxbaby` (forward host) port `80`.
4. HTTPS : certificat via Let's Encrypt (DNS direct) ou **certificat d'origine Cloudflare** si le domaine est proxifié (orange). SSL Cloudflare en **Full (strict)**.

Le backend applique les migrations et seede les prénoms automatiquement au démarrage (idempotent).

## Migration des données (Firebase → Postgres)

Scripts one-shot dans [`migration/`](migration/README.md) : export depuis Firebase (Auth + Firestore) puis import dans Postgres. Les comptes email reçoivent un mot de passe par défaut ; les comptes Google se reconnectent via leur `google_sub`.

## Scripts

**Front (racine)** : `npm run dev` · `npm run build` · `npm run lint` · `npm run preview`
**Backend (`server/`)** : `npm run dev` · `npm run start` · `npm run migrate` · `npm run seed:names` · `npm run typecheck`
