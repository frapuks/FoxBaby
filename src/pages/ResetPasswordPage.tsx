import { useState } from "react";
import { Alert, Avatar, Box, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { ApiError } from "../api";
import { clearResetTokenFromUrl, resetPassword } from "../services/passwordReset";

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.";

type Props = {
  token: string;
  // Quitte l'écran : nettoie l'URL et revient à la connexion.
  onDone: () => void;
};

// Écran affiché quand l'URL contient `?reset=<jeton>`.
const ResetPasswordPage = ({ token, onDone }: Props) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const leave = () => {
    clearResetTokenFromUrl();
    onDone();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
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
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Avatar sx={{ bgcolor: "#fff", width: 96, height: 96, fontSize: 52, boxShadow: 3 }}>
          🦊
        </Avatar>
      </Box>

      <Typography
        variant="h5"
        component="h1"
        align="center"
        sx={{ fontWeight: 700, color: "primary.main" }}
      >
        Nouveau mot de passe
      </Typography>

      {done ? (
        <>
          <Alert severity="success" sx={{ mt: 3, mb: 2 }}>
            Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.
          </Alert>
          <Button variant="contained" size="large" fullWidth onClick={leave}>
            Se connecter
          </Button>
        </>
      ) : (
        <>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Choisissez un mot de passe d'au moins 6 caractères.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              required
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={submitting}>
              Enregistrer
            </Button>
          </Stack>

          <Typography variant="body2" align="center" sx={{ mt: 4 }}>
            <Link component="button" type="button" underline="hover" onClick={leave}>
              Retour à la connexion
            </Link>
          </Typography>
        </>
      )}
    </Box>
  );
};

export default ResetPasswordPage;
