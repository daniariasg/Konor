import React, { useState } from 'react';
import { supabase } from '../../config/supabase.js';
import { X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import './Login.css';

export default function ModalCambioPassword({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  if (!isOpen) return null;

  const handleCerrar = () => {
    setEmail('');
    setPasswordActual('');
    setNuevaPassword('');
    setConfirmarPassword('');
    setMensajeExito('');
    setMensajeError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeExito('');
    setMensajeError('');

    // 1. Validaciones en cliente
    if (!email.trim() || !passwordActual.trim() || !nuevaPassword.trim() || !confirmarPassword.trim()) {
      setMensajeError('Por favor completa todos los campos.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setMensajeError('La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensajeError('Las nuevas contraseñas no coinciden. Verifica e intenta nuevamente.');
      return;
    }

    try {
      setCargando(true);

      // 2. Autenticación en segundo plano con las credenciales actuales
      const { error: errorAuth } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: passwordActual.trim(),
      });

      if (errorAuth) {
        setMensajeError('La contraseña actual o el correo son incorrectos.');
        setCargando(false);
        return;
      }

      // 3. Actualización directa de la contraseña
      const { error: errorUpdate } = await supabase.auth.updateUser({
        password: nuevaPassword.trim(),
      });

      if (errorUpdate) {
        setMensajeError(errorUpdate.message || 'Error al actualizar la contraseña en el servidor.');
        setCargando(false);
        return;
      }

      // 4. Cerrar la sesión temporal para obligar a usar la nueva clave
      await supabase.auth.signOut();

      // Limpiar campos y mostrar feedback de éxito
      setEmail('');
      setPasswordActual('');
      setNuevaPassword('');
      setConfirmarPassword('');
      setMensajeExito('Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.');
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setMensajeError('Error de conexión con el servicio de autenticación.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-card login-modal-card">
        {/* Botón de cierre en esquina superior derecha */}
        <button
          type="button"
          onClick={handleCerrar}
          className="login-modal-close-btn"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera idéntica al Login */}
        <div className="login-header">
          <div className="login-brand">
            <div className="login-brand-icon">✕</div>
            <span className="login-brand-title">
              Konor<span className="brand-dot">.</span>
            </span>
          </div>
          <span className="login-badge">Seguridad de Acceso</span>
          <p className="login-subtitle">
            Ingresa tus credenciales actuales para actualizar directamente tu contraseña de acceso.
          </p>
        </div>

        {/* Alerta de éxito */}
        {mensajeExito && (
          <div className="login-alert-success">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Alerta de error */}
        {mensajeError && (
          <div className="login-error">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{mensajeError}</span>
          </div>
        )}

        {/* Formulario de cambio directo */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label htmlFor="modal-reset-email" className="login-label">
              Correo Institucional *
            </label>
            <input
              id="modal-reset-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ejemplo@konor.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={cargando}
              className="login-input"
            />
          </div>

          <div className="login-field-group">
            <label htmlFor="modal-reset-actual" className="login-label">
              Contraseña Actual *
            </label>
            <div className="login-input-wrapper">
              <input
                id="modal-reset-actual"
                name="passwordActual"
                type={mostrarActual ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Ingresa tu clave actual"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                disabled={cargando}
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setMostrarActual(!mostrarActual)}
                className="login-eye-btn"
                tabIndex={-1}
                aria-label={mostrarActual ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="modal-reset-nueva" className="login-label">
              Nueva Contraseña (mínimo 6 caracteres) *
            </label>
            <div className="login-input-wrapper">
              <input
                id="modal-reset-nueva"
                name="nuevaPassword"
                type={mostrarNueva ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                disabled={cargando}
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setMostrarNueva(!mostrarNueva)}
                className="login-eye-btn"
                tabIndex={-1}
                aria-label={mostrarNueva ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="modal-reset-confirmar" className="login-label">
              Confirmar Nueva Contraseña *
            </label>
            <div className="login-input-wrapper">
              <input
                id="modal-reset-confirmar"
                name="confirmarPassword"
                type={mostrarConfirmar ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Repite la nueva contraseña"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                disabled={cargando}
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                className="login-eye-btn"
                tabIndex={-1}
                aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {mostrarConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="login-submit-btn"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#43b0c4]" />
                <span>Actualizando contraseña...</span>
              </>
            ) : (
              <span>Confirmar y Cambiar Contraseña</span>
            )}
          </button>
        </form>

        {/* Volver al login */}
        <div className="login-modal-footer">
          <button
            type="button"
            onClick={handleCerrar}
            className="login-back-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}