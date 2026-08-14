import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid2 as Grid, Paper, Avatar, useMediaQuery } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  NorthEast as ArrowIcon,
  Handshake as ComercialIcon,
  Palette as DesignIcon,
  Campaign as PropagandaIcon,
  SupportAgent as ContactIcon,
  Share as RedesSociaisIcon,
  TrendingUp as MarketingIcon,
  AdminPanelSettings as AdministrativoIcon,
  Insights as InteligenciaIcon,
  Dashboard as PanoramaIcon,
  Construction as ConstrucaoIcon,
  HealthAndSafety as SaudeIcon,
  School as EducacaoIcon,
  Groups as RHIcon,
  AccountBalance as FinanceiroIcon,
  Gavel as JuridicoIcon,
  Engineering as TecnologiaIcon,
  Category as DefaultIcon,
} from '@mui/icons-material';
import api from '../services/api';

const ICONES_SETOR = {
  'comercial':                         <ComercialIcon />,
  'design':                            <DesignIcon />,
  'promoções e propaganda':            <PropagandaIcon />,
  'promocoes e propaganda':            <PropagandaIcon />,
  'contact center':                    <ContactIcon />,
  'redes sociais':                     <RedesSociaisIcon />,
  'marketing':                         <MarketingIcon />,
  'administrativo':                    <AdministrativoIcon />,
  'back office':                       <AdministrativoIcon />,
  'inteligência e pesquisa de mercado':<InteligenciaIcon />,
  'inteligencia e pesquisa de mercado':<InteligenciaIcon />,
  'panorama geral':                    <PanoramaIcon />,
  'construção':                        <ConstrucaoIcon />,
  'construcao':                        <ConstrucaoIcon />,
  'saúde':                             <SaudeIcon />,
  'saude':                             <SaudeIcon />,
  'educação':                          <EducacaoIcon />,
  'educacao':                          <EducacaoIcon />,
  'recursos humanos':                  <RHIcon />,
  'rh':                                <RHIcon />,
  'financeiro':                        <FinanceiroIcon />,
  'jurídico':                          <JuridicoIcon />,
  'juridico':                          <JuridicoIcon />,
  'tecnologia':                        <TecnologiaIcon />,
  'ti':                                <TecnologiaIcon />,
};

function getIconeSetor(nome) {
  const chave = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  for (const [key, icon] of Object.entries(ICONES_SETOR)) {
    const keyNorm = key.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (chave.includes(keyNorm)) return icon;
  }
  return <DefaultIcon />;
}

const SetorCard = ({ nome, slug, id }) => {
  const icone = getIconeSetor(nome);
  const isPanorama = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('panorama geral');
  const linkTo = isPanorama ? '/setor/Geral' : `/setor/${slug}`;

  return (
    <Paper
      component={RouterLink}
      to={linkTo}
      state={{ setorId: id }}
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        borderRadius: 3,
        textDecoration: 'none',
        background: '#ffffff',
        border: '1px solid #e8edf5',
        boxShadow: '0 2px 8px rgba(13, 71, 161, 0.06)',
        transition: 'all 0.2s ease-in-out',
        minHeight: 140,
        '&:hover': {
          boxShadow: '0 8px 24px rgba(13, 71, 161, 0.14)',
          transform: 'translateY(-2px)',
          borderColor: '#c5d8f5',
        },
      }}
    >
      {/* Círculo decorativo de fundo */}
      <Box
        sx={{
          position: 'absolute',
          top: -24,
          right: -24,
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: 'rgba(25, 118, 210, 0.07)',
          pointerEvents: 'none',
        }}
      />

      <Avatar
        sx={{
          width: 42,
          height: 42,
          background: 'linear-gradient(135deg, #1565c0, #1976d2)',
          boxShadow: '0 4px 12px rgba(21, 101, 192, 0.3)',
          '& svg': { fontSize: 22 },
        }}
      >
        {icone}
      </Avatar>

      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 15,
          color: '#1a2744',
          lineHeight: 1.3,
          flexGrow: 1,
        }}
      >
        {nome}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ fontSize: 13, color: '#6b7280' }}>
          Ver indicadores
        </Typography>
        <ArrowIcon sx={{ fontSize: 14, color: '#1976d2' }} />
      </Box>
    </Paper>
  );
};

