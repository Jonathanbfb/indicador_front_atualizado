import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, MenuItem, Paper,
  IconButton, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, FormControlLabel, Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as MigrarIcon,
  BarChart as PanoramaOnIcon,
  BarChartOutlined as PanoramaOffIcon,
  OpenInNew as AbrirIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const FORMATOS = [
  { value: 'numero',      label: 'Número' },
  { value: 'horas',       label: 'Horas' },
  { value: 'moeda',       label: 'Moeda (R$)' },
  { value: 'tempo',       label: 'Tempo (texto)' },
  { value: 'porcentagem', label: 'Porcentagem (%)' },
];


function deriveFormato(item) {
  if (item.formato) return item.formato;
  if (item.moeda)   return 'moeda';
  return 'numero';
}

function formatoLabel(fmt) {
  return FORMATOS.find(f => f.value === fmt)?.label || fmt;
}

const labelStyle = { fontSize: 13, fontWeight: 500, color: '#374151', mb: 0.5 };
const inputSx   = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

const CadastroItem = () => {
  const token       = localStorage.getItem('token');
  const currentYear = new Date().getFullYear();
  const usuario     = JSON.parse(localStorage.getItem('usuario') || '{}');
  const isAdmin     = usuario?.perfil === 'Administrador';
  const navigate    = useNavigate();

  const [setores,    setSetores]    = useState([]);
  const [itens,      setItens]      = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  const [setorId, setSetorId] = useState('');
  const [ano,     setAno]     = useState(String(currentYear));

  const [panoramaConfig,    setPanoramaConfig]    = useState({});
  const [loadingPanorama,   setLoadingPanorama]   = useState(false);
  const [ordensEditadas,    setOrdensEditadas]    = useState({});
  const [salvandoOrdem,     setSalvandoOrdem]     = useState(false);

  const INDICADORES_ESPECIAIS_COMERCIAL = [
    { nome: 'Total de Proposta Qtd.',          formato: 'numero' },
    { nome: 'Propostas Geradas R$',             formato: 'moeda'  },
    { nome: 'Total de Propostas Ganhas',        formato: 'numero' },
    { nome: 'Valor Total de Propostas Ganhas',  formato: 'moeda'  },
    { nome: 'Total de Propostas Ativas',        formato: 'numero' },
    { nome: 'Valor Total de Propostas Ativas',  formato: 'moeda'  },
  ];

  const setorSelecionado = setores.find(s => String(s.id) === String(setorId));
  const isComercial = setorSelecionado?.nome?.toLowerCase().includes('comercial');
  const [form,    setForm]    = useState({ nome: '', formato: 'numero', ordem: 0, panorama: false, detalhes: '' });
  const [notif,   setNotif]   = useState({ open: false, tipo: 'success', msg: '' });

  const [openMigrar,    setOpenMigrar]    = useState(false);
  const [itensMigrar,   setItensMigrar]   = useState([]);
  const [selecionados,  setSelecionados]  = useState([]);

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchSetores = async () => {
    try {
      const res = await api.get('/setores', { headers: { Authorization: `Bearer ${token}` } });
      const lista = res.data.filter(s => s.nome !== 'Setor Padrão');
      setSetores(lista);
      if (lista.length > 0) setSetorId(prev => prev || String(lista[0].id));
    } catch (err) { console.error(err); }
  };

  const fetchItens = async () => {
    try {
      const res = await api.get('/itens', { headers: { Authorization: `Bearer ${token}` } });
      setItens(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPanoramaConfig = async (id) => {
    if (!id || !isAdmin) return;
    try {
      const res = await api.get(`/panorama-config?setorId=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const map = {};
      res.data.forEach(c => { map[c.nome] = c.ativo; });
      setPanoramaConfig(map);
    } catch (err) { console.error(err); }
  };

  const handleTogglePanoramaEspecial = async (nome) => {
    const novoValor = !panoramaConfig[nome];
    setPanoramaConfig(prev => ({ ...prev, [nome]: novoValor }));
    setLoadingPanorama(true);
    try {
      await api.put('/panorama-config', { nome, setorId: Number(setorId), ativo: novoValor }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error(err);
      setPanoramaConfig(prev => ({ ...prev, [nome]: !novoValor }));
    } finally {
      setLoadingPanorama(false);
    }
  };

  useEffect(() => { fetchSetores(); }, []);
  useEffect(() => { fetchItens(); fetchPanoramaConfig(setorId); }, [setorId, ano]);

  // ── Dados filtrados ─────────────────────────────────────────────────
  const itensFiltrados = itens
    .filter(i => String(i.setor_id) === String(setorId) && String(i.ano) === String(ano))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  // ── Handlers ────────────────────────────────────────────────────────
  const limpar = () => {
    setForm({ nome: '', formato: 'numero', ordem: 0, panorama: false, detalhes: '' });
    setEditandoId(null);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim() || !setorId) return;
    const payload = {
      nome:      form.nome,
      formato:   form.formato,
      moeda:     form.formato === 'moeda',
      atividade: false,
      setorId:   Number(setorId),
      ano:       Number(ano),
      ordem:     Number(form.ordem) || 0,
      panorama:  form.panorama,
      detalhes:  form.detalhes || null,
    };
    try {
      if (editandoId) {
        await api.put(`/itens/${editandoId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setNotif({ open: true, tipo: 'success', msg: 'Indicador atualizado com sucesso!' });
      } else {
        await api.post('/itens', payload, { headers: { Authorization: `Bearer ${token}` } });
        setNotif({ open: true, tipo: 'success', msg: 'Indicador cadastrado com sucesso!' });
      }
      limpar();
      fetchItens();
    } catch (err) {
      console.error(err);
      setNotif({ open: true, tipo: 'error', msg: 'Erro ao salvar. Tente novamente.' });
    }
  };

  const handleEditar = (item) => {
    setForm({ nome: item.nome, formato: deriveFormato(item), ordem: item.ordem ?? 0, panorama: item.panorama ?? false, detalhes: item.detalhes || '' });
    setEditandoId(item.id);
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`/itens/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchItens();
      setNotif({ open: true, tipo: 'success', msg: 'Indicador excluído.' });
    } catch (err) {
      console.error(err);
      setNotif({ open: true, tipo: 'error', msg: 'Erro ao excluir. Tente novamente.' });
    }
  };

  const handleToggleVisivel = async (item) => {
    try {
      await api.put(`/itens/${item.id}`, {
        nome:      item.nome,
        setorId:   item.setor_id,
        ano:       item.ano,
        ordem:     item.ordem,
        moeda:     item.moeda,
        atividade: item.atividade,
        formato:   deriveFormato(item),
        oculto:    !item.oculto,
        panorama:  item.panorama ?? false,
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchItens();
    } catch (err) { console.error(err); }
  };

  const handleTogglePanorama = async (item) => {
    try {
      await api.put(`/itens/${item.id}`, {
        nome:      item.nome,
        setorId:   item.setor_id,
        ano:       item.ano,
        ordem:     item.ordem,
        moeda:     item.moeda,
        atividade: item.atividade,
        formato:   deriveFormato(item),
        oculto:    item.oculto ?? false,
        panorama:  !item.panorama,
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchItens();
    } catch (err) { console.error(err); }
  };

  const handleSalvarOrdens = async () => {
    const ids = Object.keys(ordensEditadas);
    if (ids.length === 0) return;
    setSalvandoOrdem(true);
    try {
      await Promise.all(ids.map(id => {
        const item = itensFiltrados.find(i => String(i.id) === String(id));
        if (!item) return Promise.resolve();
        return api.put(`/itens/${id}`, {
          nome: item.nome,
          setorId: item.setor_id,
          ano: item.ano,
          ordem: Number(ordensEditadas[id]),
          moeda: item.moeda,
          atividade: item.atividade,
          formato: deriveFormato(item),
          oculto: item.oculto ?? false,
          panorama: item.panorama ?? false,
          detalhes: item.detalhes || null,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }));
      setOrdensEditadas({});
      fetchItens();
      setNotif({ open: true, tipo: 'success', msg: 'Ordem salva com sucesso!' });
    } catch (err) {
      console.error(err);
      setNotif({ open: true, tipo: 'error', msg: 'Erro ao salvar ordem.' });
    } finally {
      setSalvandoOrdem(false);
    }
  };

  const abrirMigrar = async () => {
    const prevYear = Number(ano) - 1;
    try {
      const res  = await api.get('/itens', { headers: { Authorization: `Bearer ${token}` } });
      const prev = res.data.filter(i => String(i.setor_id) === String(setorId) && i.ano === prevYear);
      if (!prev.length) {
        setNotif({ open: true, tipo: 'warning', msg: `Nenhum indicador encontrado em ${prevYear}.` });
        return;
      }
      setItensMigrar(prev);
      setSelecionados(prev.map(i => i.id));
      setOpenMigrar(true);
    } catch (err) {
      console.error(err);
      setNotif({ open: true, tipo: 'error', msg: 'Erro ao buscar indicadores.' });
    }
  };

  const confirmarMigrar = async () => {
    const prevYear = Number(ano) - 1;
    const paraClicar = itensMigrar.filter(i => selecionados.includes(i.id));
    try {
      for (const item of paraClicar) {
        await api.post('/itens', {
          nome:      item.nome,
          formato:   deriveFormato(item),
          moeda:     item.moeda,
          atividade: item.atividade,
          setorId:   Number(setorId),
          ano:       Number(ano),
          ordem:     item.ordem ?? 0,
          oculto:    false,
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setOpenMigrar(false);
      fetchItens();
      setNotif({ open: true, tipo: 'success', msg: `${paraClicar.length} indicador(es) migrado(s) de ${prevYear}!` });
    } catch (err) {
      console.error(err);
      setNotif({ open: true, tipo: 'error', msg: 'Erro ao migrar indicadores.' });
    }
  };

  const toggleSelecionado = (id) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 900, mx: 'auto' }}>

      {/* Card 1 — Setor + Ano */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={labelStyle}>Setor</Typography>
            <TextField
              select fullWidth size="small" value={setorId}
              onChange={e => setSetorId(e.target.value)} sx={inputSx}
            >
              {setores.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.nome}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ width: 110 }}>
            <Typography sx={labelStyle}>Ano</Typography>
            <TextField
              fullWidth size="small" value={ano}
              onChange={e => setAno(e.target.value)} sx={inputSx}
            />
          </Box>

          <Box sx={{ alignSelf: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<MigrarIcon />}
              onClick={abrirMigrar}
              sx={{
                borderRadius: 2, textTransform: 'none', fontWeight: 600,
                borderColor: '#1976d2', color: '#1976d2', height: 40,
                '&:hover': { backgroundColor: '#e3f2fd' },
              }}
            >
              Migrar de {Number(ano) - 1}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Card 2 — Novo / Editar Indicador */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 3 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1976d2', mb: 2.5 }}>
          {editandoId ? 'Editar Indicador' : 'Novo Indicador'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={labelStyle}>Nome</Typography>
            <TextField
              fullWidth size="small" placeholder="Ex.: Faturamento"
              value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
              sx={inputSx}
            />
          </Box>

          <Box sx={{ flex: 2, minWidth: 260 }}>
            <Typography sx={labelStyle}>Descrição (opcional)</Typography>
            <TextField
              fullWidth size="small" placeholder="Ex.: Soma do faturamento mensal de todas as instituições"
              value={form.detalhes} onChange={e => setForm({ ...form, detalhes: e.target.value })}
              sx={inputSx}
            />
          </Box>

          <Box sx={{ width: 160 }}>
            <Typography sx={labelStyle}>Formato</Typography>
            <TextField
              select fullWidth size="small" value={form.formato}
              onChange={e => setForm({ ...form, formato: e.target.value })} sx={inputSx}
            >
              {FORMATOS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ width: 90 }}>
            <Typography sx={labelStyle}>Ordem</Typography>
            <TextField
              fullWidth size="small" type="number"
              value={form.ordem} onChange={e => setForm({ ...form, ordem: e.target.value })}
              sx={inputSx}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained" onClick={handleSubmit}
              sx={{
                borderRadius: 2, textTransform: 'none', fontWeight: 600,
                backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' }, height: 40,
              }}
            >
              {editandoId ? 'Salvar' : 'Cadastrar'}
            </Button>
            {editandoId && (
              <Button
                variant="outlined" onClick={limpar}
                sx={{
                  borderRadius: 2, textTransform: 'none', fontWeight: 600,
                  borderColor: '#d1d5db', color: '#374151', height: 40,
                }}
              >
                Cancelar
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Card 3 — Tabela de indicadores */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1976d2' }}>
            Indicadores do setor
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {Object.keys(ordensEditadas).length > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSalvarOrdens}
                disabled={salvandoOrdem}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' } }}
              >
                {salvandoOrdem ? 'Salvando…' : 'Salvar Ordem'}
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<AbrirIcon />}
              onClick={() => navigate('/setor/Geral')}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#1976d2', color: '#1976d2', '&:hover': { background: '#e3f2fd' } }}
            >
              Ver Panorama
            </Button>
          </Box>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              {['Ordem', 'Nome', 'Formato', 'Visível', ...(isAdmin ? ['Panorama'] : []), 'Ações'].map(col => (
                <TableCell
                  key={col}
                  sx={{ fontWeight: 700, fontSize: 13, color: '#374151', borderBottom: '2px solid #e8edf5', py: 1.5 }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {itensFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 4, color: '#9ca3af', fontSize: 14 }}>
                  Nenhum indicador cadastrado para este setor e ano.
                </TableCell>
              </TableRow>
            ) : itensFiltrados.map(item => (
              <TableRow
                key={item.id}
                sx={{ '&:hover': { backgroundColor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9' } }}
              >
                <TableCell sx={{ width: 70 }}>
                  <TextField
                    size="small"
                    type="number"
                    value={ordensEditadas[item.id] !== undefined ? ordensEditadas[item.id] : (item.ordem ?? 0)}
                    onChange={e => setOrdensEditadas(prev => ({ ...prev, [item.id]: e.target.value }))}
                    inputProps={{ style: { textAlign: 'center', padding: '4px 6px', fontSize: 13, fontWeight: 600, color: '#1976d2' } }}
                    sx={{ width: 60, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                  />
                </TableCell>

                <TableCell sx={{ fontSize: 14 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ color: item.oculto ? '#9ca3af' : '#1976d2', fontWeight: 500 }}>
                      {item.nome}
                    </span>
                    {item.crm_key && (
                      <span style={{
                        fontSize: 11, color: '#ffffff', background: '#0d47a1',
                        borderRadius: 4, padding: '1px 6px', fontWeight: 700,
                      }}>
                        CRM
                      </span>
                    )}
                    {item.oculto && (
                      <span style={{
                        fontSize: 11, color: '#9ca3af', background: '#f3f4f6',
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        oculto
                      </span>
                    )}
                    {item.panorama && (
                      <span style={{
                        fontSize: 11, color: '#1976d2', background: '#e3f2fd',
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        panorama
                      </span>
                    )}
                  </Box>
                </TableCell>

                <TableCell sx={{ fontSize: 13, color: '#6b7280' }}>
                  {formatoLabel(deriveFormato(item))}
                </TableCell>

                <TableCell sx={{ fontSize: 14, color: item.oculto ? '#9ca3af' : '#374151' }}>
                  {item.oculto ? 'Não' : 'Sim'}
                </TableCell>

                {isAdmin && (
                  <TableCell sx={{ fontSize: 14, color: item.panorama ? '#1976d2' : '#9ca3af' }}>
                    {item.panorama ? 'Sim' : 'Não'}
                  </TableCell>
                )}

                <TableCell sx={{ width: isAdmin ? 160 : 130 }}>
                  <Tooltip title={item.oculto ? 'Tornar visível' : 'Ocultar'}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleVisivel(item)}
                      sx={{ color: item.oculto ? '#d1d5db' : '#6b7280', '&:hover': { color: '#1976d2' } }}
                    >
                      {item.oculto
                        ? <VisibilityOffIcon fontSize="small" />
                        : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  {isAdmin && (
                    <Tooltip title={item.panorama ? 'Remover do panorama' : 'Adicionar ao panorama'}>
                      <IconButton
                        size="small"
                        onClick={() => handleTogglePanorama(item)}
                        sx={{ color: item.panorama ? '#1976d2' : '#d1d5db', '&:hover': { color: '#1976d2' } }}
                      >
                        {item.panorama
                          ? <PanoramaOnIcon fontSize="small" />
                          : <PanoramaOffIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Editar">
                    <IconButton
                      size="small" onClick={() => handleEditar(item)}
                      sx={{ color: '#6b7280', '&:hover': { color: '#1976d2' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small" onClick={() => handleExcluir(item.id)}
                      sx={{ color: '#6b7280', '&:hover': { color: '#ef4444' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Card especial — Indicadores automáticos do Comercial (só admin) */}
      {isAdmin && isComercial && (
        <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 3 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1976d2', mb: 0.5 }}>
            Indicadores Automáticos do Comercial
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#6b7280', mb: 2.5 }}>
            Estes indicadores vêm do CRM e aparecem automaticamente. Marque quais devem aparecer no Panorama Geral.
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                {['Indicador', 'Formato', 'Panorama', ''].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, fontSize: 13, color: '#374151', borderBottom: '2px solid #e8edf5', py: 1.5 }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {INDICADORES_ESPECIAIS_COMERCIAL.map(ind => (
                <TableRow key={ind.nome} sx={{ '&:hover': { backgroundColor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9' } }}>
                  <TableCell sx={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {ind.nome}
                      {panoramaConfig[ind.nome] && (
                        <span style={{ fontSize: 11, color: '#1976d2', background: '#e3f2fd', borderRadius: 4, padding: '1px 6px' }}>
                          panorama
                        </span>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: '#6b7280' }}>
                    {formatoLabel(ind.formato)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, color: panoramaConfig[ind.nome] ? '#1976d2' : '#9ca3af' }}>
                    {panoramaConfig[ind.nome] ? 'Sim' : 'Não'}
                  </TableCell>
                  <TableCell sx={{ width: 60 }}>
                    <Tooltip title={panoramaConfig[ind.nome] ? 'Remover do panorama' : 'Adicionar ao panorama'}>
                      <IconButton
                        size="small"
                        disabled={loadingPanorama}
                        onClick={() => handleTogglePanoramaEspecial(ind.nome)}
                        sx={{ color: panoramaConfig[ind.nome] ? '#1976d2' : '#d1d5db', '&:hover': { color: '#1976d2' } }}
                      >
                        {panoramaConfig[ind.nome] ? <PanoramaOnIcon fontSize="small" /> : <PanoramaOffIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialog de migração seletiva */}
      <Dialog open={openMigrar} onClose={() => setOpenMigrar(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#1a2744' }}>
          Migrar indicadores de {Number(ano) - 1} → {ano}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: '#6b7280', mb: 2 }}>
            Selecione os indicadores que deseja copiar para {ano}:
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Button size="small" onClick={() => setSelecionados(itensMigrar.map(i => i.id))}
              sx={{ textTransform: 'none', fontSize: 12 }}>
              Selecionar todos
            </Button>
            <Button size="small" onClick={() => setSelecionados([])}
              sx={{ textTransform: 'none', fontSize: 12 }}>
              Desmarcar todos
            </Button>
          </Box>

          <Divider sx={{ mb: 1 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {itensMigrar
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
              .map(item => (
                <FormControlLabel
                  key={item.id}
                  control={
                    <Checkbox
                      checked={selecionados.includes(item.id)}
                      onChange={() => toggleSelecionado(item.id)}
                      size="small"
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 14 }}>
                      {item.nome}
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
                        {formatoLabel(deriveFormato(item))}
                      </span>
                    </Typography>
                  }
                />
              ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenMigrar(false)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={confirmarMigrar}
            variant="contained"
            disabled={selecionados.length === 0}
            sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: '#1976d2' }}
          >
            Migrar {selecionados.length > 0 ? `(${selecionados.length})` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notif.open}
        autoHideDuration={4000}
        onClose={() => setNotif(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notif.tipo} variant="filled" onClose={() => setNotif(p => ({ ...p, open: false }))}>
          {notif.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CadastroItem;
