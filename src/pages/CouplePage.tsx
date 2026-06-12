import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Avatar } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useAuth } from "../auth/AuthContext";
import PartnerLinkCard from "../components/PartnerLinkCard";
import GenderFilterButtons from "../components/GenderFilterButtons";
import SectionTitle from "../components/SectionTitle";
import { getMyCouple, linkWithCode, type Couple } from "../services/couple";
import { fetchFavorites, type Swipe } from "../services/swipes";
import type { Gender } from "../constants/names";

type Stats = { matches: number; mine: number; partner: number };
type Filter = Gender | "both";
type CoupleData = { couple: Couple | null; matches: Swipe[]; stats: Stats };

const Stat = ({ value, label }: { value: number; label: string }) => (
  <Box sx={{ flex: 1, textAlign: "center" }}>
    <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Box>
);

const CouplePage = () => {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [stats, setStats] = useState<Stats>({ matches: 0, mine: 0, partner: 0 });
  const [matches, setMatches] = useState<Swipe[]>([]);
  const [filter, setFilter] = useState<Filter>("both");
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupère couple + favoris + matchs, sans toucher au state (réutilisable).
  const fetchData = useCallback(async (): Promise<CoupleData | null> => {
    if (!user) return null;
    const selfName =
      user.displayName || user.email?.split("@")[0] || "Parent";
    const c = await getMyCouple(user.uid, selfName).catch(() => null);

    const mine = await fetchFavorites(user.uid).catch(() => []);
    const partnerUid = c?.members.find((m) => m !== user.uid);
    const partnerFavs = partnerUid
      ? await fetchFavorites(partnerUid).catch(() => [])
      : [];

    const mineIds = new Set(mine.map((f) => f.nameId));
    const matched = partnerFavs
      .filter((f) => mineIds.has(f.nameId))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return {
      couple: c,
      matches: matched,
      stats: {
        matches: matched.length,
        mine: mine.length,
        partner: partnerFavs.length,
      },
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetchData()
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setCouple(data.couple);
          setMatches(data.matches);
          setStats(data.stats);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLinking(true);
    try {
      await linkWithCode(user, code);
      setCode("");
      setLoading(true);
      const data = await fetchData();
      if (data) {
        setCouple(data.couple);
        setMatches(data.matches);
        setStats(data.stats);
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Stats du couple */}
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            align="center"
            sx={{ mb: 2 }}
          >
            Stats du couple
          </Typography>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
              <CircularProgress color="primary" size={28} />
            </Box>
          ) : (
            <Box sx={{ display: "flex" }}>
              <Stat value={stats.matches} label="Matchs" />
              <Divider orientation="vertical" flexItem />
              <Stat value={stats.mine} label="Moi" />
              <Divider orientation="vertical" flexItem />
              <Stat value={stats.partner} label="Partenaire" />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Liste des matchs (si lié) — hors d'une carte */}
      {!loading && couple && (
        <Box>
          <SectionTitle icon={FavoriteIcon}>Vos matchs</SectionTitle>

          <Box sx={{ mb: 1 }}>
            <GenderFilterButtons value={filter} onChange={setFilter} />
          </Box>

          {(() => {
            const filtered = matches.filter(
              (m) => filter === "both" || m.gender === filter,
            );
            if (filtered.length === 0) {
              return (
                <Typography
                  color="text.secondary"
                  align="center"
                  sx={{ mt: 2 }}
                >
                  Aucun match pour le moment.
                </Typography>
              );
            }
            return (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {filtered.map((m) => (
                  <Card
                    key={m.nameId}
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1.5,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor:
                          m.gender === "boy" ? "info.main" : "secondary.main",
                      }}
                    >
                      <FavoriteIcon />
                    </Avatar>
                    <Typography sx={{ flex: 1, fontWeight: 500 }}>
                      {m.name}
                    </Typography>
                  </Card>
                ))}
              </Stack>
            );
          })()}
        </Box>
      )}

      {/* Liaison du partenaire (si pas encore lié) */}
      {!loading && !couple && (
        <>
          <Typography variant="body2" color="text.secondary">
            Reliez votre compte à celui de votre partenaire pour voir vos matchs.
          </Typography>

          <PartnerLinkCard />

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Entrer le code de votre partenaire
              </Typography>
              <Stack
                component="form"
                onSubmit={handleLink}
                spacing={2}
                sx={{ mt: 1.5 }}
              >
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      maxLength: 6,
                      style: {
                        textTransform: "uppercase",
                        letterSpacing: 6,
                        textAlign: "center",
                        fontWeight: 700,
                      },
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={linking || code.trim().length === 0}
                >
                  Lier les comptes
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default CouplePage;
