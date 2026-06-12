import { useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import { searchNames, type NameDoc } from "../services/names";
import { recordSwipe, type Swipe } from "../services/swipes";

type AddFavoriteDialogProps = {
  uid: string;
  existingFavoriteIds: Set<string>;
  onClose: () => void;
  onAdded: (swipe: Swipe) => void;
};

const AddFavoriteDialog = ({
  uid,
  existingFavoriteIds,
  onClose,
  onAdded,
}: AddFavoriteDialogProps) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<NameDoc[]>([]);
  const [searching, setSearching] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId = useRef(0);

  // Recherche débouncée, déclenchée depuis le champ (pas d'effet).
  const handleChange = (value: string) => {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const current = ++reqId.current;
    timer.current = setTimeout(() => {
      searchNames(q)
        .then((found) => {
          if (current === reqId.current) setResults(found);
        })
        .finally(() => {
          if (current === reqId.current) setSearching(false);
        });
    }, 250);
  };

  const handleAdd = (nameDoc: NameDoc) => {
    recordSwipe(uid, nameDoc, "favorite").catch((err) =>
      console.error("Échec de l'ajout du favori :", err),
    );
    setAdded((prev) => new Set(prev).add(nameDoc.id));
    onAdded({
      nameId: nameDoc.id,
      name: nameDoc.name,
      gender: nameDoc.gender,
      decision: "favorite",
    });
  };

  const isAdded = (id: string) => added.has(id) || existingFavoriteIds.has(id);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Ajouter un favori</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          placeholder="Rechercher un prénom…"
          value={term}
          onChange={(e) => handleChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mt: 1 }}
        />

        {searching ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} color="primary" />
          </Box>
        ) : term.trim() && results.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
            Aucun prénom trouvé.
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
            {results.map((n) => {
              const done = isAdded(n.id);
              return (
                <ListItem
                  key={n.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      color="success"
                      disabled={done}
                      onClick={() => handleAdd(n)}
                      aria-label={`Ajouter ${n.name}`}
                    >
                      {done ? <CheckIcon /> : <AddIcon />}
                    </IconButton>
                  }
                >
                  <ListItemText primary={n.name} />
                  <Chip
                    size="small"
                    label={n.gender === "boy" ? "Garçon" : "Fille"}
                    color={n.gender === "boy" ? "info" : "secondary"}
                    sx={{ mr: 1 }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddFavoriteDialog;
