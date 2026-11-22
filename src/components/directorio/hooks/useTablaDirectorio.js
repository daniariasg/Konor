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

export const ELEMENTOS_POR_PAGINA = 10;

export function useTablaDirectorio() {
  const [alumnos, setAlumnos] = useState([]);
  const [asignacionesMes, setAsignacionesMes] = useState([]);
  const [ajustesLedgerMes, setAjustesLedgerMes] = useState([]);
  const [configFinanciera, setConfigFinanciera] = useState({
    valor_hora: 2500,
    porcentaje_retencion: 13.75,
    tope_horas_mensual: 60
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Estados de control y fecha
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);

  // Estado de ordenamiento
  const [columnaOrden, setColumnaOrden] = useState('nombre');
  const [direccionOrden, setDireccionOrden] = useState('asc'); // 'asc' | 'desc'

  // Consulta consolidada a Supabase (Alumnos, Turnos, Ledger y Configuración)
  const cargarAlumnosYHoras = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Rangos UTC estrictos para el mes y año en consulta
      const primerDia = new Date(Date.UTC(anioSeleccionado, mesSeleccionado, 1, 0, 0, 0)).toISOString();
      const ultimoDia = new Date(Date.UTC(anioSeleccionado, mesSeleccionado + 1, 0, 23, 59, 59, 999)).toISOString();

      const [resAlumnos, resAsig, resLedger, resConfig] = await Promise.all([
        // 1. Catálogo de Alumnos
        supabase
          .from('alumno')
          .select('id_alumno, rut, nombre, correo, jornada, carrera')
          .order('nombre', { ascending: true }),

        // 2. Horas selladas de turnos ejecutados
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
          .in('estado_asignacion', ['Asistió', 'Ausente']),

        // 3. Asientos contables de ajuste (Ledger HU16)
        supabase
          .from('ajuste_ledger')
          .select('id_alumno, delta_horas, fecha_registro')
          .gte('fecha_registro', primerDia)
          .lte('fecha_registro', ultimoDia),

        // 4. Parámetros financieros globales (HU17)
        supabase
          .from('configuracion_sistema')
          .select('valor_hora, porcentaje_retencion, tope_horas_mensual')
          .limit(1)
          .maybeSingle()
      ]);

      if (resAlumnos.error) throw resAlumnos.error;
      if (resAsig.error) throw resAsig.error;
      if (resLedger.error) throw resLedger.error;

      setAlumnos(resAlumnos.data || []);
      setAsignacionesMes(resAsig.data || []);
      setAjustesLedgerMes(resLedger.data || []);

      if (resConfig.data) {
        setConfigFinanciera({
          valor_hora: Number(resConfig.data.valor_hora) || 2500,
          porcentaje_retencion: Number(resConfig.data.porcentaje_retencion) || 13.75,
          tope_horas_mensual: Number(resConfig.data.tope_horas_mensual) || 60
        });
      }
    } catch (err) {
      console.error('Error cargando datos del directorio:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  }, [mesSeleccionado, anioSeleccionado]);

  useEffect(() => {
    cargarAlumnosYHoras();
  }, [cargarAlumnosYHoras]);

  // Consolidación contable reactiva (Turnos Asistidos + Suma Algebraica Ledger)
  const alumnosProcesados = useMemo(() => {
    const mapaHoras = {};

    // 1. Sumar horas validadas de turnos del mes seleccionado
    asignacionesMes.forEach((asig) => {
      if (!asig.turno?.fecha_inicio) return;
      const fechaTurno = new Date(asig.turno.fecha_inicio);
      const mesTurno = fechaTurno.getUTCMonth();
      const anioTurno = fechaTurno.getUTCFullYear();

      if (mesTurno === Number(mesSeleccionado) && anioTurno === Number(anioSeleccionado)) {
        const id = asig.id_alumno;
        const horas = Number(asig.horas_validadas) || 0;
        mapaHoras[id] = (mapaHoras[id] || 0) + horas;
      }
    });

    // 2. Aplicar suma o resta de ajustes retroactivos de Ledger (Δ horas)
    ajustesLedgerMes.forEach((ajuste) => {
      const id = ajuste.id_alumno;
      const delta = Number(ajuste.delta_horas) || 0;
      mapaHoras[id] = (mapaHoras[id] || 0) + delta;
    });

    const valorHora = configFinanciera.valor_hora;

    // 3. Formatear balances finales por estudiante
    return alumnos.map((al) => {
      // Las horas acumuladas no pueden resultar en valores negativos
      const horasTotal = Math.max(0, mapaHoras[al.id_alumno] || 0);
      const montoTotal = Math.round(horasTotal * valorHora);

      return {
        ...al,
        horas_total: horasTotal,
        monto_total: montoTotal
      };
    });
  }, [alumnos, asignacionesMes, ajustesLedgerMes, mesSeleccionado, anioSeleccionado, configFinanciera]);

  // Filtrado reactivo en tiempo real por Nombre o RUT
  const alumnosFiltrados = useMemo(() => {
    const query = terminoBusqueda.toLowerCase().trim();
    return alumnosProcesados.filter((al) => {
      const coincideNombre = (al.nombre || '').toLowerCase().includes(query);
      const coincideRut = (al.rut || '').toLowerCase().includes(query);
      return coincideNombre || coincideRut;
    });
  }, [alumnosProcesados, terminoBusqueda]);

  // Ordenamiento multi-columna
  const handleOrdenar = (columna) => {
    if (columnaOrden === columna) {
      setDireccionOrden((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColumnaOrden(columna);
      setDireccionOrden('asc');
    }
  };

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

  // Paginación de 10 elementos
  const totalPaginas = Math.ceil(alumnosOrdenados.length / ELEMENTOS_POR_PAGINA) || 1;
  const indiceInicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
  const alumnosPaginados = useMemo(() => {
    return alumnosOrdenados.slice(indiceInicio, indiceInicio + ELEMENTOS_POR_PAGINA);
  }, [alumnosOrdenados, indiceInicio]);

  // Reiniciar paginación al alterar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [terminoBusqueda, mesSeleccionado, anioSeleccionado]);

  // Inyección optimista reactiva
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

  // Exportación Excel oficial (HU18) con Bruto, Retención y Líquido transferible
  const handleExportarExcel = () => {
    if (!alumnosOrdenados || alumnosOrdenados.length === 0) return;

    const tasaRetencion = configFinanciera.porcentaje_retencion / 100;

    const datosExportar = alumnosOrdenados.map((a) => {
      const horas = Number(a.horas_total || 0);
      const montoBruto = Math.round(horas * configFinanciera.valor_hora);
      const retencion = Math.round(montoBruto * tasaRetencion);
      const liquido = montoBruto - retencion;

      return {
        'RUT': a.rut || 'Sin RUT',
        'Nombre Alumno': a.nombre,
        'Horas Totales': `${horas.toFixed(1).replace('.', ',')} hrs`,
        'Monto Bruto ($)': `$${montoBruto.toLocaleString('es-CL')}`,
        [`Retención Legal (${configFinanciera.porcentaje_retencion}%)`]: `$${retencion.toLocaleString('es-CL')}`,
        'Líquido a Transferir ($)': `$${liquido.toLocaleString('es-CL')}`
      };
    });

    const nombreMes = MESES.find((m) => m.valor === Number(mesSeleccionado))?.nombre || 'Mes';
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Nomina_${nombreMes}`);
    XLSX.writeFile(wb, `nomina_consolidada_${nombreMes.toLowerCase()}_${anioSeleccionado}.xlsx`);
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
    anioSeleccionado,
    setAnioSeleccionado,
    configFinanciera,
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