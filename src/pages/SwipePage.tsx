import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HistoryIcon from "@mui/icons-material/History";
import SwipeIcon from "@mui/icons-material/Swipe";
import type { NameDoc } from "../services/names";
import { fetchNames } from "../services/names";
import {
  fetchFavorites,
  fetchSwipedIds,
  recordSwipe,
  type Decision,
} from "../services/swipes";
import { getMyCouple } from "../services/couple";
import { usePreferences } from "../context/PreferencesContext";
import { useAuth } from "../auth/AuthContext";

const SWIPE_THRESHOLD = 120;
const EXIT_OFFSET = 700;

// Mélange (Fisher-Yates) pour un ordre aléatoire
const shuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const SwipePage = () => {
  const { user } = useAuth();
  const { genderFilter } = usePreferences();

  const [allNames, setAllNames] = useState<NameDoc[]>([]);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [partnerFavIds, setPartnerFavIds] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<NameDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchName, setMatchName] = useState<string | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animate, setAnimate] = useState(true);
  const startX = useRef(0);

  useEffect(() => {
    if (!user) return;
    const loadPartnerFavs = async () => {
      const couple = await getMyCouple(user.uid).catch(() => null);
      const partnerUid = couple?.members.find((m) => m !== user.uid);
      if (!partnerUid) return new Set<string>();
      const favs = await fetchFavorites(partnerUid).catch(() => []);
      return new Set(favs.map((f) => f.nameId));
    };

    Promise.all([fetchNames(), fetchSwipedIds(user.uid), loadPartnerFavs()])
      .then(([names, swiped, partnerFavs]) => {
        setAllNames(shuffle(names));
        setSwipedIds(swiped);
        setPartnerFavIds(partnerFavs);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // (Re)construit la file : exclut les prénoms déjà tranchés + filtre de genre
  useEffect(() => {
    setQueue(
      allNames
        .filter((n) => !swipedIds.has(n.id))
        .filter((n) => genderFilter === "both" || n.gender === genderFilter),
    );
  }, [allNames, swipedIds, genderFilter]);

  // La carte affichée est toujours la première de la file
  const current = queue[0];

  // Anime la carte hors de l'écran, puis applique le changement de file
  const animateOut = (direction: "left" | "right", after: () => void) => {
    setAnimate(true);
    setDragX(direction === "right" ? EXIT_OFFSET : -EXIT_OFFSET);
    setTimeout(() => {
      setAnimate(false);
      setDragX(0);
      after();
      requestAnimationFrame(() => setAnimate(true));
    }, 250);
  };

  // Enregistre le choix en base, puis retire le prénom de la file
  const decide = (decision: Decision, direction: "left" | "right") => {
    if (!user || !current) return;
    const name = current;
    recordSwipe(user.uid, name, decision).catch((err) =>
      console.error("Échec de l'enregistrement du swipe :", err),
    );
    // Match : le partenaire a déjà mis ce prénom en favori
    const isMatch = decision === "favorite" && partnerFavIds.has(name.id);
    animateOut(direction, () => {
      setSwipedIds((prev) => new Set(prev).add(name.id));
      if (isMatch) setMatchName(name.name);
    });
  };

  const handleRefuse = () => decide("rejected", "left");
  const handleFavorite = () => decide("favorite", "right");

  // Passer sans avis : on déplace le prénom en fin de file (aucun enregistrement)
  const handleSkip = () => {
    if (queue.length < 2) return;
    setQueue((q) => [...q.slice(1), q[0]]);
  };

  const handlePointerDown = (e: PointerEvent) => {
    setDragging(true);
    setAnimate(false);
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      handleFavorite();
    } else if (dragX < -SWIPE_THRESHOLD) {
      handleRefuse();
    } else {
      setAnimate(true);
      setDragX(0);
    }
  };

  const progress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      {loading ? (
        <CircularProgress color="primary" />
      ) : current ? (
        <>
          {/* Carte avec le prénom (glissable) */}
          <Card
            elevation={4}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: 360,
              aspectRatio: "3 / 4",
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
              touchAction: "none",
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none",
              transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`,
              transition: animate
                ? "transform 0.25s ease-out"
                : "none",
            }}
          >
            {/* Indicateurs de décision */}
            <Box
              sx={{
                position: "absolute",
                top: 20,
                left: 20,
                display: "flex",
                p: 1,
                border: 3,
                borderColor: "error.main",
                color: "error.main",
                borderRadius: "50%",
                opacity: dragX < 0 ? progress : 0,
              }}
            >
              <CloseIcon sx={{ fontSize: 40 }} />
            </Box>
            <Box
              sx={{
                position: "absolute",
                top: 20,
                right: 20,
                display: "flex",
                p: 1,
                border: 3,
                borderColor: "success.main",
                color: "success.main",
                borderRadius: "50%",
                opacity: dragX > 0 ? progress : 0,
              }}
            >
              <FavoriteIcon sx={{ fontSize: 40 }} />
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Typography
                variant="h2"
                component="span"
                sx={{
                  fontWeight: 300,
                  color: "text.secondary",
                  textAlign: "center",
                }}
              >
                {current.name}
              </Typography>
              <Chip
                label={current.gender === "boy" ? "Garçon" : "Fille"}
                color={current.gender === "boy" ? "info" : "secondary"}
              />
            </Box>

            {/* Indication de swipe en bas de la carte */}
            <Box
              sx={{
                position: "absolute",
                bottom: 16,
                left: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                color: "text.disabled",
              }}
            >
              <SwipeIcon fontSize="small" />
              <Typography variant="caption">Swipe</Typography>
              <SwipeIcon fontSize="small" />
            </Box>
          </Card>

          {/* Boutons d'action */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <IconButton
              onClick={handleRefuse}
              aria-label="Refuser"
              sx={{
                bgcolor: "background.paper",
                color: "error.main",
                border: 2,
                borderColor: "error.main",
                width: 64,
                height: 64,
                boxShadow: 2,
                "&:hover": { bgcolor: "error.main", color: "#fff" },
              }}
            >
              <CloseIcon sx={{ fontSize: 32 }} />
            </IconButton>

            <IconButton
              onClick={handleSkip}
              aria-label="Passer"
              sx={{
                bgcolor: "grey.400",
                color: "#fff",
                width: 48,
                height: 48,
                boxShadow: 1,
                "&:hover": { bgcolor: "grey.500" },
              }}
            >
              <HistoryIcon />
            </IconButton>

            <IconButton
              onClick={handleFavorite}
              aria-label="Mettre en favoris"
              sx={{
                bgcolor: "success.main",
                color: "#fff",
                width: 64,
                height: 64,
                boxShadow: 2,
                "&:hover": { bgcolor: "success.dark" },
              }}
            >
              <FavoriteIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </Box>
        </>
      ) : (
        <Typography variant="h6" color="text.secondary" align="center">
          Plus de prénoms pour le moment 🦊
        </Typography>
      )}

      {/* Célébration d'un match */}
      <Dialog
        open={matchName !== null}
        onClose={() => setMatchName(null)}
        slotProps={{ paper: { sx: { borderRadius: 4, textAlign: "center" } } }}
      >
        <DialogContent sx={{ px: 4, pt: 4 }}>
          <Typography sx={{ fontSize: 56, lineHeight: 1 }}>🎉</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
            C'est un match !
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Vous avez tous les deux aimé{" "}
            <strong>{matchName}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button variant="contained" onClick={() => setMatchName(null)}>
            Continuer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SwipePage;
