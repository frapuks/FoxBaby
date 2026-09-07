import { useEffect, useRef } from "react";
import { Button } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { useAuth } from "./AuthContext";

// Rend le bouton officiel Google Identity Services (GIS) qui renvoie un idToken,
// posté au backend via signInWithGoogle. Si aucun VITE_GOOGLE_CLIENT_ID n'est
// configuré (typiquement en dev), on affiche un bouton désactivé explicite.

type GoogleSignInButtonProps = {
  onError: (message: string) => void;
};

// google.accounts.id est injecté par le script GIS chargé dynamiquement.
type GoogleId = {
  initialize: (opts: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
  }) => void;
  renderButton: (parent: HTMLElement, opts: Record<string, unknown>) => void;
};
const getGoogleId = (): GoogleId | undefined =>
  (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id;

const GSI_SRC = "https://accounts.google.com/gsi/client";

const loadGsiScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (getGoogleId()) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Échec du chargement de Google.")));
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Échec du chargement de Google."));
    document.head.appendChild(script);
  });

const GoogleSignInButton = ({ onError }: GoogleSignInButtonProps) => {
  const { signInWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;
    loadGsiScript()
      .then(() => {
        const googleId = getGoogleId();
        if (cancelled || !googleId || !containerRef.current) return;
        googleId.initialize({
          client_id: clientId,
          callback: (resp) => {
            signInWithGoogle(resp.credential).catch((err) =>
              onError(err instanceof Error ? err.message : "Connexion Google impossible."),
            );
          },
        });
        googleId.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "pill",
        });
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Google indisponible."));
    return () => {
      cancelled = true;
    };
  }, [clientId, signInWithGoogle, onError]);

  if (!clientId) {
    return (
      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<GoogleIcon />}
        disabled
        title="Configurez VITE_GOOGLE_CLIENT_ID pour activer la connexion Google"
      >
        Google (non configuré)
      </Button>
    );
  }

  return <div ref={containerRef} style={{ display: "flex", justifyContent: "center" }} />;
};

export default GoogleSignInButton;
