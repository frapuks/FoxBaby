import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../api";
import { useAuth } from "../auth/AuthContext";
import GoogleSignInButton from "../auth/GoogleSignInButton";
import { requestPasswordReset } from "../services/passwordReset";

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.";

type Mode = "signin" | "signup" | "forgot";

const LoginPage = () => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isForgot = mode === "forgot";

  // Change d'écran en repartant d'un état propre.
  const goTo = (next: Mode) => {
    setError(null);
    setResetSent(false);
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await requestPasswordReset(email);
        setResetSent(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        p: 3,
        maxWidth: 480,
        mx: "auto",
      }}
    >
      {/* Logo */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Avatar
          sx={{
            bgcolor: "#fff",
            width: 96,
            height: 96,
            fontSize: 52,
            boxShadow: 3,
          }}
        >
          🦊
        </Avatar>
      </Box>

      {/* Nom de l'application */}
      <Typography
        variant="h4"
        component="h1"
        align="center"
        sx={{ fontWeight: 700, color: "primary.main" }}
      >
        FoxBaby
      </Typography>

      {/* Description */}
      <Typography
        variant="body2"
        align="center"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        {isForgot
          ? "Indiquez votre email, nous vous enverrons un lien."
          : "Trouvez le prénom parfait, ensemble."}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Le serveur répond de la même façon pour un email inconnu : le message
          reste donc volontairement au conditionnel. */}
      {resetSent && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Si un compte existe pour cette adresse, un lien vient d'être envoyé.
          Pensez à regarder vos spams.
        </Alert>
      )}

      {/* Formulaire */}
      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
        />
        {!isForgot && (
          <TextField
            label="Mot de passe"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
          />
        )}
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={submitting}
        >
          {isForgot
            ? "Envoyer le lien"
            : mode === "signup"
              ? "Créer mon compte"
              : "Se connecter"}
        </Button>
      </Stack>

      {isForgot ? (
        <Typography variant="body2" align="center" sx={{ mt: 3 }}>
          <Link component="button" type="button" underline="hover" onClick={() => goTo("signin")}>
            Retour à la connexion
          </Link>
        </Typography>
      ) : (
        <>
          {/* Mot de passe oublié : seulement pour la connexion, pas l'inscription */}
          {mode === "signin" && (
            <Typography variant="body2" align="center" sx={{ mt: 2 }}>
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={() => goTo("forgot")}
              >
                Mot de passe oublié ?
              </Link>
            </Typography>
          )}

          {/* Séparateur */}
          <Divider sx={{ my: 3 }}>OU</Divider>

          {/* Connexion Google (bouton GIS, ou repli désactivé si non configuré) */}
          <GoogleSignInButton onError={setError} />

          {/* Bascule connexion / création de compte */}
          <Typography variant="body2" align="center" sx={{ mt: 4 }}>
            {mode === "signup" ? "Déjà un compte ? " : "Nouveau parent ? "}
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => goTo(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Se connecter" : "Créer un compte"}
            </Link>
          </Typography>
        </>
      )}
    </Box>
  );
};

export default LoginPage;
