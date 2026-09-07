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
import { ApiError } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { AVATARS } from "../constants/avatars";

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
};

const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.";

const EditProfileDialog = ({ open, onClose }: EditProfileDialogProps) => {
  const { user, updateName, updateUserEmail } = useAuth();
  const { avatar, setAvatar } = usePreferences();

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailChanged = email !== (user?.email ?? "");

  const handleSave = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (name !== (user?.displayName ?? "")) {
        await updateName(name);
      }
      if (selectedAvatar !== avatar) {
        setAvatar(selectedAvatar);
      }
      // Changement d'email : ré-authentification par mot de passe si le compte en a un.
      if (emailChanged) {
        await updateUserEmail(email, currentPassword || undefined);
      }
      setCurrentPassword("");
      onClose();
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
          {emailChanged && (user?.hasPassword ?? false) && (
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
