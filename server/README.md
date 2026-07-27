# FoxBaby — Backend (self-hosted)

API Node (Express + TypeScript) sur PostgreSQL. Remplace Firestore/Firebase Auth.

## Prérequis
- Node 22+
- Docker (pour Postgres en local)

## Démarrage local

Depuis la racine du dépôt, lancer Postgres :

```bash
docker compose up -d postgres
```

Puis, dans `server/` :

```bash
npm install
npm run migrate      # crée le schéma (tables, types, index)
npm run seed:names   # insère les ~5000 prénoms depuis src/constants/names.ts
npm run dev          # démarre l'API sur http://localhost:3000
```

## Vérifier

```bash
curl http://localhost:3000/api/health       # {"status":"ok","db":"up"}
```

## Endpoints principaux (préfixe `/api`)

- **Auth** : `POST /auth/register` · `/login` · `/google` · `/logout` · `GET /auth/me` · `PATCH /auth/profile` · `/email` · `/password`
- **Prénoms** (auth) : `GET /names` (pager aléatoire, exclut les déjà-vus) · `GET /names/search?q=`
- **Swipes** (auth) : `PUT|DELETE /swipes/:slug` · `GET /swipes/ids` · `/swipes/favorites` · `/swipes/rejected`
- **Couple** (auth) : `GET /couple/me` · `/link-code` · `/matches` · `/partner-favorites` · `POST /couple/link` · `DELETE /couple`

L'authentification se fait par cookie de session httpOnly (posé au login/register).

## Réinitialiser la base

```bash
docker compose down -v   # supprime le volume Postgres
docker compose up -d postgres
npm run migrate && npm run seed:names
```
