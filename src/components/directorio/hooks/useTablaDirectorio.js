import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fetchAlumnosDirectorio } from '../../../services/alumnosService.js';

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function useTablaDirectorio(refreshTrigger = 0) {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'id_alumno', direction: 'desc' });
  const [paginaActual, setPaginaActual] = useState(1);
  const [menuMesAbierto, setMenuMesAbierto] = useState(false);
  const calendarRef = useRef(null);

  const valorHoraTarifa = 4700;
  const FILAS_POR_PAGINA = 10;
  const anioActivo = new Date().getFullYear();

  const [mesActivoNumero, setMesActivoNumero] = useState(() => new Date().getMonth() + 1);

  const nombreMesActivo = useMemo(() => {
    return MESES[mesActivoNumero - 1] || 'Mes actual';
  }, [mesActivoNumero]);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAlumnosDirectorio(anioActivo, mesActivoNumero);
      setAlumnos(data || []);
    } catch (err) {
      console.error('Error al sincronizar directorio:', err);
    } finally {
      setLoading(false);
    }
  }, [anioActivo, mesActivoNumero]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos, refreshTrigger]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setMenuMesAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const cambiarMes = (numeroMes) => {
    setMesActivoNumero(numeroMes);
    setMenuMesAbierto(false);
    setPaginaActual(1);
  };

  const ordenarPor = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const alumnosProcesados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    let lista = alumnos.filter((alumno) => {
      if (!q) return true;
      return (
        alumno.nombre?.toLowerCase().includes(q) ||
        alumno.rut?.toLowerCase().includes(q) ||
        String(alumno.id_alumno).includes(q)
      );
    });

    return lista.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'horas_validadas') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (sortConfig.key === 'id_alumno') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [alumnos, busqueda, sortConfig]);

  const totalPaginas = Math.ceil(alumnosProcesados.length / FILAS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * FILAS_POR_PAGINA;
  const alumnosPaginados = alumnosProcesados.slice(indiceInicio, indiceInicio + FILAS_POR_PAGINA);

  /**
   * REGLA ESTRICTA: El archivo Excel contiene ÚNICA Y EXCLUSIVAMENTE
   * las 4 columnas requeridas en el orden exacto: Nombre, RUN, Correo y Monto.
   */
  const exportarExcel = () => {
    if (alumnosProcesados.length === 0) {
      alert('No existen alumnos para exportar.');
      return;
    }

    const dataExcel = alumnosProcesados.map((a) => {
      const horas = parseFloat(a.horas_validadas || 0);
      const montoTotal = Math.round(horas * valorHoraTarifa);

      return {
        Nombre: a.nombre,
        RUN: a.rut,
        Correo: a.correo,
        Monto: montoTotal,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Nomina_${nombreMesActivo}`);
    XLSX.writeFile(workbook, `Konor_Nomina_${nombreMesActivo}_${anioActivo}.xlsx`);
  };

  return {
    alumnosPaginados,
    totalPaginas,
    paginaActual,
    setPaginaActual,
    totalAlumnos: alumnosProcesados.length,
    indiceInicio,
    FILAS_POR_PAGINA,
    loading,
    busqueda,
    setBusqueda,
    mesActivo: mesActivoNumero,
    nombreMesActivo,
    cambiarMes,
    menuMesAbierto,
    setMenuMesAbierto,
    calendarRef,
    sortConfig,
    ordenarPor,
    valorHoraTarifa,
    exportarExcel,
    recargar: cargarDatos,
  };
}