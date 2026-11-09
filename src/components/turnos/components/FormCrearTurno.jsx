import React, { useState } from 'react';
import { supabase } from '../../../config/supabase.js';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  X, 
  Plus, 
  Save,
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import './FormCrearTurno.css';

    const obtenerFechaHoraLocal = (valor) => {
    if (!valor) return { fecha: '', hora: '' };

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return { fecha: '', hora: '' };

    const dosDigitos = (numero) => String(numero).padStart(2, '0');

    return {
      fecha: `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`,
      hora: `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
    };
  };

export default function FormCrearTurno({ onCerrar, onVolver, onTurnoCreado, turnoParaEditar = null }) {
  const esEdicion = Boolean(turnoParaEditar?.id_turno);

  // Extraer valores iniciales si es edición
  const inicioLocal = obtenerFechaHoraLocal(turnoParaEditar?.fecha_inicio);
  const terminoLocal = obtenerFechaHoraLocal(turnoParaEditar?.fecha_termino);

  const fechaInicial = inicioLocal.fecha || turnoParaEditar?.fecha || '';
  const horaIniInicial = inicioLocal.hora || turnoParaEditar?.hora_inicio || '';
  const horaFinInicial = terminoLocal.hora || turnoParaEditar?.hora_termino || '';



  const [formData, setFormData] = useState({
    nombre_evento: turnoParaEditar?.nombre_evento || '',
    fecha: fechaInicial,
    hora_inicio: horaIniInicial,
    hora_termino: horaFinInicial,
    cupos: esEdicion ? turnoParaEditar.cupos || '' : '' // Sin valor por defecto al crear
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
      setErrorMsg('Debes ingresar una cantidad válida de vacantes (mínimo 1).');
      return;
    }

    try {
      setGuardando(true);

      const fechaInicioISO = `${formData.fecha}T${formData.hora_inicio}:00`;
      const fechaTerminoISO = `${formData.fecha}T${formData.hora_termino}:00`;

      if (esEdicion) {
        // Actualizar turno existente sin borrar las asignaciones asociadas
        const { data: turnoActualizado, error: errUpdate } = await supabase
          .from('turno')
          .update({
            nombre_evento: formData.nombre_evento.trim(),
            fecha_inicio: fechaInicioISO,
            fecha_termino: fechaTerminoISO,
            cupos: Number(formData.cupos)
          })
          .eq('id_turno', turnoParaEditar.id_turno)
          .select()
          .single();

        if (errUpdate) throw errUpdate;

        if (onTurnoCreado) {
          onTurnoCreado(turnoActualizado);
        } else {
          handleCerrar();
        }
      } else {
        // Crear nuevo turno
        const payload = {
          nombre_evento: formData.nombre_evento.trim(),
          fecha_inicio: fechaInicioISO,
          fecha_termino: fechaTerminoISO,
          cupos: Number(formData.cupos),
          estado: 'Abierto'
        };

        const { data: turnoCreado, error } = await supabase
          .from('turno')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        if (onTurnoCreado) {
          onTurnoCreado(turnoCreado);
        } else {
          handleCerrar();
        }
      }
    } catch (err) {
      console.error('Error al procesar turno:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos.');
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
            <h2 className="konor-crear-title">
              {esEdicion ? 'Editar Turno / Evento' : 'Crear Nuevo Turno / Evento'}
            </h2>
            <p className="konor-crear-subtitle">
              {esEdicion 
                ? 'Actualiza los parámetros operativos del bloque sin afectar los alumnos inscritos.'
                : 'Configura el bloque operativo y las vacantes requeridas para los ayudantes.'}
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
                placeholder="Ej. 5"
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
                  <span>{esEdicion ? 'Guardando cambios...' : 'Creando...'}</span>
                </>
              ) : esEdicion ? (
                <>
                  <Save size={16} />
                  <span>Guardar Cambios</span>
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