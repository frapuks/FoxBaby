import { Box, Card, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import WcIcon from "@mui/icons-material/Wc";
import type { SvgIconComponent } from "@mui/icons-material";

export type GenderChoice = "boy" | "girl" | "both";

const OPTIONS: { value: GenderChoice; label: string; icon: SvgIconComponent }[] =
  [
    { value: "boy", label: "Garçon", icon: MaleIcon },
    { value: "girl", label: "Fille", icon: FemaleIcon },
    { value: "both", label: "Les 2", icon: WcIcon },
  ];

type GenderFilterButtonsProps = {
  value: GenderChoice;
  onChange: (value: GenderChoice) => void;
};

const GenderFilterButtons = ({ value, onChange }: GenderFilterButtonsProps) => (
  <Box sx={{ display: "flex", gap: 1.5 }}>
    {OPTIONS.map(({ value: optValue, label, icon: Icon }) => {
      const selected = value === optValue;
      return (
        <Card
          key={optValue}
          variant="outlined"
          onClick={() => onChange(optValue)}
          sx={{
            flex: 1,
            aspectRatio: "1 / 1",
            borderRadius: 3,
            borderWidth: 2,
            borderColor: selected ? "primary.main" : "divider",
            bgcolor: selected
              ? (theme) => alpha(theme.palette.primary.main, 0.08)
              : "background.paper",
            color: selected ? "primary.main" : "text.secondary",
            boxShadow: selected ? 2 : 0,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            transition: "all 0.15s",
          }}
        >
          <Icon sx={{ fontSize: 32 }} />
          <Typography
            variant="body2"
            sx={{ fontWeight: selected ? 700 : 500 }}
          >
            {label}
          </Typography>
        </Card>
      );
    })}
  </Box>
);

export default GenderFilterButtons;
