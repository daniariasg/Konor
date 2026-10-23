import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase.js';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [vista, setVista] = useState('login'); // 'login' | 'cambio_password'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState(null);

  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [cargandoCambio, setCargandoCambio] = useState(false);
  const [errorCambio, setErrorCambio] = useState(null);
  const [exitoCambio, setExitoCambio] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorLogin(null);

    if (!email.trim() || !password.trim()) {
      setErrorLogin('Por favor completa todos los campos.');
      return;
    }

    try {
      setCargandoLogin(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorLogin('Credenciales incorrectas o usuario no registrado.');
        return;
      }

      if (data?.user && onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error('Error de login:', err);
      setErrorLogin('Error de conexión con el servidor.');
    } finally {
      setCargandoLogin(false);
    }
  };

  const handleCambioSubmit = async (e) => {
    e.preventDefault();
    setErrorCambio(null);
    setExitoCambio(null);

    if (!email.trim() || !passwordActual.trim() || !nuevaPassword.trim() || !confirmarPassword.trim()) {
      setErrorCambio('Por favor completa todos los campos.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setErrorCambio('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setErrorCambio('Las nuevas contraseñas no coinciden.');
      return;
    }

    try {
      setCargandoCambio(true);

      // 1. Cliente aislado sin persistencia de sesión: NO altera App.jsx ni dispara el dashboard
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const isolatedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      // 2. Verificar contraseña actual con el cliente aislado
      const { error: errorAuth } = await isolatedClient.auth.signInWithPassword({
        email: email.trim(),
        password: passwordActual.trim(),
      });

      if (errorAuth) {
        setErrorCambio('La contraseña actual o el correo son incorrectos.');
        setCargandoCambio(false);
        return;
      }

      // 3. Actualizar la contraseña en el cliente aislado
      const { error: errorUpdate } = await isolatedClient.auth.updateUser({
        password: nuevaPassword.trim(),
      });

      if (errorUpdate) {
        setErrorCambio(errorUpdate.message || 'Error al actualizar la contraseña.');
        setCargandoCambio(false);
        return;
      }

      // 4. Éxito: volvemos a la vista login con alerta verde sin salir de la pantalla
      setPasswordActual('');
      setNuevaPassword('');
      setConfirmarPassword('');
      setPassword('');
      setExitoCambio('Contraseña actualizada correctamente. Ingresa con tu nueva clave.');
      setVista('login');
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setErrorCambio('Error al procesar el cambio de contraseña.');
    } finally {
      setCargandoCambio(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Cabecera limpia */}
        <div className="login-header">
          <div className="login-brand">
            <div className="login-brand-icon">✕</div>
            <span className="login-brand-title">
              Konor<span className="brand-dot">.</span>
            </span>
          </div>
          <p className="login-subtitle">
            {vista === 'login'
              ? 'Plataforma centralizada para la gestión de ayudantes y turnos.'
              : 'Ingresa tus credenciales para actualizar tu contraseña de acceso.'}
          </p>
        </div>

        {/* Notificaciones */}
        {exitoCambio && (
          <div className="login-alert-success">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{exitoCambio}</span>
          </div>
        )}

        {vista === 'login' && errorLogin && (
          <div className="login-error">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorLogin}</span>
          </div>
        )}

        {vista === 'cambio_password' && errorCambio && (
          <div className="login-error">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorCambio}</span>
          </div>
        )}

        {/* VISTA 1: INICIO DE SESIÓN */}
        {vista === 'login' && (
          <form onSubmit={handleLoginSubmit} className="login-form login-view-transition">
            <div className="login-field-group">
              <label htmlFor="login-email" className="login-label">
                Correo Institucional
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@konor.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={cargandoLogin}
                className="login-input"
              />
            </div>

            <div className="login-field-group">
              <label htmlFor="login-password" className="login-label">
                Contraseña
              </label>
              <div className="login-input-wrapper">
                <input
                  id="login-password"
                  name="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={cargandoLogin}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="login-eye-btn"
                  tabIndex={-1}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="login-forgot-container">
              <button
                type="button"
                className="login-forgot-link"
                onClick={() => {
                  setErrorLogin(null);
                  setErrorCambio(null);
                  setVista('cambio_password');
                }}
              >
                ¿Necesitas cambiar tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={cargandoLogin}
              className="login-submit-btn"
            >
              {cargandoLogin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#43b0c4]" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>
          </form>
        )}

        {/* VISTA 2: CAMBIO DE CONTRASEÑA */}
        {vista === 'cambio_password' && (
          <form onSubmit={handleCambioSubmit} className="login-form login-view-transition">
            <div className="login-field-group">
              <label htmlFor="cambio-email" className="login-label">
                Correo Institucional *
              </label>
              <input
                id="cambio-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@konor.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={cargandoCambio}
                className="login-input"
              />
            </div>

            <div className="login-field-group">
              <label htmlFor="cambio-actual" className="login-label">
                Contraseña Actual *
              </label>
              <div className="login-input-wrapper">
                <input
                  id="cambio-actual"
                  name="passwordActual"
                  type={mostrarActual ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  disabled={cargandoCambio}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setMostrarActual(!mostrarActual)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  {mostrarActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="cambio-nueva" className="login-label">
                Nueva Contraseña *
              </label>
              <div className="login-input-wrapper">
                <input
                  id="cambio-nueva"
                  name="nuevaPassword"
                  type={mostrarNueva ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  disabled={cargandoCambio}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNueva(!mostrarNueva)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  {mostrarNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="login-field-group">
              <label htmlFor="cambio-confirmar" className="login-label">
                Confirmar Nueva Contraseña *
              </label>
              <div className="login-input-wrapper">
                <input
                  id="cambio-confirmar"
                  name="confirmarPassword"
                  type={mostrarConfirmar ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repite la nueva contraseña"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  disabled={cargandoCambio}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  {mostrarConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargandoCambio}
              className="login-submit-btn"
            >
              {cargandoCambio ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#43b0c4]" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Confirmar y Cambiar Contraseña</span>
              )}
            </button>

            <div className="login-back-wrapper">
              <button
                type="button"
                onClick={() => {
                  setErrorCambio(null);
                  setVista('login');
                }}
                className="login-back-btn"
                disabled={cargandoCambio}
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}