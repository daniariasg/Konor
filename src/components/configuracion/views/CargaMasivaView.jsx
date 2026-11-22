import React, { useState, useEffect } from 'react';
import { useCargaMasiva } from '../hooks/useCargaMasiva.js';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Download
} from 'lucide-react';
import './CargaMasivaView.css';

export default function CargaMasivaView({ onVolver }) {
  const {
    archivo,
    procesando,
    resultado,
    errorMsg,
    seleccionarArchivo,
    limpiarArchivo,
    procesarCarga,
  } = useCargaMasiva();

  // Estado breve para mostrar el esqueleto al abrir la vista (como las demás pestañas)
  const [cargandoVista, setCargandoVista] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setCargandoVista(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const descargarPlantillaEjemplo = () => {
    const datosEjemplo = [
      {
        nombre: 'Benjamin Alejandro Contreras Tapia',
        rut: '18.734.921-6',
        correo: 'benjamin.contreras@konor.cl',
        jornada: 'Diurno',
        carrera: 'Ingeniería Civil Informática',
        telefono: '+56912345678'
      },
      {
        nombre: 'Camila Andrea Soto Morales',
        rut: '19.452.123-K',
        correo: 'camila.soto@konor.cl',
        jornada: 'Vespertino',
        carrera: 'Contador Auditor',
        telefono: '+56987654321'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(datosEjemplo, {
      header: ['nombre', 'rut', 'correo', 'jornada', 'carrera', 'telefono']
    });

    worksheet['!cols'] = [
      { wch: 35 },
      { wch: 16 },
      { wch: 32 },
      { wch: 14 },
      { wch: 28 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'NominaAlumnos');
    XLSX.writeFile(workbook, 'plantilla_alumnos_ayudantes.xlsx');
  };

  // SKELETON ESTRUCTURAL (al abrir la vista o al procesar el archivo)
  if (cargandoVista || procesando) {
    return (
      <div className="konor-carga-view">
        {onVolver && (
          <div
            className="konor-skeleton-block"
            style={{ width: '90px', height: '28px', marginBottom: '20px', borderRadius: '6px' }}
          />
        )}

        <div className="konor-carga-card">
          {/* Cabecera Skeleton */}
          <div className="konor-carga-header">
            <div className="konor-carga-header-main">
              <div
                className="konor-skeleton-block"
                style={{ width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0 }}
              />
              <div>
                <div
                  className="konor-skeleton-block"
                  style={{ width: '320px', maxWidth: '100%', height: '24px', marginBottom: '8px' }}
                />
                <div
                  className="konor-skeleton-block"
                  style={{ width: '420px', maxWidth: '100%', height: '14px' }}
                />
              </div>
            </div>

            <div
              className="konor-skeleton-block"
              style={{ width: '220px', height: '34px', borderRadius: '8px' }}
            />
          </div>

          {/* Dropzone Skeleton */}
          <div
            className="konor-skeleton-block"
            style={{ width: '100%', height: '165px', borderRadius: '14px' }}
          />

          {/* Preview de archivo Skeleton */}
          <div
            className="konor-skeleton-block"
            style={{ width: '100%', height: '46px', marginTop: '16px', borderRadius: '10px' }}
          />

          {/* Barra de acciones Skeleton */}
          <div className="konor-carga-actions">
            <div
              className="konor-skeleton-block"
              style={{ width: '185px', height: '40px', borderRadius: '8px' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="konor-carga-view">
      {onVolver && (
        <button type="button" onClick={onVolver} className="konor-carga-back-btn">
          <ArrowLeft size={16} /> <span>Volver</span>
        </button>
      )}

      <div className="konor-carga-card">
        {/* Cabecera integrada */}
        <div className="konor-carga-header">
          <div className="konor-carga-header-main">
            <div className="konor-carga-icon-wrapper">
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h1 className="konor-carga-title">Carga Masiva de Alumnos Ayudantes</h1>
              <p className="konor-carga-subtitle">
                Importa la nómina semestral en formato Excel (.xlsx o .csv) para poblar o actualizar la base institucional.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={descargarPlantillaEjemplo}
            className="konor-btn-descargar-plantilla"
            title="Descargar archivo modelo con columnas requeridas"
          >
            <Download size={15} />
            <span>Descargar Plantilla de Ejemplo (.xlsx)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="konor-carga-alert error">
            <AlertCircle size={18} /> <span>{errorMsg}</span>
          </div>
        )}

        {resultado && (
          <div className="konor-carga-alert success">
            <CheckCircle2 size={18} />
            <span>Se procesaron exitosamente <strong>{resultado.total}</strong> alumnos ayudantes.</span>
          </div>
        )}

        {/* Zona de Dropzone */}
        <label className="konor-dropzone">
          <UploadCloud size={40} className="konor-dropzone-icon" />
          <div className="konor-dropzone-text">
            <span className="konor-dropzone-highlight">Haz clic para seleccionar</span> o arrastra tu archivo aquí
          </div>
          <span className="konor-dropzone-subtext">Formatos soportados: .xlsx, .csv (Máximo 5 MB)</span>
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => seleccionarArchivo(e.target.files?.[0])}
            disabled={procesando}
            style={{ display: 'none' }}
          />
        </label>

        {archivo && (
          <div className="konor-file-preview">
            <div className="konor-file-info">
              <FileSpreadsheet size={16} color="#43b0c4" />
              <span>{archivo.name}</span>
              <span className="konor-file-size">({(archivo.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button type="button" onClick={limpiarArchivo} disabled={procesando} className="konor-btn-remove-file">
              Quitar
            </button>
          </div>
        )}

        <div className="konor-carga-actions">
          <button
            type="button"
            onClick={procesarCarga}
            disabled={!archivo || procesando}
            className="konor-btn-procesar"
          >
            <UploadCloud size={16} /> <span>Iniciar Carga Masiva</span>
          </button>
        </div>
      </div>
    </div>
  );
}