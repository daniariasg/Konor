import { supabase } from '../config/supabase.js';

export async function obtenerAjustesLedger({ idAlumno = null, mes = null, anio = null } = {}) {
  try {
    let query = supabase
      .from('ajuste_ledger')
      .select(`
        id_ajuste,
        id_alumno,
        id_turno,
        delta_horas,
        justificacion,
        fecha_registro,
        alumno:id_alumno ( id_alumno, nombre, rut ),
        turno:id_turno ( id_turno, nombre_evento, fecha_inicio )
      `)
      .order('fecha_registro', { ascending: false });

    if (idAlumno) {
      query = query.eq('id_alumno', idAlumno);
    }

    if (mes !== null && anio !== null) {
      const primerDia = new Date(Date.UTC(anio, mes, 1, 0, 0, 0)).toISOString();
      const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0, 23, 59, 59, 999)).toISOString();
      query = query.gte('fecha_registro', primerDia).lte('fecha_registro', ultimoDia);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error al obtener ajustes de Ledger:', err);
    throw err;
  }
}

export async function registrarAjusteLedger({ id_alumno, id_turno = null, delta_horas, justificacion }) {
  if (!id_alumno) throw new Error('Debe seleccionar un alumno ayudante.');
  if (delta_horas === 0 || isNaN(delta_horas)) throw new Error('El ajuste de horas no puede ser cero.');
  if (!justificacion || justificacion.trim().length < 5) {
    throw new Error('La justificación es obligatoria y debe tener al menos 5 caracteres.');
  }

  const registro = {
    id_alumno: Number(id_alumno),
    id_turno: id_turno ? Number(id_turno) : null,
    delta_horas: Number(delta_horas),
    justificacion: justificacion.trim()
  };

  const { data, error } = await supabase
    .from('ajuste_ledger')
    .insert([registro])
    .select();

  if (error) throw error;
  return data?.[0];
}