import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, IconButton } from '@mui/material';
import {
  Visibility as EyeIcon,
  VisibilityOff as EyeOffIcon,
} from '@mui/icons-material';
import api from '../services/api';
import loginBg from '../assets/64-anos-FIEAM.jpg';

const FORM_REDEF_VAZIO = { email: '', novaSenha: '', confirmarSenha: '' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [openRedef, setOpenRedef] = useState(false);
  const [formRedef, setFormRedef] = useState(FORM_REDEF_VAZIO);
  const [showNova, setShowNova] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingRedef, setLoadingRedef] = useState(false);
  const [msgRedef, setMsgRedef] = useState({ text: '', tipo: '' });

  const fecharRedef = () => {
    setOpenRedef(false);
    setFormRedef(FORM_REDEF_VAZIO);
    setShowNova(false);
    setShowConfirm(false);
    setMsgRedef({ text: '', tipo: '' });
  };

  const handleRedefinir = async () => {
    if (!formRedef.email || !formRedef.novaSenha || !formRedef.confirmarSenha) {
      setMsgRedef({ text: 'Preencha todos os campos.', tipo: 'erro' });
      return;
    }
    if (formRedef.novaSenha !== formRedef.confirmarSenha) {
      setMsgRedef({ text: 'Nova senha e confirmação não coincidem.', tipo: 'erro' });
      return;
    }
    setLoadingRedef(true);
    try {
      await api.post('/auth/redefinir-senha', {
        email: formRedef.email,
        novaSenha: formRedef.novaSenha,
      });
      setMsgRedef({ text: 'Senha redefinida! Faça login com a nova senha.', tipo: 'sucesso' });
      setTimeout(fecharRedef, 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao redefinir senha.';
      setMsgRedef({ text: msg, tipo: 'erro' });
    } finally {
      setLoadingRedef(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/menu', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Informe o e-mail e a senha para acessar o sistema.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: email,
        password,
      });
      const { token, usuario } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      localStorage.setItem('email', email);
      navigate('/menu', { replace: true });
    } catch (err) {
      const backendError = err.response?.data;
      setError(backendError?.message || 'Usuário ou senha inválidos.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 32,
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: 'white',
    fontSize: 15,
    minHeight: 52,
    outline: 'none',
    transition: 'box-shadow 0.2s',
    textAlign: 'center',
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Imagem de fundo */}
      <img
        src={loginBg}
        alt="Fundo FIEAM"
        style={{ position: 'absolute', inset: 0, height: '100%', width: '100%', objectFit: 'cover' }}
      />

      {/* Gradiente escuro */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.40) 50%, rgba(8,35,80,0.95) 100%)',
        }}
      />

      {/* Conteúdo */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 448, textAlign: 'center' }}>
          <h1
            style={{
              fontWeight: 800,
              color: 'white',
              fontSize: 'clamp(32px, 5vw, 48px)',
              margin: 0,
              textShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            Bem-vindo!
          </h1>
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 16, color: 'rgba(255,255,255,0.90)' }}>
            Faça login para acessar o sistema de indicadores
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Campo de email */}
            <input
              type="email"
              placeholder="Usuário"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ ...inputStyle, padding: '14px 20px' }}
              onFocus={e => (e.target.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.45)')}
              onBlur={e => (e.target.style.boxShadow = 'none')}
            />

            {/* Campo de senha */}
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, padding: '14px 52px 14px 20px' }}
                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.45)')}
                onBlur={e => (e.target.style.boxShadow = 'none')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#111', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOffIcon style={{ fontSize: 20 }} /> : <EyeIcon style={{ fontSize: 20 }} />}
              </button>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(211,47,47,0.28)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 24,
                  padding: '10px 18px',
                  color: '#ffdddd',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              fullWidth
              sx={{
                minHeight: 52,
                borderRadius: 32,
                fontSize: 16,
                fontWeight: 700,
                textTransform: 'none',
                backgroundColor: '#1976d2',
                color: '#fff',
                boxShadow: '0 6px 20px rgba(25,118,210,0.45)',
                transition: '0.25s ease',
                '&:hover': {
                  backgroundColor: '#1565c0',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 10px 28px rgba(25,118,210,0.55)',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(25,118,210,0.55)',
                  color: 'white',
                },
              }}
            >
              {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Entrar'}
            </Button>
          </form>

          {/* Link Redefinir Senha */}
          <p style={{ marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.90)' }}>
            <button
              type="button"
              onClick={() => setOpenRedef(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'white', textDecoration: 'underline', fontSize: 14, padding: 0 }}
            >
              Redefinir Senha
            </button>
          </p>

          {/* Link Cadastre-se */}
          <p style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.90)' }}>
            Não tem uma conta?{' '}
            <Link
              to="/cadastro"
              style={{ fontWeight: 700, color: 'white', textDecoration: 'underline' }}
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>

      {/* Dialog Redefinir Senha */}
      <Dialog open={openRedef} onClose={fecharRedef} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Redefinir Senha</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="E-mail cadastrado"
            type="email"
            fullWidth
            margin="dense"
            value={formRedef.email}
            onChange={e => setFormRedef(p => ({ ...p, email: e.target.value }))}
          />
          <TextField
            label="Nova senha"
            type={showNova ? 'text' : 'password'}
            fullWidth
            margin="dense"
            value={formRedef.novaSenha}
            onChange={e => setFormRedef(p => ({ ...p, novaSenha: e.target.value }))}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowNova(v => !v)} edge="end" tabIndex={-1}>
                    {showNova ? <EyeOffIcon fontSize="small" style={{ color: '#111' }} /> : <EyeIcon fontSize="small" style={{ color: '#111' }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirmar nova senha"
            type={showConfirm ? 'text' : 'password'}
            fullWidth
            margin="dense"
            value={formRedef.confirmarSenha}
            onChange={e => setFormRedef(p => ({ ...p, confirmarSenha: e.target.value }))}
            error={formRedef.confirmarSenha.length > 0 && formRedef.confirmarSenha !== formRedef.novaSenha}
            helperText={formRedef.confirmarSenha.length > 0 && formRedef.confirmarSenha !== formRedef.novaSenha ? 'Senhas não coincidem' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowConfirm(v => !v)} edge="end" tabIndex={-1}>
                    {showConfirm ? <EyeOffIcon fontSize="small" style={{ color: '#111' }} /> : <EyeIcon fontSize="small" style={{ color: '#111' }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {msgRedef.text && (
            <p style={{
              marginTop: 8, fontSize: 13, textAlign: 'center',
              color: msgRedef.tipo === 'sucesso' ? '#16a34a' : '#dc2626',
            }}>
              {msgRedef.text}
            </p>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={fecharRedef} disabled={loadingRedef}>Cancelar</Button>
          <Button variant="contained" onClick={handleRedefinir} disabled={loadingRedef}>
            {loadingRedef ? 'Salvando…' : 'Redefinir'}
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        input::placeholder { color: rgba(255, 255, 255, 0.70); }
      `}</style>
    </div>
  );
}
