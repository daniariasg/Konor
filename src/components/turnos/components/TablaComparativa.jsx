import React from 'react';
import { X, AlertOctagon } from 'lucide-react';

export default function TablaComparativa({
  interesados,
  modoEdicion,
  estadoTurno,
  onToggleAsignado,
  onQuitar,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
          Tabla Comparativa de Interesados ({interesados.length})
        </h2>
        <span className="text-xs text-slate-400">
          Orden automático estricto: Menor a mayor horas acumuladas[cite: 3, 4]
        </span>
      </div>

      {interesados.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Aún no hay alumnos agregados a la comparativa de este turno.
          <br />
          Utiliza el buscador superior para agregar a los postulantes voluntarios.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Asignar</th>
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">RUT</th>
                <th className="py-3 px-4 text-center">Horas Acumuladas</th>
                <th className="py-3 px-4 text-center">Condición</th>
                {modoEdicion && estadoTurno !== 'Cerrado' && (
                  <th className="py-3 px-4 text-center w-12">Quitar</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interesados.map((item, idx) => (
                <tr
                  key={item.id_alumno}
                  className={`transition ${
                    item.cancelo
                      ? 'bg-red-50/50'
                      : item.asignado
                      ? 'bg-emerald-50/60 font-medium'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={item.asignado}
                      disabled={!modoEdicion || item.cancelo || estadoTurno === 'Cerrado'}
                      onChange={() => onToggleAsignado(item)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-semibold">
                    {idx + 1}. {item.nombre}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{item.rut}</td>
                  <td className="py-3 px-4 text-center text-slate-700 font-bold">
                    {item.horas_acumuladas} hrs
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.cancelo ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-[10px]">
                        <AlertOctagon className="w-3 h-3" />
                        🚫 Canceló turno {item.motivo_cancelacion ? `(${item.motivo_cancelacion})` : ''}
                      </span>
                    ) : item.asignado ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                        ✓ Asignado
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-full text-[10px]">
                        En espera (Respaldo)
                      </span>
                    )}
                  </td>
                  {modoEdicion && estadoTurno !== 'Cerrado' && (
                    <td className="py-3 px-4 text-center">
                      {!item.cancelo && !item.asignado && (
                        <button
                          onClick={() => onQuitar(item.id_alumno)}
                          className="text-slate-300 hover:text-red-500 transition p-1 cursor-pointer"
                          title="Quitar de la lista"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}