import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Table, TableHead, TableBody,
  TableRow, TableCell, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, InputLabel, FormControl, Snackbar, Alert
} from '@mui/material';
import { Edit, Refresh, Delete } from '@mui/icons-material';
import api from '../services/api';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [setores, setSetores] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    setorIds: [],
    perfilId: '',
    jornadaTrabalho: '',
    statusSenha: false
  });
  const [editingId, setEditingId] = useState(null);
  const [notificacao, setNotificacao] = useState({ open: false, tipo: 'success', mensagem: '' });

  const token = localStorage.getItem('token');

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios', { headers: { Authorization: `Bearer ${token}` } });
      setUsuarios(res.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setNotificacao({ open: true, tipo: 'error', mensagem: 'Erro ao buscar usuários' });
    }
  };

  const fetchSetoresPerfis = async () => {
    try {
      const [resSetores, resPerfis] = await Promise.all([
        api.get('/setores', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/perfis', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSetores(resSetores.data);
      setPerfis(resPerfis.data);
    } catch (error) {
      console.error('Erro ao buscar setores ou perfis:', error);
      setNotificacao({ open: true, tipo: 'error', mensagem: 'Erro ao buscar setores ou perfis' });
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {

        if (form.perfilId === "" || form.setorIds.length === 0 || form.jornadaTrabalho === '') {
          setNotificacao({ open: true, tipo: 'error', mensagem: 'Há informações faltando, Tente novamente!' });
          return
        }

        await api.put(`/usuarios/${editingId}`, form, { headers: { Authorization: `Bearer ${token}` } });
        setNotificacao({ open: true, tipo: 'success', mensagem: 'Usuário atualizado com sucesso!' });
      } else {

        if (form.perfilId === "" || form.setorIds.length === 0 || form.jornadaTrabalho === '') {
          setNotificacao({ open: true, tipo: 'error', mensagem: 'Há informações faltando, Tente novamente!' });
          return
        }

        await api.post('/usuarios', form, { headers: { Authorization: `Bearer ${token}` } });
        setNotificacao({ open: true, tipo: 'success', mensagem: 'Usuário cadastrado com sucesso!' });
      }

      setOpenDialog(false);
      setForm({ nome: '', email: '', senha: '', setorIds: [], perfilId: '', jornadaTrabalho: '', statusSenha: false });
      console.log(form)
      setEditingId(null);
      fetchUsuarios();
    } catch (error) {
      const msg = error.response?.data?.message || 'Erro ao salvar usuário';
      console.error(msg);
      setNotificacao({ open: true, tipo: 'error', mensagem: msg });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/usuarios/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setNotificacao({ open: true, tipo: 'success', mensagem: 'Usuário excluído com sucesso!' });
      fetchUsuarios();
    } catch (error) {
      const msg = error.response?.data?.erro || 'Erro ao excluir usuário';
      console.error(msg);
      setNotificacao({ open: true, tipo: 'error', mensagem: msg });
    }
  };

  const handleResetSenha = async (id) => {
    try {
      await api.patch(`/usuarios/${id}/reset-senha`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotificacao({ open: true, tipo: 'success', mensagem: 'Senha resetada com sucesso!' });
      fetchUsuarios();
    } catch (error) {
      const msg = error.response?.data?.erro || 'Erro ao resetar senha';
      console.error(msg);
      setNotificacao({ open: true, tipo: 'error', mensagem: msg });
    }
  };

  const handleEdit = (usuario) => {
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      setorIds: usuario.setorIds || [],
      perfilId: usuario.perfilId,
      jornadaTrabalho: usuario.jornadaTrabalho,
      statusSenha: usuario.statusSenha
    });
    setEditingId(usuario.id);
    setOpenDialog(true);
  };

  useEffect(() => {
    fetchUsuarios();
    fetchSetoresPerfis();
  }, []);

  return (
    <Box p={3}>
      <Typography variant="h5">Usuários</Typography>
      <Button onClick={() => setOpenDialog(true)} variant="contained" sx={{ mt: 2 }}>Novo Usuário</Button>

      <Table sx={{ mt: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Status da Senha</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.nome}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.statusSenha ? 'Alterada' : 'Inicial'}</TableCell>
              <TableCell>
                <IconButton onClick={() => handleEdit(u)}><Edit /></IconButton>
                <IconButton onClick={() => handleResetSenha(u.id)}><Refresh /></IconButton>
                <IconButton color="error" onClick={() => handleDelete(u.id)}><Delete /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogContent>
          <TextField label="Nome" fullWidth margin="dense" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <TextField label="Email" fullWidth margin="dense" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="Senha" type="password" fullWidth margin="dense" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />

          <FormControl fullWidth margin="dense">
            <InputLabel>Setores</InputLabel>
            <Select
              multiple
              value={form.setorIds}
              label="Setores"
              onChange={(e) => setForm({ ...form, setorIds: e.target.value })}
            >
              {setores.map((setor) => (
                <MenuItem key={setor.id} value={setor.id}>{setor.nome}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>Perfil</InputLabel>
            <Select value={form.perfilId} label="Perfil" onChange={(e) => setForm({ ...form, perfilId: e.target.value })}>
              {perfis.map((perfil) => (
                <MenuItem key={perfil.id} value={perfil.id}>{perfil.nome}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField label="Jornada de Trabalho (ex: 08:00)" fullWidth margin="dense" value={form.jornadaTrabalho.trim()} onChange={(e) => setForm({ ...form, jornadaTrabalho: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notificacao.open}
        autoHideDuration={5000}
        onClose={() => setNotificacao({ ...notificacao, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setNotificacao({ ...notificacao, open: false })} severity={notificacao.tipo} variant="filled">
          {notificacao.mensagem}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Usuarios;
