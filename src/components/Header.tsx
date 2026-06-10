import { AppBar, Toolbar, Typography } from "@mui/material";

const Header = () => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: "background.default",
        backgroundImage: "none",
        boxShadow: "none",
        borderBottom: "none",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <Typography sx={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
          🦊
        </Typography>
        <Typography
          variant="h6"
          component="h1"
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          FoxBaby
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
