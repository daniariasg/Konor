import { supabase } from '../config/supabase.js';

export async function fetchTurnos() {
  const { data, error } = await supabase
    .from('turno')
    .select(`
      *,
      asignacion_turno (
        id_asignacion,
        estado_asignacion
      )
    `)
    .order('id_turno', { ascending: false });

  if (error) throw error;

  // Calculamos los cupos ocupados reales para cada tarjeta de turno
  return (data || []).map(turno => {
    const ocupados = (turno.asignacion_turno || []).filter(
      asig => ['Asignado', 'Presente', 'Asistió'].includes(asig.estado_asignacion)
    ).length;

    return {
      ...turno,
      cupos_ocupados: ocupados
    };
  });
}

export async function getTurnoById(idTurno) {
  const { data, error } = await supabase
    .from('turno')
    .select(`
      *,
      asignacion_turno (
        id_asignacion,
        id_turno,
        id_alumno,
        estado_asignacion,
        motivo_cancelacion,
        hora_entrada_real,
        hora_salida_real,
        horas_validadas,
        fecha_cierre,
        alumno:id_alumno (
          id_alumno,
          rut,
          nombre,
          correo,
          jornada
        )
      )
    `)
    .eq('id_turno', idTurno)
    .single();

  if (error) throw error;
  return data;
}

export async function createTurno({ nombre_evento, fecha_inicio, fecha_termino, cupos }) {
  const { data, error } = await supabase
    .from('turno')
    .insert([{ nombre_evento, fecha_inicio, fecha_termino, cupos: Number(cupos), estado: 'Abierto' }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelarTurno(idTurno, motivo) {
  const { error } = await supabase
    .from('turno')
    .update({ estado: 'Cancelado', motivo_cancelacion: motivo })
    .eq('id_turno', idTurno);

  if (error) throw error;
}

export async function duplicarTurno(idTurno, nuevaFechaInicio, nuevaFechaTermino, nuevoNombre) {
  const { error } = await supabase.from('turno').insert([{
    nombre_evento: nuevoNombre.trim(),
    fecha_inicio: nuevaFechaInicio,
    fecha_termino: nuevaFechaTermino,
    cupos: 5,
    estado: 'Abierto'
  }]);

  if (error) throw error;
}

export async function fetchAlumnos() {
  try {
    const { data: alumnos, error } = await supabase
      .from('alumno')
      .select('id_alumno, rut, nombre, correo, jornada')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = ahora.getMonth();
    
    const primerDia = new Date(Date.UTC(año, mes, 1, 0, 0, 0)).toISOString();
    const ultimoDia = new Date(Date.UTC(año, mes + 1, 0, 23, 59, 59, 999)).toISOString();

    // FILTRO CLAVE: Solo contabilizar horas de turnos con lista cerrada y sellada
    const { data: asignaciones, error: errorAsignaciones } = await supabase
      .from('asignacion_turno')
      .select('id_alumno, horas_validadas, estado_asignacion, turno!inner(fecha_inicio)')
      .in('estado_asignacion', ['Asistió', 'Ausente'])
      .gte('turno.fecha_inicio', primerDia)
      .lte('turno.fecha_inicio', ultimoDia);

    if (errorAsignaciones) throw errorAsignaciones;

    const horasMap = (asignaciones || []).reduce((acc, curr) => {
      acc[curr.id_alumno] = (acc[curr.id_alumno] || 0) + (parseFloat(curr.horas_validadas) || 0);
      return acc;
    }, {});

    return (alumnos || []).map((al) => ({
      ...al,
      horas_acumuladas: horasMap[al.id_alumno] || 0
    }));
  } catch (err) {
    console.error('Error en fetchAlumnos:', err.message);
    return [];
  }
}

// Aliases de retrocompatibilidad
export const getTurnos = fetchTurnos;
export const getAlumnos = fetchAlumnos;
export const obtenerAlumnosCatalogo = fetchAlumnos;
export const crearTurno = createTurno;
export const obtenerTurnoConAsignaciones = getTurnoById;