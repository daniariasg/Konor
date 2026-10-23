import React from 'react';
import { 
  ArrowLeft, 
  Edit2, 
  Save, 
  Filter, 
  BookOpen, 
  CheckCircle2, 
  Loader2, 
  Send, 
  Trash2, 
  ShieldCheck 
} from 'lucide-react';
import { usePerfilAlumno } from '../hooks/usePerfilAlumno.js';
import './PerfilAlumnoView.css';

export default function PerfilAlumnoView({
  alumno,
  mesActivo,
  nombreMesActivo,
  onVolver,
  onActualizado,
}) {
  const {
    form,
    setForm,
    modoEdicion,
    setModoEdicion,
    guardando,
    guardandoNota,
    nuevaNota,
    setNuevaNota,
    mensajeExito,
    toastEnPausa,
    pausarTemporizadorToast,
    reanudarTemporizadorToast,
    turnosHistorial,
    cargandoTurnos,
    totalHorasFormato,
    bitacoraNotas,
    handleAgregarComentario,
    handleEliminarComentario,
    handleGuardarCambios,
  } = usePerfilAlumno({ alumno, mesActivo, onActualizado });

  if (!alumno) return null;

  const handleKeyDownObservacion = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAgregarComentario();
    }
  };

  const esRegistroProtegido = (tipo) => {
    return ['actualizacion_datos', 'cancelacion_turno', 'cierre_periodo'].includes(tipo);
  };

  return (
    <div className="perfil-alumno-container">
      {/* 1. Navegación superior */}
      <div className="perfil-top-nav">
        <button type="button" onClick={onVolver} className="btn-volver-link">
          <ArrowLeft className="w-4 h-4 text-[#43b0c4]" />
          Volver a lista de alumnos
        </button>

        <button
          type="button"
          onClick={() => {
            if (modoEdicion) {
              handleGuardarCambios();
            } else {
              setModoEdicion(true);
            }
          }}
          disabled={guardando}
          className="btn-edit-toggle"
        >
          {guardando ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#43b0c4]" />
          ) : modoEdicion ? (
            <Save className="w-3.5 h-3.5 text-[#43b0c4]" />
          ) : (
            <Edit2 className="w-3.5 h-3.5 text-[#43b0c4]" />
          )}
          <span>{modoEdicion ? 'Guardar Cambios' : 'Editar Datos'}</span>
        </button>
      </div>

      {/* 2. Banner de éxito con temporizador */}
      {mensajeExito && (
        <div 
          className="toast-success-banner"
          onMouseEnter={pausarTemporizadorToast}
          onMouseLeave={reanudarTemporizadorToast}
          role="status"
          aria-live="polite"
        >
          <div className="toast-success-content">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ficha del estudiante actualizada correctamente.</span>
          </div>
          <div className={`toast-progress-bar ${toastEnPausa ? 'paused' : ''}`} />
        </div>
      )}

      {/* 3. Título Principal con truncamiento y tooltip nativo */}
      <h1 className="perfil-nombre-header" title={alumno.nombre}>
        {alumno.nombre}
      </h1>

      {/* 4. Tarjeta Superior: Información */}
      <div className="perfil-card-info">
        <h2 className="perfil-card-title">Información:</h2>
        <div className="perfil-form-grid">
          <div className="perfil-field-group">
            <label htmlFor="perfil-rut" className="perfil-field-label">RUT</label>
            <input
              id="perfil-rut"
              name="rut"
              type="text"
              disabled={!modoEdicion}
              value={form.rut}
              onChange={(e) => setForm({ ...form, rut: e.target.value })}
              className="perfil-input"
            />
          </div>

          <div className="perfil-field-group">
            <span className="perfil-field-label">Jornada</span>
            <div className="radio-group-jornada">
              <label className="radio-option">
                <input
                  type="radio"
                  name="jornada"
                  value="Diurna"
                  checked={form.jornada === 'Diurna'}
                  disabled={!modoEdicion}
                  onChange={(e) => setForm({ ...form, jornada: e.target.value })}
                />
                Diurna
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="jornada"
                  value="Vespertina"
                  checked={form.jornada === 'Vespertina'}
                  disabled={!modoEdicion}
                  onChange={(e) => setForm({ ...form, jornada: e.target.value })}
                />
                Vespertina
              </label>
            </div>
          </div>

          <div className="perfil-field-group">
            <label htmlFor="perfil-telefono" className="perfil-field-label">Teléfono</label>
            <input
              id="perfil-telefono"
              name="telefono"
              type="text"
              placeholder="+56 9 ..."
              disabled={!modoEdicion}
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="perfil-input"
            />
          </div>

          <div className="perfil-field-group">
            <label htmlFor="perfil-correo" className="perfil-field-label">Correo electrónico</label>
            <input
              id="perfil-correo"
              name="correo"
              type="email"
              disabled={!modoEdicion}
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              className="perfil-input"
            />
          </div>
        </div>
      </div>

      {/* 5. Sección Inferior: 2 Columnas Independientes */}
      <div className="perfil-bottom-split">
        {/* Columna Izquierda: Historial de Turnos */}
        <div className="card-historial">
          <div className="split-card-header">
            <h3 className="split-card-title">Historial de turnos en {nombreMesActivo}</h3>
            <Filter className="w-4 h-4 text-slate-400 cursor-pointer" />
          </div>

          <table className="turnos-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Evento / Turno</th>
                <th scope="col" style={{ textAlign: 'right' }}>Horas</th>
              </tr>
            </thead>
            <tbody>
              {cargandoTurnos ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                    <Loader2 className="w-4 h-4 animate-spin text-[#43b0c4] inline mr-2" />
                    Cargando turnos...
                  </td>
                </tr>
              ) : turnosHistorial.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Sin turnos registrados en {nombreMesActivo}.
                  </td>
                </tr>
              ) : (
                turnosHistorial.map((turno) => {
                  const hFormato =
                    turno.horas % 1 === 0 ? turno.horas.toString() : turno.horas.toFixed(1).replace('.', ',');
                  return (
                    <tr key={turno.id}>
                      <td>{turno.fecha}</td>
                      <td>{turno.evento}</td>
                      <td style={{ textAlign: 'right' }}>{hFormato}</td>
                    </tr>
                  );
                })
              )}

              <tr className="turnos-total-row">
                <td colSpan="2">Total:</td>
                <td style={{ textAlign: 'right' }}>{totalHorasFormato} hrs</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Columna Derecha: Bitácora Institucional */}
        <div className="card-bitacora">
          <div className="split-card-header">
            <h3 className="split-card-title flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#43b0c4]" />
              Bitácora
            </h3>
          </div>

          <div className="bitacora-list-box">
            {Array.isArray(bitacoraNotas) && bitacoraNotas.length > 0 ? (
              bitacoraNotas.map((item, idx) => {
                const esProtegido = esRegistroProtegido(item.tipo);
                return (
                  <div 
                    key={item.id || idx} 
                    className={`bitacora-item ${esProtegido ? 'bitacora-item-system' : ''}`}
                  >
                    <div className="bitacora-item-header">
                      <span className="bitacora-autor">
                        {item.autor || 'Administrador'}
                      </span>
                      
                      <div className="bitacora-meta-right">
                        <span className="bitacora-fecha">{item.fecha || 'Reciente'}</span>
                        {esProtegido && (
                          <span className="badge-sistema" title="Registro automático del sistema">
                            Sistema
                          </span>
                        )}
                        {!esProtegido && (
                          <button
                            type="button"
                            onClick={() => handleEliminarComentario(idx)}
                            className="btn-delete-comment"
                            title="Eliminar observación"
                            aria-label="Eliminar observación"
                            disabled={guardandoNota}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bitacora-item-body">
                      {item.tipo === 'actualizacion_datos' ? (
                        <div className="system-event-tag">
                          <span className="system-tag-label">
                            <ShieldCheck className="w-3 h-3 inline mr-1 text-[#43b0c4]" />
                            Actualización de ficha
                          </span>
                          <p className="system-tag-detail">{item.motivo || item.texto}</p>
                        </div>
                      ) : item.tipo === 'cancelacion_turno' ? (
                        <div className="system-event-tag system-event-danger">
                          <span className="system-tag-label">
                            Baja de turno
                          </span>
                          <p className="system-tag-detail">{item.motivo || item.texto}</p>
                        </div>
                      ) : item.tipo === 'cierre_periodo' ? (
                        <div className="system-event-tag">
                          <span className="system-tag-label">
                            Cierre contable
                          </span>
                          <p className="system-tag-detail">{item.motivo || item.texto}</p>
                        </div>
                      ) : (
                        <p className="bitacora-manual-text">{item.texto || item.motivo}</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                Sin observaciones registradas en este periodo.
              </div>
            )}
          </div>

          <div className="nueva-nota-box">
            <label htmlFor="nueva-nota-textarea" className="sr-only">
              Escribe una observación de desempeño
            </label>
            <textarea
              id="nueva-nota-textarea"
              name="nuevaNota"
              rows="2"
              placeholder="Escribe una observación de desempeño (Presiona Enter para guardar)..."
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              onKeyDown={handleKeyDownObservacion}
              className="nueva-nota-textarea"
              disabled={guardandoNota}
            />
            {nuevaNota.trim() && (
              <button
                type="button"
                onClick={() => handleAgregarComentario()}
                disabled={guardandoNota}
                className="btn-guardar-nota"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {guardandoNota ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Guardar observación</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}