# Construit le front (Vite) puis produit une image Caddy servant les fichiers
# statiques + reverse-proxy vers le backend. Contexte de build = racine du dépôt.
#
# Image glibc (Debian) et non Alpine : Rolldown (bundler de Vite 8) ne publie pas
# de binaire natif pour ARM 32 bits + musl (Alpine), mais en fournit un pour ARM
# 32 bits glibc (linux-arm-gnueabihf). Indispensable pour builder sur un Pi 32 bits.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Injecté au build : l'URL de l'API (même origine en prod) et l'ID client Google.
ARG VITE_API_BASE_URL=/api
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
