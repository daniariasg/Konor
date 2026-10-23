import React, { useState, useMemo } from 'react';
import { createTurno } from '../../../services/turnosService.js';
import { ArrowLeft, Loader2, Clock } from 'lucide-react';

function calcularHorariosLocalesIniciales() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  const fechaLocal = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;

  const minutos = ahora.getMinutes();
  let inicio = new Date(ahora);

  if (minutos > 0 && minutos <= 30) {
    inicio.setMinutes(30, 0, 0);
  } else if (minutos > 30) {
    inicio.setHours(inicio.getHours() + 1, 0, 0, 0);
  } else {
    inicio.setMinutes(0, 0, 0);
  }

  const horaInicioStr = `${pad(inicio.getHours())}:${pad(inicio.getMinutes())}`;
  const fin = new Date(inicio.getTime() + 2 * 60 * 60 * 1000);
  const horaTerminoStr = `${pad(fin.getHours())}:${pad(fin.getMinutes())}`;

  return {
    fecha: fechaLocal,
    hora_inicio: horaInicioStr,
    hora_termino: horaTerminoStr,
  };
}

export default function FormCrearTurno({ onVolver, onTurnoCreado }) {
  const [formData, setFormData] = useState(() => {
    const horarios = calcularHorariosLocalesIniciales();
    return {
      nombre_evento: '',
      fecha: horarios.fecha,
      hora_inicio: horarios.hora_inicio,
      hora_termino: horarios.hora_termino,
      cupos: 5,
    };
  });

  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);

  const duracionHoras = useMemo(() => {
    if (!formData.hora_inicio || !formData.hora_termino) return 0;
    const [hIni, mIni] = formData.hora_inicio.split(':').map(Number);
    const [hFin, mFin] = formData.hora_termino.split(':').map(Number);
    const totalMin = hFin * 60 + mFin - (hIni * 60 + mIni);
    return totalMin > 0 ? Number((totalMin / 60).toFixed(2)) : 0;
  }, [formData.hora_inicio, formData.hora_termino]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorValidacion(null);

    if (duracionHoras <= 0) {
      setErrorValidacion('La hora de término debe ser estrictamente posterior a la hora de inicio.');
      return;
    }

    try {
      setGuardando(true);

      const fechaInicioISO = `${formData.fecha}T${formData.hora_inicio}:00`;
      const fechaTerminoISO = `${formData.fecha}T${formData.hora_termino}:00`;

      const response = await createTurno({
        nombre_evento: formData.nombre_evento,
        fecha_inicio: fechaInicioISO,
        fecha_termino: fechaTerminoISO,
        cupos: formData.cupos,
      });

      const turnoCreado = response?.data || response;

      if (response?.error) {
        throw new Error(response.error);
      }

      if (onTurnoCreado && turnoCreado) {
        onTurnoCreado(turnoCreado);
      }
    } catch (err) {
      console.error('Error al persistir el turno:', err);
      setErrorValidacion(err.message || 'Ocurrió un error al intentar crear el turno en Supabase.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="w-full py-4">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#06113C] font-semibold mb-6 transition cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Volver al listado</span>
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="pb-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-[#06113C]">Crear Nuevo Turno Institucional</h1>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa los detalles del bloque operativo. Al guardar, pasarás directamente a la selección de alumnos interesados.
            </p>
          </div>

          {errorValidacion && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs mt-4">
              {errorValidacion}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                Nombre del Evento / Turno
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Registro Feria Vocacional"
                value={formData.nombre_evento}
                onChange={(e) => setFormData({ ...formData, nombre_evento: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-[#43b0c4] focus:ring-1 focus:ring-[#43b0c4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                Fecha del Evento
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-[#43b0c4]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                  Hora Inicio
                </label>
                <input
                  type="time"
                  required
                  value={formData.hora_inicio}
                  onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-[#43b0c4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                  Hora Término
                </label>
                <input
                  type="time"
                  required
                  value={formData.hora_termino}
                  onChange={(e) => setFormData({ ...formData, hora_termino: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-[#43b0c4]"
                />
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
              duracionHoras > 0 ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <span className="font-medium">Duración calculada del turno:</span>
              </div>
              <span className="font-bold text-sm text-[#06113C]">
                {duracionHoras > 0 ? `${duracionHoras} hrs` : 'Horario inválido'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
                Cupos Requeridos (Titulares)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={formData.cupos}
                onChange={(e) => setFormData({ ...formData, cupos: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-[#43b0c4]"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onVolver}
                className="px-5 py-2.5 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || duracionHoras <= 0}
                className="px-6 py-2.5 text-sm bg-[#06113C] hover:bg-[#0a1a5c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                {guardando && <Loader2 className="animate-spin text-[#43b0c4]" size={16} />}
                <span>Crear y Continuar al Detalle</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}