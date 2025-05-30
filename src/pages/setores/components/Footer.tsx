import footerLogo from "../../../assets/footer_logo.svg";

const Footer: React.FC = () => (
  <footer style={{ textAlign: "center", marginTop: "20px" }}>
    <img
      src={footerLogo} 
      alt="Rodapé"
      style={{ width: "500px", height: "auto", marginTop: "10px" }}
    />
  </footer>
);

export default Footer;

