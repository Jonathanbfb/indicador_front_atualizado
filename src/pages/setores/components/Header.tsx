import React from "react";

type HeaderProps = {
  title: string;
};

const Header: React.FC<HeaderProps> = ({ title }) => (
  <h1 className="header-title">{title}</h1>
);

export default Header;