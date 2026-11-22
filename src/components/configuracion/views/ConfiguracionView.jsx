import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase.js';
import { Save, AlertCircle, CheckCircle2, Sliders, DollarSign, Percent, Clock } from 'lucide-react';
import './ConfiguracionView.css';

export default function ConfiguracionView() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [form, setForm] = useState({
    valor_hora: 2500,
    porcentaje_retencion: 13.75,
    tope_horas_mensual: 60,
    presupuesto_mensual: 1500000
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setForm({
          valor_hora: Number(data.valor_hora) || 2500,
          porcentaje_retencion: Number(data.porcentaje_retencion) ?? 13.75,
          tope_horas_mensual: Number(data.tope_horas_mensual) || 60,
          presupuesto_mensual: Number(data.presupuesto_mensual) || 1500000
        });
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
      setMensaje({ tipo: 'error', texto: 'No se pudo cargar la configuración actual.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (campo, valor) => {
    setForm(prev => ({
      ...prev,
      [campo]: valor === '' ? '' : Number(valor)
    }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (form.valor_hora === '' || Number(form.valor_hora) <= 0) {
      setMensaje({ tipo: 'error', texto: 'El valor por hora debe ser mayor a 0.' });
      return;
    }

    if (form.tope_horas_mensual === '' || Number(form.tope_horas_mensual) <= 0) {
      setMensaje({ tipo: 'error', texto: 'El tope mensual de horas debe ser mayor a 0.' });
      return;
    }

    try {
      setGuardando(true);
      setMensaje(null);

      const { data: existente } = await supabase
        .from('configuracion_sistema')
        .select('id_config')
        .limit(1)
        .maybeSingle();

      let errorOperacion;

      if (existente?.id_config) {
        const { error } = await supabase
          .from('configuracion_sistema')
          .update({
            valor_hora: Number(form.valor_hora),
            porcentaje_retencion: Number(form.porcentaje_retencion) || 0,
            tope_horas_mensual: Number(form.tope_horas_mensual),
            presupuesto_mensual: Number(form.presupuesto_mensual) || 0,
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id_config', existente.id_config);
        errorOperacion = error;
      } else {
        const { error } = await supabase
          .from('configuracion_sistema')
          .insert([{
            valor_hora: Number(form.valor_hora),
            porcentaje_retencion: Number(form.porcentaje_retencion) || 0,
            tope_horas_mensual: Number(form.tope_horas_mensual),
            presupuesto_mensual: Number(form.presupuesto_mensual) || 0
          }]);
        errorOperacion = error;
      }

      if (errorOperacion) throw errorOperacion;

      setMensaje({ tipo: 'exito', texto: 'Parámetros guardados correctamente.' });
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setMensaje({ tipo: 'error', texto: 'Error al persistir los cambios en la base de datos.' });
    } finally {
      setGuardando(false);
    }
  };

  // SKELETON ESTRUCTURAL DE CARGA
  if (loading) {
    return (
      <div className="konor-config-view animate-pulse">
        {/* Cabecera Skeleton */}
        <div className="konor-config-header">
          <div className="konor-skeleton-block" style={{ width: '320px', height: '28px', marginBottom: '8px' }} />
          <div className="konor-skeleton-block" style={{ width: '450px', height: '16px' }} />
        </div>

        {/* Tarjeta con los 4 campos en grilla Skeleton */}
        <div className="konor-config-card">
          <div className="konor-config-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="konor-skeleton-block" style={{ width: '160px', height: '16px' }} />
                <div className="konor-skeleton-block" style={{ width: '100%', height: '42px', borderRadius: '6px' }} />
                <div className="konor-skeleton-block" style={{ width: '220px', height: '12px' }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <div className="konor-skeleton-block" style={{ width: '160px', height: '40px', borderRadius: '6px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="konor-config-view">
      <div className="konor-config-header">
        <div>
          <h1 className="konor-config-title">Configuración Institucional</h1>
          <p className="konor-config-subtitle">
            Parámetros financieros para el cálculo de nómina, retenciones y límites de jornada
          </p>
        </div>
      </div>

      {mensaje && (
        <div className={`konor-config-banner ${mensaje.tipo}`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="konor-config-card">
        <form onSubmit={handleGuardar}>
          <div className="konor-config-grid">
            <div className="konor-config-field">
              <label>
                <DollarSign size={16} className="text-[#43b0c4]" />
                <span>Valor Hora Base (CLP)</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="ej: 2500"
                value={form.valor_hora}
                onChange={(e) => handleChange('valor_hora', e.target.value)}
                required
              />
              <span className="field-hint">Monto asignado por cada hora validada en turno.</span>
            </div>

            <div className="konor-config-field">
              <label>
                <Percent size={16} className="text-[#43b0c4]" />
                <span>Retención Legal (%)</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                placeholder="ej: 13.75"
                value={form.porcentaje_retencion}
                onChange={(e) => handleChange('porcentaje_retencion', e.target.value)}
                required
              />
              <span className="field-hint">Porcentaje de retención para cálculo de honorarios líquidos.</span>
            </div>

            <div className="konor-config-field">
              <label>
                <Clock size={16} className="text-[#43b0c4]" />
                <span>Tope Máximo Mensual (Horas)</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="ej: 60"
                value={form.tope_horas_mensual}
                onChange={(e) => handleChange('tope_horas_mensual', e.target.value)}
                required
              />
              <span className="field-hint">Límite mensual por estudiante antes de activar la alerta.</span>
            </div>

            <div className="konor-config-field">
              <label>
                <Sliders size={16} className="text-[#43b0c4]" />
                <span>Presupuesto Mensual Estimado (CLP)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="ej: 1500000"
                value={form.presupuesto_mensual}
                onChange={(e) => handleChange('presupuesto_mensual', e.target.value)}
                required
              />
              <span className="field-hint">Límite financiero para el monitoreo del Dashboard.</span>
            </div>
          </div>

          <div className="konor-config-actions">
            <button type="submit" disabled={guardando} className="konor-btn-primary">
              <Save size={16} />
              <span>{guardando ? 'Guardando...' : 'Guardar Parámetros'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}