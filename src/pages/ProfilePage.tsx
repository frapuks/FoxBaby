import { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import LogoutIcon from "@mui/icons-material/Logout";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import LockIcon from "@mui/icons-material/Lock";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import TuneIcon from "@mui/icons-material/Tune";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useAuth } from "../auth/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import EditProfileDialog from "../components/EditProfileDialog";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import { PartnerLinkContent } from "../components/PartnerLinkCard";
import GenderFilterButtons from "../components/GenderFilterButtons";
import SectionTitle from "../components/SectionTitle";
import { getMyCouple, unlinkCouple, type Couple } from "../services/couple";

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { genderFilter, setGenderFilter, avatar } = usePreferences();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [coupleLoading, setCoupleLoading] = useState(true);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Parent";
  const hasPasswordProvider =
    user?.providerData.some((p) => p.providerId === "password") ?? false;

  useEffect(() => {
    if (!user) return;
    getMyCouple(user.uid, displayName)
      .then(setCouple)
      .catch(() => setCouple(null))
      .finally(() => setCoupleLoading(false));
  }, [user, displayName]);

  const partnerName =
    couple && user
      ? couple.memberNames[couple.members.find((m) => m !== user.uid) ?? ""]
      : undefined;

  const handleUnlink = async () => {
    if (!couple) return;
    setUnlinking(true);
    try {
      await unlinkCouple(couple.id);
      setCouple(null);
      setUnlinkOpen(false);
    } catch (err) {
      console.error("Échec de la suppression du lien :", err);
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {/* Avatar + nom */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={
            <IconButton
              size="small"
              onClick={() => setEditOpen(true)}
              sx={{
                bgcolor: "primary.main",
                color: "#fff",
                "&:hover": { bgcolor: "primary.dark" },
                width: 32,
                height: 32,
              }}
              aria-label="Modifier la photo"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          }
        >
          <Avatar
            sx={{ bgcolor: "#fff", width: 96, height: 96, fontSize: 52, boxShadow: 2 }}
          >
            {avatar}
          </Avatar>
        </Badge>
        <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 700 }}>
          {displayName}
        </Typography>
      </Box>

      {/* Partenaire : titre hors carte, puis carte de hauteur fixe dont le
          contenu change (liaison / partenaire lié) pour ne pas faire sauter l'UI. */}
      <Box>
        <SectionTitle icon={FavoriteIcon}>Partenaire</SectionTitle>
        <Card
          variant="outlined"
          sx={{ borderRadius: 3, minHeight: 148, display: "flex" }}
        >
          <CardContent
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {coupleLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <CircularProgress color="primary" size={28} />
              </Box>
            ) : couple ? (
              <>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Relié à {partnerName ?? "votre partenaire"}.
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  fullWidth
                  startIcon={<LinkOffIcon />}
                  onClick={() => setUnlinkOpen(true)}
                >
                  Supprimer le lien avec le partenaire
                </Button>
              </>
            ) : (
              <PartnerLinkContent />
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Filtres */}
      <Box>
        <SectionTitle icon={TuneIcon}>Filtres</SectionTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Genre des prénoms
        </Typography>
        <GenderFilterButtons value={genderFilter} onChange={setGenderFilter} />
      </Box>

      {/* Compte */}
      <Box>
        <SectionTitle icon={AccountCircleIcon}>Compte</SectionTitle>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<ManageAccountsIcon />}
          onClick={() => setEditOpen(true)}
          sx={{ mb: 1.5 }}
        >
          Modifier le profil
        </Button>
        {hasPasswordProvider && (
          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<LockIcon />}
            onClick={() => setPasswordOpen(true)}
            sx={{ mb: 1.5 }}
          >
            Modifier le mot de passe
          </Button>
        )}
        <Button
          variant="outlined"
          color="error"
          size="large"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={() => logout()}
        >
          Se déconnecter
        </Button>
      </Box>

      <EditProfileDialog open={editOpen} onClose={() => setEditOpen(false)} />
      <ChangePasswordDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />

      <Dialog open={unlinkOpen} onClose={() => setUnlinkOpen(false)}>
        <DialogTitle>Supprimer le lien ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Vous ne serez plus relié à {partnerName ?? "votre partenaire"}. Vous
            pourrez vous relier à nouveau plus tard avec un code.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUnlinkOpen(false)} disabled={unlinking}>
            Annuler
          </Button>
          <Button color="error" onClick={handleUnlink} disabled={unlinking}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
