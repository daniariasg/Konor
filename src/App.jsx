import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarDays, 
  FileSpreadsheet, 
  LayoutDashboard, 
  Lock, 
  LogOut 
} from 'lucide-react';
import { supabase } from './config/supabase.js';

// Vistas y Orquestadores
import Directorio from './components/directorio/Directorio.jsx';
import CargaMasivaView from './components/configuracion/views/CargaMasivaView.jsx';
import Login from './components/auth/Login.jsx';

// 1. AQUÍ ESTÁ EL IMPORT: Conectado a la nueva ubicación de ModuloEventos
import ModuloEventos from './components/turnos/ModuloEventos.jsx';

// Hojas de estilos desacopladas
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Pestaña activa: inicia directo en 'turnos' para probar el Sprint 2
  const [activeTab, setActiveTab] = useState('turnos');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingSession) {
    return (
      <div className="konor-loading-screen">
        <div className="konor-spinner" />
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={(userSession) => setSession(userSession)} />;
  }

  return (
    <div className="konor-app-layout">
      {/* Sidebar Institucional (240px fijos) */}
      <aside className="konor-sidebar">
        <div className="konor-sidebar-brand">
          <span className="konor-brand-title">KONOR</span>
          <span className="konor-brand-badge">Sprint 2</span>
        </div>

        <nav className="konor-sidebar-nav">
          {/* Módulo Turnos y Eventos (HU06 - Desbloqueado) */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'turnos' ? 'active' : ''}`}
            onClick={() => setActiveTab('turnos')}
          >
            <CalendarDays className="konor-nav-icon" size={20} />
            <span className="konor-nav-text">Turnos y Eventos</span>
          </button>

          {/* Módulo Alumnos Ayudantes */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'directorio' ? 'active' : ''}`}
            onClick={() => setActiveTab('directorio')}
          >
            <Users className="konor-nav-icon" size={20} />
            <span className="konor-nav-text">Alumnos Ayudantes</span>
          </button>

          {/* Módulo Carga Masiva */}
          <button
            type="button"
            className={`konor-nav-item ${activeTab === 'carga-masiva' ? 'active' : ''}`}
            onClick={() => setActiveTab('carga-masiva')}
          >
            <FileSpreadsheet className="konor-nav-icon" size={20} />
            <span className="konor-nav-text">Carga Masiva (Excel)</span>
          </button>

          {/* Módulo Dashboard (Reservado Sprint 4) */}
          <button
            type="button"
            className="konor-nav-item disabled"
            disabled
            title="Disponible en Sprint 4"
          >
            <LayoutDashboard className="konor-nav-icon" size={20} />
            <span className="konor-nav-text">Dashboard</span>
            <Lock className="konor-lock-icon" size={16} />
          </button>
        </nav>

        {/* Footer Sidebar / Logout */}
        <div className="konor-sidebar-footer">
          <div className="konor-user-info">
            <span className="konor-user-email">{session?.user?.email}</span>
            <span className="konor-user-role">Administrador</span>
          </div>
          <button
            type="button"
            className="konor-logout-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Contenedor Principal con Scroll Independiente */}
      <main className="konor-main-content">
        <div className="konor-content-container">
          {/* 2. AQUÍ ESTÁ EL RENDER CONDICIONAL DE TURNOS */}
          {activeTab === 'turnos' && <ModuloEventos />}
          {activeTab === 'directorio' && <Directorio />}
          {activeTab === 'carga-masiva' && <CargaMasivaView />}
        </div>
      </main>
    </div>
  );
}