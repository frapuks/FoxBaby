import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { FirebaseError } from "firebase/app";
import { useAuth } from "../auth/AuthContext";

type ChangePasswordDialogProps = {
  open: boolean;
  onClose: () => void;
};

const errorMessage = (err: unknown): string => {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Mot de passe actuel incorrect.";
      case "auth/requires-recent-login":
        return "Pour des raisons de sécurité, reconnectez-vous puis réessayez.";
      case "auth/weak-password":
        return "Le nouveau mot de passe est trop faible.";
      default:
        return "Une erreur est survenue. Réessayez.";
    }
  }
  return "Une erreur est survenue. Réessayez.";
};

type Strength = {
  score: number;
  label: string;
  color: "error" | "warning" | "success";
};

const evaluateStrength = (password: string): Strength => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 25, label: "Faible", color: "error" };
  if (score === 2) return { score: 50, label: "Moyen", color: "warning" };
  if (score === 3) return { score: 75, label: "Bon", color: "success" };
  return { score: 100, label: "Excellent", color: "success" };
};

const MIN_LENGTH = 6;

const ChangePasswordDialog = ({ open, onClose }: ChangePasswordDialogProps) => {
  const { reauthenticate, updateUserPassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => evaluateStrength(newPassword), [newPassword]);

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sameAsOld = newPassword.length > 0 && newPassword === currentPassword;

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= MIN_LENGTH &&
    newPassword === confirmPassword &&
    !sameAsOld;

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await reauthenticate(currentPassword);
      await updateUserPassword(newPassword);
      reset();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Modifier le mot de passe</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Mot de passe actuel"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            required
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrent((v) => !v)}
                      edge="end"
                      aria-label="Afficher le mot de passe"
                    >
                      {showCurrent ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="Nouveau mot de passe"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            required
            error={tooShort || sameAsOld}
            helperText={
              tooShort
                ? `Au moins ${MIN_LENGTH} caractères.`
                : sameAsOld
                  ? "Le nouveau mot de passe doit être différent de l'actuel."
                  : " "
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNew((v) => !v)}
                      edge="end"
                      aria-label="Afficher le mot de passe"
                    >
                      {showNew ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {newPassword.length > 0 && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={strength.score}
                color={strength.color}
                sx={{ borderRadius: 1, height: 6 }}
              />
              <Typography
                variant="caption"
                color={`${strength.color}.main`}
                sx={{ mt: 0.5, display: "block" }}
              >
                Robustesse : {strength.label}
              </Typography>
            </Box>
          )}

          <TextField
            label="Confirmer le nouveau mot de passe"
            type={showNew ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
            error={mismatch}
            helperText={mismatch ? "Les mots de passe ne correspondent pas." : " "}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={submitting || !canSubmit}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
