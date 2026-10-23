import React, { useState, useMemo } from 'react';
import { Search, X, ShieldAlert } from 'lucide-react';

export default function BuscadorCortafuegos({
  alumnosCatalogo,
  interesados,
  duracionTurno,
  fInicio,
  fTermino,
  idTurno,
  onAgregar,
}) {
  const [busqueda, setBusqueda] = useState('');

  // Validación cortafuegos estricta (HU07)[cite: 3, 4]
  function evaluarCortafuegos(alumno) {
    // 1. Tope mensual de 60 horas[cite: 3, 4]
    if (alumno.horas_acumuladas + duracionTurno > 60.0) {
      return { bloqueado: true, motivo: 'Supera límite (60h)' };
    }

    // 2. Choque horario estricto con otros turnos asignados[cite: 3, 4]
    const tieneChoque = (alumno.turnos_asignados || []).some((t) => {
      if (t.id_turno === idTurno) return false;
      const tIni = new Date(t.fecha_inicio);
      const tFin = new Date(t.fecha_termino);
      // Condición de solapamiento: InicioA < FinB && FinA > InicioB
      return fInicio < tFin && fTermino > tIni;
    });

    if (tieneChoque) {
      return { bloqueado: true, motivo: 'Ocupado' };
    }

    return { bloqueado: false, motivo: null };
  }

  // Filtrado reactivo en memoria sobre el catálogo de alumnos
  const resultados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();

    return alumnosCatalogo
      .filter((a) => a.nombre.toLowerCase().includes(q) || a.rut.toLowerCase().includes(q))
      .slice(0, 6)
      .map((alumno) => {
        const enTabla = interesados.some((i) => i.id_alumno === alumno.id_alumno);
        const { bloqueado, motivo } = evaluarCortafuegos(alumno);
        return { ...alumno, enTabla, bloqueado, motivo };
      });
  }, [busqueda, alumnosCatalogo, interesados, duracionTurno, fInicio, fTermino, idTurno]);

  return (
    <div className="relative mb-6">
      <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm focus-within:border-[#43b0c4] focus-within:ring-1 focus-within:ring-[#43b0c4]">
        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Buscar alumno por nombre o RUT para agregar a la lista de interesados..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full text-sm outline-none text-slate-700 bg-transparent"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Menú flotante de resultados filtrados */}
      {busqueda.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
          {resultados.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No se encontraron alumnos disponibles con ese criterio
            </div>
          ) : (
            resultados.map((a) => (
              <div
                key={a.id_alumno}
                className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{a.nombre}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    {a.rut} • <span className="font-sans font-bold text-slate-600">{a.horas_acumuladas} hrs</span> acumuladas
                  </div>
                </div>

                <div>
                  {a.enTabla ? (
                    <span className="text-xs font-semibold text-slate-400 px-3 py-1 bg-slate-100 rounded-lg">
                      En la tabla
                    </span>
                  ) : a.bloqueado ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {a.motivo}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onAgregar(a);
                        setBusqueda('');
                      }}
                      className="text-xs font-semibold bg-[#06113C] hover:bg-[#0a1a5c] text-white px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                    >
                      + Agregar a lista
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}