import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Grid,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  InputAdornment,
  Snackbar,
  Alert
} from '@mui/material';
import api from '../services/api';

const AtualizacaoItem = () => {
  const [setores, setSetores] = useState([]);
  const [allItens, setAllItens] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [notificacao, setNotificacao] = useState({ open: false, tipo: 'success', mensagem: '' });
  const [itensFiltrados, setItensFiltrados] = useState([]);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    setorId: '',
    itemId: '',
    ano: String(new Date().getFullYear()),
    mes: '',
    valorFieam: '',  // raw string (e.g. "2000,00" or "100")
    valorSesi: '',
    valorSenai: '',
    valorIel: '',
    totalGeral: 0,   // numeric sum
    estrategia: 'manter'
  });

  const [isMoeda, setIsMoeda] = useState(false);

  const meses = {
    Janeiro: '1',
    Fevereiro: '2',
    Março: '3',
    Abril: '4',
    Maio: '5',
    Junho: '6',
    Julho: '7',
    Agosto: '8',
    Setembro: '9',
    Outubro: '10',
    Novembro: '11',
    Dezembro: '12'
  };

  const anos = ['2029','2028','2027','2026','2025'];
  const token = localStorage.getItem('token');

  const limparFormulario = () => {
    setForm({
      setorId: '',
      itemId: '',
      ano: String(new Date().getFullYear()),
      mes: '',
      valorFieam: '',
      valorSesi: '',
      valorSenai: '',
      valorIel: '',
      totalGeral: 0,
      estrategia: 'manter'
    });
    setItensFiltrados([]);
    setIsMoeda(false);
  };

  const fetchHistorico = async () => {
    try {
      const res = await api.get('/historico', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorico(res.data.historicos);
    } catch (err) {
      console.error('Erro ao buscar histórico', err);
    }
  };

  const fetchData = async () => {
    try {
      const [resSetores, resItens] = await Promise.all([
        api.get('/setores', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/itens', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const setoresFormatados = resSetores.data.filter((setor => setor.nome !== "Setor Padrão"))

      setSetores(setoresFormatados);
      setAllItens(resItens.data);
    } catch (err) {
      console.error('Erro ao buscar setores e itens', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHistorico();
  }, [token]);

  useEffect(() => {
    if (!form.setorId) {
      setItensFiltrados([]);
      setForm(prev => ({ ...prev, itemId: '' }));
      return;
    }
    const filtrados = allItens.filter(i => Number(i.setor_id) === Number(form.setorId));
    setItensFiltrados(filtrados);
    setForm(prev => ({ ...prev, itemId: '' }));
  }, [form.setorId, allItens]);

  useEffect(() => {
    // Recalcula totalGeral sempre que algum valor numérico mudar
    const parseRaw = raw => {
      // converte "2.000,00" ou "2000,00" em número 2000.00
      const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };
    const fieam = parseRaw(form.valorFieam);
    const sesi = parseRaw(form.valorSesi);
    const senai = parseRaw(form.valorSenai);
    const iel = parseRaw(form.valorIel);
    const total = fieam + sesi + senai + iel;
    setForm(prev => ({ ...prev, totalGeral: total }));
  }, [form.valorFieam, form.valorSesi, form.valorSenai, form.valorIel]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'itemId') {
      // Ao selecionar item, checar se tem campo moeda = true
      const selecionado = allItens.find(i => String(i.id) === value);
      setIsMoeda(selecionado?.moeda === true);
    }
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleValorRawChange = (e) => {
    // Permite dígitos e vírgula apenas. Remove pontos de milhar automaticamente
    let raw = e.target.value.replace(/[^\d,]/g, '');
    // Se usuário digitar mais de uma vírgula, pega só a primeira
    const parts = raw.split(',');
    if (parts.length > 2) {
      raw = parts[0] + ',' + parts[1];
    }
    setForm(prev => ({ ...prev, [e.target.name]: raw }));
  };

  const formatCurrencyOnBlur = (name) => {
    // Converte raw para número e depois formata pra "R$ 2.000,00"
    const raw = form[name];
    const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) {
      setForm(prev => ({ ...prev, [name]: '' }));
      return;
    }
    const formatted = num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    // Remove "R$ " do início para armazenar somente "2.000,00"
    const semSimbolo = formatted.replace('R$', '').trim();
    setForm(prev => ({ ...prev, [name]: semSimbolo }));
  };

  const handleFocusValue = (name) => {
    // Ao focar, remove qualquer formatação (retorna raw)
    const raw = form[name];
    if (!raw) return;
    // In case stored as "2.000,00", deixa "2000,00"
    const semPontos = raw.replace(/\./g, '');
    setForm(prev => ({ ...prev, [name]: semPontos }));
  };

  const handleSubmit = async (e) => {
    try {

      e.preventDefault();

      // converte string "2.000,00" → number 2000.00
      const parseRaw = raw => parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
      const payload = {
        setorId: Number(form.setorId),
        itemId: Number(form.itemId),
        ano: Number(form.ano),
        mes: Number(form.mes),
        valorFieam: parseRaw(form.valorFieam),
        valorSesi: parseRaw(form.valorSesi),
        valorSenai: parseRaw(form.valorSenai),
        valorIel: parseRaw(form.valorIel),
        totalGeral: form.totalGeral,
        estrategia: form.estrategia
      };

      await api.put(`itens/atualizar-valor/${payload.itemId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotificacao({
        open: true,
        tipo: 'success',
        mensagem: "Valores atualizados com sucesso!"
      });
      setErro(false);
      limparFormulario();
      fetchHistorico();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      setNotificacao({
        open: true,
        tipo: 'error',
        mensagem: `Erro: ${error.response.data.message}`
      });
    }
  };

  return (
    <Box p={3}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" mb={2}>Atualização de Item</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Setor"
              name="setorId"
              fullWidth
              value={form.setorId}
              onChange={handleChange}
            >
              <MenuItem value="">Selecione um setor</MenuItem>
              {setores.map(setor => (
                <MenuItem key={setor.id} value={String(setor.id)}>
                  {setor.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Item"
              name="itemId"
              fullWidth
              value={form.itemId}
              onChange={handleChange}
              disabled={!form.setorId}
            >
              <MenuItem value="">Selecione um item</MenuItem>
              {itensFiltrados.map(item => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              select
              label="Ano"
              name="ano"
              fullWidth
              value={form.ano}
              onChange={handleChange}
            >
              <MenuItem value="">Selecione o ano</MenuItem>
              {anos.map(ano => (
                <MenuItem key={ano} value={ano}>
                  {ano}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              select
              label="Mês"
              name="mes"
              fullWidth
              value={form.mes}
              onChange={handleChange}
              error={Boolean(erro)}
              helperText={erro || ""}
            >
              <MenuItem value="">Selecione o mês</MenuItem>
              {Object.entries(meses).map(([nomeMes, numeroMes]) => (
                <MenuItem key={numeroMes} value={numeroMes}>
                  {nomeMes}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Valor FIEAM (0 se não houver valor!)"
              name="valorFieam"
              fullWidth
              value={form.valorFieam}
              onChange={isMoeda ? handleValorRawChange : handleChange}
              onBlur={isMoeda ? () => formatCurrencyOnBlur('valorFieam') : undefined}
              onFocus={isMoeda ? () => handleFocusValue('valorFieam') : undefined}
              InputProps={isMoeda ? { startAdornment: <InputAdornment position="start">R$</InputAdornment> } : {}}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Valor SESI (0 se não houver valor!)"
              name="valorSesi"
              fullWidth
              value={form.valorSesi}
              onChange={isMoeda ? handleValorRawChange : handleChange}
              onBlur={isMoeda ? () => formatCurrencyOnBlur('valorSesi') : undefined}
              onFocus={isMoeda ? () => handleFocusValue('valorSesi') : undefined}
              InputProps={isMoeda ? { startAdornment: <InputAdornment position="start">R$</InputAdornment> } : {}}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Valor SENAI (0 se não houver valor!)"
              name="valorSenai"
              fullWidth
              value={form.valorSenai}
              onChange={isMoeda ? handleValorRawChange : handleChange}
              onBlur={isMoeda ? () => formatCurrencyOnBlur('valorSenai') : undefined}
              onFocus={isMoeda ? () => handleFocusValue('valorSenai') : undefined}
              InputProps={isMoeda ? { startAdornment: <InputAdornment position="start">R$</InputAdornment> } : {}}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Valor IEL (0 se não houver valor!)"
              name="valorIel"
              fullWidth
              value={form.valorIel}
              onChange={isMoeda ? handleValorRawChange : handleChange}
              onBlur={isMoeda ? () => formatCurrencyOnBlur('valorIel') : undefined}
              onFocus={isMoeda ? () => handleFocusValue('valorIel') : undefined}
              InputProps={isMoeda ? { startAdornment: <InputAdornment position="start">R$</InputAdornment> } : {}}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField
              label="Total Geral"
              name="totalGeral"
              fullWidth
              value={isMoeda ? totalGeralFormatted(form.totalGeral) : form.totalGeral}
              disabled
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Estratégia de Atualização
            </Typography>
            <RadioGroup
              row
              name="estrategia"
              value={form.estrategia}
              onChange={handleChange}
            >
              <FormControlLabel
                value="somar"
                control={<Radio />}
                label="Somar com valor existente"
              />
              <FormControlLabel
                value="media"
                control={<Radio />}
                label="Média com valor existente"
              />
              <FormControlLabel
                value="manter"
                control={<Radio />}
                label="Manter o último valor"
              />
            </RadioGroup>
          </Grid>
        </Grid>

        <Box mt={3}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!form.setorId || !form.itemId || !form.mes}
          >
            Atualizar Indicador
          </Button>
        </Box>
      </Paper>

      <Box p={3}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" mb={2}>
            Histórico de Alterações
          </Typography>

          <TableContainer
            sx={{
              maxHeight: 400,
              overflow: 'auto'
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Setor</TableCell>
                  <TableCell>Ano</TableCell>
                  <TableCell>Mês</TableCell>
                  <TableCell>FIEAM</TableCell>
                  <TableCell>SESI</TableCell>
                  <TableCell>SENAI</TableCell>
                  <TableCell>IEL</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Data da Alteração</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.usuario.nome}</TableCell>
                    <TableCell>{h.item.nome}</TableCell>
                    <TableCell>{h.setor.nome}</TableCell>
                    <TableCell>{h.ano}</TableCell>
                    <TableCell>{h.mes}</TableCell>
                    <TableCell>{h.valorFieam}</TableCell>
                    <TableCell>{h.valorSesi}</TableCell>
                    <TableCell>{h.valorSenai}</TableCell>
                    <TableCell>{h.valorIel}</TableCell>
                    <TableCell>{h.totalGeral}</TableCell>
                    <TableCell>
                      {new Date(h.dataAlteracao).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
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
    </Box>
  );
};

const totalGeralFormatted = (num) => {
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

export default AtualizacaoItem;
