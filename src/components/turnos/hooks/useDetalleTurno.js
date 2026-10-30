import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../config/supabase.js';
import {
  fetchAlumnos,
  fetchAsignacionesPorTurno,
  guardarAsignaciones,
  getTurnoById
} from '../../../services/turnosService.js';

// Extrae estrictamente "HH:mm" sin pasar por objetos Date ni conversiones de timezone
export function extraerHoraPura(valor) {
  if (!valor) return '--:--';
  const str = String(valor);
  const match = str.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  if (/^\d{2}:\d{2}/.test(str)) return str.slice(0, 5);
  return '--:--';
}

// Extrae estrictamente "DD/MM/YYYY" sin saltos de fecha por UTC
export function extraerFechaPura(valor) {
  if (!valor) return '--/--/----';
  const str = String(valor);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return '--/--/----';
}

export function useDetalleTurno(turnoInicial) {
  const [turno, setTurno] = useState(turnoInicial || {});
  const [vistaAsistencia, setVistaAsistencia] = useState(turnoInicial?.estado === 'Cerrado');
  const [alumnosCatalogo, setAlumnosCatalogo] = useState([]);
  const [interesados, setInteresados] = useState([]);
  const [asistenciaRows, setAsistenciaRows] = useState([]);
  const [modoEdicion, setModoEdicion] = useState(turnoInicial?.estado === 'Abierto');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alumnoParaBaja, setAlumnoParaBaja] = useState(null);

  const idTurnoActual = turno.id_turno || turnoInicial?.id_turno;

  // Extracción de texto fija
  const horaInicioBase = useMemo(() => {
    return extraerHoraPura(turno.hora_inicio || turno.fecha_inicio);
  }, [turno.hora_inicio, turno.fecha_inicio]);

  const horaTerminoBase = useMemo(() => {
    return extraerHoraPura(turno.hora_termino || turno.fecha_termino);
  }, [turno.hora_termino, turno.fecha_termino]);

  const fechaStr = useMemo(() => {
    return extraerFechaPura(turno.fecha || turno.fecha_inicio);
  }, [turno.fecha, turno.fecha_inicio]);

  // Diferencia directa de minutos
  const duracionTurno = useMemo(() => {
    if (horaInicioBase === '--:--' || horaTerminoBase === '--:--') return 0;
    const [hI, mI] = horaInicioBase.split(':').map(Number);
    const [hF, mF] = horaTerminoBase.split(':').map(Number);
    const min = (hF * 60 + mF) - (hI * 60 + mI);
    return min > 0 ? Number((min / 60).toFixed(1)) : 0;
  }, [horaInicioBase, horaTerminoBase]);

  const armarListaAsistencia = useCallback((candidatos, turnoActual = turno) => {
    const asignados = candidatos.filter((c) => c.asignado && !c.cancelo);
    setAsistenciaRows(
      asignados.map((a) => ({
        id_alumno: a.id_alumno,
        nombre: a.nombre,
        rut: a.rut,
        asistio: a.horas_validadas > 0 || turnoActual.estado !== 'Cerrado',
        hora_entrada: a.hora_entrada_real ? extraerHoraPura(a.hora_entrada_real) : horaInicioBase,
        hora_salida: a.hora_salida_real ? extraerHoraPura(a.hora_salida_real) : horaTerminoBase,
        horas_calculadas: a.horas_validadas > 0 ? Number(a.horas_validadas) : duracionTurno,
      }))
    );
  }, [turno, horaInicioBase, horaTerminoBase, duracionTurno]);

  useEffect(() => {
    if (!idTurnoActual) {
      setLoading(false);
      return;
    }

    async function cargar() {
      try {
        setLoading(true);
        let turnoVigente = turno;
        if (!turno.fecha_inicio && !turno.fecha) {
          const { data: turnoBD } = await getTurnoById(idTurnoActual);
          if (turnoBD) {
            turnoVigente = turnoBD;
            setTurno(turnoBD);
            if (turnoBD.estado === 'Cerrado') setVistaAsistencia(true);
          }
        }

        const [alumnosData, asignacionesData] = await Promise.all([
          fetchAlumnos(),
          fetchAsignacionesPorTurno(idTurnoActual),
        ]);

        const catalogo = Array.isArray(alumnosData) ? alumnosData : alumnosData?.data || [];
        const asignaciones = Array.isArray(asignacionesData) ? asignacionesData : asignacionesData?.data || [];
        setAlumnosCatalogo(catalogo);

        if (asignaciones.length > 0) {
          const precargados = asignaciones.map((asig) => {
            const perfil = catalogo.find((a) => a.id_alumno === asig.id_alumno) || {};
            return {
              id_alumno: asig.id_alumno,
              nombre: asig.alumno?.nombre || perfil.nombre || 'Alumno',
              rut: asig.alumno?.rut || perfil.rut || '',
              correo: asig.alumno?.correo || perfil.correo || '',
              horas_acumuladas: perfil.horas_acumuladas || 0,
              asignado: asig.estado_asignacion === 'Asignado',
              cancelo: asig.estado_asignacion === 'Canceló turno',
              motivo_cancelacion: asig.motivo_cancelacion || '',
              horas_validadas: asig.horas_validadas || 0,
              hora_entrada_real: asig.hora_entrada_real,
              hora_salida_real: asig.hora_salida_real,
            };
          });

          precargados.sort((a, b) => (a.cancelo === b.cancelo ? a.horas_acumuladas - b.horas_acumuladas : a.cancelo ? 1 : -1));
          setInteresados(precargados);
          if (turnoVigente.estado !== 'Abierto') setModoEdicion(false);
          armarListaAsistencia(precargados, turnoVigente);
        }
      } catch (err) {
        console.error('Error al inicializar turno:', err);
      } finally {
        setLoading(false);
      }
    }

    cargar();
  }, [idTurnoActual, armarListaAsistencia]);

  const totalAsignados = useMemo(() => interesados.filter((i) => i.asignado && !i.cancelo).length, [interesados]);

  const handleAgregarInteresado = (alumno) => {
    if (interesados.some((i) => i.id_alumno === alumno.id_alumno)) return;
    const nueva = [...interesados, { ...alumno, asignado: false, cancelo: false, motivo_cancelacion: '' }];
    nueva.sort((a, b) => a.horas_acumuladas - b.horas_acumuladas);
    setInteresados(nueva);
  };

  const handleAutoAsignar = () => {
    if (!modoEdicion || interesados.length === 0) return;
    let cupos = turno.cupos || 5;
    setInteresados(interesados.map((item) => {
      if (item.cancelo) return item;
      const asignar = cupos > 0;
      if (asignar) cupos--;
      return { ...item, asignado: asignar };
    }));
  };

  const handleToggleAsignado = (item) => {
    if (!modoEdicion || item.cancelo) return;
    if (item.asignado && turno.estado !== 'Abierto') {
      setAlumnoParaBaja(item);
      return;
    }
    const cuposMax = turno.cupos || 5;
    if (!item.asignado && totalAsignados >= cuposMax) {
      alert(`Límite de vacantes alcanzado (${cuposMax}/${cuposMax}).`);
      return;
    }
    setInteresados(interesados.map((i) => (i.id_alumno === item.id_alumno ? { ...i, asignado: !i.asignado } : i)));
  };

  const handleConfirmarBaja = ({ tipo, motivo }) => {
    if (!alumnoParaBaja) return;
    const esCancel = tipo === 'cancelacion';
    const nueva = interesados.map((i) => 
      i.id_alumno === alumnoParaBaja.id_alumno
        ? { ...i, asignado: false, cancelo: esCancel, motivo_cancelacion: esCancel ? motivo || 'Canceló turno' : '' }
        : i
    );
    nueva.sort((a, b) => (a.cancelo === b.cancelo ? a.horas_acumuladas - b.horas_acumuladas : a.cancelo ? 1 : -1));
    setInteresados(nueva);
    setAlumnoParaBaja(null);
  };

  const handleQuitarInteresado = (idAlumno) => {
    setInteresados(interesados.filter((i) => i.id_alumno !== idAlumno));
  };

  const handleGuardarTurno = async () => {
    if (totalAsignados === 0) {
      alert('Debes asignar al menos a 1 alumno titular para poder guardar el turno.');
      return;
    }
    try {
      setGuardando(true);
      await guardarAsignaciones(idTurnoActual, interesados, duracionTurno);
      setModoEdicion(false);
      setTurno((prev) => ({ ...prev, estado: 'Asignado' }));
      armarListaAsistencia(interesados);
      alert('Turno y asignaciones guardadas exitosamente en Supabase.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar asignaciones en Supabase.');
    } finally {
      setGuardando(false);
    }
  };

  const calcularHorasFila = (ini, fin, asistio) => {
    if (!asistio || ini === '--:--' || fin === '--:--') return 0.0;
    const [hI, mI] = ini.split(':').map(Number);
    const [hF, mF] = fin.split(':').map(Number);
    const totalMin = (hF * 60 + mF) - (hI * 60 + mI);
    return totalMin > 0 ? Number((totalMin / 60).toFixed(2)) : 0.0;
  };

  const handleCambioHoraAsistencia = (idAlumno, campo, valor) => {
    if (turno.estado === 'Cerrado') return;
    setAsistenciaRows((prev) =>
      prev.map((r) => {
        if (r.id_alumno !== idAlumno) return r;
        const e = campo === 'hora_entrada' ? valor : r.hora_entrada;
        const s = campo === 'hora_salida' ? valor : r.hora_salida;
        return { ...r, [campo]: valor, horas_calculadas: calcularHorasFila(e, s, r.asistio) };
      })
    );
  };

  const handleValidarHoraBlur = (idAlumno, campo) => {
    if (turno.estado === 'Cerrado') return;
    setAsistenciaRows((prev) =>
      prev.map((r) => {
        if (r.id_alumno !== idAlumno) return r;
        if (horaInicioBase !== '--:--' && r.hora_entrada < horaInicioBase) {
          alert(`La hora de entrada no puede ser anterior al inicio del bloque (${horaInicioBase}). Se restaurará el horario base.`);
          return { ...r, hora_entrada: horaInicioBase, horas_calculadas: calcularHorasFila(horaInicioBase, r.hora_salida, r.asistio) };
        }
        if (r.hora_entrada >= r.hora_salida) {
          alert(`Incoherencia horaria: la hora de entrada (${r.hora_entrada}) debe ser anterior a la salida (${r.hora_salida}).`);
          const e = campo === 'hora_entrada' ? horaInicioBase : r.hora_entrada;
          const s = campo === 'hora_salida' ? horaTerminoBase : r.hora_salida;
          return { ...r, hora_entrada: e, hora_salida: s, horas_calculadas: calcularHorasFila(e, s, r.asistio) };
        }
        return r;
      })
    );
  };

  const handleTogglePresenteAsistencia = (idAlumno) => {
    if (turno.estado === 'Cerrado') return;
    setAsistenciaRows((prev) =>
      prev.map((r) => (r.id_alumno === idAlumno ? { ...r, asistio: !r.asistio, horas_calculadas: calcularHorasFila(r.hora_entrada, r.hora_salida, !r.asistio) } : r))
    );
  };

  const handleSellarTurnoBD = async () => {
    try {
      setGuardando(true);
      for (const row of asistenciaRows) {
        await supabase
          .from('asignacion_turno')
          .update({
            horas_validadas: row.horas_calculadas,
            hora_entrada_real: row.asistio ? row.hora_entrada : null,
            hora_salida_real: row.asistio ? row.hora_salida : null,
            estado_asignacion: row.asistio ? 'Asignado' : 'Ausente',
          })
          .eq('id_turno', idTurnoActual)
          .eq('id_alumno', row.id_alumno);
      }
      await supabase.from('turno').update({ estado: 'Cerrado' }).eq('id_turno', idTurnoActual);
      setTurno((prev) => ({ ...prev, estado: 'Cerrado' }));
      setModoEdicion(false);
      alert('Turno cerrado y horas selladas inmutablemente.');
    } catch (err) {
      console.error(err);
      alert('Error al sellar el turno en Supabase.');
    } finally {
      setGuardando(false);
    }
  };

  return {
    turno,
    idTurnoActual,
    loading,
    guardando,
    vistaAsistencia,
    setVistaAsistencia,
    modoEdicion,
    setModoEdicion,
    totalAsignados,
    fechaStr,
    duracionTurno,
    horaInicioBase,
    horaTerminoBase,
    alumnosCatalogo,
    interesados,
    asistenciaRows,
    alumnoParaBaja,
    setAlumnoParaBaja,
    handleAgregarInteresado,
    handleAutoAsignar,
    handleToggleAsignado,
    handleConfirmarBaja,
    handleQuitarInteresado,
    handleGuardarTurno,
    handleCambioHoraAsistencia,
    handleValidarHoraBlur,
    handleTogglePresenteAsistencia,
    handleSellarTurnoBD,
  };
}