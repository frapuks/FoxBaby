import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
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
import { useAuth } from "../auth/AuthContext";
import { deleteSwipe, fetchSwipes, type Swipe } from "../services/swipes";
import type { Gender } from "../constants/names";
import GenderFilterButtons from "../components/GenderFilterButtons";
import SectionTitle from "../components/SectionTitle";

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
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("both");
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchSwipes(user.uid)
      .then((all) =>
        setSwipes(
          [...all].sort((a, b) => a.name.localeCompare(b.name, "fr")),
        ),
      )
      .finally(() => setLoading(false));
  }, [user]);

  const byGender = (items: Swipe[], gender: Gender) =>
    items.filter((s) => s.gender === gender);

  const favorites = useMemo(
    () => swipes.filter((s) => s.decision === "favorite"),
    [swipes],
  );
  const rejected = useMemo(
    () => swipes.filter((s) => s.decision === "rejected"),
    [swipes],
  );

  // Remet un prénom refusé dans la pile (supprime le swipe)
  const handleRestore = (nameId: string) => {
    if (!user) return;
    setSwipes((prev) => prev.filter((s) => s.nameId !== nameId));
    deleteSwipe(user.uid, nameId).catch((err) =>
      console.error("Échec de la suppression du swipe :", err),
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

      <GenderFilterButtons value={filter} onChange={setFilter} />

      <FormControlLabel
        control={
          <Switch
            checked={showRejected}
            onChange={(e) => setShowRejected(e.target.checked)}
          />
        }
        label="Afficher les prénoms refusés"
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : favorites.length === 0 && (!showRejected || rejected.length === 0) ? (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          Aucun prénom en favoris pour le moment.
        </Typography>
      ) : (
        <>
          {renderSection(favorites, "favorite")}

          {showRejected && rejected.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Refusés
              </Typography>
              {renderSection(rejected, "rejected")}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default FavoritesPage;