const ResumoPanel = ({ itens, ano, dataAtualizacao }) => (
  <Box
    sx={{
      width: 230,
      flexShrink: 0,
      border: '1px solid #e8edf5',
      borderRadius: 3,
      p: 2.5,
      background: '#ffffff',
      boxShadow: '0 2px 8px rgba(13, 71, 161, 0.06)',
      alignSelf: 'flex-start',
    }}
  >
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        color: '#1976d2',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        mb: 2,
      }}
    >
      Resumo {ano}
    </Typography>

    {itens.length === 0 ? (
      <Typography sx={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', py: 3 }}>
        Nenhum indicador resumido cadastrado.
      </Typography>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {itens.map((item) => (
          <Box key={item.id} sx={{ borderBottom: '1px solid #f0f4f8', pb: 1.5, '&:last-child': { borderBottom: 'none', pb: 0 } }}>
            <Typography sx={{ fontSize: 12, color: '#6b7280', lineHeight: 1.3 }}>
              {item.titulo}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1976d2', mt: 0.25 }}>
              {item.valor}
            </Typography>
          </Box>
        ))}
      </Box>
    )}

    {dataAtualizacao && (
      <Typography sx={{ fontSize: 11, color: '#9ca3af', mt: 2, borderTop: '1px solid #f0f4f8', pt: 1.5 }}>
        Atualizado em {dataAtualizacao}
      </Typography>
    )}
  </Box>
);

const STORAGE_KEY = 'resumo_anual';
const STORAGE_KEY_TS = 'resumo_anual_updated';

const RESUMO_PADRAO = [
  { id: 'p1', titulo: 'Nº de clientes Industrial', valor: '2.112', ano: String(new Date().getFullYear()) },
  { id: 'p2', titulo: 'Clientes visitados',        valor: '593',   ano: String(new Date().getFullYear()) },
  { id: 'p3', titulo: 'Propostas Apresentadas',    valor: '855',   ano: String(new Date().getFullYear()) },
  { id: 'p4', titulo: 'Produtos existentes',       valor: '1.052', ano: String(new Date().getFullYear()) },
  { id: 'p5', titulo: 'Propostas Faturadas',       valor: '236',   ano: String(new Date().getFullYear()) },
];

const lerResumo = (ano) => {
  try {
    const todos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const doAno = todos.filter(i => String(i.ano) === String(ano));
    return doAno.length > 0 ? doAno : RESUMO_PADRAO.filter(i => String(i.ano) === String(ano));
  } catch {
    return RESUMO_PADRAO;
  }
};

const lerDataAtualizacao = () => {
  try {
    const ts = localStorage.getItem(STORAGE_KEY_TS);
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return null;
  }
};

const Menu = () => {
  const [setores, setSetores] = useState([]);
  const anoAtual = new Date().getFullYear();
  const [resumoItens, setResumoItens] = useState(() => lerResumo(anoAtual));
  const [dataAtualizacao, setDataAtualizacao] = useState(() => lerDataAtualizacao());
  const isMobile = useMediaQuery('(max-width:768px)');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const response = await api.get('/setores', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSetores(response.data);
      } catch (error) {
        console.error('Erro ao buscar setores:', error);
      }
    };

    fetchSetores();

    // Escuta atualizações feitas pela página de Resumo Anual
    const onResumoAtualizado = () => {
      setResumoItens(lerResumo(anoAtual));
      setDataAtualizacao(lerDataAtualizacao());
    };
    window.addEventListener('resumo-atualizado', onResumoAtualizado);
    return () => window.removeEventListener('resumo-atualizado', onResumoAtualizado);
  }, [token]);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: '#1976d2',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            mb: 0.5,
          }}
        >
          Painel
        </Typography>

        <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#1a2744', mb: 0.5 }}>
          Indicadores Corporativos
        </Typography>

        <Typography sx={{ fontSize: 14, color: '#6b7280' }}>
          Selecione um setor para visualizar os indicadores detalhados.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Grid container spacing={2}>
            {setores
              .filter(({ nome, oculto }) => nome !== 'Setor Padrão' && nome.toUpperCase() !== 'INATIVO' && !oculto)
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
              .map(({ nome, id, slug }) => (
                <Grid key={id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <SetorCard nome={nome} slug={slug} id={id} />
                </Grid>
              ))}
          </Grid>
        </Box>

        {!isMobile && <ResumoPanel itens={resumoItens} ano={anoAtual} dataAtualizacao={dataAtualizacao} />}
      </Box>
    </Box>
  );
};

export default Menu;
