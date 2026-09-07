# Image du backend FoxBaby. Contexte de build = racine du dépôt (pour accéder à
# src/constants/names.ts, source partagée des prénoms utilisée par le seed).
FROM node:22-alpine
WORKDIR /app

# Dépendances (on installe tout : l'exécution se fait via tsx, une devDependency).
COPY server/package*.json ./
RUN npm ci

# Code du serveur.
COPY server/ ./

# La source des prénoms vit dans le front ; on la place au chemin attendu par
# l'import relatif de scripts/seedNames.ts (../../src/constants/names.ts),
# soit /src/constants/names.ts depuis /app/scripts.
COPY src/constants/names.ts /src/constants/names.ts

EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
