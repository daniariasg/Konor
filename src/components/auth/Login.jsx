import React, { useState } from 'react';
import { supabase } from '../../config/supabase.js';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;

    setErrorMsg(null);
    setCargando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data?.session && onLoginSuccess) {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      setErrorMsg(
        err.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifica el correo y la contraseña.'
          : err.message || 'Error al conectar con el servidor de autenticación.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="konor-login-view">
      <div className="konor-login-card">
        {/* Cabecera / Marca */}
{/* Cabecera / Marca Limpia */}
<        div className="konor-login-header">
          <div className="konor-brand-badge">
            <span className="konor-brand-badge-text">KONOR</span>
          </div>
          <h1 className="konor-login-title">Iniciar Sesión</h1>
          <p className="konor-login-desc">
            Sistema de Gestión y Asignación de Alumnos Ayudantes
          </p>
        </div>

        {/* Banner de Error */}
        {errorMsg && (
          <div className="konor-login-error">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="konor-login-form">
          <div className="konor-input-group">
            <label className="konor-field-label">Correo Institucional</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="admin@konor.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={cargando}
              className="konor-field-input"
            />
          </div>

          <div className="konor-input-group">
            <label className="konor-field-label">Contraseña</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={cargando}
              className="konor-field-input"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="konor-btn-login"
          >
            {cargando ? (
              <>
                <Loader2 className="konor-spin-icon" size={18} />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}