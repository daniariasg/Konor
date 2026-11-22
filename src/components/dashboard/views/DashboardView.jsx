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
  Users,
  Wallet
} from 'lucide-react';
import './DashboardView.css';

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
      const ahoraISO = ahora.toISOString();
      const año = ahora.getFullYear();
      const mes = ahora.getMonth();

      const primerDiaMes = new Date(Date.UTC(año, mes, 1, 0, 0, 0)).toISOString();
      const ultimoDiaMes = new Date(Date.UTC(año, mes + 1, 0, 23, 59, 59, 999)).toISOString();

      const diaSemana = ahora.getDay();
      const distanciaLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
      
      const fechaLunes = new Date(ahora);
      fechaLunes.setDate(ahora.getDate() + distanciaLunes);
      fechaLunes.setHours(0, 0, 0, 0);

      const fechaDomingo = new Date(fechaLunes);
      fechaDomingo.setDate(fechaLunes.getDate() + 6);
      fechaDomingo.setHours(23, 59, 59, 999);

      const inicioSemanaISO = fechaLunes.toISOString();
      const finSemanaISO = fechaDomingo.toISOString();

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
          .gte('fecha_inicio', inicioSemanaISO)
          .lte('fecha_inicio', finSemanaISO),
        supabase
          .from('turno')
          .select('id_turno, nombre_evento, fecha_inicio, fecha_termino, estado, cupos')
          .lt('fecha_termino', ahoraISO)
          .neq('estado', 'Cerrado')
          .neq('estado', 'Cancelado')
          .order('fecha_termino', { ascending: false })
      ]);

      const valorHora = Number(resConfig.data?.valor_hora) || 2500;
      const topeHoras = Number(resConfig.data?.tope_horas_mensual) || 60;
      const presupuesto = Number(resConfig.data?.presupuesto_mensual) || 1500000;

      // Consolidar horas de turnos ejecutados y ajustes contables de Ledger
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div className="konor-skeleton-block" style={{ width: '240px', height: '26px', marginBottom: '6px' }} />
            <div className="konor-skeleton-block" style={{ width: '340px', height: '14px' }} />
          </div>
          <div className="konor-skeleton-block" style={{ width: '38px', height: '38px', borderRadius: '6px' }} />
        </div>

        <div className="konor-skeleton-block" style={{ width: '100%', height: '64px', borderRadius: '12px', marginBottom: '20px' }} />

        <div className="konor-dashboard-grid-kpis">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="konor-kpi-card" style={{ height: '110px' }}>
              <div className="konor-skeleton-block" style={{ width: '50%', height: '14px', marginBottom: '12px' }} />
              <div className="konor-skeleton-block" style={{ width: '70%', height: '24px' }} />
            </div>
          ))}
        </div>

        <div className="konor-dashboard-main-grid" style={{ marginTop: '16px' }}>
          <div className="konor-dashboard-card" style={{ height: '340px' }} />
          <div className="konor-dashboard-card" style={{ height: '340px' }} />
        </div>
      </div>
    );
  }

  const porcentajePresupuesto = metricas.presupuestoTotal > 0
    ? Math.min(100, Math.round((metricas.montoEjecutado / metricas.presupuestoTotal) * 100))
    : 0;

  const saldoDisponible = Math.max(0, metricas.presupuestoTotal - metricas.montoEjecutado);

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

      {/* ACCESOS RÁPIDOS LLAMATIVOS */}
      <div className="konor-quick-actions-container">
        <button 
          type="button" 
          onClick={() => onNavegar && onNavegar('turnos')} 
          className="konor-action-card card-turnos"
        >
          <div className="konor-action-icon-box icon-turnos">
            <PlusCircle size={20} />
          </div>
          <div className="konor-action-text">
            <span className="konor-action-title">Gestionar Turnos</span>
            <span className="konor-action-desc">Crear bloques y eventos</span>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => onNavegar && onNavegar('directorio')} 
          className="konor-action-card card-nomina"
        >
          <div className="konor-action-icon-box icon-nomina">
            <Users size={20} />
          </div>
          <div className="konor-action-text">
            <span className="konor-action-title">Consultar Nómina</span>
            <span className="konor-action-desc">Sueldos y horas validadas</span>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => onNavegar && onNavegar('auditoria')} 
          className="konor-action-card card-ledger"
        >
          <div className="konor-action-icon-box icon-ledger">
            <History size={20} />
          </div>
          <div className="konor-action-text">
            <span className="konor-action-title">Ajuste Ledger</span>
            <span className="konor-action-desc">Correcciones auditables</span>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => onNavegar && onNavegar('carga-masiva')} 
          className="konor-action-card card-excel"
        >
          <div className="konor-action-icon-box icon-excel">
            <FileSpreadsheet size={20} />
          </div>
          <div className="konor-action-text">
            <span className="konor-action-title">Carga Masiva</span>
            <span className="konor-action-desc">Importar planilla Excel</span>
          </div>
        </button>
      </div>

      {/* TARJETAS KPI */}
      <div className="konor-dashboard-grid-kpis">
        <div className="konor-kpi-card">
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">PRESUPUESTO EJECUTADO</span>
            <div className="konor-kpi-icon-wrap" style={{ backgroundColor: 'rgba(67, 176, 196, 0.12)', color: '#43b0c4' }}>
              <DollarSign size={17} />
            </div>
          </div>
          <div className="konor-kpi-value">${metricas.montoEjecutado.toLocaleString('es-CL')}</div>
          <div className="konor-kpi-footer">De ${metricas.presupuestoTotal.toLocaleString('es-CL')} asignados</div>
        </div>

        <div className="konor-kpi-card">
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">HORAS VALIDADAS</span>
            <div className="konor-kpi-icon-wrap" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
              <Clock size={17} />
            </div>
          </div>
          <div className="konor-kpi-value">{metricas.horasTotales.toFixed(1).replace('.', ',')} hrs</div>
          <div className="konor-kpi-footer">Tarifa: ${metricas.valorHora.toLocaleString('es-CL')}/hr</div>
        </div>

        <div className="konor-kpi-card">
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">TURNOS ESTA SEMANA</span>
            <div className="konor-kpi-icon-wrap" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
              <CalendarClock size={17} />
            </div>
          </div>
          <div className="konor-kpi-value">{metricas.turnosSemana}</div>
          <div className="konor-kpi-footer">Bloques planificados</div>
        </div>

        <div className="konor-kpi-card">
          <div className="konor-kpi-header">
            <span className="konor-kpi-label">LISTAS POR CERRAR</span>
            <div 
              className="konor-kpi-icon-wrap" 
              style={{ 
                backgroundColor: metricas.listasPorCerrar.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.12)', 
                color: metricas.listasPorCerrar.length > 0 ? '#dc2626' : '#64748b' 
              }}
            >
              <AlertCircle size={17} />
            </div>
          </div>
          <div className="konor-kpi-value" style={{ color: metricas.listasPorCerrar.length > 0 ? '#dc2626' : '#06113c' }}>
            {metricas.listasPorCerrar.length}
          </div>
          <div className="konor-kpi-footer">
            {metricas.listasPorCerrar.length === 0 ? 'Asistencias selladas' : 'Requieren cierre'}
          </div>
        </div>
      </div>

      {/* GRILLA PRINCIPAL */}
      <div className="konor-dashboard-main-grid">
        
        {/* PANEL IZQUIERDO: PRESUPUESTO */}
        <div className="konor-dashboard-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2 className="konor-dashboard-card-title">Ejecución del Presupuesto</h2>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Fondos validados</span>
          </div>
          
          <div style={{ marginTop: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 600, color: '#06113c' }}>Consumo actual ({porcentajePresupuesto}%)</span>
              <span style={{ color: '#64748b' }}>Remanente: ${saldoDisponible.toLocaleString('es-CL')}</span>
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
          </div>

          <div className="konor-presupuesto-breakdown">
            <div className="konor-breakdown-item">
              <span className="label">Presupuesto Mensual</span>
              <strong className="value">${metricas.presupuestoTotal.toLocaleString('es-CL')}</strong>
            </div>
            <div className="konor-breakdown-item">
              <span className="label">Liquidado / Sellado</span>
              <strong className="value" style={{ color: '#06113c' }}>${metricas.montoEjecutado.toLocaleString('es-CL')}</strong>
            </div>
            <div className="konor-breakdown-item">
              <span className="label">Saldo Libre</span>
              <strong className="value" style={{ color: '#059669' }}>${saldoDisponible.toLocaleString('es-CL')}</strong>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: ALERTAS OPERATIVAS Y LISTAS POR SELLAR */}
        <div className="konor-dashboard-card">
          
          {/* SECCIÓN: LISTAS POR SELLAR */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="konor-tag-alerta-header">LISTAS POR SELLAR</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: metricas.listasPorCerrar.length > 0 ? '#dc2626' : '#64748b' }}>
                  ({metricas.listasPorCerrar.length})
                </span>
              </div>
              {metricas.listasPorCerrar.length > 3 && (
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Desplaza para ver más</span>
              )}
            </div>

            {metricas.listasPorCerrar.length === 0 ? (
              <div className="konor-empty-operativo">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>Todas las asistencias están selladas al día.</span>
              </div>
            ) : (
              <div className="konor-scrollable-list">
                {metricas.listasPorCerrar.map((t) => (
                  <div 
                    key={t.id_turno} 
                    onClick={() => onNavegar && onNavegar('turnos', { turno: t })}
                    className="konor-compact-turn-row"
                  >
                    <div>
                      <strong style={{ fontSize: '0.825rem', color: '#06113c', display: 'block' }}>{t.nombre_evento}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
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
            )}
          </div>

          {/* SECCIÓN: ALERTAS DE TOPE 60 HORAS */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="konor-tag-alerta-header" style={{ color: '#06113c' }}>LÍMITE MENSUAL ({metricas.topeHoras} HRS)</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {metricas.alertasTope.length + metricas.alertasCercanas.length} en observación
              </span>
            </div>

            {metricas.alertasTope.length === 0 && metricas.alertasCercanas.length === 0 ? (
              <div className="konor-empty-operativo">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>Todos los alumnos están dentro del rango seguro (&lt;80%).</span>
              </div>
            ) : (
              <div className="konor-scrollable-list">
                {metricas.alertasTope.map((al) => (
                  <div key={al.id_alumno} className="konor-compact-alert-row danger">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: '#06113c', display: 'block' }}>{al.nombre}</strong>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>{al.rut}</span>
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
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>{al.rut}</span>
                      </div>
                    </div>
                    <span className="konor-badge-horas-compact warning">
                      {al.horas.toFixed(1).replace('.', ',')} / {metricas.topeHoras} hrs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}