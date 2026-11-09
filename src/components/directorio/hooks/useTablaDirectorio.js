import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../config/supabase.js';
import * as XLSX from 'xlsx';

export const MESES = [
  { valor: 0, nombre: 'Enero' },
  { valor: 1, nombre: 'Febrero' },
  { valor: 2, nombre: 'Marzo' },
  { valor: 3, nombre: 'Abril' },
  { valor: 4, nombre: 'Mayo' },
  { valor: 5, nombre: 'Junio' },
  { valor: 6, nombre: 'Julio' },
  { valor: 7, nombre: 'Agosto' },
  { valor: 8, nombre: 'Septiembre' },
  { valor: 9, nombre: 'Octubre' },
  { valor: 10, nombre: 'Noviembre' },
  { valor: 11, nombre: 'Diciembre' },
];

export const VALOR_HORA_DEFAULT = 2500;
export const ELEMENTOS_POR_PAGINA = 10;

export function useTablaDirectorio() {
  const [alumnos, setAlumnos] = useState([]);
  const [asignacionesMes, setAsignacionesMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Estados de control
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);

  // Estado de ordenamiento
  const [columnaOrden, setColumnaOrden] = useState('nombre');
  const [direccionOrden, setDireccionOrden] = useState('asc'); // 'asc' | 'desc'

  // Consulta a Supabase
  const cargarAlumnosYHoras = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // FILTRO CLAVE: Solo se consideran asignaciones con lista cerrada y sellada ('Asistió' o 'Ausente')
      const [resAlumnos, resAsig] = await Promise.all([
        supabase
          .from('alumno')
          .select('id_alumno, rut, nombre, correo, jornada, carrera')
          .order('nombre', { ascending: true }),
        supabase
          .from('asignacion_turno')
          .select(`
            id_alumno,
            horas_validadas,
            estado_asignacion,
            turno:id_turno (
              fecha_inicio
            )
          `)
          .in('estado_asignacion', ['Asistió', 'Ausente'])
      ]);

      if (resAlumnos.error) throw resAlumnos.error;
      if (resAsig.error) throw resAsig.error;

      setAlumnos(resAlumnos.data || []);
      setAsignacionesMes(resAsig.data || []);
    } catch (err) {
      console.error('Error cargando alumnos ayudantes:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos de Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarAlumnosYHoras();
  }, [cargarAlumnosYHoras]);

  // Consolidación reactiva de horas y montos ($) según el mes seleccionado
  const alumnosProcesados = useMemo(() => {
    const mapaHoras = {};

    asignacionesMes.forEach((asig) => {
      if (!asig.turno?.fecha_inicio) return;
      const fechaTurno = new Date(asig.turno.fecha_inicio);
      const mesTurno = fechaTurno.getMonth();

      if (mesTurno === Number(mesSeleccionado)) {
        const id = asig.id_alumno;
        const horas = Number(asig.horas_validadas) || 0;
        mapaHoras[id] = (mapaHoras[id] || 0) + horas;
      }
    });

    return alumnos.map((al) => {
      const horasTotal = mapaHoras[al.id_alumno] || 0;
      const montoTotal = Math.round(horasTotal * VALOR_HORA_DEFAULT);
      return {
        ...al,
        horas_total: horasTotal,
        monto_total: montoTotal
      };
    });
  }, [alumnos, asignacionesMes, mesSeleccionado]);

  // Filtrado reactivo en tiempo real por Nombre o RUT
  const alumnosFiltrados = useMemo(() => {
    const query = terminoBusqueda.toLowerCase().trim();
    return alumnosProcesados.filter((al) => {
      const coincideNombre = (al.nombre || '').toLowerCase().includes(query);
      const coincideRut = (al.rut || '').toLowerCase().includes(query);
      return coincideNombre || coincideRut;
    });
  }, [alumnosProcesados, terminoBusqueda]);

  // Manejador del orden por columna
  const handleOrdenar = (columna) => {
    if (columnaOrden === columna) {
      setDireccionOrden((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColumnaOrden(columna);
      setDireccionOrden('asc');
    }
  };

  // Ordenamiento dinámico
  const alumnosOrdenados = useMemo(() => {
    const lista = [...alumnosFiltrados];
    lista.sort((a, b) => {
      let valA = a[columnaOrden];
      let valB = b[columnaOrden];

      if (columnaOrden === 'nombre' || columnaOrden === 'rut') {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        return direccionOrden === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (columnaOrden === 'horas_total' || columnaOrden === 'monto_total') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
        return direccionOrden === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });
    return lista;
  }, [alumnosFiltrados, columnaOrden, direccionOrden]);

  // Paginación
  const totalPaginas = Math.ceil(alumnosOrdenados.length / ELEMENTOS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
  const alumnosPaginados = useMemo(() => {
    return alumnosOrdenados.slice(indiceInicio, indiceInicio + ELEMENTOS_POR_PAGINA);
  }, [alumnosOrdenados, indiceInicio]);

  // Reiniciar a página 1 al filtrar o cambiar mes
  useEffect(() => {
    setPaginaActual(1);
  }, [terminoBusqueda, mesSeleccionado]);

  // Inyección optimista reactiva (HU04 - Sin recargar página)
  const handleAlumnoCreado = (nuevoAlumno) => {
    setModalRegistroOpen(false);
    if (nuevoAlumno) {
      setAlumnos((prev) => [
        { ...nuevoAlumno, horas_total: 0, monto_total: 0 },
        ...prev
      ]);
    }
    cargarAlumnosYHoras();
  };

  // Exportación a Excel limitada estrictamente a las 4 columnas visibles
  const handleExportarExcel = () => {
    if (!alumnosOrdenados || alumnosOrdenados.length === 0) return;

    const datosExportar = alumnosOrdenados.map((a) => ({
      'RUT': a.rut || 'Sin RUT',
      'Nombre alumno': a.nombre,
      'Horas Total': `${(a.horas_total || 0).toFixed(1).replace('.', ',')} hrs`,
      'Monto ($)': `$${Number(a.monto_total || 0).toLocaleString('es-CL')}`
    }));

    const nombreMes = MESES.find((m) => m.valor === Number(mesSeleccionado))?.nombre || 'Mes';
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Ayudantes_${nombreMes}`);
    XLSX.writeFile(wb, `nomina_ayudantes_${nombreMes.toLowerCase()}.xlsx`);
  };

  const nombreMesActual = MESES.find((m) => m.valor === Number(mesSeleccionado))?.nombre || '';

  return {
    loading,
    errorMsg,
    nombreMesActual,
    terminoBusqueda,
    setTerminoBusqueda,
    mesSeleccionado,
    setMesSeleccionado,
    meses: MESES,
    alumnosPaginados,
    alumnosOrdenados,
    paginaActual,
    setPaginaActual,
    totalPaginas,
    indiceInicio,
    elementosPorPagina: ELEMENTOS_POR_PAGINA,
    columnaOrden,
    direccionOrden,
    handleOrdenar,
    modalRegistroOpen,
    setModalRegistroOpen,
    handleAlumnoCreado,
    handleExportarExcel,
    recargarDirectorio: cargarAlumnosYHoras
  };
}