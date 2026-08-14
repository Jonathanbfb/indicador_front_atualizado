import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import { KeyboardArrowDown as ChevronDown, Menu as MenuIcon } from '@mui/icons-material';
import AppSidebar from '../components/layout/AppSidebar';

export default function LayoutComBarra() {
  const isMobile = useMediaQuery('(max-width:768px)');
  const [mobileOpen, setMobileOpen] = useState(false);

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const nomeUsuario =
    usuario?.nome || usuario?.full_name || usuario?.username || usuario?.email || 'Usuário';
  const primeiroNome = nomeUsuario.split(' ')[0];
  const initial = nomeUsuario.trim().charAt(0).toUpperCase();

  return (
    /*
      height: 100vh   → trava o layout na altura da viewport (sem área branca abaixo)
      overflow: hidden → impede que filhos estourem verticalmente para fora do container
      O scroll acontece DENTRO do <main>, não no body
    */
    <div style={{ height: '100vh', display: 'flex', width: '100%', background: '#f4f7fb', overflow: 'hidden' }}>

      {/* Sidebar — flexShrink:0 + display:flex para manter o comportamento do Drawer */}
      <div className="no-print" style={{ flexShrink: 0, display: 'flex' }}>
        <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>

      {/*
        Coluna direita: header fixo + main com scroll
        minHeight: 0 é obrigatório para que o flex-child possa encolher abaixo do seu conteúdo
      */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>

        <header
          className="no-print"
          style={{
            flexShrink: 0,        /* nunca comprimir o header */
            height: 64,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e3e8ef',
            padding: '0 16px 0 24px',
            background: 'rgba(255,255,255,0.96)',
            gap: 12,
            zIndex: 10,
            boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
          }}
        >
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8,
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: '#374151', flexShrink: 0,
              }}
            >
              <MenuIcon style={{ fontSize: 22 }} />
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: isMobile ? 15 : 20,
                fontWeight: 800,
                color: '#1f2937',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Diretoria Corporativa de Marketing
            </h1>
          </div>

          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 999,
              border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 14, color: '#1f2937', flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d47a1, #1976d2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 700,
                boxShadow: '0 3px 8px rgba(13,71,161,0.25)',
              }}
            >
              {initial}
            </div>
            {!isMobile && <span style={{ fontWeight: 600 }}>{primeiroNome}</span>}
            {!isMobile && <ChevronDown style={{ fontSize: 16, color: '#6b7280' }} />}
          </button>
        </header>

        {/*
          main: flex: 1 1 0 + minHeight: 0
          — o par que permite o scroll funcionar corretamente em flex:
            flex: 1 1 0  → cresce para preencher, mas pode encolher
            minHeight: 0 → sem isso, flex não deixa o filho encolher abaixo do conteúdo
          overflowY: auto → scroll só aparece quando o conteúdo é maior que o espaço
        */}
        <main
          className="layout-main"
          style={{
            flex: '1 1 0',
            minHeight: 0,
            padding: isMobile ? 16 : 32,
            overflowY: 'auto',
            overflowX: 'auto',
          }}
        >
          <div style={{ width: '100%' }}>
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
