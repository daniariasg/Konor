import React, { useState } from 'react';
import { AlertTriangle, X, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import './ModalCancelarTurno.css';

const MOTIVOS_AUDITORIA = [
  'Error en la creación / Horario o cupos incorrectos',
  'Actividad o evento suspendido por la sede',
  'Replanificación de fecha / Turno reprogramado',
  'Falta de alumnos interesados / Sin quorum',
  'Otro motivo'
];

export default function ModalCancelarTurno({ turno, onCerrar, onConfirmar }) {
  const [paso, setPaso] = useState('justificacion'); // 'justificacion' | 'confirmacion'
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_AUDITORIA[0]);
  const [otroTexto, setOtroTexto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const motivoFinal = motivoSeleccionado === 'Otro motivo' ? otroTexto.trim() : motivoSeleccionado;

  const handleIrAConfirmacion = () => {
    if (motivoSeleccionado === 'Otro motivo' && !otroTexto.trim()) {
      setErrorMsg('Debes especificar la justificación de la cancelación.');
      return;
    }
    setErrorMsg(null);
    setPaso('confirmacion');
  };

  const handleEjecutarCancelacion = async () => {
    try {
      setProcesando(true);
      setErrorMsg(null);
      await onConfirmar(turno.id_turno, motivoFinal);
    } catch (err) {
      setErrorMsg(err.message || 'Error al cancelar el turno.');
      setProcesando(false);
    }
  };

  return (
    <div 
      className="konor-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !procesando) onCerrar();
      }}
    >
      <div className="konor-cancelar-card">
        {/* Cabecera común */}
        <div className="konor-cancelar-header">
          <div className="konor-cancelar-icon-badge">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h2 className="konor-cancelar-title">
              {paso === 'justificacion' ? 'Cancelar Turno / Evento' : 'Confirmar Cancelación'}
            </h2>
            <p className="konor-cancelar-subtitle">
              {paso === 'justificacion'
                ? 'Indica el motivo de la cancelación para el registro de auditoría institucional.'
                : 'Esta acción cambiará el estado del turno a Cancelado de forma definitiva.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="konor-modal-btn-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen del turno */}
        <div className="konor-cancelar-target-info">
          <span>Turno: <strong>{turno?.nombre_evento}</strong></span>
          <span className="font-mono text-xs text-slate-500">ID #{turno?.id_turno}</span>
        </div>

        {errorMsg && (
          <div className="konor-duplicar-alert mt-3">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PASO 1: Selección de Justificación */}
        {paso === 'justificacion' && (
          <>
            <div className="konor-motivos-list">
              {MOTIVOS_AUDITORIA.map((motivo) => (
                <label key={motivo} className="konor-motivo-item">
                  <input
                    type="radio"
                    name="motivo_cancelacion"
                    value={motivo}
                    checked={motivoSeleccionado === motivo}
                    onChange={() => setMotivoSeleccionado(motivo)}
                    disabled={procesando}
                    className="konor-motivo-radio"
                  />
                  <span className="konor-motivo-text">{motivo}</span>
                </label>
              ))}
            </div>

            {motivoSeleccionado === 'Otro motivo' && (
              <div className="konor-otro-wrapper">
                <textarea
                  rows={3}
                  placeholder="Escribe la justificación detallada..."
                  value={otroTexto}
                  onChange={(e) => setOtroTexto(e.target.value)}
                  disabled={procesando}
                  className="konor-otro-textarea"
                  maxLength={200}
                />
              </div>
            )}

            <div className="konor-cancelar-footer">
              <button
                type="button"
                onClick={onCerrar}
                disabled={procesando}
                className="konor-btn-cancelar"
              >
                Volver / No cancelar
              </button>
              <button
                type="button"
                onClick={handleIrAConfirmacion}
                className="konor-btn-confirmar-cancelacion"
              >
                Continuar →
              </button>
            </div>
          </>
        )}

        {/* PASO 2: Confirmación Directa Institucional */}
        {paso === 'confirmacion' && (
        <>
            <div className="konor-confirmacion-box">
            <div className="konor-confirmacion-pregunta">
                ¿Estás seguro de que deseas cancelar este turno operativo?
            </div>
            <div className="konor-confirmacion-motivo">
                <span className="text-xs text-slate-400 block font-semibold uppercase">Motivo registrado:</span>
                <span className="text-sm text-slate-700 italic">"{motivoFinal}"</span>
            </div>
            </div>

            <div className="konor-cancelar-footer">
            <button
                type="button"
                onClick={() => setPaso('justificacion')}
                disabled={procesando}
                className="konor-btn-cancelar"
            >
                ← Cambiar motivo
            </button>
            <button
                type="button"
                onClick={handleEjecutarCancelacion}
                disabled={procesando}
                className="konor-btn-confirmar-cancelacion"
            >
                {procesando ? (
                <>
                    <Loader2 size={16} className="konor-spin-icon" />
                    <span>Cancelando turno...</span>
                </>
                ) : (
                <span>Sí, Cancelar Turno</span>
                )}
            </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}