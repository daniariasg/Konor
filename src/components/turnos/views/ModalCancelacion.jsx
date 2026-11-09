import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import './ModalCancelacion.css';

export default function ModalCancelacion({ alumno, onConfirmar, onCerrar }) {
  const [tipoAccion, setTipoAccion] = useState('cancelacion'); // 'cancelacion' | 'error_admin'
  const [motivoTexto, setMotivoTexto] = useState('');

  const nombreAlumno = alumno?.nombre || alumno?.alumno?.nombre || 'el estudiante';

  const handleConfirmar = () => {
    const esErrorAdmin = tipoAccion === 'error_admin';
    const motivoFinal = esErrorAdmin ? '' : (motivoTexto.trim() || 'Canceló turno');
    const tipoFinal = esErrorAdmin ? 'error_admin' : 'cancelacion';

    if (onConfirmar) {
      onConfirmar({
        tipo: tipoFinal,
        motivo: motivoFinal,
        esErrorAdmin
      });
    }
  };

  return (
    <div
      className="konor-modal-cancelacion-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && onCerrar) onCerrar();
      }}
    >
      <div className="konor-modal-cancelacion-card">
        <div className="modal-cancelacion-header">
          <div className="modal-header-title-box">
            <h3 className="modal-title-text">Retiro de Alumno Asignado</h3>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="modal-close-btn"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-cancelacion-body">
          <p className="modal-question">
            ¿Por qué se retira a <strong>{nombreAlumno}</strong> del turno?
          </p>

          <div className="modal-options-list">
            <label
              className={`modal-option-card ${
                tipoAccion === 'cancelacion' ? 'option-selected' : ''
              }`}
            >
              <div className="option-radio-col">
                <input
                  type="radio"
                  name="tipo_retiro"
                  value="cancelacion"
                  checked={tipoAccion === 'cancelacion'}
                  onChange={() => setTipoAccion('cancelacion')}
                  className="modal-radio"
                />
              </div>
              <div className="option-content-col">
                <span className="option-title">🚫 El alumno canceló su asistencia</span>
                <span className="option-desc">
                  Libera el cupo, lo mueve al final como evidencia y registra la baja en su perfil.
                </span>

                {tipoAccion === 'cancelacion' && (
                  <div className="reason-input-expand">
                    <label className="reason-label">
                      Motivo de la cancelación (ej. Avisó por mensaje que está enfermo):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Escribe el motivo de la baja (opcional)..."
                      value={motivoTexto}
                      onChange={(e) => setMotivoTexto(e.target.value)}
                      className="reason-textarea"
                      maxLength={180}
                    />
                  </div>
                )}
              </div>
            </label>

            <label
              className={`modal-option-card ${
                tipoAccion === 'error_admin' ? 'option-selected' : ''
              }`}
            >
              <div className="option-radio-col">
                <input
                  type="radio"
                  name="tipo_retiro"
                  value="error_admin"
                  checked={tipoAccion === 'error_admin'}
                  onChange={() => setTipoAccion('error_admin')}
                  className="modal-radio"
                />
              </div>
              <div className="option-content-col">
                <span className="option-title">✎ Error administrativo al seleccionar</span>
                <span className="option-desc">
                  Devuelve al alumno al estado "En espera (Respaldo)" sin registrar falta en su perfil.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="modal-cancelacion-footer">
          <button
            type="button"
            onClick={onCerrar}
            className="btn-modal-cancelar"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            className="btn-modal-confirmar"
          >
            <span>Confirmar</span>
          </button>
        </div>
      </div>
    </div>
  );
}