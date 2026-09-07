# Migration Firebase → Postgres

Scripts one-shot pour transférer les données existantes (Firebase Auth + Firestore)
vers la base Postgres.

## 1. Récupérer une clé de compte de service Firebase

Console Firebase → ⚙️ **Paramètres du projet** → onglet **Comptes de service** →
**Générer une nouvelle clé privée**. Enregistrez le fichier sous
`migration/service-account.json` (déjà ignoré par git).

## 2. Installer et configurer

```bash
cd migration
npm install
cp .env.example .env      # ajustez DATABASE_URL si besoin
```

`DATABASE_URL` doit pointer vers la base **cible** (schéma déjà migré + prénoms seedés) :
- stack Docker locale : `postgres://foxbaby:foxbaby@localhost:5432/foxbaby`
- Pi en prod : l'URL de votre Postgres de prod.

## 3. Exporter depuis Firebase

```bash
npm run export        # → firebase-dump.json
```

Récupère les comptes (Auth) et les collections Firestore `users`, `swipes`, `couples`.
**Les mots de passe ne sont pas exportés** (Firebase ne les fournit pas en clair).

## 4. Importer dans Postgres

```bash
npm run import        # lit firebase-dump.json
```

Sortie attendue : nombre de comptes, swipes et couples importés (les swipes dont le
prénom n'existe plus, et les comptes sans email, sont ignorés et comptabilisés).
L'import est **idempotent** : le relancer ne crée pas de doublon.

## Après migration

- **Comptes email** : ils reçoivent le `DEFAULT_PASSWORD` défini dans `.env`.
  Communiquez-le aux utilisateurs concernés ; ils le changeront depuis l'app
  (Profil → Modifier le mot de passe). Les comptes **Google** n'ont pas de mot de
  passe et se reconnectent normalement (le `google_sub` a été importé).
- La colonne temporaire `users.firebase_uid` a servi de pont. Une fois la migration
  validée en prod, elle peut être supprimée :
  `ALTER TABLE users DROP COLUMN firebase_uid;`

## Vérifier

```bash
# exemples
psql "$DATABASE_URL" -c "SELECT email, gender_filter, google_sub IS NOT NULL AS google FROM users;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM swipes;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM couples;"
```
