import React from 'react';
import { Info } from 'lucide-react';
import './TablaComparativa.css';

export default function TablaComparativa({
  interesados = [],
  modoEdicion = true,
  estadoTurno = 'Abierto',
  cuposTotales = 5,
  totalAsignados = 0,
  onToggleAsignado,
  onQuitar,
}) {
  const tieneInteresados = interesados.length > 0;

  const obtenerBadgeCupos = () => {
    let claseFondo = 'counter-cero';
    if (totalAsignados > 0 && totalAsignados < cuposTotales) {
      claseFondo = 'counter-parcial';
    } else if (totalAsignados >= cuposTotales) {
      claseFondo = 'counter-completo';
    }

    return (
      <span className={`assignedCounter ${claseFondo}`}>
        {totalAsignados}/{cuposTotales} asignados
      </span>
    );
  };

  return (
    <div className="list-card">
      {/* Título conciso y badge dinámico de cupos */}
      <div className="list-card-header">
        <h2 className="list-card-title">Postulantes al Turno</h2>
        {obtenerBadgeCupos()}
      </div>

      <div className="table-responsive-wrapper">
        <table className="tabla-oficial-konor">
          <thead>
            <tr>
              <th className="col-nombre">NOMBRE</th>
              <th className="col-horas">TOTAL DE HORAS ACUMULADAS</th>
              <th className="col-accion">ASIGNAR AL TURNO</th>
            </tr>
          </thead>
          <tbody>
            {!tieneInteresados ? (
              <tr className="empty-table-row">
                <td colSpan={3}>
                  <div className="empty-content">
                    <Info size={36} className="empty-icon" />
                    <p>
                      Aún no hay alumnos agregados a la comparativa de este turno. Utiliza el buscador superior para agregar a los postulantes voluntarios.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              interesados.map((item) => {
                const esAsignado = Boolean(item.asignado);
                const esCancelado = Boolean(item.cancelo);
                const horasAcum = Number(item.horas_acumuladas || 0).toFixed(1);

                return (
                  <tr
                    key={item.id_alumno}
                    className={`fila-alumno ${esAsignado ? 'row-asignado' : ''} ${esCancelado ? 'row-cancelado' : ''}`}
                  >
                    <td className="col-nombre">
                      <div className="alumno-nombre-container">
                        <span className="alumno-nombre-txt">{item.nombre}</span>
                        {esCancelado ? (
                          <span className="tag-cancelled">🚫 Canceló turno</span>
                        ) : esAsignado ? (
                          <span className="tag-pinned">✓ Asignado</span>
                        ) : (
                          <span className="tag-backup">En espera (Respaldo)</span>
                        )}
                      </div>
                    </td>

                    <td className="col-horas hours-col">
                      <span>{horasAcum} hrs</span>
                    </td>

                    <td className="col-accion">
                      <div className="action-cell-container">
                        <input
                          type="checkbox"
                          checked={esAsignado}
                          disabled={!modoEdicion || esCancelado || estadoTurno === 'Cerrado'}
                          onChange={() => onToggleAsignado && onToggleAsignado(item)}
                          className="checkbox-oficial"
                          aria-label={`Asignar ${item.nombre}`}
                        />

                        {modoEdicion && estadoTurno !== 'Cerrado' && !esCancelado && (
                          <button
                            type="button"
                            onClick={() => onQuitar && onQuitar(item.id_alumno)}
                            className="btn-remove-interested"
                            title="Remover de la tabla"
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