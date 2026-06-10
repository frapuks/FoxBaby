import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Skeleton,
  Snackbar,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuth } from "../auth/AuthContext";
import { ensureLinkCode } from "../services/couple";

// Contenu du code de liaison, réutilisable dans une carte parente
export const PartnerLinkContent = () => {
  const { user } = useAuth();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    ensureLinkCode(user)
      .then(setLinkCode)
      .catch((err) => console.error("Échec de la génération du code :", err));
  }, [user]);

  const handleCopy = async () => {
    if (!linkCode) return;
    await navigator.clipboard.writeText(linkCode);
    setCopied(true);
  };

  return (
    <>
      <Typography variant="subtitle2" color="text.secondary">
        Code de liaison avec votre partenaire
      </Typography>
      <Box
        sx={{
          mt: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {linkCode ? (
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, letterSpacing: 4, color: "primary.main" }}
          >
            {linkCode}
          </Typography>
        ) : (
          <Skeleton variant="text" width={120} height={40} />
        )}
        <IconButton
          onClick={handleCopy}
          disabled={!linkCode}
          aria-label="Copier le code"
        >
          <ContentCopyIcon />
        </IconButton>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Partagez ce code avec l'autre parent pour relier vos comptes.
      </Typography>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Code copié !"
      />
    </>
  );
};

const PartnerLinkCard = () => (
  <Card variant="outlined" sx={{ borderRadius: 3 }}>
    <CardContent>
      <PartnerLinkContent />
    </CardContent>
  </Card>
);

export default PartnerLinkCard;
