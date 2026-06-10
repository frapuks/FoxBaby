import { useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import BottomNav, { type Tab } from "./components/BottomNav";
import Header from "./components/Header";
import LoginPage from "./pages/LoginPage";
import SwipePage from "./pages/SwipePage";
import FavoritesPage from "./pages/FavoritesPage";
import CouplePage from "./pages/CouplePage";
import ProfilePage from "./pages/ProfilePage";
import { useAuth } from "./auth/AuthContext";

const App = () => {
  const [tab, setTab] = useState<Tab>("swipe");
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Header />
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          // Réserve l'espace de la navbar fixe (56px) + marge + zone sûre iOS
          pb: "calc(56px + 24px + env(safe-area-inset-bottom))",
        }}
      >
        {tab === "swipe" && <SwipePage />}
        {tab === "favorites" && <FavoritesPage />}
        {tab === "couple" && <CouplePage />}
        {tab === "profile" && <ProfilePage />}
      </Box>
      <BottomNav value={tab} onChange={setTab} />
    </Box>
  );
};

export default App;
