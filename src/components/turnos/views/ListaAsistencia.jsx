import React from 'react';
import { 
  FileCheck2, 
  Lock, 
  Loader2, 
  CheckSquare, 
  Square 
} from 'lucide-react';

/**
 * Sanitiza valores horarios garantizando formato HH:mm estricto de 24 horas
 * para que el navegador no rechace el valor ni muestre '--:--'.
 */
function formatearParaInputTime(valor, fallback = '09:00') {
  if (!valor) return fallback;

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(valor)) {
    return valor.slice(0, 5);
  }

  const match = valor.match(/(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/i);
  if (match) {
    let horas = parseInt(match[1], 10);
    const minutos = match[2];
    const periodo = match[3]?.toLowerCase();

    if (periodo && (periodo.includes('p') || periodo.includes('pm')) && horas < 12) {
      horas += 12;
    } else if (periodo && (periodo.includes('a') || periodo.includes('am')) && horas === 12) {
      horas = 0;
    }
    return `${String(horas).padStart(2, '0')}:${minutos}`;
  }

  return fallback;
}

export default function ListaAsistencia({
  turno,
  asistenciaRows = [],
  onCambioHora,
  onValidarHora,
  onTogglePresente,
  onSellarTurno,
  guardando = false
}) {
  const cerrado = turno?.estado === 'Cerrado';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4">
      {/* Cabecera de la Lista */}
      <div className="p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="text-[#43b0c4]" size={24} />
            <h2 className="text-lg font-bold text-[#06113C] tracking-wide uppercase">
              Lista Oficial de Asistencia
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de minutos reales y cálculo de fracciones para pago (HU14, HU15)
          </p>
        </div>

        {cerrado && (
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200">
            <Lock size={14} />
            <span>Registro Sellado (Inmutable)</span>
          </div>
        )}
      </div>

      {/* Tabla de Asistencia */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 text-center">Asistencia</th>
              <th className="py-3 px-4">Alumno</th>
              <th className="py-3 px-4">RUT</th>
              <th className="py-3 px-4 text-center">Hora Entrada</th>
              <th className="py-3 px-4 text-center">Hora Salida</th>
              <th className="py-3 px-4 text-center">Horas Reales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {asistenciaRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No hay alumnos asignados a este turno.
                </td>
              </tr>
            ) : (
              asistenciaRows.map((row) => {
                const tieneError = row.asistio && row.hora_entrada && row.hora_salida && row.hora_entrada >= row.hora_salida;

                return (
                  <tr 
                    key={row.id_alumno} 
                    className={`${!row.asistio ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50/50'} ${tieneError ? 'bg-red-50' : ''}`}
                  >
                    {/* Checkbox Presente/Ausente */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onTogglePresente(row.id_alumno)}
                        disabled={cerrado}
                        className="text-slate-400 hover:text-[#06113C] disabled:cursor-not-allowed cursor-pointer transition inline-flex items-center justify-center"
                        title={row.asistio ? 'Marcar ausente' : 'Marcar presente'}
                      >
                        {row.asistio ? (
                          <CheckSquare className="text-sky-600" size={20} />
                        ) : (
                          <Square className="text-slate-300" size={20} />
                        )}
                      </button>
                    </td>

                    {/* Datos Alumno */}
                    <td className="py-3 px-4 font-semibold text-[#06113C]">
                      <span>{row.nombre}</span>
                      {!row.asistio && (
                        <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                          Ausente (0 hrs)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {row.rut}
                    </td>

                    {/* Hora Entrada */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="time"
                        value={formatearParaInputTime(row.hora_entrada, '09:00')}
                        onChange={(e) => onCambioHora(row.id_alumno, 'hora_entrada', e.target.value)}
                        onBlur={() => onValidarHora && onValidarHora(row.id_alumno, 'hora_entrada')}
                        disabled={!row.asistio || cerrado}
                        className={`text-xs px-2.5 py-1.5 border rounded-lg outline-none transition disabled:bg-slate-100 disabled:text-slate-400 ${
                          tieneError 
                            ? 'border-red-400 bg-red-50 text-red-700' 
                            : 'border-slate-200 focus:border-[#43b0c4]'
                        }`}
                      />
                    </td>

                    {/* Hora Salida */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="time"
                        value={formatearParaInputTime(row.hora_salida, '11:00')}
                        onChange={(e) => onCambioHora(row.id_alumno, 'hora_salida', e.target.value)}
                        onBlur={() => onValidarHora && onValidarHora(row.id_alumno, 'hora_salida')}
                        disabled={!row.asistio || cerrado}
                        className={`text-xs px-2.5 py-1.5 border rounded-lg outline-none transition disabled:bg-slate-100 disabled:text-slate-400 ${
                          tieneError 
                            ? 'border-red-400 bg-red-50 text-red-700' 
                            : 'border-slate-200 focus:border-[#43b0c4]'
                        }`}
                      />
                    </td>

                    {/* Horas Calculadas */}
                    <td className="py-3 px-4 text-center font-bold text-xs text-[#06113C]">
                      {row.asistio ? `${row.horas_calculadas} hrs` : '0 hrs'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pie con advertencia y botón de sellado */}
      {!cerrado ? (
        <div className="p-6 bg-white border-t border-slate-100 flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-slate-500 max-w-xl">
            Al sellar el turno, las horas se computarán de forma definitiva en el perfil de cada ayudante y la lista pasará a modo solo lectura.
          </p>
          <button
            type="button"
            onClick={onSellarTurno}
            disabled={guardando || asistenciaRows.length === 0}
            className="inline-flex items-center gap-2 bg-[#06113C] hover:bg-[#0a1a5c] disabled:opacity-40 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
          >
            {guardando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#43b0c4]" />
                <span>Sellando registros...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Cerrar turno y sellar horas</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border-t border-emerald-100 text-center text-xs text-emerald-800 font-semibold">
          ✓ Turno cerrado exitosamente. Las horas validadas fueron transferidas a las nóminas de pago.
        </div>
      )}
    </div>
  );
}