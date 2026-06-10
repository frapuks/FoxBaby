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
- **Authentification** : email/mot de passe et Google (Firebase Auth).

## Stack technique

- React + TypeScript + Vite
- Material UI (MUI) + police Quicksand
- Firebase (Auth + Cloud Firestore)

## Configuration

1. Copier `.env.example` vers `.env.local` et renseigner la config Firebase (`VITE_FIREBASE_*`).
2. Activer dans la console Firebase : **Authentication** (Email/mot de passe + Google) et **Cloud Firestore**.
3. Publier les règles de sécurité du fichier [`firestore.rules`](firestore.rules).

## Données

- Les prénoms vivent dans la collection Firestore `names`.
- Pour (ré)injecter le jeu de prénoms depuis [`src/constants/names.ts`](src/constants/names.ts) :

  ```bash
  npm run seed:names
  ```

  ⚠️ Le seed utilise le SDK web : autoriser temporairement l'écriture sur `names`
  dans les règles Firestore le temps de l'exécution, puis rétablir
  `allow write: if false;`.

## Modèle de données Firestore

- `names/{id}` — `{ name, gender }`
- `users/{uid}` — `{ linkCode, avatar, genderFilter }`
- `users/{uid}/swipes/{nameId}` — `{ nameId, name, gender, decision }`
- `linkCodes/{CODE}` — `{ uid, name, coupleId? }`
- `couples/{id}` — `{ members: [uidA, uidB], memberNames }`

## Démarrage

```bash
npm install
npm run dev
```
