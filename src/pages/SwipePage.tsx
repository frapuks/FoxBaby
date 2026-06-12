import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
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
import { createNamePager } from "../services/names";
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

// Pagination : on recharge la file dès qu'elle passe sous REFILL_AT, en visant
// au moins PAGE_FETCH nouveaux prénoms (non encore tranchés) par recharge.
const REFILL_AT = 8;
const PAGE_FETCH = 12;

const SwipePage = () => {
  const { user } = useAuth();
  const { genderFilter } = usePreferences();

  const [partnerFavIds, setPartnerFavIds] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<NameDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [matchName, setMatchName] = useState<string | null>(null);
  const [userDataVersion, setUserDataVersion] = useState(0);

  // Prénoms déjà tranchés (chargés une fois) — en ref pour le filtrage async.
  const swipedRef = useRef<Set<string>>(new Set());
  const pagerRef = useRef<ReturnType<typeof createNamePager> | null>(null);
  const doneRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const userReadyRef = useRef(false);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animate, setAnimate] = useState(true);
  const startX = useRef(0);

  // Charge une page de prénoms et l'ajoute à la file (en sautant ceux déjà
  // tranchés). On enchaîne les pages jusqu'à PAGE_FETCH nouveaux, ou la fin.
  const loadMore = useCallback(async () => {
    const pager = pagerRef.current;
    if (!pager || doneRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const fresh: NameDoc[] = [];
      let finished = false;
      while (fresh.length < PAGE_FETCH && !finished) {
        const { names, done } = await pager.next();
        // Le filtre de genre a changé pendant le chargement : on abandonne
        // pour ne pas polluer la nouvelle file avec l'ancien pager.
        if (pagerRef.current !== pager) return;
        finished = done;
        for (const n of names) {
          if (!swipedRef.current.has(n.id)) fresh.push(n);
        }
      }
      if (pagerRef.current !== pager) return;
      if (finished) doneRef.current = true;
      if (fresh.length) setQueue((q) => [...q, ...fresh]);
      if (finished) setExhausted(true);
    } finally {
      loadingMoreRef.current = false;
    }
  }, []);

  // Données propres à l'utilisateur (prénoms déjà tranchés + favoris du
  // partenaire pour les matchs) : chargées une seule fois par utilisateur.
  useEffect(() => {
    if (!user) return;
    userReadyRef.current = false;
    let cancelled = false;
    const loadPartnerFavs = async () => {
      // Pas besoin de réconcilier le statut de liaison ici (fait sur les
      // écrans couple/profil) : on veut juste l'uid du partenaire.
      const couple = await getMyCouple(user.uid, undefined, {
        reconcile: false,
      }).catch(() => null);
      const partnerUid = couple?.members.find((m) => m !== user.uid);
      if (!partnerUid) return new Set<string>();
      const favs = await fetchFavorites(partnerUid).catch(() => []);
      return new Set(favs.map((f) => f.nameId));
    };
    (async () => {
      const [swiped, partnerFavs] = await Promise.all([
        fetchSwipedIds(user.uid).catch(() => new Set<string>()),
        loadPartnerFavs(),
      ]);
      if (cancelled) return;
      swipedRef.current = swiped;
      setPartnerFavIds(partnerFavs);
      userReadyRef.current = true;
      setUserDataVersion((v) => v + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // (Re)crée le pager et remplit la file initiale, à chaque changement de
  // filtre de genre (ou une fois les données utilisateur prêtes).
  useEffect(() => {
    if (!userReadyRef.current) return;
    let cancelled = false;
    setLoading(true);
    setExhausted(false);
    doneRef.current = false;
    pagerRef.current = createNamePager(genderFilter);
    setQueue([]);
    (async () => {
      await loadMore();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [genderFilter, userDataVersion, loadMore]);

  // Recharge dès que la file se vide (swipes / skips).
  useEffect(() => {
    if (loading || doneRef.current) return;
    if (queue.length < REFILL_AT) loadMore();
  }, [queue.length, loading, loadMore]);

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
      swipedRef.current.add(name.id);
      setQueue((q) => q.slice(1)); // retire la carte courante de la file
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
      ) : exhausted ? (
        <Typography variant="h6" color="text.secondary" align="center">
          Plus de prénoms pour le moment 🦊
        </Typography>
      ) : (
        <CircularProgress color="primary" />
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
