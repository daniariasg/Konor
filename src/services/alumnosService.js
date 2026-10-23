import { supabase } from '../config/supabase.js';

export async function fetchAlumnosDirectorio(anio = new Date().getFullYear(), mes = new Date().getMonth() + 1) {
  const { data: alumnos, error: errorAlumnos } = await supabase
    .from('alumno')
    .select('id_alumno, nombre, rut, correo, jornada, activo, bitacora')
    .order('nombre', { ascending: true });

  if (errorAlumnos) {
    console.error('Error al consultar alumnos:', errorAlumnos);
    throw errorAlumnos;
  }

  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from('asignacion_turno')
    .select(`
      id_alumno,
      horas_validadas,
      estado_asignacion,
      turno:id_turno (
        fecha_inicio
      )
    `)
    .eq('estado_asignacion', 'Asignado');

  if (errorAsignaciones) {
    console.error('Error al consultar asignaciones de turno:', errorAsignaciones);
    return (alumnos || []).map((a) => ({ ...a, horas_validadas: 0 }));
  }

  const acumuladoHoras = (asignaciones || []).reduce((acc, curr) => {
    if (!curr.turno?.fecha_inicio) return acc;

    const fechaTurno = new Date(curr.turno.fecha_inicio);
    const anioTurno = fechaTurno.getFullYear();
    const mesTurno = fechaTurno.getMonth() + 1;

    if (anioTurno === anio && mesTurno === mes) {
      const horas = parseFloat(curr.horas_validadas) || 0;
      acc[curr.id_alumno] = (acc[curr.id_alumno] || 0) + horas;
    }

    return acc;
  }, {});

  return (alumnos || []).map((alumno) => ({
    ...alumno,
    horas_validadas: Number((acumuladoHoras[alumno.id_alumno] || 0).toFixed(2)),
  }));
}

export async function insertAlumnoIndividual(alumno) {
  const payload = {
    nombre: alumno.nombre.trim(),
    rut: alumno.rut.trim(),
    correo: alumno.correo.trim().toLowerCase(),
    jornada: alumno.jornada || 'Diurno',
    activo: alumno.activo !== false,
    bitacora: alumno.bitacora || [],
  };

  if (alumno.telefono) payload.telefono = alumno.telefono.trim();
  if (alumno.carrera) payload.carrera = alumno.carrera.trim();

  const { data, error } = await supabase
    .from('alumno')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error al insertar alumno individual:', error);
    throw error;
  }
  return data;
}

/**
 * Actualiza los datos de un alumno y persiste obligatoriamente el evento
 * de sobrescritura en su columna JSONB 'bitacora'.
 */
export async function updateAlumnoConAuditoria(idAlumno, payload, nuevoEventoAuditoria = null) {
  // 1. Obtener la bitácora existente
  const { data: alumnoActual, error: errorConsulta } = await supabase
    .from('alumno')
    .select('bitacora')
    .eq('id_alumno', idAlumno)
    .single();

  if (errorConsulta) {
    console.error('Error al consultar bitacora existente:', errorConsulta);
    throw errorConsulta;
  }

  const bitacoraPrevia = Array.isArray(alumnoActual?.bitacora) ? alumnoActual.bitacora : [];

  const camposActualizables = {};
  if (payload.nombre !== undefined) camposActualizables.nombre = payload.nombre.trim();
  if (payload.rut !== undefined) camposActualizables.rut = payload.rut.trim();
  if (payload.correo !== undefined) camposActualizables.correo = payload.correo.trim().toLowerCase();
  if (payload.jornada !== undefined) camposActualizables.jornada = payload.jornada;
  if (payload.activo !== undefined) camposActualizables.activo = Boolean(payload.activo);
  if (payload.telefono !== undefined) camposActualizables.telefono = payload.telefono.trim();
  if (payload.carrera !== undefined) camposActualizables.carrera = payload.carrera.trim();

  // 2. Apilar el nuevo evento de auditoría al inicio del arreglo
  if (nuevoEventoAuditoria) {
    camposActualizables.bitacora = [nuevoEventoAuditoria, ...bitacoraPrevia];
  } else if (payload.bitacora !== undefined) {
    camposActualizables.bitacora = payload.bitacora;
  }

  const { data, error } = await supabase
    .from('alumno')
    .update(camposActualizables)
    .eq('id_alumno', idAlumno)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar datos con auditoría:', error);
    throw error;
  }
  return data;
}

