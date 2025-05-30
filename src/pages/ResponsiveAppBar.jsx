import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import fieam from "../assets/fieam.png";

function ResponsiveAppBar() {
  const [anchorElUser, setAnchorElUser] = React.useState(null);
  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const nomeUsuario = usuario?.nome ?? 'Usuário';

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: '100%',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: "#fff"
      }}
    >
      <Toolbar
        sx={{
          px: 4,
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%'
        }}
      >
        {/* Logo FIEAM */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button component={RouterLink} to="/menu" sx={{ p: 0 }}>
            <img src={fieam} alt="Logo FIEAM" style={{ maxWidth: "60px", height: "auto" }} />
          </Button>
         
        </Box>
        <Typography
        variant="h4"
        gutterBottom
        sx={{ textAlign: 'center', fontWeight: 'bold', color: '#1976d2' }}
      >
        DIRETORIA CORPORATIVA DE MARKETING
      </Typography>

        {/* Nome do usuário com botão dropdown */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Opções do usuário">
            <Button
              onClick={handleOpenUserMenu}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'gray',
                fontWeight: 'bold',
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                py: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                },
                border: '1px solid rgba(92, 85, 85, 0.3)',
              }}
            >
              {nomeUsuario}
              <ArrowDropDownIcon sx={{ color: 'black' }} />
            </Button>
          </Tooltip>
          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1,
                minWidth: 160,
                borderRadius: 2
              }
            }}
          >
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body1">Sair</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
export default ResponsiveAppBar;
