import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import SetoresPerfis from './pages/SetoresPerfis';
import Menu from './pages/Menu';
import Usuarios from './pages/Usuarios';
import CadastroItem from './pages/CadastroItem';
import AtualizacaoItem from './pages/AtualizacaoItem';
import LayoutComBarra from './pages/LayoutComBarra';
import Comercial from './pages/setores/Comercial';
import Geral from './pages/setores/Geral';
import JornadaColaboradores from './pages/JornadaColaboradores';
import SetorPage from './pages/setores/SetorPage';
import CadastroResumo from './pages/CadastroResumo';
import Auditoria from './pages/Auditoria';
import Relatorio from './pages/Relatorio';
import AuthMiddleware from './middlewares/authMiddleware';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const ProtectedRoute = ({ children, perfisPermitidos }) => {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  if (!token || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!perfisPermitidos.includes(usuario.perfil)) {
    return <Navigate to="/menu" replace />;
  }

  return children;
};

function App() {
  return (
    <Router basename="/indicadores">
      <Routes>
        {/* Login fora do layout */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Signup />} />

        <Route element={<AuthMiddleware />}>
          {/* Rotas de setores — standalone, sem sidebar para não restringir a tabela */}
          <Route path="/setor/Comercial" element={<Comercial />} />
          <Route path="/setor/Geral" element={<Geral />} />
          <Route path="/setor/:slug" element={<SetorPage />} />

          {/* Rotas protegidas dentro do layout principal */}
          <Route element={<LayoutComBarra />}>
            <Route
              path="/menu"
              element={
                <PrivateRoute>
                  <Menu />
                </PrivateRoute>
              }
            />

            {/* Rota antiga e rota nova para usuários */}
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <Usuarios />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cadastrar/usuario"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <Usuarios />
                </ProtectedRoute>
              }
            />

            {/* Rota antiga e rota nova para setores */}
            <Route
              path="/setores"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <SetoresPerfis />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cadastrar/setor"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <SetoresPerfis />
                </ProtectedRoute>
              }
            />

            {/* Rota antiga e rota nova para cadastro de indicadores */}
            <Route
              path="/itens"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <CadastroItem />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cadastrar/indicadores"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <CadastroItem />
                </ProtectedRoute>
              }
            />

            {/* Rota antiga e rota nova para atualização de indicadores */}
            <Route
              path="/atualizar"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador', 'Usuario_Editor']}>
                  <AtualizacaoItem />
                </ProtectedRoute>
              }
            />

            <Route
              path="/atualizar/indicadores"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador', 'Usuario_Editor']}>
                  <AtualizacaoItem />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dias-uteis"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador', 'Usuario_Editor', 'Lideres']}>
                  <JornadaColaboradores />
                </ProtectedRoute>
              }
            />

            {/* Futuras rotas da atualização nova */}
            <Route
              path="/admin/resumo"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <CadastroResumo />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/auditoria"
              element={
                <ProtectedRoute perfisPermitidos={['Administrador']}>
                  <Auditoria />
                </ProtectedRoute>
              }
            />

            <Route
              path="/relatorio"
              element={
                <PrivateRoute>
                  <Relatorio />
                </PrivateRoute>
              }
            />
          </Route>
        </Route>

        {/* Qualquer rota inválida volta para o menu */}
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </Router>
  );
}

export default App;