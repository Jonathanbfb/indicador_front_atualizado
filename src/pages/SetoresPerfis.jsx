import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import api from '../services/api';

const SetoresPerfis = () => {
  const [setores, setSetores] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [tipo, setTipo] = useState('setor');
  const [form, setForm] = useState({ nome: '', descricao: '', tipo: '' });
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, tipo: '', id: null });

  const token = localStorage.getItem('token');

  function criarSlug(text) {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  const fetchData = async () => {
    if (!token) return;

    try {
      const [resSetores, resPerfis] = await Promise.all([
        api.get('/setores', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/perfis', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSetores(resSetores.data);
      setPerfis(resPerfis.data);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      alert('Erro ao buscar dados. Verifique se está autenticado.');
    }
  };

  const handleSave = async () => {
    if (!token) {
      alert('Sessão expirada. Faça login novamente.');
      return;
    }

    const endpoint = tipo === 'setor' ? '/setores' : '/perfis';
    const payload = tipo === 'perfil'
      ? { nome: form.nome, detalhes: form.descricao, tipo: form.tipo }
      : { nome: form.nome, descricao: form.descricao, slug: (form.nome) };

    try {
      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        payload.slug = criarSlug(payload.nome)
        await api.post(endpoint, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setOpenDialog(false);
      window.location.reload();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar. Verifique se está autenticado.');
    }
  };

  const handleEdit = (item, tipoItem) => {
    setTipo(tipoItem);
    setForm({ nome: item.nome, descricao: item.descricao });
    setEditingId(item.id);
    setOpenDialog(true);
  };

  const handleDelete = async () => {
    if (!token) {
      alert('Sessão expirada. Faça login novamente.');
      return;
    }

    const { id, tipo } = confirmDelete;
    const endpoint = tipo === 'setor' ? '/setores' : '/perfis';

    try {
      await api.delete(`${endpoint}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfirmDelete({ open: false, tipo: '', id: null });
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir. Verifique se está autenticado.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h5">Setores</Typography>
      <br />
      <Button variant="contained" onClick={() => { setTipo('setor'); setOpenDialog(true); }}>Novo Setor</Button>
      <Table sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Descrição</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {setores.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.nome}</TableCell>
              <TableCell>{s.descricao}</TableCell>
              <TableCell>
                <IconButton onClick={() => handleEdit(s, 'setor')}><Edit /></IconButton>
                <IconButton onClick={() => setConfirmDelete({ open: true, tipo: 'setor', id: s.id })}><Delete /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography variant="h5" mt={4}>Perfis</Typography>
      <br />
      <Button variant="contained" onClick={() => { setTipo('perfil'); setOpenDialog(true); }}>Novo Perfil</Button>
      <Table sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Detalhes</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {perfis.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.nome}</TableCell>
              <TableCell>{p.detalhes}</TableCell>
              <TableCell>
                <IconButton onClick={() => handleEdit(p, 'perfil')}><Edit /></IconButton>
                <IconButton onClick={() => setConfirmDelete({ open: true, tipo: 'perfil', id: p.id })}><Delete /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{editingId ? 'Editar' : 'Novo'} {tipo === 'setor' ? 'Setor' : 'Perfil'}</DialogTitle>
        <DialogContent>
          <TextField label="Nome" fullWidth margin="dense" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <TextField label={tipo === 'setor' ? 'Descrição' : 'Detalhes'} fullWidth margin="dense" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, tipo: '', id: null })}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>Tem certeza que deseja excluir este {confirmDelete.tipo}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, tipo: '', id: null })}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Excluir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SetoresPerfis;
