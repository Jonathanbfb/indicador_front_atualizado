import React, { useState, useRef } from 'react';
import {
  TextField, Button, Box, Typography, Paper, InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

import logo from "../assets/fieam.png";
import neutro from "../assets/neutro_sorrindo.gif";
import olhosFechados from "../assets/olhos_fechados.gif";
import maoCobrindo from "../assets/mao_cobrindo.gif";
import espiandoEntreDedos from "../assets/espiando_entre_dedos.gif";
import confuso from "../assets/confuso.png";
import logo2 from "../assets/logo.png";
import jwt from 'jwt-simple';


const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [imagemAtual, setImagemAtual] = useState(neutro);

  const emailRef = useRef(null);
  const senhaRef = useRef(null);

  const navigate = useNavigate();

  const handleFocus = (campo) => {
    if (campo === 'email') setImagemAtual(olhosFechados);
    if (campo === 'senha') setImagemAtual(maoCobrindo);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (
        document.activeElement !== emailRef.current &&
        document.activeElement !== senhaRef.current
      ) {
        setImagemAtual(neutro);
      }
    }, 100);
  };

  const handleToggleMostrarSenha = () => {
    setMostrarSenha((prev) => {
      const novoEstado = !prev;
      if (novoEstado) {
        setImagemAtual(espiandoEntreDedos);
      } else {
        setImagemAtual(maoCobrindo);
      }
      return novoEstado;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    // Login com backend
    try {
      const response = await api.post('/auth/login', {
        username: email,
        password: senha
      });

      const { token, usuario } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      localStorage.setItem('email', email);

      alert('Login realizado com sucesso!');
      navigate('/menu');
    } catch (error) {
       const backendError = error.response?.data;
  console.error('Erro ao logar:', backendError || error);
  setErro(backendError?.message || 'Erro ao tentar login');
  setImagemAtual(confuso);



    }
  };


  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: `url(${logo2})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        animation: 'wave 10s infinite ease-in-out'
      }}
    >
      <Paper elevation={6} sx={{
        p: 4,
        width: 400,
        borderRadius: 3,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255,255,255,0.9)'
      }}>
        <Typography variant="h5" mb={2} align="center">
          SISTEMA INDICADORES DCM
        </Typography>

        <Box textAlign="center" mb={2}>
          <img
            src={imagemAtual}
            alt="Animação do personagem"
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              transition: 'all 0.5s ease-in-out'
            }}
          />
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={email}
            inputRef={emailRef}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => handleFocus('email')}
            onBlur={handleBlur}
          />

          <TextField
            label="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={senha}
            inputRef={senhaRef}
            onChange={(e) => setSenha(e.target.value)}
            onFocus={() => handleFocus('senha')}
            onBlur={handleBlur}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleToggleMostrarSenha} edge="end">
                    {mostrarSenha ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {erro && (
            <Typography color="error" mt={1}>{erro}</Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 2,
              transition: '0.3s',
              ':hover': {
                transform: 'scale(1.05)',
                backgroundColor: 'primary.dark'
              }
            }}
          >
            Entrar
          </Button>
        </form>

        <Box textAlign="center" mt={4}>
          <img src={logo} alt="Logo" width={100} style={{ marginBottom: 8 }} />
          <br></br>
          <Typography variant="caption" color="text.secondary">
            © 2025 Superintendência Corporativa (SUCOR)
          </Typography>
        </Box>
      </Paper>

      <style>
        {`
          @keyframes wave {
            0% { background-position: 50% 50%; }
            50% { background-position: 52% 48%; }
            100% { background-position: 50% 50%; }
          }
        `}
      </style>
    </Box>
  );
};

export default Login;
