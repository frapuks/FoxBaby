#!/bin/sh
# Applique les migrations, seed les prénoms (idempotent), puis démarre l'API.
set -e

echo "→ Migrations…"
npm run migrate

echo "→ Seed des prénoms (ignoré si déjà peuplé)…"
npm run seed:names

echo "→ Démarrage de l'API…"
exec npm run start
