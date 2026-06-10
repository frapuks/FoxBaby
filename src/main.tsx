import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "@fontsource/quicksand/300.css";
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/500.css";
import "@fontsource/quicksand/700.css";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";

const theme = createTheme({
  palette: {
    primary: { main: "#f97316" },
    background: {
      default: "#fff7f1", // fond très légèrement orangé
      paper: "#ffffff", // les cartes restent blanches
    },
  },
  typography: {
    fontFamily: '"Quicksand", system-ui, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
