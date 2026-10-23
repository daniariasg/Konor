import React, { useState } from 'react';

export default function ModalCancelacion({ alumno, onConfirmar, onCerrar }) {
  const [tipo, setTipo] = useState('cancelacion'); // 'cancelacion' | 'error_admin'
  const [motivo, setMotivo] = useState('');

  if (!alumno) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onConfirmar({
      tipo,
      motivo: tipo === 'cancelacion' ? motivo.trim() : '',
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-base font-bold text-[#06113C] mb-2">
          Retiro de Alumno Asignado
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Estás desmarcando a <strong className="text-slate-800 font-semibold">{alumno.nombre}</strong>. Indica el motivo del cambio para asegurar la trazabilidad del turno (HU11)[cite: 3, 4]:
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
            <input
              type="radio"
              name="tipoBaja"
              value="cancelacion"
              checked={tipo === 'cancelacion'}
              onChange={() => setTipo('cancelacion')}
              className="mt-0.5 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-red-700">🚫 Cancelación del estudiante</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                El alumno notificó que no podrá asistir. Se liberará la vacante y quedará registrado al final de la tabla[cite: 4].
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
            <input
              type="radio"
              name="tipoBaja"
              value="error_admin"
              checked={tipo === 'error_admin'}
              onChange={() => setTipo('error_admin')}
              className="mt-0.5 text-[#06113C] focus:ring-[#06113C] cursor-pointer"
            />
            <div>
              <div className="text-xs font-bold text-slate-800">✎ Error administrativo</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Error involuntario al marcar la casilla. Vuelve a "En espera" sin marcas negativas ni penalización[cite: 4].
              </div>
            </div>
          </label>

          {tipo === 'cancelacion' && (
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Motivo de la cancelación (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej: Avisó por WhatsApp por tope de horario"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-[#43b0c4]"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Volver
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#06113C] hover:bg-[#0a1a5c] text-white rounded-lg shadow-sm transition cursor-pointer"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}