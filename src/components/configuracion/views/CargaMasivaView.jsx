import React, { useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2 } from 'lucide-react';
import ModalCargaMasiva from '../../directorio/components/ModalCargaMasiva.jsx';
import '../../directorio/components/ModalesDirectorio.css';

export default function CargaMasivaView() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  const handleExito = (mensaje) => {
    setMensajeExito(mensaje);
    setTimeout(() => setMensajeExito(null), 5000);
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', padding: '2.25rem 3rem', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}>
      <div style={{ paddingBottom: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #cbd5e1' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Carga Masiva de Alumnos
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
          Herramienta de importación semestral de nóminas estudiantiles desde archivos Excel (.xlsx, .xls) o CSV.
        </p>
      </div>

      {mensajeExito && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{mensajeExito}</span>
        </div>
      )}

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '2rem', maxWidth: '640px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Importador de Planillas
          </h2>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          Sube la nómina oficial del periodo. El sistema detectará automáticamente conflictos por RUT y te permitirá resolver duplicados mediante auditoría.
        </p>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          style={{ padding: '0.625rem 1.25rem', backgroundColor: '#06113c', color: '#ffffff', fontSize: '0.8125rem', fontWeight: 600, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Upload className="w-4 h-4" />
          Iniciar Carga Masiva
        </button>
      </div>

      <ModalCargaMasiva
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSuccess={handleExito}
      />
    </div>
  );
}