import { useState, useEffect, useCallback, useMemo } from 'react';
import { validarTextoSeguro } from '../../../utils/sanitizer.js';
import { supabase } from '../../../config/supabase.js';

const procesarEntradaSegura = (textoBruto) => {
  const { esValido, valorLimpio } = validarTextoSeguro(textoBruto);

  if (!esValido) {
    throw new Error('El texto ingresado contiene caracteres no permitidos o posibles scripts maliciosos.');
  }

  return valorLimpio;
};

const normalizarJornadaUI = (jornada) =>
  jornada === 'Vespertino' || jornada === 'Vespertina' ? 'Vespertina' : 'Diurna';

export function usePerfilAlumno({ alumno, mesActivo, onActualizado }) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [cargandoTurnos, setCargandoTurnos] = useState(false);

  // Formulario del alumno
  const [form, setForm] = useState({
    rut: alumno?.rut || '',
    jornada: normalizarJornadaUI(alumno?.jornada),
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

  // Sincronizar datos iniciales al cambiar de alumno
  useEffect(() => {
    if (alumno) {
      setForm({
        rut: alumno.rut || '',
        jornada: normalizarJornadaUI(alumno.jornada),
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

  // 1. Cargar ficha fresca del alumno + historial consolidado (Turnos Cerrados + Ledger)
  const cargarDatos = useCallback(async () => {
    if (!alumno?.id_alumno) return;

    try {
      setCargandoTurnos(true);
      const ahora = new Date();
      const año = ahora.getFullYear();
      const mes = typeof mesActivo === 'number' ? mesActivo : ahora.getMonth();

      const primerDia = new Date(Date.UTC(año, mes, 1, 0, 0, 0)).toISOString();
      const ultimoDia = new Date(Date.UTC(año, mes + 1, 0, 23, 59, 59, 999)).toISOString();

      const [resAlumnoFresh, resTurnosMes, resCancelaciones, resLedger] = await Promise.all([
        supabase
          .from('alumno')
          .select('id_alumno, rut, nombre, correo, jornada, carrera, telefono, bitacora')
          .eq('id_alumno', alumno.id_alumno)
          .single(),

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
          .in('estado_asignacion', ['Asistió', 'Ausente'])
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
          .eq('estado_asignacion', 'Canceló turno'),

        supabase
          .from('ajuste_ledger')
          .select(`
            id_ajuste,
            delta_horas,
            justificacion,
            fecha_registro,
            turno:id_turno (
              id_turno,
              nombre_evento
            )
          `)
          .eq('id_alumno', alumno.id_alumno)
          .gte('fecha_registro', primerDia)
          .lte('fecha_registro', ultimoDia)
      ]);

      if (resAlumnoFresh.data) {
        const fresh = resAlumnoFresh.data;
        setForm({
          rut: fresh.rut || '',
          jornada: normalizarJornadaUI(fresh.jornada),
          telefono: fresh.telefono || '',
          correo: fresh.correo || '',
          carrera: fresh.carrera || ''
        });
        setNotasManuales(Array.isArray(fresh.bitacora) ? fresh.bitacora : []);
      }

      if (resTurnosMes.error) throw resTurnosMes.error;
      if (resLedger.error) throw resLedger.error;

      // A. Mapear turnos normales del mes
      const turnosMapeados = (resTurnosMes.data || []).map((asig) => {
        const t = asig.turno || {};
        let fechaFormat = '--/--/----';
        let timestamp = 0;
        if (t.fecha_inicio) {
          timestamp = new Date(t.fecha_inicio).getTime();
          const f = t.fecha_inicio.substring(0, 10);
          const [yyyy, mm, dd] = f.split('-');
          fechaFormat = `${dd}/${mm}/${yyyy}`;
        }
        return {
          id: `turno-${asig.id_asignacion}`,
          id_asignacion: asig.id_asignacion,
          id_turno: t.id_turno,
          nombre_evento: t.nombre_evento,
          fecha: fechaFormat,
          timestamp,
          horas_validadas: Number(asig.horas_validadas) || 0,
          esAjusteLedger: false,
          estado_asignacion: asig.estado_asignacion
        };
      });

      // B. Mapear asientos contables de ajuste (Ledger)
      const ajustesMapeados = (resLedger.data || []).map((aj) => {
        let fechaFormat = '--/--/----';
        let timestamp = 0;
        if (aj.fecha_registro) {
          timestamp = new Date(aj.fecha_registro).getTime();
          const d = new Date(aj.fecha_registro);
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const yyyy = d.getUTCFullYear();
          fechaFormat = `${dd}/${mm}/${yyyy}`;
        }

        const nombreEventoAsociado = aj.turno?.nombre_evento
          ? `Ajuste (${aj.turno.nombre_evento}): ${aj.justificacion}`
          : `Ajuste Ledger: ${aj.justificacion}`;

        return {
          id: `ledger-${aj.id_ajuste}`,
          id_asignacion: `adj-${aj.id_ajuste}`,
          id_turno: aj.turno?.id_turno || null,
          nombre_evento: nombreEventoAsociado,
          fecha: fechaFormat,
          timestamp,
          horas_validadas: Number(aj.delta_horas) || 0,
          esAjusteLedger: true,
          estado_asignacion: 'Ajuste Contable'
        };
      });

      // C. Unir ambos historiales y ordenar cronológicamente
      const historialCompleto = [...turnosMapeados, ...ajustesMapeados];
      historialCompleto.sort((a, b) => b.timestamp - a.timestamp);
      setTurnosHistorial(historialCompleto);

      // D. Mapear cancelaciones como entradas de bitácora
      const cancels = (resCancelaciones.data || []).map((c) => ({
        id: `cancel-${c.id_asignacion}`,
        tipo: 'Cancelacion',
        fecha: c.turno?.fecha_inicio || new Date().toISOString(),
        autor: 'Sistema / Auditoría',
        comentario: `Canceló participación en turno "${c.turno?.nombre_evento || 'Operativo'}". Motivo: ${c.motivo_cancelacion || 'Sin motivo especificado'}.`
      }));
      setCancelacionesTurnos(cancels);
    } catch (err) {
      console.error('Error cargando datos consolidados del alumno:', err);
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

      const limpiarCampo = (val) =>
        String(val || '').replace(/[<>]/g, '').trim();

      const telefonoLimpio = limpiarCampo(form.telefono);
      const carreraLimpia = limpiarCampo(form.carrera);

      const payload = {
        rut: limpiarCampo(form.rut),
        telefono: telefonoLimpio || null,
        correo: limpiarCampo(form.correo).toLowerCase(),
        carrera: carreraLimpia || null,
        jornada: form.jornada === 'Vespertina' ? 'Vespertino' : 'Diurno'
      };

      const { data, error } = await supabase
        .from('alumno')
        .update(payload)
        .eq('id_alumno', alumno.id_alumno)
        .select('id_alumno, rut, nombre, correo, jornada, carrera, telefono, bitacora')
        .single();

      if (error) throw error;

      if (data) {
        setForm({
          rut: data.rut || '',
          jornada: normalizarJornadaUI(data.jornada),
          telefono: data.telefono || '',
          correo: data.correo || '',
          carrera: data.carrera || ''
        });
      }

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
        comentario: nuevaNota.replace(/[<>]/g, '').trim(),
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
    loading: cargandoTurnos,
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