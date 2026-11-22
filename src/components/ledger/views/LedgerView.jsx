import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase.js';
import { useLedger } from '../hooks/useLedger.js';
import ModalNuevoAjuste from '../components/ModalNuevoAjuste.jsx';
import { 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  ClipboardList,
  Clock,
  UserCheck
} from 'lucide-react';
import './LedgerView.css';

export default function LedgerView() {
  const {
    loading: loadingLedger,
    guardando,
    ajustes,
    alumnos,
    modalAbierto,
    setModalAbierto,
    mensaje,
    handleCrearAjuste,
    recargar: recargarLedger
  } = useLedger();

  const [subTab, setSubTab] = useState('ledger'); // 'ledger' | 'asistencia'
  const [auditoriasAsistencia, setAuditoriasAsistencia] = useState([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);

  // Consulta robusta: evita fallos por relaciones relacionales faltantes en Supabase
  const cargarAuditoriasAsistencia = useCallback(async () => {
    try {
      setLoadingAuditoria(true);

      const [resAuditoria, resAlumnos, resTurnos] = await Promise.all([
        supabase
          .from('asistencia_auditoria')
          .select('id_auditoria, id_turno, id_alumno, tipo_evento, campo, valor_anterior, valor_nuevo, fecha_registro')
          .order('fecha_registro', { ascending: false })
          .limit(100),
        supabase.from('alumno').select('id_alumno, nombre, rut'),
        supabase.from('turno').select('id_turno, nombre_evento')
      ]);

      if (resAuditoria.error) throw resAuditoria.error;

      const mapaAlumnos = (resAlumnos.data || []).reduce((acc, a) => {
        acc[a.id_alumno] = a;
        return acc;
      }, {});

      const mapaTurnos = (resTurnos.data || []).reduce((acc, t) => {
        acc[t.id_turno] = t;
        return acc;
      }, {});

      const mapeadas = (resAuditoria.data || []).map((item) => ({
        ...item,
        alumno: mapaAlumnos[item.id_alumno] || null,
        turno: mapaTurnos[item.id_turno] || null
      }));

      setAuditoriasAsistencia(mapeadas);
    } catch (err) {
      console.error('Error cargando auditoría de asistencia:', err);
    } finally {
      setLoadingAuditoria(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'asistencia') {
      cargarAuditoriasAsistencia();
    }
  }, [subTab, cargarAuditoriasAsistencia]);

  const recargarTodo = () => {
    if (subTab === 'ledger') {
      recargarLedger();
    } else {
      cargarAuditoriasAsistencia();
    }
  };

  const loading = subTab === 'ledger' ? loadingLedger : loadingAuditoria;

  if (loading) {
    return (
      <div className="konor-ledger-view animate-pulse">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div className="konor-skeleton-block" style={{ width: '380px', height: '28px', marginBottom: '8px' }} />
            <div className="konor-skeleton-block" style={{ width: '450px', height: '16px' }} />
          </div>
          <div className="konor-skeleton-block" style={{ width: '160px', height: '40px', borderRadius: '8px' }} />
        </div>
        <div className="konor-skeleton-block" style={{ width: '360px', height: '42px', borderRadius: '8px', marginBottom: '16px' }} />
        <div className="konor-ledger-card" style={{ height: '360px' }} />
      </div>
    );
  }

  return (
    <div className="konor-ledger-view">
      <div className="konor-ledger-header">
        <div>
          <h1 className="konor-ledger-title">Auditoría y Trazabilidad</h1>
          <p className="konor-ledger-subtitle">
            Registro inmutable de correcciones contables y trazabilidad de asistencia en tiempo real
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={recargarTodo} className="konor-btn-icon" title="Recargar">
            <RefreshCw size={17} />
          </button>
          {subTab === 'ledger' && (
            <button type="button" onClick={() => setModalAbierto(true)} className="konor-btn-primary">
              <Plus size={16} />
              <span>Ingresar Ajuste</span>
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div className={`konor-config-banner ${mensaje.tipo}`} style={{ marginBottom: '20px' }}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* SELECTOR DE PESTAÑAS REDISEÑADO CON BOTONES ESTILIZADOS */}
      <div className="konor-auditoria-tabs-container">
        <button
          type="button"
          onClick={() => setSubTab('ledger')}
          className={`konor-subtab-btn ${subTab === 'ledger' ? 'is-active' : ''}`}
        >
          <History size={16} />
          <span>Ajustes Contables</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('asistencia')}
          className={`konor-subtab-btn ${subTab === 'asistencia' ? 'is-active' : ''}`}
        >
          <ClipboardList size={16} />
          <span>Trazabilidad de Asistencia en Vivo</span>
        </button>
      </div>

      {/* CONTENIDO 1: TABLA DEL LEDGER CONTABLE */}
      {subTab === 'ledger' && (
        <div className="konor-ledger-card">
          {ajustes.length === 0 ? (
            <div className="konor-turnos-empty" style={{ padding: '48px 0' }}>
              <History size={42} className="text-slate-300" />
              <h3 style={{ color: '#06113c', margin: '12px 0 4px 0' }}>No hay ajustes contables registrados</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Todos los turnos liquidados se encuentran al día sin diferencias retroactivas.
              </p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="tabla-oficial-konor">
                <thead>
                  <tr>
                    <th style={{ width: '16%' }} className="th-left">FECHA REGISTRO</th>
                    <th style={{ width: '28%' }} className="th-left">ALUMNO AYUDANTE</th>
                    <th style={{ width: '16%' }} className="th-center">AJUSTE (Δ HORAS)</th>
                    <th style={{ width: '24%' }} className="th-left">TURNO ASOCIADO</th>
                    <th style={{ width: '16%' }} className="th-left">JUSTIFICACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {ajustes.map((item) => {
                    const esPositivo = Number(item.delta_horas) > 0;
                    const fecha = item.fecha_registro
                      ? new Date(item.fecha_registro).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '--';

                    return (
                      <tr key={item.id_ajuste} className="fila-alumno">
                        <td className="td-left">
                          <span className="font-mono text-xs text-slate-600">{fecha}</span>
                        </td>
                        <td className="td-left">
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#06113c', fontSize: '0.875rem' }}>
                              {item.alumno?.nombre || 'Alumno no identificado'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {item.alumno?.rut || '--'}
                            </span>
                          </div>
                        </td>
                        <td className="th-center">
                          <span className={`konor-delta-badge ${esPositivo ? 'positivo' : 'negativo'}`}>
                            {esPositivo ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            <span>{esPositivo ? `+${item.delta_horas}` : item.delta_horas} hrs</span>
                          </span>
                        </td>
                        <td className="td-left">
                          <span style={{ fontSize: '0.825rem', color: '#334155' }}>
                            {item.turno?.nombre_evento || 'Ajuste Directo'}
                          </span>
                        </td>
                        <td className="td-left">
                          <span style={{ fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                            "{item.justificacion}"
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO 2: TABLA DE ASISTENCIA_AUDITORIA */}
      {subTab === 'asistencia' && (
        <div className="konor-ledger-card">
          {auditoriasAsistencia.length === 0 ? (
            <div className="konor-turnos-empty" style={{ padding: '48px 0' }}>
              <ClipboardList size={42} className="text-slate-300" />
              <h3 style={{ color: '#06113c', margin: '12px 0 4px 0' }}>Sin registros de mutación horaria</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Las modificaciones de relojes y sellados de turnos se registrarán automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="tabla-oficial-konor">
                <thead>
                  <tr>
                    <th style={{ width: '16%' }} className="th-left">FECHA Y HORA</th>
                    <th style={{ width: '20%' }} className="th-left">TIPO DE OPERACIÓN</th>
                    <th style={{ width: '26%' }} className="th-left">ALUMNO AFECTADO</th>
                    <th style={{ width: '20%' }} className="th-left">TURNO ASOCIADO</th>
                    <th style={{ width: '18%' }} className="th-left">CAMBIO EFECTUADO</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoriasAsistencia.map((item) => {
                    const fecha = item.fecha_registro
                      ? new Date(item.fecha_registro).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })
                      : '--';

                    const esCambioHora = item.tipo_evento === 'cambio_hora';
                    const esCierre = item.tipo_evento === 'cierre_lista';

                    return (
                      <tr key={item.id_auditoria} className="fila-alumno">
                        <td className="td-left">
                          <span className="font-mono text-xs text-slate-600">{fecha}</span>
                        </td>
                        <td className="td-left">
                          <span className={`konor-audit-tipo-badge ${esCambioHora ? 'badge-hora' : esCierre ? 'badge-cierre' : 'badge-asistencia'}`}>
                            {esCambioHora ? <Clock size={12} /> : esCierre ? <ClipboardList size={12} /> : <UserCheck size={12} />}
                            <span>
                              {esCambioHora ? 'Cambio de Reloj' : esCierre ? 'Sellado de Turno' : 'Alternó Asistencia'}
                            </span>
                          </span>
                        </td>
                        <td className="td-left">
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#06113c', fontSize: '0.85rem' }}>
                              {item.alumno?.nombre || 'General / Turno'}
                            </span>
                            {item.alumno?.rut && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                                {item.alumno.rut}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="td-left">
                          <span style={{ fontSize: '0.825rem', color: '#334155' }}>
                            {item.turno?.nombre_evento || `Turno #${item.id_turno}`}
                          </span>
                        </td>
                        <td className="td-left">
                          <div style={{ fontSize: '0.76rem', color: '#334155', fontFamily: 'monospace' }}>
                            {item.campo ? (
                              <span>
                                {item.campo}: <strong style={{ color: '#b91c1c' }}>{JSON.stringify(item.valor_anterior)}</strong> &rarr; <strong style={{ color: '#15803d' }}>{JSON.stringify(item.valor_nuevo)}</strong>
                              </span>
                            ) : (
                              <span style={{ color: '#15803d', fontWeight: 600 }}>Asistencia sellada</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ModalNuevoAjuste
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        alumnos={alumnos}
        onConfirmar={handleCrearAjuste}
        guardando={guardando}
      />
    </div>
  );
}