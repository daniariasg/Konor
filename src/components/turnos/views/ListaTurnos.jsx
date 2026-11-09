import React, { useState } from 'react';
import { supabase } from '../../../config/supabase.js';
import { useListaTurnos } from '../hooks/useListaTurnos.js';
import FormCrearTurno from '../components/FormCrearTurno.jsx';
import ModalDuplicarTurno from '../components/ModalDuplicarTurno.jsx';
import ModalCancelarTurno from '../components/ModalCancelarTurno.jsx';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  RefreshCw, 
  Copy, 
  Pencil, 
  Trash2, 
  AlertCircle, 
  ChevronRight 
} from 'lucide-react';
import './ListaTurnos.css';

export default function ListaTurnos({ onSeleccionarTurno, onCrearTurno, onAbrirCrear }) {
  const { turnos: turnosRecibidos, loading, error, recargarTurnos } = useListaTurnos();
  const turnos = Array.isArray(turnosRecibidos) ? turnosRecibidos : [];

  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [turnoParaEditar, setTurnoParaEditar] = useState(null);
  const [turnoParaDuplicar, setTurnoParaDuplicar] = useState(null);
  const [turnoParaCancelar, setTurnoParaCancelar] = useState(null);

  const handleDispararCrear = () => {
    if (typeof onCrearTurno === 'function') {
      onCrearTurno();
    } else if (typeof onAbrirCrear === 'function') {
      onAbrirCrear();
    } else {
      setModalCrearOpen(true);
    }
  };

  const handleAbrirEditar = (e, t) => {
    e.stopPropagation();
    setTurnoParaEditar(t);
  };

  const handleAbrirDuplicar = (e, t) => {
    e.stopPropagation();
    setTurnoParaDuplicar(t);
  };

  const handleConfirmarDuplicar = async (nuevoTurnoData) => {
    const { error: errIns } = await supabase.from('turno').insert([{
      nombre_evento: nuevoTurnoData.nombre_evento,
      fecha_inicio: nuevoTurnoData.fecha_inicio,
      fecha_termino: nuevoTurnoData.fecha_termino,
      cupos: Number(nuevoTurnoData.cupos),
      estado: 'Abierto'
    }]);

    if (errIns) throw errIns;

    setTurnoParaDuplicar(null);
    recargarTurnos();
  };

  const handleAbrirCancelar = (e, t) => {
    e.stopPropagation();
    setTurnoParaCancelar(t);
  };

  const handleConfirmarCancelar = async (idTurno) => {
    const { error: errUpdate } = await supabase
      .from('turno')
      .update({ estado: 'Cancelado' })
      .eq('id_turno', idTurno);

    if (errUpdate) throw errUpdate;

    setTurnoParaCancelar(null);
    recargarTurnos();
  };

  if (loading) {
    return (
      <div className="konor-turnos-view animate-pulse">
        {/* Header Skeleton */}
        <div className="konor-turnos-header">
          <div>
            <div className="konor-skeleton-block" style={{ width: '220px', height: '28px', marginBottom: '8px' }} />
            <div className="konor-skeleton-block" style={{ width: '280px', height: '16px' }} />
          </div>
          <div className="konor-turnos-header-actions" style={{ display: 'flex', gap: '8px' }}>
            <div className="konor-skeleton-block" style={{ width: '38px', height: '38px', borderRadius: '6px' }} />
            <div className="konor-skeleton-block" style={{ width: '130px', height: '38px', borderRadius: '6px' }} />
          </div>
        </div>

        {/* Grilla de Tarjetas Skeleton */}
        <div className="konor-turnos-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="konor-turno-card" style={{ borderColor: '#e2e8f0', background: '#ffffff', minHeight: '180px' }}>
              <div className="konor-card-header" style={{ marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div className="konor-skeleton-block" style={{ width: '65%', height: '18px', marginBottom: '6px' }} />
                  <div className="konor-skeleton-block" style={{ width: '70px', height: '18px', borderRadius: '12px' }} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div className="konor-skeleton-block" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                  <div className="konor-skeleton-block" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                </div>
              </div>

              <div className="konor-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="konor-skeleton-block" style={{ width: '85px', height: '14px' }} />
                <div className="konor-skeleton-block" style={{ width: '120px', height: '14px' }} />
                <div className="konor-skeleton-block" style={{ width: '90px', height: '20px', borderRadius: '12px' }} />
              </div>

              <div className="konor-card-footer" style={{ borderTop: '1px solid #f1f5f9', marginTop: '14px', paddingTop: '10px' }}>
                <div className="konor-skeleton-block" style={{ width: '75px', height: '14px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="konor-turnos-view">
      <div className="konor-turnos-header">
        <div>
          <h1 className="konor-turnos-title">Turnos y Eventos</h1>
          <p className="konor-turnos-subtitle">Planificación y asignación equitativa</p>
        </div>
        <div className="konor-turnos-header-actions">
          <button type="button" onClick={recargarTurnos} className="konor-btn-icon" title="Recargar">
            <RefreshCw size={17} />
          </button>
          <button type="button" onClick={handleDispararCrear} className="konor-btn-primary cursor-pointer">
            <Plus size={18} /> <span>Crear Turno</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="konor-turnos-alert">
          <AlertCircle size={18} /> <span>{error}</span>
        </div>
      )}

      {turnos.length === 0 ? (
        <div className="konor-turnos-empty">
          <Calendar size={48} className="text-slate-300" />
          <h3>No hay turnos registrados</h3>
          <button type="button" onClick={handleDispararCrear} className="konor-btn-primary mt-2 cursor-pointer">
            <Plus size={18} /> <span>Crear Primer Turno</span>
          </button>
        </div>
      ) : (
        <div className="konor-turnos-grid">
          {turnos.map((t) => {
            const ocupados = t.cupos_ocupados || 0;
            const totales = t.cupos || 5;
            const fStr = t.fecha 
              ? t.fecha.split('-').reverse().join('-') 
              : (t.fecha_inicio ? t.fecha_inicio.substring(0, 10).split('-').reverse().join('-') : '--');
            const hIni = t.hora_inicio ? t.hora_inicio.slice(0, 5) : (t.fecha_inicio?.substring(11, 16) || '--');
            const hFin = t.hora_termino ? t.hora_termino.slice(0, 5) : (t.fecha_termino?.substring(11, 16) || '--');
            const hStr = `${hIni} a ${hFin}`;
            const esCerrado = t.estado?.toLowerCase() === 'cerrado';

            return (
              <div
                key={t.id_turno}
                className={`konor-turno-card ${t.estado?.toLowerCase() || 'abierto'}`}
                onClick={() => onSeleccionarTurno && onSeleccionarTurno(t)}
              >
                <div className="konor-card-header">
                  <div className="konor-card-title-group">
                    <h3 className="konor-card-title">{t.nombre_evento}</h3>
                    <span className={`konor-badge-status ${t.estado?.toLowerCase() || 'abierto'}`}>{t.estado}</span>
                  </div>
                  <div className="konor-card-quick-actions">
                    {!esCerrado && (
                      <button 
                        type="button" 
                        onClick={(e) => handleAbrirEditar(e, t)} 
                        className="konor-btn-card-action" 
                        title="Editar parámetros del turno"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={(e) => handleAbrirDuplicar(e, t)} 
                      className="konor-btn-card-action" 
                      title="Duplicar turno"
                    >
                      <Copy size={15} />
                    </button>
                    {!esCerrado && (
                      <button 
                        type="button" 
                        onClick={(e) => handleAbrirCancelar(e, t)} 
                        className="konor-btn-card-action delete" 
                        title="Cancelar turno"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="konor-card-body">
                  <div className="konor-meta-row"><Calendar size={15} className="konor-meta-icon" /> <span>{fStr}</span></div>
                  <div className="konor-meta-row"><Clock size={15} className="konor-meta-icon" /> <span>{hStr}</span></div>
                  <div className="konor-meta-row">
                    <Users size={15} className="konor-meta-icon" />
                    <span className={`konor-cupos-tag ${ocupados >= totales ? 'full' : ocupados > 0 ? 'mid' : 'empty'}`}>
                      {ocupados}/{totales} cupos
                    </span>
                  </div>
                </div>

                <div className="konor-card-footer">
                  <span className="konor-card-link">Gestionar <ChevronRight size={15} /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear */}
      {modalCrearOpen && (
        <FormCrearTurno
          onCerrar={() => setModalCrearOpen(false)}
          onTurnoCreado={(nuevoTurno) => {
            setModalCrearOpen(false);
            recargarTurnos();
            if (nuevoTurno && onSeleccionarTurno) onSeleccionarTurno(nuevoTurno);
          }}
        />
      )}

      {/* Modal Editar */}
      {turnoParaEditar && (
        <FormCrearTurno
          turnoParaEditar={turnoParaEditar}
          onCerrar={() => setTurnoParaEditar(null)}
          onTurnoCreado={() => {
            setTurnoParaEditar(null);
            recargarTurnos();
          }}
        />
      )}

      {/* Modal Duplicar */}
      {turnoParaDuplicar && (
        <ModalDuplicarTurno
          isOpen={!!turnoParaDuplicar}
          onClose={() => setTurnoParaDuplicar(null)}
          turnoOriginal={turnoParaDuplicar}
          turnosExistentes={turnos}
          onConfirmarDuplicacion={handleConfirmarDuplicar}
        />
      )}

      {/* Modal Cancelar */}
      {turnoParaCancelar && (
        <ModalCancelarTurno
          turno={turnoParaCancelar}
          onCerrar={() => setTurnoParaCancelar(null)}
          onConfirmar={handleConfirmarCancelar}
        />
      )}
    </div>
  );
}