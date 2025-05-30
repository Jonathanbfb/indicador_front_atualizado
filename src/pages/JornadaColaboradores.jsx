import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions
} from '@mui/material';
import dayjs from 'dayjs';
import api from '../services/api';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const JornadaColaboradores = () => {
  const [ano, setAno] = useState(dayjs().year());
  const [mes, setMes] = useState(dayjs().month() + 1);
  const [dados, setDados] = useState([]); // [{ setor, colaboradores: [ { id, nome, setorId, dias: [ { dia, valor, motivo, id } ] } ] }]
  const [feriados, setFeriados] = useState([]);
  const [notificacao, setNotificacao] = useState({ open: false, tipo: 'success', mensagem: '' });
  const [setores, setSetores] = useState([]);               // Lista de setores do usuário (backend já filtra)
  const [setoresCarregados, setSetoresCarregados] = useState(false);
  const [setorSelecionado, setSetorSelecionado] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [novoValor, setNovoValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const token = localStorage.getItem('token');
  const diasNoMes = dayjs(`${ano}-${String(mes).padStart(2, '0')}-01`).daysInMonth();

  // 1) Busca, do backend, todos os setores aos quais o usuário atual pertence.
  const fetchSetores = async () => {
    try {
      const response = await api.get('/setores', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remover "Setor Padrão" (id=1) se por acaso estiver na lista
      const setoresFiltrados = response.data.filter(setor => setor.id !== 1);
      setSetores(setoresFiltrados);

      if (setoresFiltrados.length > 0) {
        setSetorSelecionado(setoresFiltrados[0].id);
      } else {
        setSetorSelecionado('');
      }
      setSetoresCarregados(true);
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      setNotificacao({
        open: true,
        tipo: 'error',
        mensagem: 'Erro ao carregar setores.'
      });
    }
  };

  // 2) Monta as jornadas no frontend combinando valores padrão + registros vindos do backend.
  const fetchDados = async () => {
    try {
      if (!setorSelecionado) {
        setDados([]);
        return;
      }

      // 2.1) Buscar todos os usuários
      const uRes = await api.get('/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const todosUsuarios = uRes.data; // cada usuário: { id, nome, setorIds: [...], jornadaTrabalho }

      // 2.2) Filtrar só quem tem setorIds[0] igual a setorSelecionado (e != 1)
      const usuariosNoSetor = todosUsuarios.filter(user =>
        Array.isArray(user.setorIds) &&
        user.setorIds.length > 0 &&
        user.setorIds[0] === Number(setorSelecionado) &&
        user.setorIds[0] !== 1
      );

      // 2.3) Buscar feriados do ano e filtrar só o mês atual
      const fRes = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`).then(r => r.json());
      const feriadosMes = fRes.filter(f => dayjs(f.date).month() + 1 === mes);
      setFeriados(feriadosMes);

      // 2.4) Buscar jornadas já salvas no backend para esse mês/ano
      const jRes = await api.get('/jornadas/retornar-jornadas', {
        headers: { Authorization: `Bearer ${token}` },
        params: { mes, ano }
      });
      // muitas vezes a API devolve algo como: { jornada: [ ... ] }
      // noutras devolve o array diretamente em `jRes.data`.
      const jornadasBackend = Array.isArray(jRes.data)
        ? jRes.data
        : jRes.data.jornada || [];

      // 2.5) Criar, para cada usuário do setor, a matriz de dias com valores padrão
      const agrupado = {};
      usuariosNoSetor.forEach(user => {
        agrupado[user.id] = {
          id: user.id,
          nome: user.nome,
          setorId: user.setorIds[0],
          jornadaTrabalho: user.jornadaTrabalho || '00:00',
          dias: Array.from({ length: diasNoMes }, (_, idx) => {
            const diaData = dayjs(
              `${ano}-${String(mes).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`
            );
            const isWeekend = [0, 6].includes(diaData.day());
            const isFeriado = feriadosMes.some(fh => dayjs(fh.date).date() === diaData.date());
            let valorPadrao;
            if (isFeriado) {
              valorPadrao = 'FER';
            } else if (isWeekend) {
              valorPadrao = 'FDS';
            } else {
              valorPadrao = user.jornadaTrabalho || '00:00';
            }
            return { dia: idx + 1, valor: valorPadrao, motivo: '', id: null };
          })
        };
      });

      // 2.6) Sobrescrever *sempre* com o registro do backend, mesmo que o valor seja "00:00"
      jornadasBackend.forEach(entry => {
        if (entry.ano === ano && entry.mes === mes) {
          const colaboradorId = entry.colaborador.id;
          const diaIndex = entry.dia - 1;
          if (agrupado[colaboradorId] && agrupado[colaboradorId].dias[diaIndex]) {
            agrupado[colaboradorId].dias[diaIndex] = {
              dia: entry.dia,
              valor: entry.valor,
              motivo: entry.motivo || '',
              id: entry.id
            };
          }
        }
      });

      // 2.7) Montar o array final – só um grupo, o setorSelecionado, com seus colaboradores
      const nomeSetor = setores.find(s => s.id === Number(setorSelecionado))?.nome || '';
      const colaboradores = Object.values(agrupado);
      setDados([{ setor: nomeSetor, colaboradores }]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setNotificacao({
        open: true,
        tipo: 'error',
        mensagem: 'Erro ao carregar dados.'
      });
    }
  };

  // 3) Ao montar, buscar setores
  useEffect(() => {
    fetchSetores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4) Quando setorSelecionado, mês ou ano mudarem, recarregar dados
  useEffect(() => {
    if (setoresCarregados && setorSelecionado) {
      fetchDados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, setorSelecionado, setoresCarregados]);

  // 5) Converte "HH:mm" em horas decimais
  const parseHoras = valor => {
    const [h, m] = valor.split(':').map(Number);
    return isNaN(h) ? 0 : h + (m || 0) / 60;
  };

  // 6) Quando clica na célula, abre modal
  const abrirModal = (colaborador, idxDia) => {
    const diaObj = colaborador.dias[idxDia];
    setDiaSelecionado({
      colaboradorId: colaborador.id,
      setorId: Number(setorSelecionado),
      diaIndex: idxDia,
      dia: idxDia + 1,
      valor: diaObj.valor,
      motivo: diaObj.motivo,
      id: diaObj.id
    });
    setNovoValor(diaObj.valor);
    setMotivo(diaObj.motivo || '');
    setModalAberto(true);
  };

  // 7) Salvar somente no estado local (antes de enviar ao backend)
  const salvarLocalmente = () => {
    if (!diaSelecionado) return;
    const { colaboradorId, diaIndex, dia } = diaSelecionado;

    setDados(prevDados => {
      return prevDados.map(setorItem => {
        if (setorItem.setor === setores.find(s => s.id === Number(setorSelecionado))?.nome) {
          const novosColabs = setorItem.colaboradores.map(col => {
            if (col.id === colaboradorId) {
              const novosDias = [...col.dias];
              novosDias[diaIndex] = {
                dia,
                valor: novoValor,
                motivo,
                id: diaSelecionado.id // pode ser null ou um ID existente
              };
              return { ...col, dias: novosDias };
            }
            return col;
          });
          return { ...setorItem, colaboradores: novosColabs };
        }
        return setorItem;
      });
    });

    setModalAberto(false);
    setNotificacao({ open: true, tipo: 'success', mensagem: 'Valor atualizado localmente.' });
  };

  // 8) Envia ao backend (PUT para updates, POST para novos), sem checar “nenhuma jornada alterada”
  const cadastrarJornadas = async () => {
    try {
      const setorObj = dados[0]; 
      if (!setorObj || setorObj.colaboradores.length === 0) {
        setNotificacao({ open: true, tipo: 'warning', mensagem: 'Nenhum colaborador neste setor.' });
        return;
      }

      const toCreate = [];
      const toUpdate = [];

      setorObj.colaboradores.forEach(col => {
        col.dias.forEach(d => {
          if (d.id) {
            // se já existe id, vai ser PUT, mesmo se valor for "00:00"
            toUpdate.push({
              id: d.id,
              valor: d.valor,
              motivo: d.motivo || ''
            });
          } else {
            // se não tem id, cria novo registro
            toCreate.push({
              colaboradorId: col.id,
              setorId: col.setorId,
              ano,
              mes,
              dia: d.dia,
              valor: d.valor,
              motivo: d.motivo || ''
            });
          }
        });
      });

      // Primeiro faz todos os PUTs
      for (let upd of toUpdate) {
        await api.put(
          `/jornadas/editar-jornada/${upd.id}`,
          { valor: upd.valor, motivo: upd.motivo },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Depois cria tudo que for novo
      if (toCreate.length > 0) {
        await api.post(
          '/jornadas/criar-jornada',
          toCreate,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // **Mesmo que o backend diga "Nenhuma jornada atualizada", consideramos como sucesso**
      setNotificacao({ open: true, tipo: 'success', mensagem: 'Jornadas sincronizadas com sucesso!' });
      fetchDados();
    } catch (error) {
      console.error(error);
      const backendMsg = error.response?.data?.message || 'Erro ao cadastrar jornadas.';
      setNotificacao({
        open: true,
        tipo: 'error',
        mensagem: backendMsg
      });
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Jornada de Trabalho por Colaborador
      </Typography>

      {/* Controles: Mês, Ano e Setor */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <FormControl size="small">
          <InputLabel>Mês</InputLabel>
          <Select
            value={mes}
            onChange={e => setMes(e.target.value)}
            label="Mês"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {dayjs().month(i).format('MMMM')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>Ano</InputLabel>
          <Select
            value={ano}
            onChange={e => setAno(e.target.value)}
            label="Ano"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {setores.length > 0 && (
          <FormControl size="small">
            <InputLabel>Setor</InputLabel>
            <Select
              value={setorSelecionado}
              onChange={e => setSetorSelecionado(e.target.value)}
              label="Setor"
            >
              {setores.map(setor => (
                <MenuItem key={setor.id} value={setor.id}>
                  {setor.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Se não houver setores válidos, exibe aviso */}
      {setores.length === 0 ? (
        <Typography color="textSecondary" sx={{ mt: 2 }}>
          Você não está vinculado a nenhum setor válido.
        </Typography>
      ) : (
        (() => {
          // Pega o array de colaboradores já atribuídos ao setor (posição 0 de setorIds)
          const colaboradores = dados[0]?.colaboradores || [];
          if (colaboradores.length === 0) {
            return (
              <Typography color="textSecondary" sx={{ mt: 2 }}>
                Não há colaboradores vinculados a este setor.
              </Typography>
            );
          }
          return (
            <Box mb={4}>
              <Typography variant="h6">
                Setor: {setores.find(s => s.id === Number(setorSelecionado))?.nome}
              </Typography>
              <Paper sx={{ mt: 1 }}>
                <Box
                  sx={{
                    display: 'block',
                    maxHeight: 300,
                    overflowY: 'hidden',
                    '&:hover': {
                      overflowY: 'auto',
                      overflowX: 'auto'
                    }
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 150 }}>Colaborador</TableCell>
                        {Array.from({ length: diasNoMes }).map((_, i) => {
                          const data = dayjs(
                            `${ano}-${String(mes).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
                          );
                          const isWeekend = [0, 6].includes(data.day());
                          const isFeriado = feriados.some(fh => dayjs(fh.date).date() === data.date());
                          return (
                            <TableCell
                              key={i}
                              align="center"
                              sx={{
                                minWidth: 60,
                                backgroundColor: isFeriado
                                  ? '#f8d7da'
                                  : isWeekend
                                    ? '#e0e0e0'
                                    : 'inherit'
                              }}
                            >
                              {i + 1}
                              <br/>
                              <Typography variant="caption">
                                {diasSemana[data.day()]}
                              </Typography>
                            </TableCell>
                          );
                        })}
                        <TableCell align="center" sx={{ minWidth: 80 }}>
                          Total (h)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {colaboradores.map(col => {
                        const total = col.dias.reduce((sum, d) => {
                          if (d.valor && /\d{2}:\d{2}/.test(d.valor)) {
                            return sum + parseHoras(d.valor);
                          }
                          return sum;
                        }, 0);

                        return (
                          <TableRow key={col.id}>
                            <TableCell sx={{ minWidth: 150 }}>{col.nome}</TableCell>
                            {col.dias.map((d, idx) => {
                              const data = dayjs(
                                `${ano}-${String(mes).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`
                              );
                              const isWeekend = [0, 6].includes(data.day());
                              const isFeriado = feriados.some(fh => dayjs(fh.date).date() === data.date());
                              return (
                                <TableCell
                                  key={idx}
                                  align="center"
                                  sx={{
                                    cursor: 'pointer',
                                    minWidth: 60,
                                    backgroundColor: isFeriado
                                      ? '#f8d7da'
                                      : isWeekend
                                        ? '#e0e0e0'
                                        : 'inherit'
                                  }}
                                  onClick={() => abrirModal(col, idx)}
                                >
                                  {d.valor}
                                </TableCell>
                              );
                            })}
                            <TableCell align="center">
                              <b>{total.toFixed(2)}</b>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Box>
          );
        })()
      )}

      {/* Modal para editar cada célula */}
      <Dialog open={modalAberto} onClose={() => setModalAberto(false)} fullWidth>
        <DialogTitle>Editar jornada</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Novo valor (HH:mm / FER / FDS)"
            value={novoValor}
            onChange={e => setNovoValor(e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Motivo"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAberto(false)}>Cancelar</Button>
          <Button
            onClick={salvarLocalmente}
            variant="contained"
            color="primary"
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Botão para sincronizar jornadas */}
      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={cadastrarJornadas}
        >
          Cadastrar Jornada
        </Button>
      </Box>

      {/* Snackbar de notificação */}
      <Snackbar
        open={notificacao.open}
        autoHideDuration={5000}
        onClose={() => setNotificacao({ ...notificacao, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotificacao({ ...notificacao, open: false })}
          severity={notificacao.tipo}
          variant="filled"
        >
          {notificacao.mensagem}
        </Alert>
      </Snackbar>

      {/* Botão para recarregar dados */}
      <Box mt={2}>
        <Button variant="outlined" onClick={fetchDados}>
          Atualizar
        </Button>
      </Box>
    </Box>
  );
};

export default JornadaColaboradores;
