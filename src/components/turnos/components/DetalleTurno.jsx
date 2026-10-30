import React, { useState } from 'react';
import { useDetalleTurno } from '../hooks/useDetalleTurno.js';
import TablaComparativa from './TablaComparativa.jsx';
import ModalCancelacion from '../views/ModalCancelacion.jsx';
import ListaAsistencia from '../views/ListaAsistencia.jsx';
import {
  ArrowLeft,
  Search,
  Check,
  Save,
  Edit3,
  Loader2,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import './DetalleTurno.css';

export default function DetalleTurno({ turno: turnoInicial, onVolver }) {
  const t = useDetalleTurno(turnoInicial);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  if (t.loading) {
    return (
      <div className="konor-detalle-loading">
        <Loader2 size={36} className="konor-spin text-[#43b0c4]" />
        <p>Cargando información del turno...</p>
      </div>
    );
  }

  if (!t.idTurnoActual) {
    return (
      <div className="konor-detalle-view">
        <div className="konor-detalle-notfound">
          <AlertCircle size={44} className="text-amber-500 mb-3" />
          <h2>No se ha seleccionado ningún turno</h2>
          <p>Regresa a la lista de turnos para seleccionar uno válido.</p>
          <button onClick={onVolver} className="konor-btn-primary mt-4">
            ← Volver al listado
          </button>
        </div>
      </div>
    );
  }

  const cuposTotales = t.turno.cupos || 5;
  const botonGuardarDeshabilitado = t.guardando || (t.modoEdicion && t.totalAsignados === 0);

  const handleSeleccionarEnBuscador = (alumno) => {
    if (t.handleAgregarInteresado) {
      t.handleAgregarInteresado(alumno);
    }
    setTerminoBusqueda('');
  };

  const resultadosBusqueda = terminoBusqueda.trim().length > 1
    ? (t.alumnosCatalogo || []).filter((al) => {
        const query = terminoBusqueda.toLowerCase();
        const coincide = al.nombre?.toLowerCase().includes(query) || (al.rut && al.rut.toLowerCase().includes(query));
        const yaEsta = (t.interesados || []).some((i) => i.id_alumno === al.id_alumno);
        return coincide && !yaEsta;
      }).slice(0, 5)
    : [];

  return (
    <div className="konor-detalle-view">
      <button type="button" onClick={onVolver} className="konor-detalle-back-btn">
        <ArrowLeft size={16} />
        <span>Volver a turnos</span>
      </button>

      {/* Título Principal H1 único para el nombre del evento */}
      <h1 className="konor-detalle-title">
        Lista de turno: {t.turno.nombre_evento || 'Turno Operativo'}
      </h1>

      {/* Panel de Resumen Horizontal sin el nombre repetido */}
      <div className="shift-overview">
        <div className="shift-meta-group">
          <div className="shift-meta-item">
            <span className="shift-meta-label">DÍA DEL EVENTO</span>
            <span className="shift-meta-value">{t.fechaStr}</span>
          </div>

          <div className="shift-meta-item">
            <span className="shift-meta-label">HORA INICIO</span>
            <span className="shift-meta-value">{t.horaInicioBase}</span>
          </div>

          <div className="shift-meta-item">
            <span className="shift-meta-label">HORA SALIDA</span>
            <span className="shift-meta-value">
              {t.horaTerminoBase} <span className="duration-tag">({t.duracionTurno} hrs)</span>
            </span>
          </div>
        </div>

        {!t.vistaAsistencia && (
          <div className="assignment-controls">
            <div className="search-box-wrapper">
              <Search size={16} className="search-box-icon" />
              <input
                type="text"
                placeholder="Buscar alumno para agregar..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                disabled={!t.modoEdicion || t.turno.estado === 'Cerrado'}
                className="search-box-input"
              />
              {resultadosBusqueda.length > 0 && (
                <div className="search-dropdown-results">
                  {resultadosBusqueda.map((al) => (
                    <div
                      key={al.id_alumno}
                      onClick={() => handleSeleccionarEnBuscador(al)}
                      className="search-dropdown-item"
                    >
                      <span className="item-name">{al.nombre}</span>
                      <span className="item-hours">{al.horas_acumuladas || 0} hrs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={t.handleAutoAsignar}
              disabled={!t.modoEdicion || (t.interesados || []).length === 0 || t.turno.estado === 'Cerrado'}
              className="btn-autoasignar-oficial"
            >
              <Check size={16} />
              <span>✓ Auto-asignar</span>
            </button>
          </div>
        )}
      </div>

      {!t.vistaAsistencia ? (
        <TablaComparativa
          interesados={t.interesados}
          modoEdicion={t.modoEdicion}
          estadoTurno={t.turno.estado}
          cuposTotales={cuposTotales}
          totalAsignados={t.totalAsignados}
          onToggleAsignado={t.handleToggleAsignado}
          onQuitar={t.handleQuitarInteresado}
        />
      ) : (
        <ListaAsistencia
          turno={t.turno}
          asistenciaRows={t.asistenciaRows}
          onCambioHora={t.handleCambioHoraAsistencia}
          onValidarHora={t.handleValidarHoraBlur}
          onTogglePresente={t.handleTogglePresenteAsistencia}
          onSellarTurno={t.handleSellarTurnoBD}
          guardando={t.guardando}
        />
      )}

      <div className="footer-actions">
        {!t.vistaAsistencia ? (
          <>
            {t.turno.estado === 'Asignado' && (
              <button
                type="button"
                onClick={() => t.setVistaAsistencia(true)}
                className="btn-abrir-lista"
              >
                <UserCheck size={16} />
                <span>Abrir lista</span>
              </button>
            )}

            {t.turno.estado !== 'Cerrado' && (
              <button
                type="button"
                onClick={t.modoEdicion ? t.handleGuardarTurno : () => t.setModoEdicion(true)}
                disabled={botonGuardarDeshabilitado}
                className={`btn-guardar-turno ${!t.modoEdicion ? 'edit-mode' : ''}`}
              >
                {t.guardando ? (
                  <>
                    <Loader2 size={16} className="konor-spin text-[#43b0c4]" />
                    <span>Guardando...</span>
                  </>
                ) : t.modoEdicion ? (
                  <span>Guardar turno</span>
                ) : (
                  <span>✎ Editar turno</span>
                )}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => t.setVistaAsistencia(false)}
            className="btn-volver-asignacion-link"
          >
            ← Volver a Asignación
          </button>
        )}
      </div>

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