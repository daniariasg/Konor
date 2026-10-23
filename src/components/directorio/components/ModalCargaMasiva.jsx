import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, X, AlertCircle, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { insertAlumnosMasivo } from '../../../services/alumnosService.js';
import { supabase } from '../../../config/supabase.js';
import './ModalesDirectorio.css';

export default function ModalCargaMasiva({ isOpen, onClose, onSuccess }) {
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [confirmacionDuplicados, setConfirmacionDuplicados] = useState(null);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const descargarPlantillaEjemplo = () => {
    const cabecerasEjemplo = [
      { Nombre: 'Pedro López', RUT: '20.123.456-1', Correo: 'pedro.lopez@konor.cl', Jornada: 'Diurno' },
      { Nombre: 'Lucas Hernández', RUT: '21.345.678-3', Correo: 'lucas.hernandez@konor.cl', Jornada: 'Vespertino' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(cabecerasEjemplo);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Alumnos');
    XLSX.writeFile(workbook, 'Plantilla_Carga_Alumnos_Konor.xlsx');
  };

  const normalizar = (txt) =>
    txt.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setConfirmacionDuplicados(null);
    setMotivoPersonalizado('');
    setProcesando(true);

    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (jsonRows.length === 0) {
        throw new Error('El archivo cargado está completamente vacío.');
      }

      const columnasDetectadas = Object.keys(jsonRows[0] || {});
      const keyNombre = columnasDetectadas.find((k) => normalizar(k).includes('nombre'));
      const keyRut = columnasDetectadas.find((k) => normalizar(k).includes('rut'));
      const keyCorreo = columnasDetectadas.find((k) => normalizar(k).includes('correo') || normalizar(k).includes('email'));
      const keyJornada = columnasDetectadas.find((k) => normalizar(k).includes('jornada'));

      if (!keyNombre || !keyRut || !keyCorreo) {
        throw new Error('El archivo debe incluir las columnas obligatorias: "Nombre", "RUT" y "Correo".');
      }

      const alumnosParaInsertar = [];
      const filasInvalidas = [];
      const rutsVistos = new Set();
      const duplicadosInternos = [];

      jsonRows.forEach((row, idx) => {
        const filaNum = idx + 2;
        const nombre = String(row[keyNombre] || '').trim();
        const rut = String(row[keyRut] || '').trim();
        const correo = String(row[keyCorreo] || '').trim();
        const jornadaRaw = keyJornada ? String(row[keyJornada] || '').trim() : 'Diurno';

        if (!nombre || !rut || !correo) {
          filasInvalidas.push(filaNum);
          return;
        }

        if (rutsVistos.has(rut.toUpperCase())) {
          duplicadosInternos.push(rut);
        } else {
          rutsVistos.add(rut.toUpperCase());
        }

        const jornada = normalizar(jornadaRaw).startsWith('vesp') ? 'Vespertino' : 'Diurno';

        alumnosParaInsertar.push({
          nombre,
          rut,
          correo: correo.toLowerCase(),
          jornada,
          activo: true
        });
      });

      if (duplicadosInternos.length > 0) {
        throw new Error(`El archivo contiene RUTs repetidos internamente: ${duplicadosInternos.slice(0, 3).join(', ')}${duplicadosInternos.length > 3 ? '...' : ''}`);
      }

      if (alumnosParaInsertar.length === 0) {
        throw new Error('Ninguna fila del archivo contiene datos válidos para registrar.');
      }

      // Verificación de duplicados en Supabase
      const listaRuts = alumnosParaInsertar.map((a) => a.rut);
      const { data: existentes, error: errorExistentes } = await supabase
        .from('alumno')
        .select('id_alumno, nombre, rut')
        .in('rut', listaRuts);

      if (errorExistentes) throw errorExistentes;

      if (existentes && existentes.length > 0) {
        setConfirmacionDuplicados({
          listaAlumnos: alumnosParaInsertar,
          repetidos: existentes,
          filasInvalidas,
        });
        setProcesando(false);
        return;
      }

      await ejecutarCargaMasiva(alumnosParaInsertar, filasInvalidas, null);
    } catch (err) {
      console.error('Error durante la carga masiva:', err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel.');
      setProcesando(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const ejecutarCargaMasiva = async (alumnos, filasInvalidas = [], justificacion = null) => {
    try {
      setProcesando(true);
      await insertAlumnosMasivo(alumnos, justificacion);

      let mensajeExito = `${alumnos.length} alumnos importados con éxito a la base de datos.`;
      if (filasInvalidas.length > 0) {
        mensajeExito += ` (Se omitieron ${filasInvalidas.length} filas incompletas).`;
      }
      if (justificacion) {
        mensajeExito += ` [Trazabilidad de auditoría registrada].`;
      }

      if (onSuccess) onSuccess(mensajeExito);
      onClose();
    } catch (err) {
      console.error('Error al persistir carga masiva:', err);
      setErrorMsg('Error al guardar el lote de alumnos en Supabase.');
    } finally {
      setProcesando(false);
    }
  };

  // BOTÓN 1: Importar solo nuevos (omite existentes)
  const handleImportarSoloNuevos = () => {
    if (!confirmacionDuplicados) return;

    const rutsExistentesSet = new Set(
      confirmacionDuplicados.repetidos.map((r) => r.rut.trim().toUpperCase())
    );

    const soloNuevos = confirmacionDuplicados.listaAlumnos.filter(
      (a) => !rutsExistentesSet.has(a.rut.trim().toUpperCase())
    );

    if (soloNuevos.length === 0) {
      alert('Todos los alumnos del archivo ya existen en el sistema. No hay registros nuevos que importar.');
      return;
    }

    ejecutarCargaMasiva(soloNuevos, confirmacionDuplicados.filasInvalidas, null);
  };

  // BOTÓN 2: Sobreponer existentes con motivo obligatorio
  const handleConfirmarSobrescrituraLote = () => {
    if (!motivoPersonalizado.trim()) {
      alert('Debes ingresar obligatoriamente una justificación para la bitácora institucional.');
      return;
    }
    ejecutarCargaMasiva(confirmacionDuplicados.listaAlumnos, confirmacionDuplicados.filasInvalidas, motivoPersonalizado.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card-compact">
        {/* Cabecera institucional Konor */}
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet className="w-4 h-4 text-[#43b0c4]" />
            <span>Carga Masiva de Alumnos</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmacionDuplicados ? (
          /* MODO RESOLUCIÓN DE CONFLICTOS COMPACTO */
          <>
            <div className="modal-body modal-body-compact">
              <div className="modal-alert-collision">
                <div className="collision-header">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="collision-title">
                      Se detectaron {confirmacionDuplicados.repetidos.length} alumnos ya existentes
                    </strong>
                    <p className="collision-desc">
                      Los siguientes estudiantes ya existen en la base de datos:
                    </p>
                  </div>
                </div>

                {/* Lista de Duplicados con Truncamiento */}
                <div className="collision-list-container">
                  <ul className="collision-list">
                    {confirmacionDuplicados.repetidos.slice(0, 4).map((r) => (
                      <li key={r.id_alumno} className="collision-list-item">
                        <span className="student-name" title={r.nombre}>{r.nombre}</span>
                        <span className="student-rut">{r.rut}</span>
                      </li>
                    ))}
                    {confirmacionDuplicados.repetidos.length > 4 && (
                      <li className="collision-list-more">
                        ... y otros {confirmacionDuplicados.repetidos.length - 4} alumnos más.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="audit-prompt">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 inline shrink-0" />
                  <span>En caso de sobreponer, ingresa la justificación institucional:</span>
                </div>

                {/* Solicitud directa de Caso Excepcional */}
                <div className="reason-input-box" style={{ marginTop: '4px' }}>
                  <label htmlFor="motivo-masivo-input" style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    Motivo justificado de sobrescritura masiva (Caso excepcional) *:
                  </label>
                  <input
                    id="motivo-masivo-input"
                    name="motivoMasivo"
                    type="text"
                    className="modal-input modal-input-compact"
                    placeholder="Detalla la justificación obligatoria para la bitácora institucional..."
                    value={motivoPersonalizado}
                    onChange={(e) => setMotivoPersonalizado(e.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Pie de botones homogéneo, limpio y alineado */}
            <div className="modal-footer modal-footer-conflict">
              <button
                type="button"
                disabled={procesando}
                onClick={() => setConfirmacionDuplicados(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={procesando || !motivoPersonalizado.trim()}
                onClick={handleConfirmarSobrescrituraLote}
                className="btn-warning-action"
                title={!motivoPersonalizado.trim() ? "Ingresa un motivo justificado para habilitar esta opción" : "Sobrepone la información existente registrando auditoría"}
              >
                Sobreponer existentes
              </button>

              <button
                type="button"
                disabled={procesando}
                onClick={handleImportarSoloNuevos}
                className="btn-primary-action"
                title="Omite los existentes e importa solo los nuevos estudiantes"
              >
                {procesando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Importar solo nuevos'
                )}
              </button>
            </div>
          </>
        ) : (
          /* MODO DROPZONE REGULAR */
          <>
            <div className="modal-body modal-body-compact">
              <p className="modal-description">
                Sube la nómina en formato <strong>.xlsx, .xls o .csv</strong>. El sistema verificará automáticamente duplicados por <strong>RUT</strong>.
              </p>

              <div className="modal-info-box">
                <div>
                  <span className="modal-info-title">Formato de planilla oficial</span>
                  <span className="modal-info-subtitle">Columnas: Nombre, RUT, Correo, Jornada.</span>
                </div>
                <button type="button" onClick={descargarPlantillaEjemplo} className="btn-outline">
                  <Download className="w-3.5 h-3.5 text-[#43b0c4]" />
                  Plantilla
                </button>
              </div>

              <div className="modal-dropzone modal-dropzone-compact" onClick={() => !procesando && fileInputRef.current?.click()}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                {procesando ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#43b0c4]" />
                ) : (
                  <Upload className="w-6 h-6 text-slate-400" />
                )}
                <div className="modal-dropzone-title">
                  {procesando ? 'Procesando archivo...' : 'Haz clic para seleccionar el archivo'}
                </div>
                <div className="modal-dropzone-sub">Formatos compatibles: .xlsx, .xls o .csv</div>
              </div>

              {errorMsg && (
                <div className="modal-alert-error">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} disabled={procesando} className="btn-secondary">
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}