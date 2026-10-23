import { supabase } from '../config/supabase.js';

/**
 * Obtiene la lista completa de alumnos activos con sus horas acumuladas del mes.
 */
export async function fetchAlumnos() {
  try {
    const { data: alumnos, error } = await supabase
      .from('alumno')
      .select('id_alumno, nombre, rut, correo, jornada, activo')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    const ahora = new Date();
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: asignacionesMes } = await supabase
      .from('asignacion_turno')
      .select(`
        id_alumno,
        horas_validadas,
        turno!inner ( fecha_inicio )
      `)
      .gte('turno.fecha_inicio', primerDiaMes)
      .lte('turno.fecha_inicio', ultimoDiaMes);

    const horasMap = (asignacionesMes || []).reduce((acc, curr) => {
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

export const getAlumnos = fetchAlumnos;

/**
 * HU08 / HU10: Obtiene asignaciones del turno vinculadas a alumnos.
 */
export async function fetchAsignacionesPorTurno(idTurno) {
  try {
    if (!idTurno) return [];

    const { data: asignaciones, error } = await supabase
      .from('asignacion_turno')
      .select(`
        id_asignacion,
        id_turno,
        id_alumno,
        estado_asignacion,
        horas_validadas,
        hora_entrada_real,
        hora_salida_real,
        motivo_cancelacion,
        alumno:id_alumno (
          id_alumno,
          nombre,
          rut,
          correo,
          jornada,
          activo
        )
      `)
      .eq('id_turno', idTurno);

    if (error) throw error;
    return asignaciones || [];
  } catch (err) {
    console.error('Error en fetchAsignacionesPorTurno:', err.message);
    return [];
  }
}

export const getAsignacionesPorTurno = fetchAsignacionesPorTurno;

/**
 * HU06: Obtiene los turnos ordenados para mostrar los más recientes arriba.
 */
export async function fetchTurnos() {
  try {
    const { data, error } = await supabase
      .from('turno')
      .select(`
        id_turno,
        nombre_evento,
        fecha_inicio,
        fecha_termino,
        cupos,
        estado,
        fecha_creacion,
        asignacion_turno (
          id_asignacion,
          estado_asignacion
        )
      `)
      .order('id_turno', { ascending: false });

    if (error) throw error;

    return (data || []).map((t) => {
      const asignaciones = t.asignacion_turno || [];
      const ocupados = asignaciones.filter((a) => a.estado_asignacion === 'Asignado').length;
      return {
        ...t,
        cupos_ocupados: ocupados,
        total_asignaciones: asignaciones.length
      };
    });
  } catch (err) {
    console.error('Error en fetchTurnos:', err.message);
    return [];
  }
}

export const getTurnos = fetchTurnos;

/**
 * HU06: Obtiene el detalle de un turno por su ID.
 */
export async function getTurnoById(idTurno) {
  try {
    if (!idTurno) return { data: null, error: 'ID requerido' };

    const { data: turno, error } = await supabase
      .from('turno')
      .select(`
        id_turno,
        nombre_evento,
        fecha_inicio,
        fecha_termino,
        cupos,
        estado,
        fecha_creacion,
        asignacion_turno (
          id_asignacion,
          id_alumno,
          estado_asignacion,
          horas_validadas,
          hora_entrada_real,
          hora_salida_real,
          motivo_cancelacion,
          alumno:id_alumno (
            id_alumno,
            nombre,
            rut,
            correo,
            jornada,
            activo
          )
        )
      `)
      .eq('id_turno', idTurno)
      .single();

    if (error) throw error;
    return { data: turno, error: null };
  } catch (err) {
    console.error('Error en getTurnoById:', err.message);
    return { data: null, error: err.message };
  }
}

/**
 * HU10 / HU11: Guarda y confirma las asignaciones.
 */
export async function guardarAsignaciones(idTurno, interesados = [], duracionTurno = 0) {
  try {
    if (!idTurno) throw new Error('ID de turno obligatorio.');

    const registros = interesados.map((item) => {
      let estado = 'En espera';
      if (item.cancelo) {
        estado = 'Canceló turno';
      } else if (item.asignado) {
        estado = 'Asignado';
      }

      return {
        id_turno: idTurno,
        id_alumno: item.id_alumno,
        estado_asignacion: estado,
        motivo_cancelacion: item.motivo_cancelacion || null
      };
    });

    if (registros.length > 0) {
      // Upsert contra la restricción uq_turno_alumno
      const { error: upsertError } = await supabase
        .from('asignacion_turno')
        .upsert(registros, { onConflict: 'id_turno,id_alumno' });

      if (upsertError) throw upsertError;
    }

    // Actualizar estado del turno a 'Asignado' si hay titulares
    const tieneAsignados = interesados.some((i) => i.asignado && !i.cancelo);
    if (tieneAsignados) {
      const { error: turnoError } = await supabase
        .from('turno')
        .update({ estado: 'Asignado' })
        .eq('id_turno', idTurno);

      if (turnoError) throw turnoError;
    }

    return { success: true };
  } catch (err) {
    console.error('Error en guardarAsignaciones:', err.message);
    throw err;
  }
}

export const guardarAsignacionesTurno = guardarAsignaciones;

/**
 * HU06: Inserta un nuevo turno adaptando formatos de formulario.
 */
export async function createTurno(payload) {
  try {
    const { 
      nombre_evento, 
      fecha_inicio, 
      fecha_termino, 
      fecha, 
      hora_inicio, 
      hora_termino, 
      cupos 
    } = payload || {};

    if (!nombre_evento || !nombre_evento.trim()) {
      throw new Error('El nombre del evento es requerido.');
    }

    const vacantes = parseInt(cupos, 10);
    if (isNaN(vacantes) || vacantes <= 0) {
      throw new Error('Los cupos deben ser mayores a 0.');
    }

    let finalInicioISO = fecha_inicio;
    let finalTerminoISO = fecha_termino;

    if (!finalInicioISO && fecha && hora_inicio) {
      finalInicioISO = `${fecha}T${hora_inicio.length === 5 ? hora_inicio + ':00' : hora_inicio}`;
    }
    if (!finalTerminoISO && fecha && hora_termino) {
      finalTerminoISO = `${fecha}T${hora_termino.length === 5 ? hora_termino + ':00' : hora_termino}`;
    }

    const inicio = new Date(finalInicioISO);
    const termino = new Date(finalTerminoISO);

    if (isNaN(inicio.getTime()) || isNaN(termino.getTime())) {
      throw new Error('Formato de fecha u hora inválido.');
    }
    if (termino <= inicio) {
      throw new Error('La hora de término debe ser posterior a la de inicio.');
    }

    const record = {
      nombre_evento: nombre_evento.trim(),
      fecha_inicio: inicio.toISOString(),
      fecha_termino: termino.toISOString(),
      cupos: vacantes,
      estado: 'Abierto'
    };

    const { data, error } = await supabase.from('turno').insert([record]).select().single();
    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error en createTurno:', err.message);
    return { data: null, error: err.message || 'Error al crear turno' };
  }
}

export const crearTurno = createTurno;

/**
 * HU07: Buscador Cortafuegos.
 */
export async function fetchAlumnosDisponibles(
  idTurnoActual,
  fechaInicioISO,
  fechaTerminoISO,
  duracionTurnoHoras = 0,
  limiteHoras = 60
) {
  try {
    const { data: alumnos, error: errorAlumnos } = await supabase
      .from('alumno')
      .select('id_alumno, nombre, rut, correo, jornada')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (errorAlumnos) throw errorAlumnos;

    const fechaTurno = new Date(fechaInicioISO);
    const primerDiaMes = new Date(fechaTurno.getFullYear(), fechaTurno.getMonth(), 1).toISOString();
    const ultimoDiaMes = new Date(fechaTurno.getFullYear(), fechaTurno.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: asignaciones, error: errorAsig } = await supabase
      .from('asignacion_turno')
      .select(`
        id_alumno,
        estado_asignacion,
        horas_validadas,
        turno!inner (
          id_turno,
          fecha_inicio,
          fecha_termino
        )
      `)
      .gte('turno.fecha_inicio', primerDiaMes)
      .lte('turno.fecha_inicio', ultimoDiaMes);

    if (errorAsig) throw errorAsig;

    const inicioTurnoMs = new Date(fechaInicioISO).getTime();
    const terminoTurnoMs = new Date(fechaTerminoISO).getTime();

    return (alumnos || []).map((alumno) => {
      const susAsignaciones = (asignaciones || []).filter((a) => a.id_alumno === alumno.id_alumno);

      const horasAcumuladas = susAsignaciones.reduce((acc, curr) => {
        return acc + (parseFloat(curr.horas_validadas) || 0);
      }, 0);

      const tieneChoque = susAsignaciones.some((asig) => {
        if (asig.estado_asignacion !== 'Asignado') return false;
        if (idTurnoActual && asig.turno.id_turno === idTurnoActual) return false;

        const otroIni = new Date(asig.turno.fecha_inicio).getTime();
        const otroFin = new Date(asig.turno.fecha_termino).getTime();

        return Math.max(inicioTurnoMs, otroIni) < Math.min(terminoTurnoMs, otroFin);
      });

      const superaLimite = (horasAcumuladas + duracionTurnoHoras) > limiteHoras;

      return {
        ...alumno,
        horas_acumuladas: horasAcumuladas,
        horas_proyectadas: horasAcumuladas + duracionTurnoHoras,
        limite_aplicado: limiteHoras,
        esta_ocupado: tieneChoque,
        supera_limite: superaLimite,
        disponible: !tieneChoque && !superaLimite
      };
    });
  } catch (err) {
    console.error('Error en fetchAlumnosDisponibles:', err.message);
    return [];
  }
}

/**
 * HU06: Cancela o actualiza el estado de un turno a 'Cancelado'.
 */
export async function cancelarTurno(idTurno) {
  try {
    if (!idTurno) throw new Error('ID obligatorio.');

    const { data, error } = await supabase
      .from('turno')
      .update({ estado: 'Cancelado' })
      .eq('id_turno', idTurno)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error en cancelarTurno:', err.message);
    return { data: null, error: err.message };
  }
}

/**
 * HU06: Duplica un turno base.
 */
export async function duplicarTurno(idTurno, nuevaFechaInicio, nuevaFechaTermino) {
  try {
    const { data: base, error: errorBase } = await supabase
      .from('turno')
      .select('nombre_evento, cupos')
      .eq('id_turno', idTurno)
      .single();

    if (errorBase) throw errorBase;

    const payload = {
      nombre_evento: `${base.nombre_evento} (Copia)`,
      fecha_inicio: new Date(nuevaFechaInicio).toISOString(),
      fecha_termino: new Date(nuevaFechaTermino).toISOString(),
      cupos: base.cupos,
      estado: 'Abierto'
    };

    const { data, error } = await supabase.from('turno').insert([payload]).select().single();
    if (error) throw error;

    return { data, error: null };
  } catch (err) {
    console.error('Error en duplicarTurno:', err.message);
    return { data: null, error: err.message };
  }
}