/**
 * Inserta masivamente un lote de alumnos mediante upsert resolviendo conflicto por RUT.
 * Si se incluye justificación de lote, se concatena el evento en la bitácora existente de cada alumno.
 */
export async function insertAlumnosMasivo(listaAlumnos, justificacionLote = null) {
  const hoyStr = new Date().toLocaleDateString('es-CL');

  // Si existe justificación, traer las bitácoras previas de los alumnos para no sobreescribirlas en blanco
  let bitacorasPreviasMap = {};
  if (justificacionLote) {
    const ruts = listaAlumnos.map((a) => a.rut.trim());
    const { data: existentes } = await supabase
      .from('alumno')
      .select('rut, bitacora')
      .in('rut', ruts);

    (existentes || []).forEach((e) => {
      bitacorasPreviasMap[e.rut.trim().toUpperCase()] = Array.isArray(e.bitacora) ? e.bitacora : [];
    });
  }

  const payload = listaAlumnos.map((item) => {
    const rutKey = item.rut.trim().toUpperCase();
    const previas = bitacorasPreviasMap[rutKey] || [];

    let bitacoraFinal = previas;
    if (justificacionLote) {
      const eventoLote = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        fecha: hoyStr,
        tipo: 'actualizacion_datos',
        motivo: justificacionLote,
        autor: 'Administrador',
      };
      bitacoraFinal = [eventoLote, ...previas];
    }

    return {
      nombre: item.nombre.trim(),
      rut: item.rut.trim(),
      correo: item.correo.trim().toLowerCase(),
      jornada: item.jornada || 'Diurno',
      activo: item.activo !== false,
      bitacora: bitacoraFinal,
    };
  });

  const { data, error } = await supabase
    .from('alumno')
    .upsert(payload, { onConflict: 'rut' })
    .select();

  if (error) {
    console.error('Error en carga masiva de alumnos:', error);
    throw error;
  }
  return data;
}

export async function updateAlumno(idAlumno, payload) {
  return updateAlumnoConAuditoria(idAlumno, payload, null);
}

export async function updateAlumnoBitacora(idAlumno, nuevaEntrada) {
  const { data: alumnoActual, error: errorConsulta } = await supabase
    .from('alumno')
    .select('bitacora')
    .eq('id_alumno', idAlumno)
    .single();

  if (errorConsulta) {
    console.error('Error al consultar bitacora existente:', errorConsulta);
    throw errorConsulta;
  }

  const bitacoraPrevia = Array.isArray(alumnoActual?.bitacora) ? alumnoActual.bitacora : [];
  const bitacoraActualizada = [nuevaEntrada, ...bitacoraPrevia];

  const { data, error } = await supabase
    .from('alumno')
    .update({ bitacora: bitacoraActualizada })
    .eq('id_alumno', idAlumno)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar columna bitacora:', error);
    throw error;
  }

  return data;
}

export async function fetchTurnosAlumnoPorMes(idAlumno, anio, mes) {
  try {
    const { data, error } = await supabase
      .from('asignacion_turno')
      .select(`
        id_asignacion,
        horas_validadas,
        estado_asignacion,
        turno:id_turno (
          id_turno,
          nombre_evento,
          fecha_inicio
        )
      `)
      .eq('id_alumno', idAlumno)
      .eq('estado_asignacion', 'Asignado');

    if (error) {
      console.error('Error al consultar turnos del alumno:', error);
      return [];
    }

    if (!data) return [];

    return data
      .filter((item) => {
        if (!item.turno?.fecha_inicio) return false;
        const fecha = new Date(item.turno.fecha_inicio);
        return fecha.getFullYear() === anio && fecha.getMonth() + 1 === mes;
      })
      .map((item) => {
        const fechaObj = new Date(item.turno.fecha_inicio);
        const dia = String(fechaObj.getDate()).padStart(2, '0');
        const mesStr = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const anioStr = fechaObj.getFullYear();

        return {
          id: item.id_asignacion,
          fecha: `${dia}/${mesStr}/${anioStr}`,
          evento: item.turno.nombre_evento || 'Turno operativo',
          horas: parseFloat(item.horas_validadas) || 0,
        };
      });
  } catch (err) {
    console.error('Error al traer historial de turnos:', err);
    return [];
  }
}