import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../config/supabase.js';
import { 
  X, 
  AlertCircle, 
  Save, 
  Scale, 
  Search, 
  ArrowRight, 
  User, 
  AlertTriangle 
} from 'lucide-react';

export default function ModalNuevoAjuste({ isOpen, onClose, alumnos, onConfirmar, guardando }) {
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [horasAcumuladasMes, setHorasAcumuladasMes] = useState(0);
  const [topeMaximo, setTopeMaximo] = useState(60);
  const [turnosAlumno, setTurnosAlumno] = useState([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(false);
  const [idTurno, setIdTurno] = useState('');
  
  const [tipoSigno, setTipoSigno] = useState('+');
  const [deltaHoras, setDeltaHoras] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const [alertaModalBloqueo, setAlertaModalBloqueo] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setBusquedaAlumno('');
      setAlumnoSeleccionado(null);
      setHorasAcumuladasMes(0);
      setTurnosAlumno([]);
      setIdTurno('');
      setTipoSigno('+');
      setDeltaHoras('');
      setJustificacion('');
      setErrorLocal('');
      setAlertaModalBloqueo(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!alumnoSeleccionado) {
      setTurnosAlumno([]);
      setIdTurno('');
      setHorasAcumuladasMes(0);
      return;
    }

    async function cargarHistorialYBalance() {
      try {
        setCargandoTurnos(true);
        const ahora = new Date();
        const año = ahora.getFullYear();
        const mes = ahora.getMonth();
        const primerDia = new Date(Date.UTC(año, mes, 1, 0, 0, 0)).toISOString();
        const ultimoDia = new Date(Date.UTC(año, mes + 1, 0, 23, 59, 59, 999)).toISOString();

        // FILTRO ESTRICTO: Solo turnos CERRADOS y con asistencia liquidada ('Asistió' o 'Ausente')
        const [resConfig, resTurnos, resLedger] = await Promise.all([
          supabase.from('configuracion_sistema').select('tope_horas_mensual').limit(1).maybeSingle(),
          supabase
            .from('asignacion_turno')
            .select(`
              id_asignacion,
              id_turno,
              horas_validadas,
              estado_asignacion,
              turno!inner (
                id_turno,
                nombre_evento,
                fecha_inicio,
                estado
              )
            `)
            .eq('id_alumno', alumnoSeleccionado.id_alumno)
            .eq('turno.estado', 'Cerrado')
            .in('estado_asignacion', ['Asistió', 'Ausente'])
            .order('id_asignacion', { ascending: false }),
          supabase
            .from('ajuste_ledger')
            .select('delta_horas, fecha_registro')
            .eq('id_alumno', alumnoSeleccionado.id_alumno)
            .gte('fecha_registro', primerDia)
            .lte('fecha_registro', ultimoDia)
        ]);

        if (resConfig.data?.tope_horas_mensual) {
          setTopeMaximo(Number(resConfig.data.tope_horas_mensual));
        }

        // Mapear únicamente turnos efectivamente cerrados
        const turnosMapeados = (resTurnos.data || []).map((a) => ({
          id_turno: a.turno.id_turno,
          nombre_evento: a.turno.nombre_evento,
          fecha_inicio: a.turno.fecha_inicio ? a.turno.fecha_inicio.substring(0, 10) : '--',
          horas: Number(a.horas_validadas || 0),
          estado: a.turno.estado
        }));

        setTurnosAlumno(turnosMapeados);

        // Sumar horas ejecutadas del mes activo
        let totalHoras = (resTurnos.data || [])
          .filter((a) => {
            if (!a.turno?.fecha_inicio) return false;
            const f = new Date(a.turno.fecha_inicio);
            return f.getUTCMonth() === mes && f.getUTCFullYear() === año;
          })
          .reduce((acc, curr) => acc + (Number(curr.horas_validadas) || 0), 0);

        // Sumar deltas de Ledger registrados en el mes
        (resLedger.data || []).forEach((adj) => {
          totalHoras += (Number(adj.delta_horas) || 0);
        });

        setHorasAcumuladasMes(Math.max(0, totalHoras));
      } catch (err) {
        console.error('Error cargando historial del alumno para Ledger:', err);
      } finally {
        setCargandoTurnos(false);
      }
    }

    cargarHistorialYBalance();
  }, [alumnoSeleccionado]);

  const alumnosFiltrados = useMemo(() => {
    const q = busquedaAlumno.trim().toLowerCase();
    if (!q) return [];
    return alumnos.filter((a) => 
      (a.nombre || '').toLowerCase().includes(q) || 
      (a.rut || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [busquedaAlumno, alumnos]);

  const valorAjuste = parseFloat(deltaHoras) || 0;
  const deltaFinal = tipoSigno === '-' ? -valorAjuste : valorAjuste;
  const nuevoSaldoMes = Math.max(0, Number(horasAcumuladasMes) + deltaFinal);
  const superaTope = nuevoSaldoMes > topeMaximo;

  const formatearDecimales = (num) => {
    return Number(num).toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorLocal('');

    if (!alumnoSeleccionado) {
      setErrorLocal('Debe seleccionar a un alumno ayudante.');
      return;
    }
    if (!valorAjuste || valorAjuste <= 0) {
      setErrorLocal('Ingrese un valor de horas mayor a 0.');
      return;
    }

    // Modal de bloqueo por límite de jornada
    if (superaTope) {
      setAlertaModalBloqueo({
        titulo: 'Tope Mensual Excedido',
        mensaje: `No es posible ingresar este ajuste. El alumno acumula actualmente ${formatearDecimales(horasAcumuladasMes)} hrs y la adición de +${formatearDecimales(valorAjuste)} hrs llevaría su saldo mensual a ${formatearDecimales(nuevoSaldoMes)} hrs, sobrepasando el tope institucional permitido de ${topeMaximo} hrs.`
      });
      return;
    }

    if (justificacion.trim().length < 5) {
      setErrorLocal('La justificación es obligatoria (mínimo 5 caracteres).');
      return;
    }

    const res = await onConfirmar({
      id_alumno: alumnoSeleccionado.id_alumno,
      id_turno: idTurno ? Number(idTurno) : null,
      delta_horas: deltaFinal,
      justificacion: justificacion.trim()
    });

    if (!res.success) {
      setErrorLocal(res.error);
    }
  };

  return (
    <div className="konor-modal-backdrop" onClick={onClose}>
      <div className="konor-modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="konor-modal-header">
          <div className="konor-modal-icon-badge" style={{ backgroundColor: 'rgba(67, 176, 196, 0.15)', color: '#43b0c4' }}>
            <Scale size={20} />
          </div>
          <div>
            <h3 className="konor-modal-title">Ajuste Retroactivo (Ledger)</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Corrección sobre turnos cerrados (Tope: {topeMaximo} hrs)</span>
          </div>
          <button type="button" onClick={onClose} className="konor-btn-icon" style={{ marginLeft: 'auto' }}>
            <X size={18} />
          </button>
        </div>

        {errorLocal && (
          <div className="konor-directorio-alert" style={{ margin: '14px 0 0 0' }}>
            <AlertCircle size={16} />
            <span>{errorLocal}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="konor-label">1. ALUMNO AYUDANTE *</label>
            {!alumnoSeleccionado ? (
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Escribe el nombre o RUT del alumno..."
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                  className="konor-input"
                  style={{ paddingLeft: '36px' }}
                  autoFocus
                />
                {busquedaAlumno.trim().length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
                    borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    zIndex: 50, marginTop: '4px', maxHeight: '200px', overflowY: 'auto'
                  }}>
                    {alumnosFiltrados.map((al) => (
                      <div
                        key={al.id_alumno}
                        onClick={() => { setAlumnoSeleccionado(al); setBusquedaAlumno(''); }}
                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#06113c', fontSize: '0.85rem' }}>{al.nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{al.rut}</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#43b0c4' }}>Seleccionar</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#06113c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, color: '#06113c', fontSize: '0.875rem', display: 'block' }}>{alumnoSeleccionado.nombre}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>RUT: {alumnoSeleccionado.rut}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setAlumnoSeleccionado(null)} style={{ background: 'transparent', border: 'none', color: '#0d9488', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {alumnoSeleccionado && (
            <div>
              <label className="konor-label">2. TURNO CERRADO ASOCIADO (OPCIONAL)</label>
              {cargandoTurnos ? (
                <div style={{ fontSize: '0.8rem', color: '#64748b', padding: '6px 0' }}>Buscando turnos cerrados del ayudante...</div>
              ) : (
                <select value={idTurno} onChange={(e) => setIdTurno(e.target.value)} className="konor-input">
                  <option value="">-- Sin turno específico (Ajuste global al mes) --</option>
                  {turnosAlumno.length === 0 ? (
                    <option disabled>Este alumno no registra turnos cerrados</option>
                  ) : (
                    turnosAlumno.map((t) => (
                      <option key={t.id_turno} value={t.id_turno}>
                        {t.nombre_evento} ({t.fecha_inicio}) - Validó: {formatearDecimales(t.horas)} hrs
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          )}

          {alumnoSeleccionado && (
            <div>
              <label className="konor-label">3. AJUSTE DE HORAS *</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={tipoSigno}
                  onChange={(e) => setTipoSigno(e.target.value)}
                  className="konor-input"
                  style={{
                    width: '120px', fontWeight: 800,
                    backgroundColor: tipoSigno === '+' ? '#f0fdf4' : '#fef2f2',
                    color: tipoSigno === '+' ? '#16a34a' : '#dc2626'
                  }}
                >
                  <option value="+">+ Sumar</option>
                  <option value="-">- Restar</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="ej: 1.5"
                  value={deltaHoras}
                  onChange={(e) => setDeltaHoras(e.target.value)}
                  className="konor-input font-mono"
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>

              {valorAjuste > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: '6px',
                  backgroundColor: superaTope ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${superaTope ? '#fca5a5' : '#e2e8f0'}`
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>TOTAL MES ACTUAL</span>
                    <strong style={{ fontSize: '0.9rem', color: '#06113c' }}>{formatearDecimales(horasAcumuladasMes)} hrs</strong>
                  </div>

                  <span style={{ fontWeight: 800, color: tipoSigno === '+' ? '#16a34a' : '#dc2626', fontSize: '0.95rem' }}>
                    {tipoSigno} {formatearDecimales(valorAjuste)}
                  </span>

                  <ArrowRight size={16} className="text-slate-400" />

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>PROYECCIÓN FINAL</span>
                    <strong style={{ fontSize: '0.9rem', color: superaTope ? '#dc2626' : '#43b0c4' }}>
                      {formatearDecimales(nuevoSaldoMes)} / {topeMaximo} hrs
                    </strong>
                  </div>
                </div>
              )}

              {superaTope && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  marginTop: '6px', 
                  fontSize: '0.75rem', 
                  color: '#dc2626', 
                  fontWeight: 600 
                }}>
                  <AlertTriangle size={14} />
                  <span>Este ajuste excede el límite de {topeMaximo} horas mensuales del alumno.</span>
                </div>
              )}
            </div>
          )}

          {alumnoSeleccionado && (
            <div>
              <label className="konor-label">4. JUSTIFICACIÓN AUDITABLE * (MÍN. 5 CARACTERES)</label>
              <textarea
                rows={2}
                placeholder="Indique el motivo claro de este ajuste..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                className="konor-input"
                style={{ height: 'auto', padding: '10px' }}
                required
              />
            </div>
          )}

          <div className="konor-modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" onClick={onClose} disabled={guardando} className="konor-btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !alumnoSeleccionado || !valorAjuste}
              className="konor-btn-primary"
            >
              <Save size={16} />
              <span>{guardando ? 'Guardando...' : 'Confirmar Asiento'}</span>
            </button>
          </div>
        </form>

        {alertaModalBloqueo && (
          <div 
            className="konor-modal-backdrop" 
            style={{ zIndex: 1100, backgroundColor: 'rgba(6, 17, 60, 0.7)' }}
            onClick={() => setAlertaModalBloqueo(null)}
          >
            <div 
              className="konor-modal-card" 
              style={{ maxWidth: '420px', padding: '24px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="konor-modal-header" style={{ marginBottom: '14px' }}>
                <div className="konor-modal-icon-badge danger" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  <AlertTriangle size={22} />
                </div>
                <h3 className="konor-modal-title" style={{ color: '#06113c', fontSize: '1.1rem' }}>
                  {alertaModalBloqueo.titulo}
                </h3>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                {alertaModalBloqueo.mensaje}
              </p>

              <div className="konor-modal-actions">
                <button
                  type="button"
                  onClick={() => setAlertaModalBloqueo(null)}
                  className="konor-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  autoFocus
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}