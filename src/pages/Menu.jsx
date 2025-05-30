import React, { useEffect, useState } from 'react';
import {
  Box, Drawer, List, ListItemIcon, ListItemText, Toolbar, CssBaseline, Typography, Grid, Paper
} from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import {
  PersonAdd as PersonAddIcon,
  Domain as DomainIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
  Update as UpdateIcon,
  CalendarMonth as CalendarMonthIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ResponsiveAppBar from './ResponsiveAppBar';
import Sidebar from '../pages/setores/Sidebar';
import api from '../services/api';

const drawerWidth = 240;
const MotionListItem = motion(Box);


const BotaoMenu = ({ to, icon, label, location }) => (
  <MotionListItem
    component={RouterLink}
    to={to}
    whileHover={{ scale: 1.05 }}
    sx={{
      display: 'flex',
      alignItems: 'center',
      py: 1.2,
      px: 2,
      mx: 1,
      my: 1,
      borderRadius: 2,
      color: 'white',
      textDecoration: 'none',
      backgroundColor: location.pathname === to ? '#1565c0' : 'transparent',
      boxShadow: location.pathname === to ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: '#1565c0',
      }
    }}
  >
    <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>{icon}</ListItemIcon>
    <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 500 }} />
  </MotionListItem>
);

const LayoutBase = () => {
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const perfil = usuario?.perfil;
  const isAdmin = perfil === 'Administrador';
  const isLider = perfil === 'Lideres';
  const isEditor = perfil === 'Usuario_Editor';
  const isViewer = perfil === 'Usuario_Visualizacao';
  const isMenuPage = location.pathname === '/menu';
  const [setores, setSetores] = useState([]);
  const token = localStorage.getItem('token')

  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const response = await api.get('/setores', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setSetores(response.data);

      } catch (error) {
        console.error('Erro ao buscar setores:', error);
      }
    };

    fetchSetores();
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <CssBaseline />

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#1976d2',
            color: 'white',
            pt: 1
          }
        }}
      >
        <Toolbar />
        <List>
          <BotaoMenu to="/menu" icon={<HomeIcon />} label="Menu Principal" location={location} />

          {isAdmin && (
            <BotaoMenu to="/usuarios" icon={<PersonAddIcon />} label="Cadastrar Usuário" location={location} />
          )}

          {(isAdmin) && (
            <BotaoMenu to="/setores" icon={<DomainIcon />} label="Cadastrar Setor" location={location} />
          )}

          {(isAdmin) && (
            <BotaoMenu to="/itens" icon={<InventoryIcon />} label="Cadastrar Indicadores" location={location} />
          )}

          {(isAdmin || isEditor) && (
            <BotaoMenu to="/atualizar" icon={<UpdateIcon />} label="Atualizar Indicadores" location={location} />
          )}

          {(isAdmin || isEditor || isLider) && (
            <BotaoMenu to="/dias-uteis" icon={<CalendarMonthIcon />} label="Dias Úteis por Setor" location={location} />
          )}
        </List>
      </Drawer>


      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', overflow: 'hidden' }}>
        <Box sx={{ flexShrink: 0, bgcolor: '#1976d2', px: 2 }}>
          <Box sx={{ backgroundColor: 'white', borderRadius: 2, px: 2, py: 1, display: 'inline-block', mt: 1, mb: 1 }}>
            <ResponsiveAppBar />
          </Box>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
          <Toolbar />
          {isMenuPage ? (
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, marginLeft: '135px' }}>
              {/* Cards (lado esquerdo) */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ textAlign: 'center', fontWeight: 'bold', color: '#1976d2', marginBottom: '60px' }}
                >
                  PAINEL DE INDICADORES
                </Typography>

                <Grid container spacing={3} justifyContent="center">
                  {setores
                  .filter(({ nome }) => nome !== "Setor Padrão")
                  .map(({ nome, id, slug }) => (
                    <Grid item xs={12} sm={6} md={3} key={id}>
                      <motion.div whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.3 }} style={{ height: '100%' }}>
                        <Paper
                          component={RouterLink}
                          to={`/setor/${slug}`}
                          state={{ setorId: id }}
                          elevation={4}
                          sx={{
                            height: '100%',
                            p: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: 3,
                            textDecoration: 'none',
                            background: 'linear-gradient(to bottom, #e3f2fd, #ffffff)',
                            color: '#0d47a1',
                            transition: 'all 0.3s ease-in-out',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            '&:hover': {
                              background: '#bbdefb',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                              color: '#002171',
                            }
                          }}
                        >
                          <Typography variant="h6" fontWeight="bold" align="center">{nome}</Typography>
                          <Typography variant="body2" color="text.secondary" align="center" mt={1}>
                            Ver Indicadores
                          </Typography>
                        </Paper>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Sidebar (lado direito) */}
              <Box sx={{ width: 300, flexShrink: 0 }}>
                <Sidebar />
              </Box>
            </Box>

          ) : (
            <Outlet />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default LayoutBase;
