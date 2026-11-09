import React from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useDetalleTurno } from '../hooks/useDetalleTurno.js';
import TablaComparativa from './TablaComparativa.jsx';
import ListaAsistencia from '../views/ListaAsistencia.jsx';
import ModalCancelacion from '../views/ModalCancelacion.jsx';
import './DetalleTurno.css';

export default function DetalleTurno(props = {}) {
  const turnoEntrante = props.turno || props.hook?.turno || props;
  const internalHook = useDetalleTurno(turnoEntrante);
  const t = props.hook?.idTurnoActual ? props.hook : internalHook;
  const onVolver = props.onVolver || props.hook?.onVolver;

if (t.loading || t.cargando) {
    return (
      <div className="konor-detalle-view animate-pulse" style={{ opacity: 0.85 }}>
        {/* Botón Volver falso */}
        <div className="konor-skeleton-block" style={{ width: '130px', height: '24px', marginBottom: '20px' }} />

        {/* Título de Turno */}
        <div className="konor-skeleton-block" style={{ width: '320px', height: '32px', marginBottom: '24px' }} />

        {/* Panel shift-overview */}
        <section className="shift-overview" style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div className="konor-skeleton-block" style={{ width: '100px', height: '42px' }} />
              <div className="konor-skeleton-block" style={{ width: '90px', height: '42px' }} />
              <div className="konor-skeleton-block" style={{ width: '110px', height: '42px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="konor-skeleton-block" style={{ width: '220px', height: '38px' }} />
              <div className="konor-skeleton-block" style={{ width: '110px', height: '38px' }} />
            </div>
          </div>
        </section>

        {/* Cabecera y cuerpo de tabla comparativa */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div className="konor-skeleton-block" style={{ width: '180px', height: '22px' }} />
            <div className="konor-skeleton-block" style={{ width: '80px', height: '22px' }} />
          </div>

          {/* Filas simuladas */}
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderTop: '1px solid #f1f5f9'
              }}
            >
              <div className="konor-skeleton-block" style={{ width: '240px', height: '20px' }} />
              <div className="konor-skeleton-block" style={{ width: '80px', height: '20px' }} />
              <div className="konor-skeleton-block" style={{ width: '40px', height: '20px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="konor-detalle-view">
      <button type="button" className="btn-back-link" onClick={onVolver}>
        <ArrowLeft size={16} /> Volver a turnos
      </button>

      <h1 className="konor-detalle-title">
        Lista de turno: {t.turno?.nombre_evento || 'Sin título'}
      </h1>

      <section className="shift-overview">
        <div className="shift-meta-group">
          <div className="meta-box"><span className="meta-label">DÍA DEL EVENTO</span><span className="meta-value">{t.fechaStr || t.fechaFormateada}</span></div>
          <div className="meta-box"><span className="meta-label">HORA INICIO</span><span className="meta-value">{t.horaInicioBase}</span></div>
          <div className="meta-box"><span className="meta-label">HORA SALIDA</span><span className="meta-value">{t.horaTerminoBase} ({t.duracionTurno} hrs)</span></div>
        </div>

        {/* Buscador visible pero bloqueado si el turno está guardado (modoEdicion = false) */}
        {t.estadoTurno !== 'Cerrado' && (
          <div className="assignment-controls">
            <div className="search-box-wrapper">
              <Search className="search-box-icon" size={16} />
              <input
                type="text"
                placeholder={t.modoEdicion ? "Buscar alumno para agregar..." : "Presiona 'Editar turno' para buscar alumnos"}
                value={t.terminoBusqueda || ''}
                onChange={(e) => t.setTerminoBusqueda(e.target.value)}
                disabled={!t.modoEdicion}
                className="search-box-input"
                style={{ backgroundColor: t.modoEdicion ? '#ffffff' : '#f1f5f9', cursor: t.modoEdicion ? 'text' : 'not-allowed' }}
              />
              {t.modoEdicion && (t.terminoBusqueda || '').trim().length >= 1 && (
                <div className="search-dropdown-results">
                  {(t.resultadosBusqueda || []).length > 0 ? (
                    t.resultadosBusqueda.map((al) => (
                      <div key={al.id_alumno} className="search-dropdown-item">
                        <div className="search-item-left">
                          <span className="search-item-name">{al.nombre}</span>
                          <span className="search-item-hours">
                            Horas acumuladas: {(Number(al.horas_acumuladas) || 0).toFixed(1).replace('.', ',')} hrs
                          </span>
                        </div>
                        <div className="search-item-right">
                          {al.supera_limite ? (
                            <span className="badge-status-limit">SUPERÓ LÍMITE</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-search-add"
                              onMouseDown={(e) => { e.preventDefault(); t.handleAgregarInteresado(al); }}
                            >
                              + Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="search-dropdown-empty">No se encontraron alumnos disponibles</div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-autoassign"
              onClick={t.handleAutoAsignar}
              disabled={!t.modoEdicion || t.totalAsignados >= t.cuposTotales || (t.interesados || []).filter((i) => !i.cancelo).length === 0}
            >
              Autoasignar
            </button>
          </div>
        )}
      </section>

      {/* SEPARACIÓN DE FASES */}
      {t.modoEjecucion ? (
        <ListaAsistencia
          turno={{ ...t.turno, estado: t.estadoTurno }}
          asistenciaRows={t.asistenciaRows}
          cuposTotales={t.cuposTotales}
          totalAsignados={t.totalAsignados}
          onCambioHora={t.handleCambioHora}
          onValidarHora={t.handleValidarHora}
          onTogglePresente={t.handleTogglePresente}
          onSellarTurno={t.handleCerrarLista}
          onVolverAsignacion={() => t.setListaAbierta(false)}
          guardando={t.guardando}
        />
      ) : (
        <TablaComparativa
          interesados={t.interesados || []}
          cupos={t.cuposTotales}
          asignados={t.totalAsignados}
          modoEdicion={t.modoEdicion}
          onToggleAsignado={t.handleToggleAsignado}
          onRemoverInteresado={t.handleQuitarInteresado}
        />
      )}

      {/* FOOTER DE ACCIONES */}
      <footer className="footer-actions">
        {t.estadoTurno === 'Cerrado' ? (
          <div className="banner-lista-cerrada">
            Lista de asistencia cerrada y sellada. Estado: INMUTABLE.
          </div>
        ) : t.modoEjecucion ? (
          <button
            type="button"
            className="btn-save-turno"
            onClick={t.handleCerrarLista}
            disabled={t.guardando}
          >
            {t.guardando ? 'Cerrando...' : 'Cerrar lista'}
          </button>
        ) : (
          <div className="footer-actions-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            
            <button
              type="button"
              className="btn-edit-turno"
              onClick={t.handleAbrirLista}
              disabled={!t.puedeAbrirLista}
              style={{
                opacity: t.puedeAbrirLista ? 1 : 0.4,
                backgroundColor: t.puedeAbrirLista ? '#ffffff' : '#f1f5f9',
                color: t.puedeAbrirLista ? '#06113C' : '#94a3b8',
                borderColor: t.puedeAbrirLista ? '#cbd5e1' : '#e2e8f0',
                cursor: t.puedeAbrirLista ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease'
              }}
              title={
                t.puedeAbrirLista 
                  ? "Abrir lista oficial de asistencia del evento" 
                  : "El control de asistencia solo se habilita el día programado del evento"
              }
            >
              Abrir lista
            </button>

            {t.modoEdicion ? (
              <button
                type="button"
                className="btn-save-turno"
                onClick={t.handleGuardarTurno}
                disabled={t.guardando || t.totalAsignados === 0}
              >
                {t.guardando ? 'Guardando...' : 'Guardar turno'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-edit-turno"
                onClick={() => t.setModoEdicion(true)}
              >
                ✎ Editar turno
              </button>
            )}
          </div>
        )}
      </footer>

      {t.alumnoParaBaja && (
        <ModalCancelacion
          alumno={t.alumnoParaBaja}
          onConfirmar={t.handleConfirmarBaja}
          onCerrar={() => t.setAlumnoParaBaja(null)}
        />
      )}
    </div>
  );
}