import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
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
import AuthMiddleware from './middlewares/authMiddleware';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};
const ProtectedRoute = ({ children, perfisPermitidos }) => {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  if (!token || !usuario) {
    return <Navigate to="/login" />;
  }
  if (!perfisPermitidos.includes(usuario.perfil)) {
    return <Navigate to="/menu" />;
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
        <Route element={<AuthMiddleware />}>
        <Route path="/setor/Comercial" element={<Comercial />} />
        <Route path="/setor/Geral" element={<Geral />} />
        <Route path="/setor/:slug" element={<SetorPage />} />

        {/* Rotas protegidas dentro do layout com a AppBar */}
        <Route element={ <LayoutComBarra />}>
          <Route path="/menu" element={<PrivateRoute><Menu /></PrivateRoute>} />

          <Route path="/usuarios" element={
            <ProtectedRoute perfisPermitidos={['Administrador']}>
              <Usuarios />
            </ProtectedRoute>
          } />

          <Route path="/setores" element={
            <ProtectedRoute perfisPermitidos={['Administrador']}>
              <SetoresPerfis />
            </ProtectedRoute>
          } />

          <Route path="/itens" element={
            <ProtectedRoute perfisPermitidos={['Administrador']}>
              <CadastroItem />
            </ProtectedRoute>
          } />

          <Route path="/atualizar" element={
            <ProtectedRoute perfisPermitidos={['Administrador', 'Usuario_Editor']}>
              <AtualizacaoItem />
            </ProtectedRoute>
          } />

          <Route path="/dias-uteis" element={
            <ProtectedRoute perfisPermitidos={['Administrador', 'Usuario_Editor', 'Lideres']}>
              <JornadaColaboradores></JornadaColaboradores>
            </ProtectedRoute>
          } />
          </Route>
        </Route>

      </Routes>
      
    </Router>
  );
}

export default App;
