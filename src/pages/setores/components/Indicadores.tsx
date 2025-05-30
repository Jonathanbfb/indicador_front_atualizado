import React from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Box } from "@mui/material";
import Header from "./Header";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import Button from "./Button";

const Indicadores: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row", minHeight: "100vh" }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, padding: "16px", textAlign: "center" }}>
        <Header title="DIRETORIA CORPORATIVA DE MARKETING" />
        <h2 style={{ textAlign: "center", margin: "16px 0", fontSize: "20px" }}>
          PAINEL DE INDICADORES
        </h2>

        {/* Grid Container */}
        <Grid
          container
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ marginTop: "16px" }}
        >
          {/* Nível 1 - 1 botão (centralizado) */}
          <Grid item xs={12} sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              labelHeading="Diretoria de Marketing"
              labelSubheading="Diretor: Paulo Pereira"
              onClick={() => handleNavigate("/setor/Geral")}
            />
          </Grid>

          {/* Nível 2 - 4 botões (centralizados com espaçamento) */}
          {[
            { heading: "Setor Comercial", subheading: "Supervisora: Adriana Dabela", path: "/setor/Comercial" },
            { heading: "Setor Contact Center", subheading: "Supervisora: Ariana Costa", path: "/setor/CallCenter" },
            { heading: "Setor de Marketing", subheading: "Supervisora: Renata Nascimento", path: "/setor/Marketing" },
            { heading: "Setor de Design", subheading: "Supervisora: Mary Martins", path: "/setor/Design" },
          ].map(({ heading, subheading, path }, index) => (
            <Grid item xs={12} sm={6} md={3} key={index} sx={{ display: "flex", justifyContent: "center" }}>
              <Button labelHeading={heading} labelSubheading={subheading} onClick={() => handleNavigate(path)} />
            </Grid>
          ))}

          {/* Nível 3 - 5 botões (centralizados com espaçamento e tamanho ajustado) */}
          {[
            { heading: "Setor Administrativo", subheading: "Coordenadora: Edivalda Martins", path: "/setor/Administracao" },
           // { heading: "Setor Pesquisa de Mercado", subheading: "", path: "/setor/Pesquisa" },
            { heading: "Setor Redes Sociais", subheading: "Coordenador: Diego Nobre", path: "/setor/RedesSociais" },
            { heading: "Setor Pesquisa & Inteligência de Mercado", subheading: "Coordenadora: Lidiane Laborda", path: "/setor/Mercado" },
            { heading: "Setor Promoções e Propaganda", subheading: "Coordenadora: Etienne Lopes", path: "/setor/Promocoes" },
          ].map(({ heading, subheading, path }, index) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={3} // Ajuste para usar mais espaço horizontalmente
              key={index}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <Button labelHeading={heading} labelSubheading={subheading} onClick={() => handleNavigate(path)} />
            </Grid>
          ))}
        </Grid>

        <Footer />
      </Box>
    </Box>
  );
};

export default Indicadores;
