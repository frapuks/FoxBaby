import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import StyleIcon from "@mui/icons-material/Style";
import StyleOutlinedIcon from "@mui/icons-material/StyleOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PeopleIcon from "@mui/icons-material/People";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import PersonIcon from "@mui/icons-material/Person";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export type Tab = "swipe" | "favorites" | "couple" | "profile";

type BottomNavProps = {
  value: Tab;
  onChange: (tab: Tab) => void;
};

type NavItem = {
  value: Tab;
  Outlined: SvgIconComponent;
  Filled: SvgIconComponent;
};

const ITEMS: NavItem[] = [
  { value: "swipe", Outlined: StyleOutlinedIcon, Filled: StyleIcon },
  { value: "favorites", Outlined: FavoriteBorderIcon, Filled: FavoriteIcon },
  { value: "couple", Outlined: PeopleOutlinedIcon, Filled: PeopleIcon },
  { value: "profile", Outlined: PersonOutlinedIcon, Filled: PersonIcon },
];

const NavIcon = ({ item, active }: { item: NavItem; active: boolean }) => {
  const Icon = active ? item.Filled : item.Outlined;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: "50%",
        bgcolor: active
          ? (theme) => alpha(theme.palette.primary.main, 0.15)
          : "transparent",
        transition: "background-color 0.2s",
      }}
    >
      <Icon color={active ? "primary" : "action"} />
    </Box>
  );
};

const BottomNav = ({ value, onChange }: BottomNavProps) => {
  return (
    <Paper
      elevation={3}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: "hidden",
        // Espace vide sous les icônes : zone sûre (barre d'accueil mobile) + marge,
        // pour que les boutons ne soient pas collés au bord bas.
        pb: "calc(env(safe-area-inset-bottom) + 16px)",
      }}
    >
      <BottomNavigation
        value={value}
        onChange={(_, newValue: Tab) => onChange(newValue)}
        sx={{ bgcolor: "transparent" }}
      >
        {ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.value}
            value={item.value}
            icon={<NavIcon item={item} active={value === item.value} />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
