import React, { useState } from 'react';
import { crearTurno, createTurno } from '../../../services/turnosService.js';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  X, 
  Plus, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import './FormCrearTurno.css';

export default function FormCrearTurno({ onCerrar, onVolver, onTurnoCreado }) {
  const [formData, setFormData] = useState({
    nombre_evento: '',
    fecha: '',
    hora_inicio: '',
    hora_termino: '',
    cupos: 5
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const handleCerrar = () => {
    if (typeof onCerrar === 'function') {
      onCerrar();
    } else if (typeof onVolver === 'function') {
      onVolver();
    }
  };

  const handleChange = (campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const calcularDuracion = () => {
    if (!formData.hora_inicio || !formData.hora_termino) return 0;
    const [hIni, mIni] = formData.hora_inicio.split(':').map(Number);
    const [hFin, mFin] = formData.hora_termino.split(':').map(Number);
    const totalMin = (hFin * 60 + mFin) - (hIni * 60 + mIni);
    return totalMin > 0 ? Number((totalMin / 60).toFixed(1)) : 0;
  };

  const duracionHoras = calcularDuracion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.nombre_evento.trim()) {
      setErrorMsg('Debes ingresar un nombre para el evento o turno.');
      return;
    }

    if (!formData.fecha) {
      setErrorMsg('Debes seleccionar una fecha para el turno.');
      return;
    }

    if (!formData.hora_inicio || !formData.hora_termino) {
      setErrorMsg('Debes ingresar la hora de inicio y de término.');
      return;
    }

    if (formData.hora_inicio >= formData.hora_termino) {
      setErrorMsg('La hora de inicio debe ser anterior a la hora de término.');
      return;
    }

    if (!formData.cupos || Number(formData.cupos) <= 0) {
      setErrorMsg('La cantidad de vacantes requeridas debe ser mayor a 0.');
      return;
    }

    try {
      setGuardando(true);

      // Fijación de hora real UTC fija (.000Z) para almacenar los caracteres exactos
      const fechaInicioISO = `${formData.fecha}T${formData.hora_inicio}:00.000Z`;
      const fechaTerminoISO = `${formData.fecha}T${formData.hora_termino}:00.000Z`;

      const payload = {
        nombre_evento: formData.nombre_evento.trim(),
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_termino: formData.hora_termino,
        fecha_inicio: fechaInicioISO,
        fecha_termino: fechaTerminoISO,
        cupos: Number(formData.cupos) || 5,
        estado: 'Abierto'
      };

      const fnCrear = typeof crearTurno === 'function' ? crearTurno : createTurno;
      const res = await fnCrear(payload);
      const turnoCreado = res?.data || res;

      if (onTurnoCreado) {
        onTurnoCreado(turnoCreado);
      } else {
        handleCerrar();
      }
    } catch (err) {
      console.error('Error al crear turno:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos para crear el turno.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div 
      className="konor-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCerrar();
      }}
    >
      <div className="konor-crear-card">
        <div className="konor-crear-header">
          <div className="konor-crear-title-group">
            <h2 className="konor-crear-title">Crear Nuevo Turno / Evento</h2>
            <p className="konor-crear-subtitle">
              Configura el bloque operativo y las vacantes requeridas para los ayudantes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            className="konor-crear-close-btn"
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="konor-crear-alert">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="konor-crear-form">
          <div className="konor-form-group">
            <label className="konor-form-label">
              <FileText size={15} />
              <span>Nombre del Evento o Actividad</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="Ej. Apoyo Feria Vocacional"
              value={formData.nombre_evento}
              onChange={(e) => handleChange('nombre_evento', e.target.value)}
              disabled={guardando}
              className="konor-form-input"
            />
          </div>

          <div className="konor-form-row">
            <div className="konor-form-group flex-1">
              <label className="konor-form-label">
                <Calendar size={15} />
                <span>Fecha del Turno</span>
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => handleChange('fecha', e.target.value)}
                disabled={guardando}
                className="konor-form-input"
              />
            </div>

            <div className="konor-form-group flex-1">
              <label className="konor-form-label">
                <Users size={15} />
                <span>Vacantes / Cupos</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max="50"
                value={formData.cupos}
                onChange={(e) => handleChange('cupos', e.target.value)}
                disabled={guardando}
                className="konor-form-input"
              />
            </div>
          </div>

          <div className="konor-form-row">
            <div className="konor-form-group flex-1">
              <label className="konor-form-label">
                <Clock size={15} />
                <span>Hora Inicio (24h)</span>
              </label>
              <input
                type="time"
                required
                value={formData.hora_inicio}
                onChange={(e) => handleChange('hora_inicio', e.target.value)}
                disabled={guardando}
                className="konor-form-input"
              />
            </div>

            <div className="konor-form-group flex-1">
              <label className="konor-form-label">
                <Clock size={15} />
                <span>Hora Término (24h)</span>
              </label>
              <input
                type="time"
                required
                value={formData.hora_termino}
                onChange={(e) => handleChange('hora_termino', e.target.value)}
                disabled={guardando}
                className="konor-form-input"
              />
            </div>
          </div>

          <div className="konor-duracion-box">
            <span className="konor-duracion-label">Duración total calculada:</span>
            <span className={`konor-duracion-valor ${duracionHoras <= 0 ? 'error' : ''}`}>
              {duracionHoras > 0 ? `${duracionHoras} hrs` : '--'}
            </span>
          </div>

          <div className="konor-crear-footer">
            <button
              type="button"
              onClick={handleCerrar}
              disabled={guardando}
              className="konor-btn-cancelar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || duracionHoras <= 0}
              className="konor-btn-crear"
            >
              {guardando ? (
                <>
                  <Loader2 size={16} className="konor-spin-icon" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Crear y Planificar Turno</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}