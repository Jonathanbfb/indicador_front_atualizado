import { Theme } from "@mui/material/styles";

const styles = (theme: Theme) => ({
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    margin: "20px",
    padding: "16px",
    [theme.breakpoints.down("sm")]: {
      margin: "10px",
      padding: "8px",
    },
  },
  nivel: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap" as const,
    margin: "10px 0",
    gap: "16px",
    [theme.breakpoints.down("md")]: {
      gap: "12px",
    },
  },
  botao: {
    backgroundColor: "blue", // Cor de fundo azul
    color: "white", // Cor do texto branca
    border: "none",
    width: "300px",
    height: "150px",
    margin: "5px",
    borderRadius: "8px",
    fontSize: "16px", // Tamanho inicial da fonte
    fontWeight: "bold", // Texto em negrito
    cursor: "pointer",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center", // Centraliza o texto no botão
    transition: "all 0.3s ease", // Animações suaves
    "&:hover": {
      backgroundColor: "#003d99", // Azul mais escuro no hover
    },
    [theme.breakpoints.down("md")]: {
      width: "250px", // Tamanho reduzido em telas médias
      height: "120px",
      fontSize: "14px", // Fonte menor
    },
    [theme.breakpoints.down("sm")]: {
      width: "200px", // Botões menores em telas pequenas
      height: "100px",
      fontSize: "12px", // Fonte ainda menor
    },
  },
  h2: {
    margin: "0",
    color: "red",
    fontSize: "20px",
    textAlign: "center",
    [theme.breakpoints.down("sm")]: {
      fontSize: "16px",
    },
  },
});

export default styles;
