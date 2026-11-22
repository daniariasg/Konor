import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase.js';
import {
  DollarSign,
  Clock,
  CalendarClock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  PlusCircle,
  FileSpreadsheet,
  History,
  Users
} from 'lucide-react';
import './DashboardView.css';

const formatearFechaLocalSQL = (fecha) => {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mi = String(fecha.getMinutes()).padStart(2, '0');
  const ss = String(fecha.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mm}:${ss}`;
};

export default function DashboardView({ onNavegar }) {
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState({
    presupuestoTotal: 1500000,
    montoEjecutado: 0,
    horasTotales: 0,
    valorHora: 2500,
    topeHoras: 60,
    turnosSemana: 0,
    listasPorCerrar: [],
    alertasTope: [],
    alertasCercanas: []
  });

  const cargarMetricas = useCallback(async () => {
    try {
      setLoading(true);

      const ahora = new Date();
      const año = ahora.getFullYear();
      const mes = ahora.getMonth();

      const primerDiaMes = new Date(Date.UTC(año, mes, 1, 0, 0, 0)).toISOString();
      const ultimoDiaMes = new Date(Date.UTC(año, mes + 1, 0, 23, 59, 59, 999)).toISOString();

      // Fin del día actual (23:59:59) para incluir todas las listas que se cierran hoy y atrasadas
      const finDeHoy = new Date(ahora);
      finDeHoy.setHours(23, 59, 59, 999);
      const finDeHoySQL = formatearFechaLocalSQL(finDeHoy);

      // Ventana móvil de 7 días (hoy + próximos 6 días) en hora local
      const inicioVentana = new Date(ahora);
      inicioVentana.setHours(0, 0, 0, 0);

      const finVentana = new Date(inicioVentana);
      finVentana.setDate(inicioVentana.getDate() + 6);
      finVentana.setHours(23, 59, 59, 999);

      const inicioSemanaSQL = formatearFechaLocalSQL(inicioVentana);
      const finSemanaSQL = formatearFechaLocalSQL(finVentana);

      const [resConfig, resAlumnos, resAsig, resLedger, resTurnosSemana, resTurnosVencidos] = await Promise.all([
        supabase.from('configuracion_sistema').select('*').limit(1).maybeSingle(),
        supabase.from('alumno').select('id_alumno, nombre, rut').eq('activo', true),
        supabase
          .from('asignacion_turno')
          .select('id_alumno, horas_validadas, turno!inner(fecha_inicio, estado)')
          .in('estado_asignacion', ['Asistió', 'Ausente'])
          .gte('turno.fecha_inicio', primerDiaMes)
          .lte('turno.fecha_inicio', ultimoDiaMes),
        supabase
          .from('ajuste_ledger')
          .select('id_alumno, delta_horas, fecha_registro')
          .gte('fecha_registro', primerDiaMes)
          .lte('fecha_registro', ultimoDiaMes),
        supabase
          .from('turno')
          .select('id_turno')
          .in('estado', ['Abierto', 'Asignado'])
          .gte('fecha_inicio', inicioSemanaSQL)
          .lte('fecha_inicio', finSemanaSQL),
        supabase
          .from('turno')
          .select('id_turno, nombre_evento, fecha_inicio, fecha_termino, estado, cupos')
          .lte('fecha_inicio', finDeHoySQL)
          .neq('estado', 'Cerrado')
          .neq('estado', 'Cancelado')
          .order('fecha_inicio', { ascending: false })
      ]);

      const valorHora = Number(resConfig.data?.valor_hora) || 2500;
      const topeHoras = Number(resConfig.data?.tope_horas_mensual) || 60;
      const presupuesto = Number(resConfig.data?.presupuesto_mensual) || 1500000;

      const mapaHoras = {};
      (resAsig.data || []).forEach((a) => {
        mapaHoras[a.id_alumno] = (mapaHoras[a.id_alumno] || 0) + (Number(a.horas_validadas) || 0);
      });
      (resLedger.data || []).forEach((l) => {
        mapaHoras[l.id_alumno] = (mapaHoras[l.id_alumno] || 0) + (Number(l.delta_horas) || 0);
      });

      let sumaHorasTotales = 0;
      const superanTope = [];
      const cercanasTope = [];

      (resAlumnos.data || []).forEach((al) => {
        const total = Math.max(0, mapaHoras[al.id_alumno] || 0);
        sumaHorasTotales += total;

        if (total >= topeHoras) {
          superanTope.push({ ...al, horas: total });
        } else if (total >= topeHoras * 0.8) {
          cercanasTope.push({ ...al, horas: total });
        }
      });

      const montoEjecutado = Math.round(sumaHorasTotales * valorHora);

      setMetricas({
        presupuestoTotal: presupuesto,
        montoEjecutado,
        horasTotales: sumaHorasTotales,
        valorHora,
        topeHoras,
        turnosSemana: resTurnosSemana.data?.length || 0,
        listasPorCerrar: resTurnosVencidos.data || [],
        alertasTope: superanTope,
        alertasCercanas: cercanasTope
      });
    } catch (err) {
      console.error('Error cargando métricas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  if (loading) {
    return (
      <div className="konor-dashboard-view animate-pulse">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div className="konor-skeleton-block" style={{ width: '240px', height: '26px', marginBottom: '6px' }} />
            <div className="konor-skeleton-block" style={{ width: '340px', height: '14px' }} />
          </div>
          <div className="konor-skeleton-block" style={{ width: '38px', height: '38px', borderRadius: '8px' }} />
        </div>

        <div className="konor-dashboard-grid-kpis">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="konor-kpi-card" style={{ height: '116px' }}>
              <div className="konor-skeleton-block" style={{ width: '50%', height: '14px', marginBottom: '12px' }} />
              <div className="konor-skeleton-block" style={{ width: '70%', height: '26px' }} />
            </div>
          ))}
        </div>

        <div className="konor-dashboard-main-grid">
          <div className="konor-left-column">
            <div className="konor-dashboard-card" style={{ height: '165px' }} />
            <div className="konor-quick-actions-grid-2x2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="konor-skeleton-block" style={{ height: '64px', borderRadius: '12px' }} />
              ))}
            </div>
          </div>
          <div className="konor-dashboard-card" style={{ height: '245px' }} />
        </div>
      </div>
    );
  }

  const porcentajePresupuesto = metricas.presupuestoTotal > 0
    ? Math.min(100, Math.round((metricas.montoEjecutado / metricas.presupuestoTotal) * 100))
    : 0;

  const saldoDisponible = Math.max(0, metricas.presupuestoTotal - metricas.montoEjecutado);
  const totalAlertasJornada = metricas.alertasTope.length + metricas.alertasCercanas.length;
  const hayPendientesCierre = metricas.listasPorCerrar.length > 0;
  const hayAlertasOperativas = hayPendientesCierre || totalAlertasJornada > 0;

  return (
    <div className="konor-dashboard-view">
      <div className="konor-dashboard-header">
        <div>
          <h1 className="konor-dashboard-title">Dashboard Administrativo</h1>
          <p className="konor-dashboard-subtitle">
            Monitoreo en tiempo real de presupuesto institucional, jornada y ejecución operativa
          </p>
        </div>
        <button type="button" onClick={cargarMetricas} className="konor-btn-icon" title="Actualizar datos">
          <RefreshCw size={17} />
        </button>
      </div>

      {/* 1. TARJETAS KPI */}
      <div className="konor-dashboard-grid-kpis">
        <div className="konor-kpi-card kpi-presupuesto">
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">Presupuesto ejecutado</span>
            <div className="konor-kpi-icon-wrap">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="konor-kpi-value">${metricas.montoEjecutado.toLocaleString('es-CL')}</div>
          <div className="konor-kpi-footer">De ${metricas.presupuestoTotal.toLocaleString('es-CL')} asignados</div>
        </div>

        <div className="konor-kpi-card kpi-horas">
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">Horas validadas</span>
            <div className="konor-kpi-icon-wrap">
              <Clock size={16} />
            </div>
          </div>
          <div className="konor-kpi-value">{metricas.horasTotales.toFixed(1).replace('.', ',')} hrs</div>
          <div className="konor-kpi-footer">Tarifa: ${metricas.valorHora.toLocaleString('es-CL')}/hr</div>
        </div>

        <div className="konor-kpi-card kpi-turnos">
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">Turnos esta semana</span>
            <div className="konor-kpi-icon-wrap">
              <CalendarClock size={16} />
            </div>
          </div>
          <div className="konor-kpi-value">{metricas.turnosSemana}</div>
          <div className="konor-kpi-footer">Próximos 7 días</div>
        </div>

        <div className={`konor-kpi-card kpi-listas ${hayPendientesCierre ? 'is-danger' : ''}`}>
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">Listas por cerrar</span>
            <div className={`konor-kpi-icon-wrap ${hayPendientesCierre ? 'is-danger' : ''}`}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div className={`konor-kpi-value ${hayPendientesCierre ? 'is-danger' : ''}`}>
            {metricas.listasPorCerrar.length}
          </div>
          <div className="konor-kpi-footer">
            {hayPendientesCierre ? 'Requieren cierre' : 'Asistencias selladas'}
          </div>
        </div>
      </div>

      {/* 2. GRILLA PRINCIPAL: PRESUPUESTO + 2x2 A LA IZQUIERDA, CONTROL A LA DERECHA */}
      <div className="konor-dashboard-main-grid">
        <div className="konor-left-column">
          {/* PANEL PRESUPUESTO */}
          <div className="konor-dashboard-card">
            <div className="konor-card-top-bar">
              <h2 className="konor-dashboard-card-title">Ejecución del Presupuesto</h2>
              <span className="konor-pct-badge">{porcentajePresupuesto}% utilizado</span>
            </div>

            <div className="konor-progress-bar-bg">
              <div
                className="konor-progress-bar-fill"
                style={{
                  width: `${porcentajePresupuesto}%`,
                  backgroundColor: porcentajePresupuesto > 90 ? '#ef4444' : porcentajePresupuesto > 75 ? '#f59e0b' : '#43b0c4'
                }}
              />
            </div>

            <div className="konor-presupuesto-breakdown">
              <div className="konor-breakdown-item">
                <span className="label">Presupuesto mensual</span>
                <strong className="value">${metricas.presupuestoTotal.toLocaleString('es-CL')}</strong>
              </div>
              <div className="konor-breakdown-item">
                <span className="label">Liquidado</span>
                <strong className="value">${metricas.montoEjecutado.toLocaleString('es-CL')}</strong>
              </div>
              <div className="konor-breakdown-item">
                <span className="label">Saldo disponible</span>
                <strong className="value is-positive">${saldoDisponible.toLocaleString('es-CL')}</strong>
              </div>
            </div>
          </div>

          {/* ACCESOS RÁPIDOS EN GRILLA 2x2 */}
          <div className="konor-quick-actions-grid-2x2">
            <button
              type="button"
              onClick={() => onNavegar && onNavegar('turnos')}
              className="konor-action-card card-turnos"
            >
              <div className="konor-action-icon-box icon-turnos">
                <PlusCircle size={19} />
              </div>
              <div className="konor-action-text">
                <span className="konor-action-title">Gestionar Turnos</span>
                <span className="konor-action-desc">Crear bloques y eventos</span>
              </div>
              <ChevronRight size={16} className="konor-action-arrow" />
            </button>

            <button
              type="button"
              onClick={() => onNavegar && onNavegar('directorio')}
              className="konor-action-card card-nomina"
            >
              <div className="konor-action-icon-box icon-nomina">
                <Users size={19} />
              </div>
              <div className="konor-action-text">
                <span className="konor-action-title">Consultar Nómina</span>
                <span className="konor-action-desc">Sueldos y horas validadas</span>
              </div>
              <ChevronRight size={16} className="konor-action-arrow" />
            </button>

            <button
              type="button"
              onClick={() => onNavegar && onNavegar('auditoria')}
              className="konor-action-card card-ledger"
            >
              <div className="konor-action-icon-box icon-ledger">
                <History size={19} />
              </div>
              <div className="konor-action-text">
                <span className="konor-action-title">Ajuste Ledger</span>
                <span className="konor-action-desc">Correcciones auditables</span>
              </div>
              <ChevronRight size={16} className="konor-action-arrow" />
            </button>

            <button
              type="button"
              onClick={() => onNavegar && onNavegar('carga-masiva')}
              className="konor-action-card card-excel"
            >
              <div className="konor-action-icon-box icon-excel">
                <FileSpreadsheet size={19} />
              </div>
              <div className="konor-action-text">
                <span className="konor-action-title">Carga Masiva</span>
                <span className="konor-action-desc">Importar planilla Excel</span>
              </div>
              <ChevronRight size={16} className="konor-action-arrow" />
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: CONTROL OPERATIVO */}
        <div className="konor-dashboard-card">
          <div className="konor-card-top-bar">
            <h2 className="konor-dashboard-card-title">Control Operativo</h2>
            <span className={`konor-card-pill ${hayAlertasOperativas ? 'alert' : 'ok'}`}>
              {hayAlertasOperativas ? 'Requiere atención' : 'Todo al día'}
            </span>
          </div>

          <div className="konor-operativo-sections">
            {/* BLOQUE 1: LISTAS POR SELLAR */}
            <div className="konor-operativo-block">
              {!hayPendientesCierre ? (
                <div className="konor-status-row">
                  <CheckCircle2 size={17} />
                  <span>
                    <strong>Asistencias al día:</strong> no hay listas pendientes de cierre.
                  </span>
                </div>
              ) : (
                <>
                  <div className="konor-operativo-subheader">
                    <span className="konor-tag-alerta-header is-danger">
                      Listas por sellar ({metricas.listasPorCerrar.length})
                    </span>
                    {metricas.listasPorCerrar.length > 3 && (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Desplaza para ver más</span>
                    )}
                  </div>
                  <div className="konor-scrollable-list">
                    {metricas.listasPorCerrar.map((t) => (
                      <div
                        key={t.id_turno}
                        onClick={() => onNavegar && onNavegar('turnos', { turno: t })}
                        className="konor-compact-turn-row"
                      >
                        <div>
                          <strong style={{ fontSize: '0.825rem', color: '#06113c', display: 'block' }}>{t.nombre_evento}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }} className="konor-tabular">
                            Término: {t.fecha_termino ? t.fecha_termino.substring(0, 10) : '--'} • {t.cupos} vacantes
                          </span>
                        </div>
                        <button type="button" className="konor-compact-btn">
                          <span>Cerrar</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* BLOQUE 2: LÍMITE MENSUAL */}
            <div className="konor-operativo-block">
              {totalAlertasJornada === 0 ? (
                <div className="konor-status-row">
                  <CheckCircle2 size={17} />
                  <span>
                    <strong>Límite de {metricas.topeHoras} hrs:</strong> todos los alumnos bajo el 80%.
                  </span>
                </div>
              ) : (
                <>
                  <div className="konor-operativo-subheader">
                    <span className="konor-tag-alerta-header">
                      Límite mensual ({metricas.topeHoras} hrs)
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }} className="konor-tabular">
                      {totalAlertasJornada} en observación
                    </span>
                  </div>
                  <div className="konor-scrollable-list">
                    {metricas.alertasTope.map((al) => (
                      <div key={al.id_alumno} className="konor-compact-alert-row danger">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
                          <div>
                            <strong style={{ fontSize: '0.8rem', color: '#06113c', display: 'block' }}>{al.nombre}</strong>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }} className="konor-tabular">{al.rut}</span>
                          </div>
                        </div>
                        <span className="konor-badge-horas-compact danger">
                          {al.horas.toFixed(1).replace('.', ',')} / {metricas.topeHoras} hrs
                        </span>
                      </div>
                    ))}

                    {metricas.alertasCercanas.map((al) => (
                      <div key={al.id_alumno} className="konor-compact-alert-row warning">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                          <div>
                            <strong style={{ fontSize: '0.8rem', color: '#06113c', display: 'block' }}>{al.nombre}</strong>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }} className="konor-tabular">{al.rut}</span>
                          </div>
                        </div>
                        <span className="konor-badge-horas-compact warning">
                          {al.horas.toFixed(1).replace('.', ',')} / {metricas.topeHoras} hrs
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}