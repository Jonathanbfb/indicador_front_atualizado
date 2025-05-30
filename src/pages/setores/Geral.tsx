import React from "react";
import Comercial from "./Comercial";
import { Typography } from "@mui/material";

const Geral: React.FC = () => {
  return (
    <div>
      <Typography
        variant="h4"
        gutterBottom
        marginTop="20px"
        style={{ textAlign: "center" }}
      >
        VISÃO GERAL
      </Typography>

      <Comercial setorId={5} />

    </div>
  );
};

export default Geral;
