import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, MenuItem, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Snackbar, Alert, CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import api from '../services/api';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const INST_LABELS = ['FIEAM', 'SESI', 'SENAI', 'IEL'];
const INST_KEYS   = ['fieam', 'sesi', 'senai', 'iel'];

const SETORES_COM_INSTITUICOES = [
  'Comercial',
  'Design',
  'Promoções e Propaganda',
  'Contact Center',
  'Redes Sociais',
  'Marketing',
  'Back Office',
  'Inteligência e Pesquisa de Mercado',
];

const ESTRATEGIA_OPTS = [
  { value: 'manter', label: 'Manter' },
  { value: 'somar',  label: 'Somar' },
  { value: 'media',  label: 'Média' },
];

const ESTRATEGIA_ACUM_OPTS = [
  { value: 'somar',  label: 'Somar' },
  { value: 'ultimo', label: 'Último' },
  { value: 'media',  label: 'Média' },
];

// Colunas sticky responsivas — clamp(mín, ideal, máx)
const IND_W_CSS  = 'clamp(160px, 15vw, 300px)';
const IND_W_MIN  = 160;

const EST_W_CSS  = 'clamp(85px, 8vw, 110px)';
const EST_W      = 85;

const ACUM_W_CSS = 'clamp(90px, 8vw, 115px)';
const ACUM_W     = 90;

const CELL_NORMAL = 60;
const CELL_INST   = 44;

const labelSx = { fontSize: 13, fontWeight: 500, color: '#374151', mb: 0.5 };
const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

// Estilo compartilhado para células de cabeçalho de dados (normal)
const thDataNormal = {
  fontWeight: 700, fontSize: 12, color: '#6b7280',
  borderBottom: '2px solid #e8edf5', py: 1.5,
  textTransform: 'uppercase', letterSpacing: 0.5,
  minWidth: CELL_NORMAL,
};

