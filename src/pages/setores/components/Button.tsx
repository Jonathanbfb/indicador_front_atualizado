import React from "react";
import { Button as MuiButton, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

type ButtonProps = {
  labelHeading: string;
  labelSubheading: string;
  onClick: () => void;
};

const Button: React.FC<ButtonProps> = ({ labelHeading, labelSubheading, onClick }) => {
  const theme = useTheme();

  return (
    <MuiButton
      onClick={onClick}
      sx={{
        backgroundColor: "blue",
        color: "white",
        width: "250px", // Tamanho fixo ajustado para manter uniformidade
        height: "150px",
        margin: "5px",
        borderRadius: "8px",
        fontSize: "14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        transition: "background-color 0.3s ease",
        "&:hover": {
          backgroundColor: "#003d99",
        },
        [theme.breakpoints.down("md")]: {
          width: "200px",
          height: "120px",
        },
        [theme.breakpoints.down("sm")]: {
          width: "180px",
          height: "100px",
          fontSize: "12px",
        },
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <h3 style={{ fontWeight: "bold", margin: "5px 0", fontSize: "16px" }}>
          {labelHeading}
        </h3>
        <h4 style={{ fontWeight: "normal", margin: "5px 0", fontSize: "12px" }}>
          {labelSubheading}
        </h4>
      </Box>
    </MuiButton>
  );
};

export default Button;
