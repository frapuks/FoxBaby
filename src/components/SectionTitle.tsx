import { Box, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { ReactNode } from "react";

type SectionTitleProps = {
  icon: SvgIconComponent;
  children: ReactNode;
};

const SectionTitle = ({ icon: Icon, children }: SectionTitleProps) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
    <Icon color="primary" />
    <Typography variant="h6" sx={{ fontWeight: 700 }}>
      {children}
    </Typography>
  </Box>
);

export default SectionTitle;
