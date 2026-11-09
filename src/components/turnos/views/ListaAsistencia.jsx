import React from 'react';

export default function ListaAsistencia({
  turno,
  asistenciaRows = [],
  cuposTotales = 0,
  totalAsignados = 0,
  onCambioHora,
  onValidarHora,
  onTogglePresente,
  onSellarTurno,
  onVolverAsignacion,
  guardando = false
}) {
  const cerrado = turno?.estado === 'Cerrado';

  return (
    <div className="konor-asistencia-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Botón superior para volver a la lista de asignación */}
      {onVolverAsignacion && (
        <button
          type="button"
          onClick={onVolverAsignacion}
          className="back-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', fontWeight: 500, padding: 0, width: 'fit-content' }}
        >
          <span className="back-circle" style={{ width: '20px', height: '20px', backgroundColor: '#06113C', color: '#ffffff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>‹</span>
          <span>Volver a lista de asignación</span>
        </button>
      )}

      <div className="list-card">
        <div className="list-card-header">
          {/* Título cambiado a azul oscuro institucional */}
          <h2 className="list-card-title" style={{ color: '#06113C', fontWeight: 700, fontSize: '16px', textTransform: 'none' }}>
            Lista de asistencia
          </h2>
          {/* Refleja correctamente los cupos y asignados */}
          <span className="badge-assigned state-complete">
            {asistenciaRows.filter(r => r.asistio).length} / {cuposTotales} asignados
          </span>
        </div>

        <div className="table-scroll">
          <table className="comparativa-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>NOMBRE</th>
                <th style={{ width: '25%', textAlign: 'center' }}>HORA ENTRADA</th>
                <th style={{ width: '25%', textAlign: 'center' }}>HORA SALIDA</th>
                <th style={{ width: '10%', textAlign: 'center' }}>HORAS REALES</th>
                <th style={{ width: '10%', textAlign: 'right' }}>ASISTENCIA</th>
              </tr>
            </thead>
            <tbody>
              {asistenciaRows.length === 0 ? (
                <tr className="empty-table-row">
                  <td colSpan={5}>
                    <div className="empty-message-wrap">
                      <div className="empty-info-circle">i</div>
                      <span>No hay alumnos asignados a este turno.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                asistenciaRows.map((row) => {
                  const tieneError = row.asistio && row.hora_entrada && row.hora_salida && row.hora_entrada >= row.hora_salida;

                  return (
                    <tr 
                      key={row.id_alumno} 
                      className={`${!row.asistio ? 'row-cancelled' : 'row-assigned'} ${tieneError ? 'row-invalido' : ''}`}
                    >
                      <td>
                        <div className="col-nombre-wrap">
                          <span className="alumno-nombre-text">{row.nombre}</span>
                          {!row.asistio && (
                            <span className="tag-cancelled">Ausente (0 hrs)</span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="time"
                          value={row.hora_entrada || ''}
                          onChange={(e) => onCambioHora(row.id_alumno, 'hora_entrada', e.target.value)}
                          onBlur={() => onValidarHora && onValidarHora(row.id_alumno, 'hora_entrada')}
                          disabled={!row.asistio || cerrado}
                          className="time-input"
                          style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, textAlign: 'center' }}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="time"
                          value={row.hora_salida || ''}
                          onChange={(e) => onCambioHora(row.id_alumno, 'hora_salida', e.target.value)}
                          onBlur={() => onValidarHora && onValidarHora(row.id_alumno, 'hora_salida')}
                          disabled={!row.asistio || cerrado}
                          className="time-input"
                          style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, textAlign: 'center' }}
                        />
                      </td>

                      <td className="hours-col" style={{ textAlign: 'center' }}>
                        {row.asistio ? `${row.horas_calculadas} hrs` : '0.00 hrs'}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions-wrap" style={{ justifyContent: 'flex-end' }}>
                          <input
                            type="checkbox"
                            className="student-check"
                            checked={row.asistio}
                            disabled={cerrado}
                            onChange={() => onTogglePresente(row.id_alumno)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {cerrado && (
          <div style={{ padding: '14px 20px', backgroundColor: '#f0fdf4', borderTop: '1px solid #bbf7d0', textAlign: 'center', color: '#166534', fontSize: '13px', fontWeight: 600 }}>
            ✓ Turno cerrado exitosamente. Las horas validadas fueron transferidas a las nóminas de pago.
          </div>
        )}
      </div>
    </div>
  );
}