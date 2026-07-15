# FoxBaby — Backend (self-hosted)

API Node (Express + TypeScript) sur PostgreSQL. Remplace Firestore/Firebase Auth.

## Prérequis
- Node 22+
- Docker (pour Postgres en local)

## Démarrage local (étape 1)

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
curl http://localhost:3000/api/names/count  # {"count":5000,"sample":[...]}
```

## Réinitialiser la base

```bash
docker compose down -v   # supprime le volume Postgres
docker compose up -d postgres
npm run migrate && npm run seed:names
```
