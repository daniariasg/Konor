import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Copy, 
  Trash2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { 
  fetchTurnos, 
  cancelarTurno, 
  duplicarTurno 
} from '../../../services/turnosService.js';
import './ListaTurnos.css';

export default function ListaTurnos({ onSeleccionarTurno, onAbrirCrear }) {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const cargarTurnos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchTurnos();
      setTurnos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar turnos:', err);
      setErrorMsg('No se pudieron recuperar los turnos operativos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTurnos();
  }, [cargarTurnos]);

  const handleCancelar = async (idTurno, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Deseas cancelar este bloque operativo?')) return;
    const { error } = await cancelarTurno(idTurno);
    if (error) {
      alert(`Error al cancelar turno: ${error}`);
    } else {
      cargarTurnos();
    }
  };

  const handleDuplicar = async (turno, e) => {
    e.stopPropagation();
    const hoyStr = new Date().toISOString().split('T')[0];
    const nuevaFecha = window.prompt(
      'Ingresa la nueva fecha para duplicar el turno (YYYY-MM-DD):', 
      hoyStr
    );
    if (!nuevaFecha) return;

    const fechaIniBase = new Date(turno.fecha_inicio);
    const fechaFinBase = new Date(turno.fecha_termino);

    const horaIniStr = fechaIniBase.toTimeString().slice(0, 5);
    const horaFinStr = fechaFinBase.toTimeString().slice(0, 5);

    const nuevaFechaInicio = `${nuevaFecha}T${horaIniStr}:00`;
    const nuevaFechaTermino = `${nuevaFecha}T${horaFinStr}:00`;

    const { error } = await duplicarTurno(turno.id_turno, nuevaFechaInicio, nuevaFechaTermino);
    if (error) {
      alert(`Error al duplicar: ${error}`);
    } else {
      cargarTurnos();
    }
  };

  const formatFecha = (isoString) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatHora = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const calcularHoras = (inicio, termino) => {
    if (!inicio || !termino) return 0;
    const ms = new Date(termino) - new Date(inicio);
    const hrs = ms / (1000 * 60 * 60);
    return hrs > 0 ? hrs.toFixed(1).replace('.', ',') : 0;
  };

  const abrirFormularioCrear = () => {
    if (typeof onAbrirCrear === 'function') {
      onAbrirCrear();
    } else {
      console.warn('onAbrirCrear no fue proporcionado a ListaTurnos');
    }
  };

  return (
    <div className="konor-turnos-view">
      {/* Cabecera Principal */}
      <div className="konor-turnos-header">
        <div>
          <h1 className="konor-turnos-title">Turnos y Eventos</h1>
          <p className="konor-turnos-subtitle">
            Planificación de bloques operativos y asignación equitativa (Sprint 2)
          </p>
        </div>
        <div className="konor-turnos-actions">
          <button 
            type="button" 
            className="konor-btn-refresh" 
            onClick={cargarTurnos} 
            title="Recargar lista"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            type="button" 
            className="konor-btn-primary" 
            onClick={abrirFormularioCrear}
          >
            <Plus size={18} />
            <span>Crear Turno</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="konor-turnos-error-banner">
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="konor-turnos-loading">
          <div className="konor-turnos-spinner" />
          <span>Cargando turnos operativos...</span>
        </div>
      ) : turnos.length === 0 ? (
        <div className="konor-turnos-empty-state">
          <Calendar size={48} className="konor-empty-icon" />
          <h3>No hay turnos registrados</h3>
          <p>Crea el primer bloque operativo para habilitar la tabla de asignación equitativa.</p>
          <button 
            type="button" 
            className="konor-btn-primary" 
            onClick={abrirFormularioCrear}
          >
            <Plus size={18} />
            <span>Crear primer turno</span>
          </button>
        </div>
      ) : (
        <div className="konor-turnos-grid">
          {turnos.map((turno) => {
            const ocupados = turno.cupos_ocupados || 0;
            const totales = turno.cupos || 0;
            const completo = ocupados >= totales && totales > 0;
            const horas = calcularHoras(turno.fecha_inicio, turno.fecha_termino);

            return (
              <div 
                key={turno.id_turno} 
                className="konor-turno-card"
                onClick={() => onSeleccionarTurno && onSeleccionarTurno(turno)}
              >
                <div className="konor-card-header">
                  <div className="konor-card-title-group">
                    <h3 className="konor-card-title">{turno.nombre_evento}</h3>
                    <span className={`konor-estado-badge estado-${(turno.estado || 'abierto').toLowerCase()}`}>
                      {turno.estado}
                    </span>
                  </div>
                  <div className="konor-card-options">
                    <button 
                      type="button" 
                      className="konor-card-btn-action" 
                      onClick={(e) => handleDuplicar(turno, e)}
                      title="Duplicar turno"
                    >
                      <Copy size={16} />
                    </button>
                    {turno.estado !== 'Cancelado' && turno.estado !== 'Cerrado' && (
                      <button 
                        type="button" 
                        className="konor-card-btn-action delete" 
                        onClick={(e) => handleCancelar(turno.id_turno, e)}
                        title="Cancelar turno"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="konor-card-body">
                  <div className="konor-info-row">
                    <Calendar size={16} className="konor-info-icon" />
                    <span>{formatFecha(turno.fecha_inicio)}</span>
                  </div>
                  <div className="konor-info-row">
                    <Clock size={16} className="konor-info-icon" />
                    <span>{formatHora(turno.fecha_inicio)} - {formatHora(turno.fecha_termino)} ({horas} hrs)</span>
                  </div>
                  <div className="konor-info-row">
                    <Users size={16} className="konor-info-icon" />
                    <span className={`konor-cupos-badge ${completo ? 'cupos-llenos' : ocupados > 0 ? 'cupos-parcial' : 'cupos-cero'}`}>
                      {ocupados} / {totales} cupos
                    </span>
                  </div>
                </div>

                <div className="konor-card-footer">
                  <span className="konor-card-link">
                    Gestionar asignaciones &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}