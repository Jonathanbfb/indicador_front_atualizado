import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Paper,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import api from '../services/api';

const SetoresPerfis = () => {
  const [setores, setSetores] = useState([]);
  const [form, setForm] = useState({ nome: '', ordem: '' });
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const token = localStorage.getItem('token');

  function criarSlug(text) {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await api.get('/setores', { headers: { Authorization: `Bearer ${token}` } });
      setSetores(res.data);
    } catch (err) {
      console.error('Erro ao buscar setores:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) return;

    const payload = {
      nome: form.nome,
      ordem: Number(form.ordem) || 0,
      slug: criarSlug(form.nome),
    };

    try {
      if (editingId) {
        await api.put(`/setores/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/setores', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setForm({ nome: '', ordem: '' });
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar setor.');
    }
  };

  const handleEdit = (setor) => {
    setForm({ nome: setor.nome, ordem: setor.ordem ?? '' });
    setEditingId(setor.id);
  };

  const handleToggleOculto = async (setor) => {
    try {
      await api.put(`/setores/${setor.id}`, {
        nome: setor.nome,
        slug: setor.slug,
        ordem: setor.ordem,
        oculto: !setor.oculto,
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      console.error('Erro ao alterar visibilidade:', err);
      alert('Erro ao alterar visibilidade do setor.');
    }
  };

  const handleCancel = () => {
    setForm({ nome: '', ordem: '' });
    setEditingId(null);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/setores/${confirmDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmDelete({ open: false, id: null });
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir setor.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 860, mx: 'auto' }}>

      {/* Card do formulário */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 3 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1976d2', mb: 2.5 }}>
          {editingId ? 'Editar Setor' : 'Novo Setor'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#374151', mb: 0.5 }}>
              Nome do Setor
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Nome do setor"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ width: 120 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#374151', mb: 0.5 }}>
              Ordem
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              placeholder="0"
              value={form.ordem}
              onChange={e => setForm({ ...form, ordem: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleSave}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: '#1976d2',
                '&:hover': { backgroundColor: '#1565c0' },
              }}
            >
              Salvar
            </Button>

            {editingId && (
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#d1d5db',
                  color: '#374151',
                  '&:hover': { borderColor: '#9ca3af' },
                }}
              >
                Cancelar
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Card da tabela */}
      <Paper elevation={0} sx={{ border: '1px solid #e8edf5', borderRadius: 3, p: 3 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#1976d2', mb: 2.5 }}>
          Setores cadastrados
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              {['Ordem', 'Nome', 'Slug', 'Visível', 'Ações'].map((col) => (
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
            {setores
              .filter(s => s.nome !== 'Setor Padrão')
              .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
              .map((s) => (
                <TableRow
                  key={s.id}
                  sx={{ '&:hover': { backgroundColor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9' } }}
                >
                  <TableCell sx={{ fontSize: 14, color: '#1976d2', fontWeight: 600, width: 80 }}>
                    {s.ordem ?? '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 14, color: '#1a2744', fontWeight: 500 }}>
                    {s.nome}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: '#1976d2' }}>
                    {s.slug}
                  </TableCell>
                  <TableCell sx={{ width: 80 }}>
                    <Tooltip title={s.oculto ? 'Oculto no painel' : 'Visível no painel'} arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleOculto(s)}
                        sx={{ color: s.oculto ? '#d1d5db' : '#16a34a', '&:hover': { color: s.oculto ? '#1976d2' : '#15803d' } }}
                      >
                        {s.oculto ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ width: 100 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(s)}
                      sx={{ color: '#6b7280', '&:hover': { color: '#1976d2' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setConfirmDelete({ open: true, id: s.id })}
                      sx={{ color: '#6b7280', '&:hover': { color: '#ef4444' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Confirmação de exclusão */}
      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>Tem certeza que deseja excluir este setor?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, id: null })} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ textTransform: 'none' }}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SetoresPerfis;
