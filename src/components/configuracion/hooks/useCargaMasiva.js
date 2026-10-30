import { useState } from 'react';
import { supabase } from '../../../config/supabase.js';
import * as XLSX from 'xlsx';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const VALID_EXTENSIONS = ['.xlsx', '.csv'];
const VALID_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

export function useCargaMasiva() {
  const [archivo, setArchivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const validarArchivo = (file) => {
    if (!file) return 'No se seleccionó ningún archivo.';
    if (file.size > MAX_FILE_SIZE_BYTES) return 'El archivo supera el límite de 5 MB.';
    
    const nombreLower = file.name.toLowerCase();
    const extensionValida = VALID_EXTENSIONS.some((ext) => nombreLower.endsWith(ext));
    if (!extensionValida) return 'Formato no admitido. Usa un archivo .xlsx o .csv.';

    if (file.type && !VALID_MIME_TYPES.includes(file.type)) {
      return 'El archivo no corresponde a una planilla válida.';
    }
    return null;
  };

  const seleccionarArchivo = (file) => {
    setErrorMsg(null);
    setResultado(null);
    if (!file) return;

    const error = validarArchivo(file);
    if (error) {
      setErrorMsg(error);
      setArchivo(null);
      return;
    }
    setArchivo(file);
  };

  const limpiarArchivo = () => {
    setArchivo(null);
    setErrorMsg(null);
  };

  const procesarCarga = async () => {
    if (!archivo) {
      setErrorMsg('Selecciona un archivo válido antes de continuar.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);
    setResultado(null);

    try {
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('La planilla no contiene filas de datos.');
      }

      // Validar columnas obligatorias
      const llaves = Object.keys(rawRows[0]).map((k) => k.trim().toLowerCase());
      const requeridas = ['nombre', 'rut', 'correo'];
      const faltantes = requeridas.filter((col) => !llaves.includes(col));
      if (faltantes.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${faltantes.join(', ')}.`);
      }

      const payload = rawRows.map((row) => {
        const getVal = (campo) => {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase() === campo);
          return key ? String(row[key]).trim() : '';
        };

        return {
          nombre: getVal('nombre'),
          rut: getVal('rut'),
          correo: getVal('correo').toLowerCase(),
          jornada: getVal('jornada') || 'Diurno',
          carrera: getVal('carrera') || null,
          telefono: getVal('telefono') || null,
          activo: true
        };
      }).filter((al) => al.rut && al.correo && al.nombre);

      if (payload.length === 0) {
        throw new Error('No se encontraron registros válidos de estudiantes.');
      }

      const { data, error } = await supabase
        .from('alumno')
        .upsert(payload, { onConflict: 'rut' })
        .select('id_alumno');

      if (error) throw error;

      setResultado({
        total: payload.length,
        actualizados: data?.length || payload.length
      });
      setArchivo(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setProcesando(false);
    }
  };

  return {
    archivo,
    procesando,
    resultado,
    errorMsg,
    seleccionarArchivo,
    limpiarArchivo,
    procesarCarga,
  };
}