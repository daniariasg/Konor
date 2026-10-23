import { useState, useEffect, useMemo, useRef } from 'react';
import { updateAlumno, updateAlumnoBitacora, fetchTurnosAlumnoPorMes } from '../../../services/alumnosService.js';
import { supabase } from '../../../config/supabase.js';

export function usePerfilAlumno({ alumno, mesActivo, onActualizado }) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  
  // Estado para el Toast / Alerta de éxito con temporizador
  const [mensajeExito, setMensajeExito] = useState(false);
  const [toastEnPausa, setToastEnPausa] = useState(false);
  const toastTimerRef = useRef(null);
  const tiempoRestanteRef = useRef(4000);
  const tiempoInicioRef = useRef(null);

  const [turnosHistorial, setTurnosHistorial] = useState([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(true);

  // Lista de observaciones leídas directamente de alumno.bitacora
  const [bitacoraNotas, setBitacoraNotas] = useState([]);

  const [form, setForm] = useState({
    rut: '',
    jornada: 'Diurna',
    telefono: '',
    correo: '',
  });

  // Manejador del temporizador de 4 segundos para el Toast
  const iniciarTemporizadorToast = () => {
    limpiarTemporizadorToast();
    tiempoInicioRef.current = Date.now();
    toastTimerRef.current = setTimeout(() => {
      setMensajeExito(false);
      tiempoRestanteRef.current = 4000;
    }, tiempoRestanteRef.current);
  };

  const limpiarTemporizadorToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const pausarTemporizadorToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
      const transcurrido = Date.now() - tiempoInicioRef.current;
      tiempoRestanteRef.current = Math.max(0, tiempoRestanteRef.current - transcurrido);
      setToastEnPausa(true);
    }
  };

  const reanudarTemporizadorToast = () => {
    if (tiempoRestanteRef.current > 0 && mensajeExito) {
      setToastEnPausa(false);
      tiempoInicioRef.current = Date.now();
      toastTimerRef.current = setTimeout(() => {
        setMensajeExito(false);
        tiempoRestanteRef.current = 4000;
      }, tiempoRestanteRef.current);
    }
  };

  const dispararToastExito = () => {
    tiempoRestanteRef.current = 4000;
    setToastEnPausa(false);
    setMensajeExito(true);
    iniciarTemporizadorToast();
  };

  useEffect(() => {
    return () => {
      limpiarTemporizadorToast();
    };
  }, []);

  useEffect(() => {
    if (alumno) {
      setModoEdicion(false);
      setForm({
        rut: alumno.rut || '',
        jornada: alumno.jornada === 'Vespertino' ? 'Vespertina' : 'Diurna',
        telefono: alumno.telefono || '',
        correo: alumno.correo || '',
      });
      setNuevaNota('');

      // Cargar bitácora oficial desde la base de datos
      setBitacoraNotas(Array.isArray(alumno.bitacora) ? alumno.bitacora : []);

      // Cargar turnos reales para el mes activo
      const anio = new Date().getFullYear();
      const mes = Number(mesActivo) || (new Date().getMonth() + 1);

      setCargandoTurnos(true);
      fetchTurnosAlumnoPorMes(alumno.id_alumno, anio, mes)
        .then((data) => {
          setTurnosHistorial(data || []);
        })
        .finally(() => {
          setCargandoTurnos(false);
        });
    }
  }, [alumno, mesActivo]);

  // Totalizador reactivo: suma matemática estricta de las horas desplegadas
  const totalHorasCalculadas = useMemo(() => {
    return turnosHistorial.reduce((acc, t) => acc + (parseFloat(t.horas) || 0), 0);
  }, [turnosHistorial]);

  const totalHorasFormato = useMemo(() => {
    return totalHorasCalculadas % 1 === 0
      ? totalHorasCalculadas.toString()
      : totalHorasCalculadas.toFixed(1).replace('.', ',');
  }, [totalHorasCalculadas]);

  // Agregar observación manual tipada estrictamente como 'comentario_manual'
  const handleAgregarComentario = async (textoPersonalizado = null) => {
    const textoFinal = (textoPersonalizado ?? nuevaNota).trim();
    if (!textoFinal || !alumno?.id_alumno || guardandoNota) return;

    const nuevaEntrada = {
      id: Date.now().toString(), // Identificador único para el borrado seguro
      fecha: new Date().toLocaleDateString('es-CL'),
      tipo: 'comentario_manual',
      autor: 'Administrador',
      texto: textoFinal,
    };

    try {
      setGuardandoNota(true);
      const alumnoActualizado = await updateAlumnoBitacora(alumno.id_alumno, nuevaEntrada);

      const bitacoraFresca = Array.isArray(alumnoActualizado.bitacora)
        ? alumnoActualizado.bitacora
        : [nuevaEntrada, ...bitacoraNotas];

      setBitacoraNotas(bitacoraFresca);
      setNuevaNota('');

      if (onActualizado) {
        onActualizado({
          ...alumno,
          ...alumnoActualizado,
          horas_validadas: totalHorasCalculadas,
        });
      }
    } catch (err) {
      console.error('Error al agregar comentario a la bitácora:', err);
      alert('Error al guardar la observación en la base de datos.');
    } finally {
      setGuardandoNota(false);
    }
  };

  // REGLA DE BORRADO ESTRICTO: Solo tipo 'comentario_manual'
  const handleEliminarComentario = async (indexAEliminar) => {
    const comentario = bitacoraNotas[indexAEliminar];
    if (!comentario) return;

    // Regla de inmutabilidad: Bloquear si no es manual
    const tipo = comentario.tipo || 'comentario_manual';
    if (tipo !== 'comentario_manual') {
      alert('Este registro es parte del historial de auditoría inmutable del sistema y no puede eliminarse.');
      return;
    }

    const confirmar = window.confirm('¿Deseas eliminar esta observación de desempeño?');
    if (!confirmar) return;

    const nuevoArreglo = bitacoraNotas.filter((_, idx) => idx !== indexAEliminar);

    try {
      setGuardandoNota(true);

      const { data, error } = await supabase
        .from('alumno')
        .update({ bitacora: nuevoArreglo })
        .eq('id_alumno', alumno.id_alumno)
        .select()
        .single();

      if (error) throw error;

      setBitacoraNotas(nuevoArreglo);

      if (onActualizado) {
        onActualizado({
          ...alumno,
          bitacora: nuevoArreglo,
          horas_validadas: totalHorasCalculadas,
        });
      }
    } catch (err) {
      console.error('Error al eliminar comentario de la bitácora:', err);
      alert('Error al eliminar la nota de Supabase.');
    } finally {
      setGuardandoNota(false);
    }
  };

  // Guardar cambios en datos estáticos
  const handleGuardarCambios = async (e) => {
    e?.preventDefault();
    if (!alumno) return;

    try {
      setGuardando(true);
      const payload = {
        rut: form.rut.trim(),
        jornada: form.jornada === 'Vespertina' ? 'Vespertino' : 'Diurno',
        correo: form.correo.trim(),
      };
      if (form.telefono) payload.telefono = form.telefono.trim();

      const alumnoActualizado = await updateAlumno(alumno.id_alumno, payload);
      alumnoActualizado.horas_validadas = totalHorasCalculadas;

      if (onActualizado) {
        onActualizado({
          ...alumno,
          ...alumnoActualizado,
          bitacora: bitacoraNotas,
        });
      }

      setModoEdicion(false);
      dispararToastExito();
    } catch (err) {
      console.error('Error al guardar datos del alumno:', err);
      alert('Error al guardar los datos en Supabase.');
    } finally {
      setGuardando(false);
    }
  };

  return {
    form,
    setForm,
    modoEdicion,
    setModoEdicion,
    guardando,
    guardandoNota,
    nuevaNota,
    setNuevaNota,
    mensajeExito,
    toastEnPausa,
    pausarTemporizadorToast,
    reanudarTemporizadorToast,
    turnosHistorial,
    cargandoTurnos,
    totalHorasFormato,
    bitacoraNotas,
    handleAgregarComentario,
    handleEliminarComentario,
    handleGuardarCambios,
  };
}