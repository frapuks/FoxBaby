import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CloseIcon from "@mui/icons-material/Close";
import ReplayIcon from "@mui/icons-material/Replay";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "../auth/AuthContext";
import {
  deleteSwipe,
  fetchFavorites,
  fetchRejected,
  type Swipe,
} from "../services/swipes";
import type { Gender } from "../constants/names";
import GenderFilterButtons from "../components/GenderFilterButtons";
import SectionTitle from "../components/SectionTitle";
import AddFavoriteDialog from "../components/AddFavoriteDialog";

type Filter = Gender | "both";

const SwipeList = ({
  items,
  variant,
  onRestore,
}: {
  items: Swipe[];
  variant: "favorite" | "rejected";
  onRestore?: (nameId: string) => void;
}) => (
  <Stack spacing={1} sx={{ mt: 1 }}>
    {items.map((item) => (
      <Card
        key={item.nameId}
        variant="outlined"
        sx={{
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 1.5,
          opacity: variant === "rejected" ? 0.7 : 1,
        }}
      >
        <Avatar
          sx={{
            bgcolor:
              variant === "rejected"
                ? "grey.400"
                : item.gender === "boy"
                  ? "info.main"
                  : "secondary.main",
          }}
        >
          {variant === "rejected" ? <CloseIcon /> : <FavoriteIcon />}
        </Avatar>
        <Typography sx={{ flex: 1, fontWeight: 500 }}>{item.name}</Typography>
        {onRestore && (
          <Tooltip title="Remettre à trier">
            <IconButton
              aria-label="Remettre à trier"
              onClick={() => onRestore(item.nameId)}
            >
              <ReplayIcon />
            </IconButton>
          </Tooltip>
        )}
      </Card>
    ))}
  </Stack>
);

const FavoritesPage = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Swipe[]>([]);
  const [rejected, setRejected] = useState<Swipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectedLoaded, setRejectedLoaded] = useState(false);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("both");
  const [showRejected, setShowRejected] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const sortByName = (items: Swipe[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // Au chargement : on ne récupère QUE les favoris (les refusés, souvent
  // majoritaires, ne sont pas affichés par défaut).
  useEffect(() => {
    if (!user) return;
    fetchFavorites(user.uid)
      .then((favs) => setFavorites(sortByName(favs)))
      .finally(() => setLoading(false));
  }, [user]);

  // Les refusés sont chargés à la demande, à la première activation du bouton.
  const handleToggleRejected = (checked: boolean) => {
    setShowRejected(checked);
    if (!checked || rejectedLoaded || rejectedLoading || !user) return;
    setRejectedLoading(true);
    fetchRejected(user.uid)
      .then((rej) => {
        setRejected(sortByName(rej));
        setRejectedLoaded(true);
      })
      .finally(() => setRejectedLoading(false));
  };

  const byGender = (items: Swipe[], gender: Gender) =>
    items.filter((s) => s.gender === gender);

  // Remet un prénom refusé dans la pile (supprime le swipe)
  const handleRestore = (nameId: string) => {
    if (!user) return;
    setFavorites((prev) => prev.filter((s) => s.nameId !== nameId));
    setRejected((prev) => prev.filter((s) => s.nameId !== nameId));
    deleteSwipe(user.uid, nameId).catch((err) =>
      console.error("Échec de la suppression du swipe :", err),
    );
  };

  // Insère un favori ajouté manuellement (si pas déjà présent).
  const handleFavoriteAdded = (swipe: Swipe) => {
    setFavorites((prev) =>
      prev.some((s) => s.nameId === swipe.nameId)
        ? prev
        : sortByName([...prev, swipe]),
    );
  };

  const renderSection = (items: Swipe[], variant: "favorite" | "rejected") => {
    const boys = byGender(items, "boy");
    const girls = byGender(items, "girl");
    const onRestore = handleRestore;
    return (
      <>
        {(filter === "both" || filter === "boy") && boys.length > 0 && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Garçons ({boys.length})
            </Typography>
            <SwipeList items={boys} variant={variant} onRestore={onRestore} />
          </Box>
        )}
        {(filter === "both" || filter === "girl") && girls.length > 0 && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Filles ({girls.length})
            </Typography>
            <SwipeList items={girls} variant={variant} onRestore={onRestore} />
          </Box>
        )}
      </>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <SectionTitle icon={FavoriteIcon}>Mes favoris</SectionTitle>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<AddIcon />}
        onClick={() => setAddOpen(true)}
        sx={{ mb: 2 }}
      >
        Ajouter un favori
      </Button>

      <GenderFilterButtons value={filter} onChange={setFilter} />

      <FormControlLabel
        control={
          <Switch
            checked={showRejected}
            onChange={(e) => handleToggleRejected(e.target.checked)}
          />
        }
        label="Afficher les prénoms refusés"
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : favorites.length === 0 &&
        (!showRejected || (rejectedLoaded && rejected.length === 0)) ? (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          Aucun prénom en favoris pour le moment.
        </Typography>
      ) : (
        <>
          {renderSection(favorites, "favorite")}

          {showRejected && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Refusés
              </Typography>
              {rejectedLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <CircularProgress size={24} color="primary" />
                </Box>
              ) : (
                renderSection(rejected, "rejected")
              )}
            </Box>
          )}
        </>
      )}

      {addOpen && user && (
        <AddFavoriteDialog
          uid={user.uid}
          existingFavoriteIds={new Set(favorites.map((f) => f.nameId))}
          onClose={() => setAddOpen(false)}
          onAdded={handleFavoriteAdded}
        />
      )}
    </Box>
  );
};

export default FavoritesPage;
