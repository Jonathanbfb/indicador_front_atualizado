import React from 'react';
import { Outlet } from 'react-router-dom';
import Menu from './Menu';

const LayoutComBarra = () => {
  return (
    <Menu>
      <Outlet />
    </Menu>
  );
};

export default LayoutComBarra;