const AtualizacaoItem = () => {
  const token       = localStorage.getItem('token');
  const currentYear = new Date().getFullYear();

  const [setores,          setSetores]          = useState([]);
  const [indicadores,      setIndicadores]      = useState([]);
  const [grid,             setGrid]             = useState({});
  const [gridInst,         setGridInst]         = useState({});
  const [gridEstrategia,        setGridEstrategia]        = useState({});
  const [gridEstrategiaAcumulado, setGridEstrategiaAcumulado] = useState({});
  const [setorId,               setSetorId]               = useState('');
  const [ano,                   setAno]                   = useState(String(currentYear));
  const [todosSector,           setTodosSector]           = useState([]);
  const [loading,               setLoading]               = useState(false);
  const [saving,                setSaving]                = useState(false);
  const [notif,                 setNotif]                 = useState({ open: false, tipo: 'success', msg: '' });
  const [comInstituicoes,       setComInstituicoes]       = useState(false);
  const [isPanoramaGeral,       setIsPanoramaGeral]       = useState(false);

  const tableMinWidth = comInstituicoes
    ? IND_W_MIN + EST_W + ACUM_W + 48 * CELL_INST
    : IND_W_MIN + EST_W + ACUM_W + 12 * CELL_NORMAL;

  const totalCols = comInstituicoes ? 51 : 15;

  // ── Carrega setores ─────────────────────────────────────────────────
  useEffect(() => {
    api.get('/setores', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const lista = res.data.filter(s => s.nome !== 'Setor Padrão');
        setSetores(lista);
        if (lista.length > 0) setSetorId(String(lista[0].id));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const setor = setores.find(s => String(s.id) === String(setorId));
    setComInstituicoes(setor ? SETORES_COM_INSTITUICOES.includes(setor.nome) : false);
  }, [setorId, setores]);

  // ── Carrega indicadores + valores quando setor/ano muda ─────────────
  useEffect(() => {
    if (!setorId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [itensRes, valoresRes] = await Promise.all([
          api.get('/itens', { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`itens/valor/${setorId}/?ano=${ano}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const todosSector = itensRes.data.filter(i => String(i.setor_id) === String(setorId));

        const itensDoSetor = todosSector
          .filter(i => String(i.ano) === String(ano))
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

        const valoresPorNome = {};
        (valoresRes.data.indicadores || []).forEach(ind => {
          valoresPorNome[ind.nome] = ind.valores;
        });

        // Grid simples
        const newGrid = {};
        itensDoSetor.forEach(item => {
          newGrid[item.id] = {};
          const valores = valoresPorNome[item.nome] || [];
          for (let mes = 1; mes <= 12; mes++) {
            const soma = valores
              .filter(v => v.mes === mes)
              .reduce((acc, v) => acc + (parseFloat(v.valor) || 0), 0);
            newGrid[item.id][mes] = soma > 0 ? String(soma) : '';
          }
        });

        // Grid por instituição
        const newGridInst = {};
        itensDoSetor.forEach(item => {
          newGridInst[item.id] = {};
          const valores = valoresPorNome[item.nome] || [];
          for (let mes = 1; mes <= 12; mes++) {
            const getInst = (instId) => {
              const soma = valores
                .filter(v => v.mes === mes && v.instituicao_id === instId)
                .reduce((acc, v) => acc + (parseFloat(v.valor) || 0), 0);
              return soma > 0 ? String(soma) : '';
            };
            newGridInst[item.id][mes] = {
              fieam: getInst(1), sesi: getInst(2),
              senai: getInst(3), iel:  getInst(4),
            };
          }
        });

        // Estratégia por indicador
        const newGridEstrategia = {};
        const newGridEstrategiaAcumulado = {};
        itensDoSetor.forEach(item => {
          newGridEstrategia[item.id] = item.estrategia ?? 'manter';
          newGridEstrategiaAcumulado[item.id] = item.estrategia_acumulado ?? 'somar';
        });

        setTodosSector(todosSector);
        setIndicadores(itensDoSetor);
        setGrid(newGrid);
        setGridInst(newGridInst);
        setGridEstrategia(newGridEstrategia);
        setGridEstrategiaAcumulado(newGridEstrategiaAcumulado);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [setorId, ano]);

  const handleCellChange = (itemId, mes, value) =>
    setGrid(prev => ({ ...prev, [itemId]: { ...prev[itemId], [mes]: value } }));

  const handleInstChange = (itemId, mes, instKey, value) =>
    setGridInst(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [mes]: { ...prev[itemId]?.[mes], [instKey]: value } },
    }));

  const handleEstrategiaChange = (itemId, value) =>
    setGridEstrategia(prev => ({ ...prev, [itemId]: value }));

  const handleEstrategiaAcumuladoChange = (itemId, value) =>
    setGridEstrategiaAcumulado(prev => ({ ...prev, [itemId]: value }));

  // ── Salvar tudo ─────────────────────────────────────────────────────
  const handleSalvarTudo = async () => {
    setSaving(true);
    let savedCount = 0;
    try {
      const itemPorNome = {};
      const parseVal = v => parseFloat(String(v || '').replace(',', '.')) || 0;

      const mesTemValor = (ind, mes) => {
        if (comInstituicoes) {
          const inst = gridInst[ind.id]?.[mes] || {};
          return INST_KEYS.some(k => parseVal(inst[k]) > 0);
        }
        const v = String(grid[ind.id]?.[mes] ?? '').trim();
        return v !== '' && parseVal(v) > 0;
      };

      const indComValores = indicadores.filter(ind =>
        [1,2,3,4,5,6,7,8,9,10,11,12].some(mes => mesTemValor(ind, mes))
      );

      const precisaCriar = indComValores.filter(ind =>
        !todosSector.find(i => i.nome === ind.nome && String(i.ano) === String(ano))
      );

      if (precisaCriar.length > 0) {
        for (const ind of precisaCriar) {
          try {
            await api.post('/itens', {
              nome:       ind.nome,
              formato:    ind.formato || 'numero',
              moeda:      ind.moeda ?? false,
              atividade:  ind.atividade ?? false,
              setorId:    Number(setorId),
              ano:        Number(ano),
              ordem:      ind.ordem ?? 0,
              oculto:     ind.oculto ?? false,
              estrategia: gridEstrategia[ind.id] ?? ind.estrategia ?? 'manter',
              estrategia_acumulado: gridEstrategiaAcumulado[ind.id] ?? 'somar',
            }, { headers: { Authorization: `Bearer ${token}` } });
          } catch (e) {
            if (!e.response || (e.response.status !== 409 && e.response.status !== 422)) throw e;
          }
        }
        const refreshRes = await api.get('/itens', { headers: { Authorization: `Bearer ${token}` } });
        refreshRes.data
          .filter(i => String(i.setor_id) === String(setorId) && String(i.ano) === String(ano))
          .forEach(i => { itemPorNome[i.nome] = i; });
      }

      for (const ind of indComValores) {
        const itemDoAno =
          itemPorNome[ind.nome] ??
          todosSector.find(i => i.nome === ind.nome && String(i.ano) === String(ano));

        if (!itemDoAno) continue;

        for (let mes = 1; mes <= 12; mes++) {
          if (!mesTemValor(ind, mes)) continue;

          let valorFieam, valorSesi, valorSenai, valorIel;
          if (comInstituicoes) {
            const inst = gridInst[ind.id]?.[mes] || {};
            valorFieam = parseVal(inst.fieam);
            valorSesi  = parseVal(inst.sesi);
            valorSenai = parseVal(inst.senai);
            valorIel   = parseVal(inst.iel);
          } else {
            valorFieam = parseVal(grid[ind.id]?.[mes]);
            valorSesi  = 0; valorSenai = 0; valorIel = 0;
          }

          await api.put(`itens/atualizar-valor/${itemDoAno.id}`, {
            setorId:    Number(setorId),
            itemId:     itemDoAno.id,
            ano:        Number(ano),
            mes,
            valorFieam, valorSesi, valorSenai, valorIel,
            totalGeral: valorFieam + valorSesi + valorSenai + valorIel,
            estrategia: gridEstrategia[ind.id] ?? ind.estrategia ?? 'manter',
            estrategia_acumulado: gridEstrategiaAcumulado[ind.id] ?? 'somar',
          }, { headers: { Authorization: `Bearer ${token}` } });
          savedCount++;
        }
      }

      setNotif({ open: true, tipo: 'success', msg: `${savedCount} valor(es) salvo(s) com sucesso!` });
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setNotif({ open: true, tipo: 'error', msg: 'Erro ao salvar alguns valores.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Estilos compartilhados ──────────────────────────────────────────
  const stickyIndSx = (bg) => ({
    position: 'sticky', left: 0, zIndex: 3,
    backgroundColor: bg,
    width: IND_W_CSS, minWidth: IND_W_MIN,
    boxShadow: '2px 0 5px rgba(0,0,0,0.08)',
  });

  const stickyEstSx = (bg) => ({
    position: 'sticky', left: IND_W_CSS, zIndex: 3,
    backgroundColor: bg,
    width: EST_W_CSS, minWidth: EST_W,
    boxShadow: '2px 0 5px rgba(0,0,0,0.06)',
  });

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: 'calc(100vh - 160px)' }}>

      {/* Filtros */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>

          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={labelSx}>Setor</Typography>
            <TextField select fullWidth size="small" value={setorId}
              onChange={e => setSetorId(e.target.value)} sx={inputSx}>
              {setores.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.nome}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ width: 110 }}>
            <Typography sx={labelSx}>Ano</Typography>
            <TextField fullWidth size="small" value={ano}
              onChange={e => setAno(e.target.value)} sx={inputSx} />
          </Box>

          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SaveIcon />}
            onClick={handleSalvarTudo}
            disabled={saving || loading || indicadores.length === 0}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 600,
              backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' },
              height: 40, minWidth: 130,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar tudo'}
          </Button>
        </Box>
      </Paper>

      {/* Tabela editável */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={{ overflowX: 'auto', overflowY: 'auto', width: '100%', flex: 1 }}>
          <Table sx={{ width: '100%', tableLayout: 'fixed', minWidth: tableMinWidth }}>
            <TableHead>
              {comInstituicoes ? (
                <>
                  {/* Linha 1: Indicador e Estratégia (rowSpan=2) + cabeçalhos de mês (colSpan=4) */}
                  <TableRow sx={{ backgroundColor: '#1976d2' }}>
                    <TableCell rowSpan={2} sx={{
                      ...stickyIndSx('#1976d2'),
                      fontWeight: 700, fontSize: 13, color: 'white',
                      borderBottom: 'none', py: 1.5, px: 2, zIndex: 5,
                    }}>
                      Indicador
                    </TableCell>
                    <TableCell rowSpan={2} sx={{
                      ...stickyEstSx('#1976d2'),
                      fontWeight: 700, fontSize: 13, color: 'white',
                      borderBottom: 'none', py: 1.5, px: 1, zIndex: 5,
                    }}>
                      Estratégia
                    </TableCell>
                    <TableCell rowSpan={2} sx={{
                      fontWeight: 700, fontSize: 12, color: 'white',
                      borderBottom: 'none', py: 1.5, px: 1,
                      width: ACUM_W_CSS, minWidth: ACUM_W, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      Acumulado
                    </TableCell>
                    {MESES.map(m => (
                      <TableCell key={m} colSpan={4} align="center" sx={{
                        fontWeight: 700, fontSize: 12, color: 'white',
                        borderBottom: 'none', py: 1, letterSpacing: 0.5,
                        borderLeft: '1px solid rgba(255,255,255,0.2)',
                        minWidth: CELL_INST * 4,
                      }}>
                        {m.toUpperCase()}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Linha 2: FIEAM / SESI / SENAI / IEL por mês */}
                  <TableRow sx={{ backgroundColor: '#1565c0' }}>
                    {MESES.flatMap(m =>
                      INST_LABELS.map((inst, i) => (
                        <TableCell key={`${m}-${inst}`} align="center" sx={{
                          fontWeight: 600, fontSize: 11,
                          color: 'rgba(255,255,255,0.9)',
                          py: 0.75, minWidth: CELL_INST,
                          borderBottom: '2px solid #e8edf5',
                          borderLeft: i === 0 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        }}>
                          {inst}
                        </TableCell>
                      ))
                    )}
                  </TableRow>
                </>
              ) : (
                /* Modo simples: uma linha de cabeçalho */
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{
                    ...stickyIndSx('#f8fafc'),
                    fontWeight: 700, fontSize: 13, color: '#374151',
                    borderBottom: '2px solid #e8edf5', py: 1.5, px: 2,
                  }}>
                    Indicador
                  </TableCell>
                  <TableCell sx={{
                    ...stickyEstSx('#f8fafc'),
                    fontWeight: 700, fontSize: 13, color: '#374151',
                    borderBottom: '2px solid #e8edf5', py: 1.5, px: 1,
                  }}>
                    Estratégia
                  </TableCell>
                  <TableCell sx={{
                    fontWeight: 700, fontSize: 12, color: '#6b7280',
                    borderBottom: '2px solid #e8edf5', py: 1.5, px: 1,
                    width: ACUM_W_CSS, minWidth: ACUM_W, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    Acumulado
                  </TableCell>
                  {MESES.map(m => (
                    <TableCell key={m} align="center" sx={thDataNormal}>
                      {m}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={totalCols} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : indicadores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalCols} align="center"
                    sx={{ py: 5, color: '#9ca3af', fontSize: 14 }}>
                    Nenhum indicador cadastrado para este setor e ano.
                  </TableCell>
                </TableRow>
              ) : indicadores.map((ind, rowIdx) => {
                const rowBg = rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
                const estrategiaAtual = gridEstrategia[ind.id] ?? ind.estrategia ?? 'manter';

                return (
                  <TableRow key={ind.id}
                    sx={{ backgroundColor: rowBg, '&:hover': { backgroundColor: '#eef4fd' } }}>

                    {/* Indicador — sticky */}
                    <TableCell
                      title={ind.nome}
                      sx={{
                        ...stickyIndSx(rowBg),
                        fontSize: 13, fontWeight: 500,
                        color: ind.oculto ? '#9ca3af' : '#1976d2',
                        borderBottom: '1px solid #f0f4f8', py: 1, px: 2,
                        whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3,
                      }}>
                      {ind.nome}
                    </TableCell>

                    {/* Estratégia — sticky */}
                    <TableCell sx={{
                      ...stickyEstSx(rowBg),
                      borderBottom: '1px solid #f0f4f8', py: 0.5, px: 1,
                    }}>
                      <select
                        value={estrategiaAtual}
                        onChange={e => handleEstrategiaChange(ind.id, e.target.value)}
                        style={{
                          width: '100%', fontSize: 12, color: '#374151',
                          border: '1px solid #d1d5db', borderRadius: 4,
                          padding: '3px 4px', background: '#fff',
                          cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                        }}
                      >
                        {ESTRATEGIA_OPTS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </TableCell>

                    {/* Acumulado */}
                    <TableCell sx={{
                      borderBottom: '1px solid #f0f4f8', py: 0.5, px: 1, width: ACUM_W_CSS, minWidth: ACUM_W,
                    }}>
                      <select
                        value={gridEstrategiaAcumulado[ind.id] ?? 'somar'}
                        onChange={e => handleEstrategiaAcumuladoChange(ind.id, e.target.value)}
                        style={{
                          width: '100%', fontSize: 12, color: '#374151',
                          border: '1px solid #d1d5db', borderRadius: 4,
                          padding: '3px 4px', background: '#fff',
                          cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                        }}
                      >
                        {ESTRATEGIA_ACUM_OPTS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </TableCell>

                    {/* Células de dados */}
                    {comInstituicoes
                      ? [1,2,3,4,5,6,7,8,9,10,11,12].flatMap(mes =>
                          INST_KEYS.map((instKey, iIdx) => (
                            <TableCell key={`${mes}-${instKey}`} align="center" sx={{
                              borderBottom: '1px solid #f0f4f8',
                              py: 0.5, px: 0.25,
                              borderLeft: iIdx === 0 ? '1px solid #e8edf5' : 'none',
                              minWidth: CELL_INST,
                            }}>
                              <input
                                type="text"
                                value={gridInst[ind.id]?.[mes]?.[instKey] ?? ''}
                                onChange={e => handleInstChange(ind.id, mes, instKey, e.target.value)}
                                style={{
                                  width: '100%', border: 'none', outline: 'none',
                                  textAlign: 'center', fontSize: 12, color: '#374151',
                                  background: 'transparent', padding: '3px 0',
                                  fontFamily: 'inherit', cursor: 'text',
                                }}
                                onFocus={e => { e.target.style.background = '#eff6ff'; e.target.style.borderRadius = '4px'; }}
                                onBlur={e  => { e.target.style.background = 'transparent'; }}
                              />
                            </TableCell>
                          ))
                        )
                      : [1,2,3,4,5,6,7,8,9,10,11,12].map(mes => (
                          <TableCell key={mes} align="center" sx={{
                            borderBottom: '1px solid #f0f4f8',
                            py: 0.5, px: 0.5,
                            minWidth: CELL_NORMAL,
                          }}>
                            <input
                              type="text"
                              value={grid[ind.id]?.[mes] ?? ''}
                              onChange={e => handleCellChange(ind.id, mes, e.target.value)}
                              style={{
                                width: '100%', border: 'none', outline: 'none',
                                textAlign: 'center', fontSize: 13, color: '#374151',
                                background: 'transparent', padding: '4px 0',
                                fontFamily: 'inherit', cursor: 'text',
                              }}
                              onFocus={e => { e.target.style.background = '#eff6ff'; e.target.style.borderRadius = '4px'; }}
                              onBlur={e  => { e.target.style.background = 'transparent'; }}
                            />
                          </TableCell>
                        ))
                    }
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar open={notif.open} autoHideDuration={5000}
        onClose={() => setNotif(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notif.tipo} variant="filled"
          onClose={() => setNotif(p => ({ ...p, open: false }))}>
          {notif.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AtualizacaoItem;
