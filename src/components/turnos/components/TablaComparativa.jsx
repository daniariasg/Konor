import React from 'react';
import './DetalleTurno.css';

const formatHoras = (horas) => {
  const h = Number(horas) || 0;
  return `${h.toFixed(1)} hrs`;
};

export default function TablaComparativa({
  interesados = [],
  cupos = 1,
  asignados = 0,
  modoEdicion = true,
  onToggleAsignado,
  onRemoverInteresado
}) {
  const listaInteresados = Array.isArray(interesados)
  ? interesados.filter(Boolean)
  : [];

  const badgeClass =
    asignados === 0
      ? 'badge-assigned state-empty'
      : asignados >= cupos
      ? 'badge-assigned state-complete'
      : 'badge-assigned state-partial';

  return (
    <div className="list-card">
      <div className="list-card-header">
        <h2 className="list-card-title">Postulantes al Turno</h2>
        <span className={badgeClass}>
          {asignados}/{cupos} asignados
        </span>
      </div>

      <div className="table-scroll">
        <table className="comparativa-table">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>NOMBRE</th>
              <th style={{ width: '35%' }}>TOTAL DE HORAS ACUMULADAS</th>
              <th style={{ width: '20%', textAlign: 'right' }}>ASIGNAR AL TURNO</th>
            </tr>
          </thead>
          <tbody>
            {listaInteresados.length === 0 ? (
              <tr className="empty-table-row">
                <td colSpan={3}>
                  <div className="empty-message-wrap">
                    <div className="empty-info-circle">i</div>
                    <span>Aún no hay alumnos agregados a la comparativa de este turno. Utiliza el buscador superior para agregar a los postulantes voluntarios.</span>
                  </div>
                </td>
              </tr>
            ) : (
              listaInteresados.map((al, index) => {
                const estaAsignado = Boolean(al.asignado || al.estado_asignacion === 'Asignado');
                const estaCancelado = Boolean(al.cancelo || al.estado_asignacion === 'Canceló turno');

                let rowClass = '';
                if (estaCancelado) rowClass = 'row-cancelled';
                else if (estaAsignado) rowClass = 'row-assigned';

                const uniqueKey = al.id_alumno 
                  ? `alumno-${al.id_alumno}` 
                  : al.id_asignacion 
                  ? `asig-${al.id_asignacion}` 
                  : `row-${index}`;

                return (
                  <tr key={uniqueKey} className={rowClass}>
                    <td>
                      <div className="col-nombre-wrap">
                        <span className="alumno-nombre-text">{al.nombre || 'Sin nombre'}</span>
                        {estaCancelado ? (
                          <span className="tag-cancelled">🚫 Canceló turno</span>
                        ) : estaAsignado ? (
                          <span className="tag-pinned">✓ Asignado</span>
                        ) : (
                          <span className="tag-backup">En espera (Respaldo)</span>
                        )}
                      </div>
                      {estaCancelado && al.motivo_cancelacion && (
                        <div className="cancel-reason-note">
                          Motivo: "{al.motivo_cancelacion}"
                        </div>
                      )}
                    </td>

                    <td className="hours-col">
                      {formatHoras(al.horas_acumuladas)}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions-wrap">
                        <input
                          type="checkbox"
                          className="student-check"
                          checked={estaAsignado}
                          disabled={!modoEdicion || estaCancelado || (!estaAsignado && asignados >= cupos)}
                          onChange={() => onToggleAsignado && onToggleAsignado(al.id_alumno)}
                        />
                        {modoEdicion && !estaCancelado && (
                          <button
                            type="button"
                            className="btn-remove-interested"
                            onClick={() => onRemoverInteresado(al.id_alumno ?? al.id)}
                            title="Quitar de la lista"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}