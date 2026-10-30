import React, { useState } from 'react';
import { useListaTurnos } from '../hooks/useListaTurnos.js';
import FormCrearTurno from '../components/FormCrearTurno.jsx';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  RefreshCw, 
  Copy, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  ChevronRight 
} from 'lucide-react';
import './ListaTurnos.css';

export default function ListaTurnos({ onSeleccionarTurno, onCrearTurno, onAbrirCrear }) {
  const { turnos, loading, error, recargarTurnos, cancelarTurno, duplicarTurno } = useListaTurnos();
  const [modalCrearOpen, setModalCrearOpen] = useState(false);

  const handleDispararCrear = () => {
    if (typeof onCrearTurno === 'function') {
      onCrearTurno();
    } else if (typeof onAbrirCrear === 'function') {
      onAbrirCrear();
    } else {
      setModalCrearOpen(true);
    }
  };

  const handleDuplicar = (e, t) => {
    e.stopPropagation();
    const hoy = new Date().toISOString().split('T')[0];
    const nuevaFecha = window.prompt('Nueva fecha (YYYY-MM-DD):', hoy);
    if (!nuevaFecha) return;
    const hIni = t.fecha_inicio ? t.fecha_inicio.substring(11, 16) : '09:00';
    const hFin = t.fecha_termino ? t.fecha_termino.substring(11, 16) : '11:00';
    duplicarTurno(t.id_turno, `${nuevaFecha}T${hIni}:00`, `${nuevaFecha}T${hFin}:00`);
  };

  if (loading) {
    return (
      <div className="konor-turnos-loading">
        <Loader2 size={36} className="konor-spin text-[#43b0c4]" />
        <p>Cargando bloques operativos...</p>
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
            const fStr = t.fecha_inicio ? t.fecha_inicio.substring(0, 10).split('-').reverse().join('-') : '--';
            const hStr = `${t.fecha_inicio?.substring(11, 16) || '--'} a ${t.fecha_termino?.substring(11, 16) || '--'}`;

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
                    <button type="button" onClick={(e) => handleDuplicar(e, t)} className="konor-btn-card-action" title="Duplicar">
                      <Copy size={15} />
                    </button>
                    {t.estado !== 'Cerrado' && (
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); cancelarTurno(t.id_turno); }} 
                        className="konor-btn-card-action delete" 
                        title="Cancelar"
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

      {modalCrearOpen && (
        <FormCrearTurno
          onCerrar={() => setModalCrearOpen(false)}
          onTurnoCreado={(nuevoTurno) => {
            setModalCrearOpen(false);
            recargarTurnos();
            if (nuevoTurno && onSeleccionarTurno) {
              onSeleccionarTurno(nuevoTurno);
            }
          }}
        />
      )}
    </div>
  );
}