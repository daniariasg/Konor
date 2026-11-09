import React, { useState, useEffect } from 'react';
import { X, Copy } from 'lucide-react';

const extraerFechaLocal = (isoString) => {
  if (!isoString) return new Date().toISOString().split('T')[0];
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const extraerHoraLocal = (isoString) => {
  if (!isoString) return '06:00';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '06:00';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const limpiador = (str) => (str ? str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

const calcularSiguienteCorrelativo = (nombreBase, listaTurnos) => {
  if (!nombreBase) return 'Turno Duplicado';
  const limpio = nombreBase.replace(/\s*\(Copia\)/gi, '').replace(/\s+\d+$/, '').trim();
  
  const mismaFamilia = (listaTurnos || []).filter(t => 
    t.nombre_evento && t.nombre_evento.startsWith(limpiador(limpio))
  );

  let maxNum = 1;
  mismaFamilia.forEach(t => {
    const match = t.nombre_evento.match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num >= maxNum) maxNum = num + 1;
    } else if (t.nombre_evento.trim() === limpio) {
      if (maxNum < 2) maxNum = 2;
    }
  });

  return mismaFamilia.length > 0 ? `${limpio} ${maxNum}` : `${limpio} 2`;
};

export default function ModalDuplicarTurno({ 
  isOpen, 
  onClose, 
  onCerrar, 
  turno, 
  turnoOriginal, 
  turnosExistentes, 
  onConfirmar, 
  onConfirmarDuplicacion 
}) {
  const handleCerrar = onClose || onCerrar || (() => {});
  const turnoObj = turnoOriginal || turno;
  const handleConfirmarAccion = onConfirmarDuplicacion || onConfirmar || (() => {});

  if (!isOpen || !turnoObj) return null;

  const [nombreTurno, setNombreTurno] = useState(() => calcularSiguienteCorrelativo(turnoObj?.nombre_evento, turnosExistentes));
  const [nuevaFecha, setNuevaFecha] = useState(() => extraerFechaLocal(turnoObj?.fecha_inicio));
  const [vacantes, setVacantes] = useState(turnoObj?.cupos || 1);
  const [horaInicio, setHoraInicio] = useState(() => extraerHoraLocal(turnoObj?.fecha_inicio));
  const [horaTermino, setHoraTermino] = useState(() => extraerHoraLocal(turnoObj?.fecha_termino));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (turnoObj) {
      setNombreTurno(calcularSiguienteCorrelativo(turnoObj?.nombre_evento, turnosExistentes));
      setNuevaFecha(extraerFechaLocal(turnoObj?.fecha_inicio));
      setVacantes(turnoObj?.cupos || 1);
      setHoraInicio(extraerHoraLocal(turnoObj?.fecha_inicio));
      setHoraTermino(extraerHoraLocal(turnoObj?.fecha_termino));
    }
  }, [turnoObj, turnosExistentes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombreTurno.trim() || !nuevaFecha || !horaInicio || !horaTermino) return;

    if (horaTermino <= horaInicio) {
      alert('La hora de término debe ser estrictamente posterior a la hora de inicio.');
      return;
    }

    try {
      setGuardando(true);
      const fechaInicioISO = `${nuevaFecha}T${horaInicio}:00.000Z`;
      const fechaTerminoISO = `${nuevaFecha}T${horaTermino}:00.000Z`;

      await handleConfirmarAccion({
        nombre_evento: nombreTurno.trim(),
        nombre: nombreTurno.trim(),
        fecha_inicio: fechaInicioISO,
        fecha_termino: fechaTerminoISO,
        fecha: nuevaFecha,
        horaInicio,
        horaTermino,
        cupos: Number(vacantes)
      });

      handleCerrar();
    } catch (err) {
      console.error('Error al duplicar turno:', err);
      alert(`No se pudo duplicar el turno: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 17, 60, 0.6)',
        backdropFilter: 'blur(2px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCerrar();
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(6, 17, 60, 0.35)',
          padding: '24px',
          boxSizing: 'border-box',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Copy size={20} color="#43b0c4" />
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#06113c' }}>
              Duplicar Bloque Operativo
            </h2>
          </div>
          <button 
            type="button" 
            onClick={handleCerrar} 
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
          Crea una copia de este turno para otra fecha preservando la estructura horaria.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
              Nombre del Turno
            </label>
            <input
              type="text"
              value={nombreTurno}
              onChange={(e) => setNombreTurno(e.target.value)}
              required
              maxLength={150}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                Nueva Fecha
              </label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                Vacantes / Cupos
              </label>
              <input
                type="number"
                min="1"
                value={vacantes}
                onChange={(e) => setVacantes(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                Hora Inicio (24h)
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>
                Hora Término (24h)
              </label>
              <input
                type="time"
                value={horaTermino}
                onChange={(e) => setHoraTermino(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button 
              type="button" 
              onClick={handleCerrar} 
              disabled={guardando} 
              style={{
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={guardando} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#43b0c4',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Copy size={16} />
              <span>{guardando ? 'Duplicando...' : 'Confirmar y Duplicar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}