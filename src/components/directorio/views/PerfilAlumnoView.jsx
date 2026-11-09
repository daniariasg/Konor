import React, { useState } from 'react';
import { usePerfilAlumno } from '../hooks/usePerfilAlumno.js';
import { 
  ArrowLeft, 
  Pencil, 
  Save, 
  X, 
  Clock, 
  BookOpen, 
  Send, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';
import './PerfilAlumnoView.css';

export default function PerfilAlumnoView({ 
  alumno, 
  mesActivo, 
  nombreMesActivo, 
  onVolver, 
  onActualizado 
}) {
  const {
    loading,
    modoEdicion,
    setModoEdicion,
    guardando,
    guardandoNota,
    nuevaNota,
    setNuevaNota,
    form,
    turnosHistorial,
    bitacoraNotas,
    handleInputChange,
    handleGuardarDatos,
    handleAgregarNota,
    handleEliminarNota
  } = usePerfilAlumno({ alumno, mesActivo, onActualizado });

  // Estado del Modal Institucional (reemplazo de window.alert y window.confirm)
  const [modal, setModal] = useState(null);

  const cerrarModal = () => setModal(null);

  const totalHoras = (turnosHistorial || []).reduce(
    (acc, t) => acc + (Number(t.horas_validadas) || 0),
    0
  );

  const handleGuardarClick = async () => {
    const res = await handleGuardarDatos();
    if (res.success) {
      setModal({
        tipo: 'info',
        titulo: 'Actualización Exitosa',
        mensaje: 'Los datos del estudiante se guardaron correctamente en la base de datos.'
      });
    } else {
      setModal({
        tipo: 'error',
        titulo: 'Error al Guardar',
        mensaje: res.error || 'No se pudieron actualizar los datos del estudiante.'
      });
    }
  };

  const handleNotaSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!nuevaNota.trim()) return;
    const res = await handleAgregarNota();
    if (!res.success) {
      setModal({
        tipo: 'error',
        titulo: 'Error en Bitácora',
        mensaje: res.error || 'No se pudo registrar la observación en la bitácora.'
      });
    }
  };

  const solicitarEliminarNota = (idNota) => {
    setModal({
      tipo: 'confirm',
      titulo: 'Eliminar Observación',
      mensaje: '¿Estás seguro de que deseas eliminar este comentario de la bitácora? Esta acción no se puede deshacer.',
      onConfirmar: async () => {
        cerrarModal();
        const res = await handleEliminarNota(idNota);
        if (!res.success) {
          setModal({
            tipo: 'error',
            titulo: 'Error al Eliminar',
            mensaje: res.error || 'No se pudo eliminar la nota seleccionada.'
          });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="konor-perfil-view animate-pulse">
        {/* Cabecera Skeleton */}
        <div className="konor-perfil-header">
          <div className="konor-skeleton-block" style={{ width: '180px', height: '28px' }} />
          <div className="konor-skeleton-block" style={{ width: '120px', height: '36px', borderRadius: '6px' }} />
        </div>

        <div className="konor-skeleton-block" style={{ width: '320px', height: '34px', margin: '20px 0' }} />

        {/* Tarjeta Principal Datos Estudiante */}
        <div className="konor-card konor-perfil-card" style={{ marginBottom: '24px' }}>
          <div className="konor-skeleton-block" style={{ width: '210px', height: '20px', marginBottom: '20px' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="konor-skeleton-block" style={{ height: '40px' }} />
            <div className="konor-skeleton-block" style={{ height: '40px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '16px' }}>
            <div className="konor-skeleton-block" style={{ height: '40px' }} />
            <div className="konor-skeleton-block" style={{ height: '40px' }} />
            <div className="konor-skeleton-block" style={{ height: '40px' }} />
          </div>
        </div>

        {/* Grilla Inferior (2 Bloques Skeleton) */}
        <div className="konor-bottom-grid">
          {/* Historial Turnos Skeleton */}
          <div className="konor-card" style={{ height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="konor-skeleton-block" style={{ width: '220px', height: '20px', marginBottom: '16px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="konor-skeleton-block" style={{ height: '24px' }} />
                <div className="konor-skeleton-block" style={{ height: '24px' }} />
                <div className="konor-skeleton-block" style={{ height: '24px' }} />
              </div>
            </div>
            <div className="konor-skeleton-block" style={{ width: '140px', height: '18px', marginLeft: 'auto' }} />
          </div>

          {/* Bitácora Skeleton */}
          <div className="konor-card" style={{ height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="konor-skeleton-block" style={{ width: '100px', height: '20px', marginBottom: '16px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="konor-skeleton-block" style={{ height: '36px', borderRadius: '6px' }} />
                <div className="konor-skeleton-block" style={{ height: '36px', borderRadius: '6px' }} />
              </div>
            </div>
            <div className="konor-skeleton-block" style={{ height: '36px', borderRadius: '6px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="konor-perfil-view">
      {/* 1. Header institucional */}
      <div className="konor-perfil-header">
        <button type="button" onClick={onVolver} className="konor-btn-volver-perfil">
          <ArrowLeft size={16} />
          <span>Volver a lista de alumnos</span>
        </button>

        <div className="konor-perfil-actions">
          {modoEdicion ? (
            <>
              <button
                type="button"
                onClick={() => setModoEdicion(false)}
                disabled={guardando}
                className="konor-btn-secondary"
              >
                <X size={15} />
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                onClick={handleGuardarClick}
                disabled={guardando}
                className="konor-btn-primary"
              >
                {guardando ? (
                  <>
                    <Loader2 className="konor-spin" size={15} />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setModoEdicion(true)}
              className="konor-btn-secondary"
            >
              <Pencil size={15} />
              <span>Editar Datos</span>
            </button>
          )}
        </div>
      </div>

      <h1 className="konor-perfil-title">{alumno?.nombre || 'Ficha del Estudiante'}</h1>

      {/* 2. Tarjeta principal: Información del Estudiante */}
      <div className="konor-card konor-perfil-card">
        <h2 className="konor-card-title">Información del Estudiante</h2>

        <div className="konor-form-container">
          {/* Fila 1: 2 Columnas (RUT y TELÉFONO) */}
          <div className="konor-form-row-top">
            <div className="konor-field-group">
              <label className="konor-label">RUT</label>
              <input
                type="text"
                value={form.rut || ''}
                onChange={(e) => handleInputChange('rut', e.target.value)}
                disabled={!modoEdicion || guardando}
                className={`konor-input ${!modoEdicion ? 'is-disabled' : ''}`}
              />
            </div>

            <div className="konor-field-group">
              <label className="konor-label">TELÉFONO</label>
              <input
                type="text"
                value={form.telefono || ''}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                disabled={!modoEdicion || guardando}
                className={`konor-input ${!modoEdicion ? 'is-disabled' : ''}`}
                placeholder="+56 9 ..."
              />
            </div>
          </div>

          {/* Fila 2: 3 Columnas balanceadas (CORREO, CARRERA y JORNADA) */}
          <div className="konor-form-row-bottom">
            <div className="konor-field-group">
              <label className="konor-label">CORREO ELECTRÓNICO</label>
              <input
                type="email"
                value={form.correo || ''}
                onChange={(e) => handleInputChange('correo', e.target.value)}
                disabled={!modoEdicion || guardando}
                className={`konor-input ${!modoEdicion ? 'is-disabled' : ''}`}
                placeholder="alumno@institucion.cl"
              />
            </div>

            <div className="konor-field-group">
              <label className="konor-label">CARRERA</label>
              <input
                type="text"
                value={form.carrera || ''}
                onChange={(e) => handleInputChange('carrera', e.target.value)}
                disabled={!modoEdicion || guardando}
                className={`konor-input ${!modoEdicion ? 'is-disabled' : ''}`}
                placeholder="Carrera"
              />
            </div>

            <div className="konor-field-group">
              <label className="konor-label">JORNADA</label>
              {modoEdicion ? (
                <div className="konor-radio-group">
                  <label className={`konor-radio-badge ${form.jornada === 'Diurna' || form.jornada === 'Diurno' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="jornada"
                      value="Diurna"
                      checked={form.jornada === 'Diurna' || form.jornada === 'Diurno'}
                      onChange={() => handleInputChange('jornada', 'Diurna')}
                    />
                    <span>Diurna</span>
                  </label>
                  <label className={`konor-radio-badge ${form.jornada === 'Vespertina' || form.jornada === 'Vespertino' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="jornada"
                      value="Vespertina"
                      checked={form.jornada === 'Vespertina' || form.jornada === 'Vespertino'}
                      onChange={() => handleInputChange('jornada', 'Vespertina')}
                    />
                    <span>Vespertina</span>
                  </label>
                </div>
              ) : (
                <div className="konor-badge-jornada">
                  <span>{form.jornada || alumno?.jornada || 'Diurna'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cuadrícula inferior: Historial y Bitácora */}
      <div className="konor-bottom-grid">
        {/* Historial de Turnos */}
        <div className="konor-card">
          <div className="konor-card-header">
            <div className="konor-card-header-left">
              <Clock className="text-[#43b0c4]" size={16} />
              <h3 className="konor-card-subtitle">
                Historial de turnos ({nombreMesActivo || 'este mes'})
              </h3>
            </div>
          </div>

          <div className="konor-table-wrapper">
            <table className="konor-table">
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>TURNO / EVENTO</th>
                  <th className="text-right">HORAS</th>
                </tr>
              </thead>
              <tbody>
                {!turnosHistorial || turnosHistorial.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8">
                      <p className="konor-empty-state-text">
                        Sin turnos registrados en este mes.
                      </p>
                    </td>
                  </tr>
                ) : (
                  turnosHistorial.map((t, idx) => (
                    <tr key={t.id_asignacion || idx}>
                      <td className="font-mono text-xs text-slate-600">{t.fecha || '--/--/----'}</td>
                      <td className="text-sm font-semibold text-[#06113c]">{t.nombre_evento || 'Turno operativo'}</td>
                      <td className="text-right font-mono font-bold text-slate-700">
                        {Number(t.horas_validadas || 0).toFixed(1).replace('.', ',')} hrs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="konor-card-footer">
            <span className="konor-total-destacado">
              TOTAL: {totalHoras.toFixed(1).replace('.', ',')} hrs
            </span>
          </div>
        </div>

        {/* Bitácora Institucional */}
        <div className="konor-card">
          <div className="konor-card-header">
            <div className="konor-card-header-left">
              <BookOpen className="text-[#43b0c4]" size={16} />
              <h3 className="konor-card-subtitle">Bitácora</h3>
            </div>
          </div>

          <div className="konor-bitacora-body">
            {!bitacoraNotas || bitacoraNotas.length === 0 ? (
              <div className="konor-bitacora-list flex items-center justify-center py-8">
                <p className="konor-empty-state-text">
                  Sin observaciones registradas en este periodo.
                </p>
              </div>
            ) : (
              <div className="konor-bitacora-list">
                {bitacoraNotas.map((item) => (
                  <div key={item.id} className={`konor-bitacora-item ${item.tipo === 'Cancelacion' ? 'is-cancel' : ''}`}>
                    <div className="konor-bitacora-meta">
                      <div className="konor-bitacora-meta-left">
                        <span className={`konor-tag-tipo ${item.tipo === 'Cancelacion' ? 'tag-cancel' : 'tag-obs'}`}>
                          {item.tipo === 'Cancelacion' ? 'Cancelación de Turno' : 'Observación'}
                        </span>
                        <span className="font-bold text-xs text-[#06113c]">{item.autor}</span>
                        <span className="text-[11px] text-slate-400">
                          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-CL') : ''}
                        </span>
                      </div>
                      {item.tipo === 'Observacion' && (
                        <button
                          type="button"
                          onClick={() => solicitarEliminarNota(item.id)}
                          className="konor-btn-trash"
                          title="Eliminar observación"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{item.comentario}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleNotaSubmit} className="konor-bitacora-input-wrap">
              <input
                type="text"
                placeholder="Escribe una observación de desempeño (Presiona Enter para guardar)..."
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                disabled={guardandoNota}
                className="konor-input text-xs"
              />
              <button
                type="submit"
                disabled={guardandoNota || !nuevaNota?.trim()}
                className="konor-btn-primary px-3 py-2"
                title="Guardar nota"
              >
                {guardandoNota ? <Loader2 className="konor-spin" size={14} /> : <Send size={14} />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 4. Modal Institucional */}
      {modal && (
        <div className="konor-modal-backdrop" onClick={cerrarModal}>
          <div className="konor-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="konor-modal-header">
              {modal.tipo === 'confirm' ? (
                <div className="konor-modal-icon-badge warning">
                  <AlertTriangle size={20} />
                </div>
              ) : modal.tipo === 'error' ? (
                <div className="konor-modal-icon-badge danger">
                  <AlertTriangle size={20} />
                </div>
              ) : (
                <div className="konor-modal-icon-badge success">
                  <CheckCircle size={20} />
                </div>
              )}
              <h3 className="konor-modal-title">{modal.titulo}</h3>
            </div>
            <p className="konor-modal-message">{modal.mensaje}</p>
            <div className="konor-modal-actions">
              {modal.tipo === 'confirm' ? (
                <>
                  <button type="button" onClick={cerrarModal} className="konor-btn-secondary">
                    Cancelar
                  </button>
                  <button type="button" onClick={modal.onConfirmar} className="konor-btn-danger">
                    Eliminar
                  </button>
                </>
              ) : (
                <button type="button" onClick={cerrarModal} className="konor-btn-primary">
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}