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

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.";

const LoginPage = () => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
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
        Trouvez le prénom parfait, ensemble.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Formulaire */}
      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={submitting}
        >
          {isSignUp ? "Créer mon compte" : "Se connecter"}
        </Button>
      </Stack>

      {/* Séparateur */}
      <Divider sx={{ my: 3 }}>OU</Divider>

      {/* Connexion Google (bouton GIS, ou repli désactivé si non configuré) */}
      <GoogleSignInButton onError={setError} />

      {/* Bascule connexion / création de compte */}
      <Typography variant="body2" align="center" sx={{ mt: 4 }}>
        {isSignUp ? "Déjà un compte ? " : "Nouveau parent ? "}
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={() => {
            setError(null);
            setIsSignUp((v) => !v);
          }}
        >
          {isSignUp ? "Se connecter" : "Créer un compte"}
        </Link>
      </Typography>
    </Box>
  );
};

export default LoginPage;
