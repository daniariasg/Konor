import React, { useState } from 'react';
import { supabase } from '../../../config/supabase.js';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import './ConfiguracionView.css';

export default function ConfiguracionView({ usuario }) {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');

    if (!nuevaPassword.trim() || !confirmarPassword.trim()) {
      setMensajeError('Por favor completa ambos campos de contraseña.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setMensajeError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensajeError('Las contraseñas no coinciden. Verifica e intenta nuevamente.');
      return;
    }

    try {
      setCargando(true);
      const { error } = await supabase.auth.updateUser({
        password: nuevaPassword.trim(),
      });

      if (error) {
        setMensajeError(error.message || 'Error al actualizar la contraseña en el servidor.');
        return;
      }

      setMensajeExito('Contraseña actualizada exitosamente.');
      setNuevaPassword('');
      setConfirmarPassword('');
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      setMensajeError('Error de conexión con el servicio de autenticación.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="config-layout">
      {/* 1. Cabecera idéntica a Carga Masiva */}
      <div className="config-top-header">
        <h1 className="config-page-title">Configuración de Cuenta</h1>
        <p className="config-page-subtitle">
          Administra las credenciales de acceso institucional y la seguridad de tu sesión administrativa.
        </p>
      </div>

      {/* 2. Banner de éxito o error */}
      {mensajeExito && (
        <div className="alert-success">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="alert-error">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* 3. Tarjeta blanca idéntica a la tarjeta de Carga Masiva */}
      <div className="config-card">
        <div className="config-card-header">
          <KeyRound className="w-5 h-5 text-[#43b0c4]" />
          <h2 className="config-card-title">Seguridad y Acceso</h2>
        </div>
        <p className="config-card-desc">
          Actualiza periódicamente tu contraseña para proteger el acceso a las nóminas y turnos de los alumnos ayudantes.
        </p>

        <form onSubmit={handleSubmit} className="config-form">
          {/* Correo de solo lectura */}
          <div className="config-form-group">
            <label htmlFor="config-user-email" className="config-label">
              Correo Institucional Activo
            </label>
            <input
              id="config-user-email"
              name="email"
              type="email"
              disabled
              autoComplete="email"
              value={usuario?.email || 'admin@konor.cl'}
              className="config-input-disabled"
            />
          </div>

          {/* Nueva Contraseña */}
          <div className="config-form-group">
            <label htmlFor="config-new-password" className="config-label">
              Nueva Contraseña *
            </label>
            <div className="config-input-wrapper">
              <input
                id="config-new-password"
                name="newPassword"
                type={mostrarNueva ? 'text' : 'password'}
                required
                placeholder="Mínimo 6 caracteres"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                disabled={cargando}
                className="config-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setMostrarNueva(!mostrarNueva)}
                className="config-eye-btn"
                tabIndex={-1}
                aria-label={mostrarNueva ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div className="config-form-group">
            <label htmlFor="config-confirm-password" className="config-label">
              Confirmar Nueva Contraseña *
            </label>
            <div className="config-input-wrapper">
              <input
                id="config-confirm-password"
                name="confirmPassword"
                type={mostrarConfirmar ? 'text' : 'password'}
                required
                placeholder="Repite la nueva contraseña"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                disabled={cargando}
                className="config-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                className="config-eye-btn"
                tabIndex={-1}
                aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón Guardar en Azul Institucional */}
          <div className="config-actions">
            <button type="submit" disabled={cargando} className="btn-config-submit">
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#43b0c4]" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Actualizar Contraseña</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}