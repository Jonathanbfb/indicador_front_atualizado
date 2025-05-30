// src/components/AuthMiddleware.jsx
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const AuthMiddleware = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const validarToken = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                // Não há token: limpa storage e redireciona para /login
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                localStorage.removeItem('email');
                navigate('/login', { replace: true });
                return;
            }

            try {
                // Faz GET /auth/validar (axios já injeta o Authorization via interceptor)
                const response = await api.get('/auth/validar', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                // Token válido → libera acesso às rotas-filhas
                localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
                localStorage.setItem('email', response.data.usuario.email);
                setChecking(false);
            } catch (err) {
                // Se der 401 ou outro erro, limpa storage e manda pra /login
                if (err.response && err.response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('usuario');
                    localStorage.removeItem('email');
                } else {
                    console.error('Erro ao validar token:', err);
                    localStorage.removeItem('token');
                    localStorage.removeItem('usuario');
                    localStorage.removeItem('email');
                }
                if (location.pathname !== '/login') {
                    navigate('/login', { replace: true });
                }
            }
        };

        validarToken();
    }, [navigate, location]);

    if (checking) {
        return <div>Verificando autenticação...</div>;
    }

    // Se chegou aqui, token é válido → renderiza rotas-filhas
    return <Outlet />;
};

export default AuthMiddleware;
