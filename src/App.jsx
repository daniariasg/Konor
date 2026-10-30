import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabase.js';
import Login from './components/auth/Login.jsx';
import Directorio from './components/directorio/Directorio.jsx';
import CargaMasivaView from './components/configuracion/views/CargaMasivaView.jsx';
import ModuloEventos from './components/turnos/ModuloEventos.jsx';
import { 
  Users, 
  CalendarDays, 
  FileSpreadsheet, 
  LayoutDashboard, 
  Lock, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck 
} from 'lucide-react';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [activeTab, setActiveTab] = useState('turnos');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // 1. Verificación inicial de sesión
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoadingSession(false);
    }).catch(() => {
      setSession(null);
      setLoadingSession(false);
      // En src/App.jsx
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
    });

    // 2. Suscripción a cambios de autenticación en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT' || !newSession) {
        setActiveTab('turnos');
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

  // Pantalla de carga (Splash neutro seguro)
  if (loadingSession) {
    return (
      <div className="konor-loading-screen" role="status" aria-live="polite">
        <div className="konor-spinner" />
      </div>
    );
  }

  // Guardia de autenticación: Si no hay sesión válida, renderiza estrictamente el Login
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

      {/* Backdrop para cerrar el menú en móviles */}
      {sidebarOpen && (
        <div 
          className="konor-sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true" 
        />
      )}

      {/* Sidebar Institucional (240px desktop, drawer colapsable en móvil) */}
      <aside className={`konor-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="konor-sidebar-brand">
          <div className="konor-brand-logo">
            <span className="konor-brand-title">KONOR</span>
            {/* Se elimina la etiqueta Sede que estaba aquí */}
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
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'turnos' ? 'active' : ''}`}
            onClick={() => { setActiveTab('turnos'); setSidebarOpen(false); }}
          >
            <CalendarDays className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Turnos y Eventos</span>
          </button>

          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'directorio' ? 'active' : ''}`}
            onClick={() => { setActiveTab('directorio'); setSidebarOpen(false); }}
          >
            <Users className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Alumnos Ayudantes</span>
          </button>

          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'carga-masiva' ? 'active' : ''}`}
            onClick={() => { setActiveTab('carga-masiva'); setSidebarOpen(false); }}
          >
            <FileSpreadsheet className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Carga Masiva (Excel)</span>
          </button>

          <button
            type="button"
            className="konor-nav-item disabled"
            disabled
            title="Módulo planificado para el Sprint 4"
          >
            <LayoutDashboard className="konor-nav-icon" size={19} />
            <span className="konor-nav-text">Dashboard</span>
            <Lock className="konor-lock-icon" size={15} />
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

      {/* Contenedor Principal con Scroll vertical independiente */}
      <main className="konor-main-content">
        <div className="konor-content-container">
          {activeTab === 'turnos' && <ModuloEventos />}
          {activeTab === 'directorio' && <Directorio />}
          {activeTab === 'carga-masiva' && <CargaMasivaView />}
        </div>
      </main>
    </div>
  );
}