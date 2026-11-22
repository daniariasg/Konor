import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabase.js';
import Login from './components/auth/Login.jsx';
import DashboardView from './components/dashboard/views/DashboardView.jsx';
import Directorio from './components/directorio/Directorio.jsx';
import CargaMasivaView from './components/configuracion/views/CargaMasivaView.jsx';
import ModuloEventos from './components/turnos/ModuloEventos.jsx';
import ConfiguracionView from './components/configuracion/views/ConfiguracionView.jsx';
import LedgerView from './components/ledger/views/LedgerView.jsx';

import { 
  Users, 
  CalendarDays, 
  FileSpreadsheet, 
  LayoutDashboard, 
  SlidersHorizontal,
  History,
  LogOut, 
  Menu, 
  X,
  ShieldCheck 
} from 'lucide-react';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Dashboard es la primera vista al iniciar o refrescar
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [turnoDirecto, setTurnoDirecto] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoadingSession(false);
    }).catch(() => {
      setSession(null);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT' || !newSession) {
        setActiveTab('dashboard');
        setTurnoDirecto(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setSession(null);
    }
  };

  // Manejador de navegación con paso de parámetros para turnos
  const handleNavegar = (tab, params = null) => {
    if (tab === 'turnos' && params?.turno) {
      setTurnoDirecto(params.turno);
    } else {
      setTurnoDirecto(null);
    }
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  if (loadingSession) {
    return (
      <div className="konor-loading-screen" role="status" aria-live="polite">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="konor-spinner" />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            VERIFICANDO SESIÓN...
          </span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={(userSession) => setSession(userSession)} />;
  }

  return (
    <div className="konor-app-layout">
      {/* Botón flotante móvil (Hamburguesa) */}
      <button 
        type="button"
        className="konor-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Abrir menú de navegación"
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div 
          className="konor-sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true" 
        />
      )}

      {/* Sidebar Institucional */}
      <aside className={`konor-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="konor-sidebar-brand">
          <div className="konor-brand-logo">
            <span className="konor-brand-title">KONOR</span>
          </div>
          <button 
            type="button" 
            className="konor-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="konor-sidebar-nav" role="navigation">
          {/* 1. Dashboard en la primera posición */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavegar('dashboard')}
          >
            <LayoutDashboard className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Dashboard</span>
          </button>

          {/* 2. Turnos y Eventos */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'turnos' ? 'active' : ''}`}
            onClick={() => handleNavegar('turnos')}
          >
            <CalendarDays className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Turnos y Eventos</span>
          </button>

          {/* 3. Alumnos Ayudantes */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'directorio' ? 'active' : ''}`}
            onClick={() => handleNavegar('directorio')}
          >
            <Users className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Alumnos Ayudantes</span>
          </button>

          {/* 4. Carga Masiva (Excel) */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'carga-masiva' ? 'active' : ''}`}
            onClick={() => handleNavegar('carga-masiva')}
          >
            <FileSpreadsheet className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Carga Masiva</span>
          </button>

          {/* 5. Configuración */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'configuracion' ? 'active' : ''}`}
            onClick={() => handleNavegar('configuracion')}
          >
            <SlidersHorizontal className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Configuración</span>
          </button>

          {/* 6. Auditoría (Ledger) */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'auditoria' ? 'active' : ''}`}
            onClick={() => handleNavegar('auditoria')}
          >
            <History className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Auditoría</span>
          </button>
        </nav>

        <div className="konor-sidebar-footer">
          <div className="konor-user-info">
            <span className="konor-user-email" title={session?.user?.email}>
              {session?.user?.email}
            </span>
            <div className="konor-user-badge">
              <ShieldCheck size={12} />
              <span>Administrador</span>
            </div>
          </div>
          <button
            type="button"
            className="konor-logout-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Contenedor Principal */}
      <main className="konor-main-content">
        <div className="konor-content-container">
          {activeTab === 'dashboard' && <DashboardView onNavegar={handleNavegar} />}
          {activeTab === 'turnos' && (
            <ModuloEventos 
              turnoSeleccionadoDirecto={turnoDirecto}
              onLimpiarTurnoDirecto={() => setTurnoDirecto(null)}
            />
          )}
          {activeTab === 'directorio' && <Directorio />}
          {activeTab === 'carga-masiva' && <CargaMasivaView />}
          {activeTab === 'configuracion' && <ConfiguracionView />}
          {activeTab === 'auditoria' && <LedgerView />}
        </div>
      </main>
    </div>
  );
}