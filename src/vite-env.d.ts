/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base de l'API backend. En dev : http://localhost:3000/api ; en prod : /api.
  readonly VITE_API_BASE_URL?: string;
  // ID client OAuth Google (pour le bouton de connexion Google). Optionnel en dev.
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
