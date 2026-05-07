import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Grid,
  Paper,
  Chip,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControlLabel,
  Tabs,
  Tab,
  Checkbox,
  TableContainer,
  InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '../services/api';

const CadastroItem = () => {
  const [setores, setSetores] = useState([]);
  const [itens, setItens] = useState([]);
  const [instituicoes, setInstituicoes] = useState(['FIEAM', 'SESI', 'SENAI', 'IEL']);
  const [editandoId, setEditandoId] = useState(null);

  // abaSetor representa o índice no array 'setores'
  const [abaSetor, setAbaSetor] = useState(0);

  const [form, setForm] = useState({
    nome: '',
    detalhes: '',
    setorId: '',
    ano: new Date().getFullYear(),
    atividade: false,
    moeda: false // novo campo para "É valor em dinheiro"
  });

  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  const token = localStorage.getItem('token');

  // Carregar setores e itens
  useEffect(() => {
    const fetchSetores = async () => {
      try {
        const res = await api.get('/setores', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSetores(res.data);
      } catch (err) {
        console.error('Erro ao carregar setores', err);
      }
    };

    const fetchItens = async () => {
      try {
        const res = await api.get('/itens', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setItens(res.data);
      } catch (err) {
        console.error('Erro ao carregar itens', err);
      }
    };

    fetchSetores();
    fetchItens();
  }, [token]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    if (type === 'checkbox') {
      if (name === 'atividade') {
        // Se marcar "atividade", desmarca "moeda"
        setForm((prev) => ({
          ...prev,
          atividade: checked,
          moeda: checked ? false : prev.moeda
        }));
      } else if (name === 'moeda') {
        // Se marcar "moeda", desmarca "atividade"
        setForm((prev) => ({
          ...prev,
          moeda: checked,
          atividade: checked ? false : prev.atividade
        }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const removerInstituicao = (nome) => {
    setInstituicoes((prev) => prev.filter((inst) => inst !== nome));
  };

  const limparFormulario = () => {
    setForm({
      nome: '',
      detalhes: '',
      setorId: '',
      ano: currentYear,
      atividade: false,
      moeda: false
    });
    setInstituicoes(['FIEAM', 'SESI', 'SENAI', 'IEL']);
    setEditandoId(null);
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...form, instituicoes };

      if (editandoId) {
        await api.put(`/itens/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Item atualizado com sucesso!');
      } else {
        console.log(payload)
        await api.post('/itens', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Item cadastrado com sucesso!');
      }

      limparFormulario();

      // Recarregar lista de itens após inserir/atualizar
      const res = await api.get('/itens', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItens(res.data);
    } catch (error) {
      console.error('Erro ao salvar item:', error);
    }
  };

  const handleEditar = (item) => {
    setForm({
      nome: item.nome,
      detalhes: item.detalhes,
      setorId: item.setor_id,
      ano: item.ano,
      atividade: item.atividade,
      moeda: item.moeda || false
    });
    if (item.instituicoes) {
      setInstituicoes(item.instituicoes);
    }
    setEditandoId(item.id);
  };

  const handleExcluir = async (id) => {
    try {
      await api.delete(`/itens/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Item excluído com sucesso!');
      setItens((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Erro ao excluir item:', error);
    }
  };

  // Se ainda não houver setores carregados, não renderiza nada
  if (!setores.length) {
    return (
      <Box p={3}>
        <Typography>Carregando setores...</Typography>
      </Box>
    );
  }

  // Quando mudar a aba, abaSetor será o índice em `setores`
  const setorSelecionado = setores[abaSetor];

  return (
    <Box p={3}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" mb={2}>
          {editandoId ? 'Editar Indicador' : 'Cadastro de Indicador'}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nome do Indicador"
              name="nome"
              fullWidth
              value={form.nome}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Detalhes"
              name="detalhes"
              fullWidth
              value={form.detalhes}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Setor"
              name="setorId"
              fullWidth
              value={form.setorId}
              onChange={handleChange}
            >
              {setores.map((setor) => (
                <MenuItem key={setor.id} value={setor.id}>
                  {setor.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Ano"
              name="ano"
              fullWidth
              value={form.ano}
              onChange={handleChange}
            >
              {anos.map((ano) => (
                <MenuItem key={ano} value={ano}>
                  {ano}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Instituições Selecionadas:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {instituicoes.map((inst) => (
                <Chip
                  key={inst}
                  label={inst}
                  onDelete={() => removerInstituicao(inst)}
                  deleteIcon={<DeleteIcon />}
                />
              ))}
            </Box>
            <br />
            <FormControlLabel
              label="Conta como atividade?"
              labelPlacement="end"
              control={
                <Checkbox
                  name="atividade"
                  checked={form.atividade}
                  onChange={handleChange}
                />
              }
            />
            <FormControlLabel
              label="É valor em dinheiro?"
              labelPlacement="end"
              control={
                <Checkbox
                  name="moeda"
                  checked={form.moeda}
                  onChange={handleChange}
                />
              }
            />
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button variant="contained" onClick={handleSubmit}>
            {editandoId ? 'Atualizar Item' : 'Cadastrar Item'}
          </Button>
          {editandoId && (
            <Button onClick={limparFormulario} sx={{ ml: 2 }}>
              Cancelar
            </Button>
          )}
        </Box>
      </Paper>

      {/* Tabela de Itens */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Itens Cadastrados
        </Typography>

        {/* Abas dos Setores dinamicamente */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={abaSetor}
            onChange={(e, newValue) => setAbaSetor(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Abas por setor"
          >
            {setores.map((setor, index) => (
              <Tab key={setor.id} label={setor.nome} />
            ))}
          </Tabs>
        </Box>

        {/* Conteúdo da aba atual */}
        <Box role="tabpanel" p={2}>
          {setorSelecionado && (
            <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Detalhes</TableCell>
                    <TableCell>Setor</TableCell>
                    <TableCell>Ano</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itens
                    .filter(
                      (item) =>
                        item.setor?.id === setorSelecionado.id ||
                        item.setor_id === setorSelecionado.id
                    )
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell>{item.detalhes}</TableCell>
                        <TableCell>
                          {item.setor?.nome || setorSelecionado.nome}
                        </TableCell>
                        <TableCell>{item.ano}</TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleEditar(item)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleExcluir(item.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {setorSelecionado &&
            !itens.some(
              (item) =>
                item.setor?.id === setorSelecionado.id ||
                item.setor_id === setorSelecionado.id
            ) && (
              <Box mt={2}>
                <Typography variant="body2">
                  Não há indicadores cadastrados para o setor “
                  {setorSelecionado.nome}”.
                </Typography>
              </Box>
            )}
        </Box>
      </Paper>
    </Box>
  );
};

export default CadastroItem;
