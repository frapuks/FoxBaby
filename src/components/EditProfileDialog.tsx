import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FirebaseError } from "firebase/app";
import { useAuth } from "../auth/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { AVATARS } from "../constants/avatars";

type EditProfileDialogProps = {
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
      case "auth/email-already-in-use":
        return "Cet email est déjà utilisé.";
      case "auth/invalid-email":
        return "Adresse email invalide.";
      case "auth/operation-not-allowed":
        return "Changement d'email impossible : vérifiez d'abord votre nouvelle adresse.";
      default:
        return "Une erreur est survenue. Réessayez.";
    }
  }
  return "Une erreur est survenue. Réessayez.";
};

const EditProfileDialog = ({ open, onClose }: EditProfileDialogProps) => {
  const { user, updateName, reauthenticate, updateUserEmail } = useAuth();
  const { avatar, setAvatar } = usePreferences();

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailChanged = email !== (user?.email ?? "");

  const handleSave = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (emailChanged) {
        await reauthenticate(currentPassword);
      }
      if (name !== (user?.displayName ?? "")) {
        await updateName(name);
      }
      setAvatar(selectedAvatar);
      setCurrentPassword("");

      if (emailChanged) {
        // Changement d'email : vérification requise, l'email ne change pas encore.
        await updateUserEmail(email);
        setEmail(user?.email ?? "");
        setInfo(
          "Un email de confirmation a été envoyé à votre nouvelle adresse. " +
            "Le changement sera effectif après validation du lien.",
        );
      } else {
        onClose();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Modifier le profil</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Avatar
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 1,
              }}
            >
              {AVATARS.map((option) => {
                const selected = option.emoji === selectedAvatar;
                return (
                  <Avatar
                    key={option.id}
                    onClick={() => setSelectedAvatar(option.emoji)}
                    title={option.label}
                    sx={{
                      cursor: "pointer",
                      bgcolor: "#fff",
                      fontSize: 22,
                      width: 44,
                      height: 44,
                      border: 2,
                      borderColor: selected ? "primary.main" : "divider",
                      boxShadow: selected ? 2 : 0,
                    }}
                  >
                    {option.emoji}
                  </Avatar>
                );
              })}
            </Box>
          </Box>
          <TextField
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          {emailChanged && (
            <>
              <Typography variant="caption" color="text.secondary">
                Confirmez votre mot de passe actuel pour modifier l'email.
              </Typography>
              <TextField
                label="Mot de passe actuel"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                required
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={submitting}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProfileDialog;
