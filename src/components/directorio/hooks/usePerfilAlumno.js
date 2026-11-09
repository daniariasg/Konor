import { useState, useEffect, useCallback, useMemo } from 'react';
import { sanitizarTextoPlano, validarTextoSeguro } from '../../../utils/sanitizer.js';
import { supabase } from '../../../config/supabase.js';

const procesarEntradaSegura = (textoBruto) => {
  const { esValido, valorLimpio } = validarTextoSeguro(textoBruto);
  
  if (!esValido) {
    throw new Error('El texto ingresado contiene caracteres no permitidos o posibles scripts maliciosos.');
  }
  
  return valorLimpio;
};

export function usePerfilAlumno({ alumno, mesActivo, onActualizado }) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [cargandoTurnos, setCargandoTurnos] = useState(false);

  // Formulario del alumno
  const [form, setForm] = useState({
    rut: alumno?.rut || '',
    jornada: alumno?.jornada === 'Vespertino' || alumno?.jornada === 'Vespertina' ? 'Vespertina' : 'Diurna',
    telefono: alumno?.telefono || '',
    correo: alumno?.correo || '',
    carrera: alumno?.carrera || ''
  });

  const [turnosHistorial, setTurnosHistorial] = useState([]);
  const [notasManuales, setNotasManuales] = useState(
    Array.isArray(alumno?.bitacora) ? alumno.bitacora : []
  );
  const [cancelacionesTurnos, setCancelacionesTurnos] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');

  // Sincronizar datos al cambiar de alumno
  useEffect(() => {
    if (alumno) {
      setForm({
        rut: alumno.rut || '',
        jornada: alumno.jornada === 'Vespertino' || alumno.jornada === 'Vespertina' ? 'Vespertina' : 'Diurna',
        telefono: alumno.telefono || '',
        correo: alumno.correo || '',
        carrera: alumno.carrera || ''
      });
      setNotasManuales(Array.isArray(alumno.bitacora) ? alumno.bitacora : []);
    }
  }, [alumno]);

  const handleInputChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  // 1. Cargar historial de turnos del mes activo (solo turnos con lista cerrada y sellada)
  const cargarDatos = useCallback(async () => {
    if (!alumno?.id_alumno) return;

    try {
      setCargandoTurnos(true);
      const ahora = new Date();
      const año = ahora.getFullYear();
      const mes = typeof mesActivo === 'number' ? mesActivo : ahora.getMonth();

      const primerDia = new Date(Date.UTC(año, mes, 1, 0, 0, 0)).toISOString();
      const ultimoDia = new Date(Date.UTC(año, mes + 1, 0, 23, 59, 59, 999)).toISOString();

      // Consultar únicamente turnos cerrados/sellados del mes para el historial y cancelaciones para la bitácora
      const [resTurnosMes, resCancelaciones] = await Promise.all([
        supabase
          .from('asignacion_turno')
          .select(`
            id_asignacion,
            horas_validadas,
            estado_asignacion,
            turno!inner (
              id_turno,
              nombre_evento,
              fecha_inicio,
              fecha_termino
            )
          `)
          .eq('id_alumno', alumno.id_alumno)
          .in('estado_asignacion', ['Asistió', 'Ausente']) // CLAVE: Solo turnos cerrados
          .gte('turno.fecha_inicio', primerDia)
          .lte('turno.fecha_inicio', ultimoDia),
        supabase
          .from('asignacion_turno')
          .select(`
            id_asignacion,
            motivo_cancelacion,
            turno!inner (
              id_turno,
              nombre_evento,
              fecha_inicio
            )
          `)
          .eq('id_alumno', alumno.id_alumno)
          .eq('estado_asignacion', 'Canceló turno')
      ]);

      if (resTurnosMes.error) throw resTurnosMes.error;

      // Mapear turnos del mes
      const turnosMapeados = (resTurnosMes.data || []).map((asig) => {
        const t = asig.turno || {};
        let fechaFormat = '--/--/----';
        if (t.fecha_inicio) {
          const f = t.fecha_inicio.substring(0, 10);
          const [yyyy, mm, dd] = f.split('-');
          fechaFormat = `${dd}/${mm}/${yyyy}`;
        }
        return {
          id_asignacion: asig.id_asignacion,
          id_turno: t.id_turno,
          nombre_evento: t.nombre_evento,
          fecha: fechaFormat,
          horas_validadas: Number(asig.horas_validadas) || 0,
          estado_asignacion: asig.estado_asignacion
        };
      });
      setTurnosHistorial(turnosMapeados);

      // Mapear cancelaciones como entradas de bitácora
      const cancels = (resCancelaciones.data || []).map((c) => ({
        id: `cancel-${c.id_asignacion}`,
        tipo: 'Cancelacion',
        fecha: c.turno?.fecha_inicio || new Date().toISOString(),
        autor: 'Sistema / Auditoría',
        comentario: `Canceló participación en turno "${c.turno?.nombre_evento || 'Operativo'}". Motivo: ${c.motivo_cancelacion || 'Sin motivo especificado'}.`
      }));
      setCancelacionesTurnos(cancels);

    } catch (err) {
      console.error('Error cargando datos de turnos/bitácora:', err);
    } finally {
      setCargandoTurnos(false);
    }
  }, [alumno?.id_alumno, mesActivo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Unificación de la bitácora
  const bitacoraUnificada = useMemo(() => {
    const lista = [...notasManuales, ...cancelacionesTurnos];
    lista.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return lista;
  }, [notasManuales, cancelacionesTurnos]);

  // 2. Guardar datos del estudiante en Supabase
  const handleGuardarDatos = async () => {
    if (!alumno?.id_alumno) return { success: false, error: 'Alumno no válido' };

    try {
      setGuardando(true);
      const payload = {
        rut: form.rut?.trim(),
        telefono: form.telefono?.trim(),
        correo: form.correo?.trim(),
        carrera: form.carrera?.trim(),
        jornada: form.jornada === 'Vespertina' ? 'Vespertino' : 'Diurno'
      };

      const { data, error } = await supabase
        .from('alumno')
        .update(payload)
        .eq('id_alumno', alumno.id_alumno)
        .select()
        .single();

      if (error) throw error;

      setModoEdicion(false);
      if (onActualizado) onActualizado(data);
      return { success: true };
    } catch (err) {
      console.error('Error al actualizar alumno:', err);
      return { success: false, error: err.message };
    } finally {
      setGuardando(false);
    }
  };

  // 3. Agregar nota a la bitácora
  const handleAgregarNota = async () => {
    if (!nuevaNota.trim() || !alumno?.id_alumno) return { success: false };

    try {
      setGuardandoNota(true);
      const nuevaEntrada = {
        id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fecha: new Date().toISOString(),
        comentario: nuevaNota.trim(),
        tipo: 'Observacion'
      };

      const previas = Array.isArray(notasManuales) ? notasManuales : [];
      const actualizadas = [nuevaEntrada, ...previas];

      const { error } = await supabase
        .from('alumno')
        .update({ bitacora: actualizadas })
        .eq('id_alumno', alumno.id_alumno);

      if (error) throw error;

      setNotasManuales(actualizadas);
      setNuevaNota('');
      if (onActualizado) onActualizado({ ...alumno, bitacora: actualizadas });
      return { success: true };
    } catch (err) {
      console.error('Error al registrar nota en bitácora:', err);
      return { success: false, error: err.message };
    } finally {
      setGuardandoNota(false);
    }
  };

  // 4. Eliminar nota manual de la bitácora
  const handleEliminarNota = async (idNota) => {
    if (!idNota || !alumno?.id_alumno) return { success: false };

    try {
      const filtradas = notasManuales.filter((n) => n.id !== idNota);

      const { error } = await supabase
        .from('alumno')
        .update({ bitacora: filtradas })
        .eq('id_alumno', alumno.id_alumno);

      if (error) throw error;

      setNotasManuales(filtradas);
      if (onActualizado) onActualizado({ ...alumno, bitacora: filtradas });
      return { success: true };
    } catch (err) {
      console.error('Error al eliminar nota de bitácora:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    modoEdicion,
    setModoEdicion,
    guardando,
    guardandoNota,
    cargandoTurnos,
    nuevaNota,
    setNuevaNota,
    form,
    turnosHistorial,
    bitacoraNotas: bitacoraUnificada,
    handleInputChange,
    handleGuardarDatos,
    handleAgregarNota,
    handleEliminarNota
  };
}