import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../config/supabase.js';
import {
  fetchAlumnos,
  fetchAsignacionesPorTurno,
  guardarAsignaciones,
  getTurnoById
} from '../../../services/turnosService.js';
import BuscadorCortafuegos from './BuscadorCortafuegos.jsx';
import TablaComparativa from './TablaComparativa.jsx';
import ModalCancelacion from '../views/ModalCancelacion.jsx';
import ListaAsistencia from '../views/ListaAsistencia.jsx';
import {
  ArrowLeft,
  Check,
  Save,
  Edit3,
  Loader2,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function DetalleTurno({ turno: turnoInicial, onVolver }) {
  const [turno, setTurno] = useState(turnoInicial || {});
  const [vistaAsistencia, setVistaAsistencia] = useState(turnoInicial?.estado === 'Cerrado');
  const [alumnosCatalogo, setAlumnosCatalogo] = useState([]);
  const [interesados, setInteresados] = useState([]);
  const [asistenciaRows, setAsistenciaRows] = useState([]);
  const [modoEdicion, setModoEdicion] = useState(turnoInicial?.estado === 'Abierto');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alumnoParaBaja, setAlumnoParaBaja] = useState(null);

  // Normalizador flexible de fechas
  const resolverFecha = useCallback((fechaISO, fechaStr, horaStr) => {
    if (fechaISO) {
      const d = new Date(fechaISO);
      if (!isNaN(d.getTime())) return d;
    }
    if (fechaStr && horaStr) {
      const d = new Date(`${fechaStr}T${horaStr.length === 5 ? horaStr + ':00' : horaStr}`);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }, []);

  const fInicio = useMemo(() => {
    return resolverFecha(turno.fecha_inicio, turno.fecha, turno.hora_inicio);
  }, [turno.fecha_inicio, turno.fecha, turno.hora_inicio, resolverFecha]);

  const fTermino = useMemo(() => {
    return resolverFecha(turno.fecha_termino, turno.fecha, turno.hora_termino);
  }, [turno.fecha_termino, turno.fecha, turno.hora_termino, resolverFecha]);

  const duracionTurno = useMemo(() => {
    if (!fInicio || !fTermino) return 0;
    const diff = (fTermino - fInicio) / (1000 * 60 * 60);
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  }, [fInicio, fTermino]);

  // Forzar formato de 24 horas (HH:mm) para que el <input type="time" /> lo acepte sin error
  const horaInicioBase = useMemo(() => {
    if (!fInicio || isNaN(fInicio.getTime())) return '09:00';
    const h = String(fInicio.getHours()).padStart(2, '0');
    const m = String(fInicio.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }, [fInicio]);

  const horaTerminoBase = useMemo(() => {
    if (!fTermino || isNaN(fTermino.getTime())) return '11:00';
    const h = String(fTermino.getHours()).padStart(2, '0');
    const m = String(fTermino.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }, [fTermino]);

  const fechaStr = useMemo(() => {
    return !fInicio || isNaN(fInicio.getTime())
      ? 'Fecha no definida'
      : fInicio.toLocaleDateString('es-CL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
  }, [fInicio]);

  const idTurnoActual = turno.id_turno || turnoInicial?.id_turno;

  useEffect(() => {
    if (idTurnoActual) {
      inicializarDatos();
    } else {
      setLoading(false);
    }
  }, [idTurnoActual]);

  async function inicializarDatos() {
    try {
      setLoading(true);

      // Si los datos del turno vinieron incompletos, consultamos el registro a Supabase
      let turnoVigente = turno;
      if (!turno.fecha_inicio || !turno.cupos) {
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
          };
        });

        // Orden de equidad: menor a mayor horas
        precargados.sort((a, b) => {
          if (a.cancelo && !b.cancelo) return 1;
          if (!a.cancelo && b.cancelo) return -1;
          return a.horas_acumuladas - b.horas_acumuladas;
        });

        setInteresados(precargados);
        if (turnoVigente.estado !== 'Abierto') {
          setModoEdicion(false);
        }
        armarListaAsistencia(precargados, turnoVigente);
      }
    } catch (err) {
      console.error('Error al inicializar turno:', err);
    } finally {
      setLoading(false);
    }
  }

  function armarListaAsistencia(candidatos, turnoActual = turno) {
    const asignados = candidatos.filter((c) => c.asignado && !c.cancelo);
    setAsistenciaRows(
      asignados.map((a) => ({
        id_alumno: a.id_alumno,
        nombre: a.nombre,
        rut: a.rut,
        asistio: a.horas_validadas > 0 || turnoActual.estado !== 'Cerrado',
        hora_entrada: horaInicioBase,
        hora_salida: horaTerminoBase,
        horas_calculadas: a.horas_validadas > 0 ? Number(a.horas_validadas) : duracionTurno,
      }))
    );
  }

  const totalAsignados = useMemo(() => {
    return interesados.filter((i) => i.asignado && !i.cancelo).length;
  }, [interesados]);

  function handleAgregarInteresado(alumno) {
    if (interesados.some((i) => i.id_alumno === alumno.id_alumno)) return;

    const nuevaLista = [
      ...interesados,
      {
        id_alumno: alumno.id_alumno,
        nombre: alumno.nombre,
        rut: alumno.rut,
        correo: alumno.correo,
        horas_acumuladas: alumno.horas_acumuladas || 0,
        asignado: false,
        cancelo: false,
        motivo_cancelacion: '',
      },
    ];

    nuevaLista.sort((a, b) => {
      if (a.cancelo && !b.cancelo) return 1;
      if (!a.cancelo && b.cancelo) return -1;
      return a.horas_acumuladas - b.horas_acumuladas;
    });

    setInteresados(nuevaLista);
  }

  function handleAutoAsignar() {
    if (!modoEdicion || interesados.length === 0) return;
    let cuposRestantes = turno.cupos || 5;

    const actualizados = interesados.map((item) => {
      if (item.cancelo) return item;
      const asignar = cuposRestantes > 0;
      if (asignar) cuposRestantes -= 1;
      return { ...item, asignado: asignar };
    });

    setInteresados(actualizados);
  }

  function handleToggleAsignado(item) {
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

    setInteresados(
      interesados.map((i) => (i.id_alumno === item.id_alumno ? { ...i, asignado: !i.asignado } : i))
    );
  }

  function handleConfirmarBaja({ tipo, motivo }) {
    if (!alumnoParaBaja) return;

    let nuevaLista = interesados.map((i) => {
      if (i.id_alumno !== alumnoParaBaja.id_alumno) return i;
      if (tipo === 'cancelacion') {
        return {
          ...i,
          asignado: false,
          cancelo: true,
          motivo_cancelacion: motivo || 'Canceló turno',
        };
      } else {
        return {
          ...i,
          asignado: false,
          cancelo: false,
          motivo_cancelacion: '',
        };
      }
    });

    nuevaLista.sort((a, b) => {
      if (a.cancelo && !b.cancelo) return 1;
      if (!a.cancelo && b.cancelo) return -1;
      return a.horas_acumuladas - b.horas_acumuladas;
    });

    setInteresados(nuevaLista);
    setAlumnoParaBaja(null);
  }

  function handleQuitarInteresado(idAlumno) {
    setInteresados(interesados.filter((i) => i.id_alumno !== idAlumno));
  }

  async function handleGuardarTurno() {
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
  }

  function calcularHorasFila(entrada, salida, asistio) {
    if (!asistio) return 0.0;
    const [hIni, mIni] = entrada.split(':').map(Number);
    const [hFin, mFin] = salida.split(':').map(Number);
    const totalMin = hFin * 60 + mFin - (hIni * 60 + mIni);
    return totalMin > 0 ? Number((totalMin / 60).toFixed(2)) : 0.0;
  }

  function handleCambioHoraAsistencia(idAlumno, campo, valor) {
    if (turno.estado === 'Cerrado') return;

    setAsistenciaRows((prev) =>
      prev.map((row) => {
        if (row.id_alumno !== idAlumno) return row;

        const nuevaEntrada = campo === 'hora_entrada' ? valor : row.hora_entrada;
        const nuevaSalida = campo === 'hora_salida' ? valor : row.hora_salida;

        const [hIni, mIni] = (nuevaEntrada || '00:00').split(':').map(Number);
        const [hFin, mFin] = (nuevaSalida || '00:00').split(':').map(Number);
        const totalMin = (hFin * 60 + mFin) - (hIni * 60 + mIni);

        // Si la salida es mayor a la entrada, calcula fracción; si no, marca 0 temporalmente
        const hrs = (row.asistio && totalMin > 0) 
          ? Number((totalMin / 60).toFixed(2)) 
          : 0.0;

        return { 
          ...row, 
          [campo]: valor, 
          horas_calculadas: hrs,
          error_horario: null // Se limpia mientras tipea
        };
      })
    );
  }

  // 2. HU14: Validación reactiva al terminar de poner la hora (onBlur)
  function handleValidarHoraBlur(idAlumno, campo) {
    if (turno.estado === 'Cerrado') return;

    setAsistenciaRows((prev) =>
      prev.map((row) => {
        if (row.id_alumno !== idAlumno) return row;

        const entrada = row.hora_entrada;
        const salida = row.hora_salida;

        // Regla A: La entrada no puede ser menor al inicio del bloque operativo
        if (entrada < horaInicioBase) {
          alert(`La hora de entrada no puede ser anterior al inicio del bloque (${horaInicioBase}). Se restaurará el horario base.`);
          const hrs = calcularHorasFila(horaInicioBase, salida, row.asistio);
          return {
            ...row,
            hora_entrada: horaInicioBase,
            horas_calculadas: hrs
          };
        }

        // Regla B: La entrada debe ser estrictamente menor a la salida
        if (entrada >= salida) {
          alert(`La hora de entrada (${entrada}) no puede ser igual o superior a la salida (${salida}). Se restaurará el horario válido.`);
          
          if (campo === 'hora_salida') {
            // Si estaba editando la salida y la dejó inválida, la restauramos a la hora término base
            const hrs = calcularHorasFila(entrada, horaTerminoBase, row.asistio);
            return {
              ...row,
              hora_salida: horaTerminoBase,
              horas_calculadas: hrs
            };
          } else {
            // Si estaba editando la entrada y la dejó superior a la salida, la restauramos al inicio
            const hrs = calcularHorasFila(horaInicioBase, salida, row.asistio);
            return {
              ...row,
              hora_entrada: horaInicioBase,
              horas_calculadas: hrs
            };
          }
        }

        return row;
      })
    );
  }

  function handleTogglePresenteAsistencia(idAlumno) {
    if (turno.estado === 'Cerrado') return;
    setAsistenciaRows((prev) =>
      prev.map((row) => {
        if (row.id_alumno !== idAlumno) return row;
        const nuevoAsistio = !row.asistio;
        return {
          ...row,
          asistio: nuevoAsistio,
          horas_calculadas: calcularHorasFila(row.hora_entrada, row.hora_salida, nuevoAsistio),
        };
      })
    );
  }

  async function handleSellarTurnoBD() {
    try {
      setGuardando(true);
      for (const row of asistenciaRows) {
        await supabase
          .from('asignacion_turno')
          .update({
            horas_validadas: row.horas_calculadas,
            estado_asignacion: row.asistio ? 'Asignado' : 'Ausente',
          })
          .eq('id_turno', idTurnoActual)
          .eq('id_alumno', row.id_alumno);
      }

      await supabase
        .from('turno')
        .update({ estado: 'Cerrado' })
        .eq('id_turno', idTurnoActual);

      setTurno((prev) => ({ ...prev, estado: 'Cerrado' }));
      setModoEdicion(false);
      alert('Turno cerrado y horas selladas inmutablemente.');
    } catch (err) {
      console.error(err);
      alert('Error al sellar el turno en Supabase.');
    } finally {
      setGuardando(false);
    }
  }

  const cuposTotales = turno.cupos || 5;
  const botonGuardarDeshabilitado = guardando || (modoEdicion && totalAsignados === 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#43b0c4]" />
        <p className="text-sm font-medium">Cargando datos del turno...</p>
      </div>
    );
  }

  if (!idTurnoActual) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white border border-slate-200 rounded-xl my-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No se ha seleccionado ningún turno</h2>
        <p className="text-sm text-slate-500 mb-6">Regresa a la lista de turnos para seleccionar uno válido.</p>
        <button
          onClick={onVolver}
          className="px-4 py-2 bg-[#06113C] text-white rounded-lg text-sm font-medium hover:bg-[#0a1a5c]"
        >
          ← Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      {/* Botón Volver */}
      <button
        onClick={onVolver}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#06113C] font-semibold mb-6 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        ← Volver a turnos
      </button>

      {/* Header Metadata */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#06113C]">{turno.nombre_evento || 'Turno Operativo'}</h1>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                turno.estado === 'Cerrado'
                  ? 'bg-slate-200 text-slate-700'
                  : totalAsignados === cuposTotales
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {turno.estado === 'Cerrado' ? 'Sellado / Inmutable' : `${totalAsignados}/${cuposTotales} asignados`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 mt-2">
            <span className="capitalize">{fechaStr}</span>
            <span>•</span>
            <span>
              {horaInicioBase} a {horaTerminoBase} ({duracionTurno} horas)
            </span>
            <span>•</span>
            <span className="font-mono">ID #{idTurnoActual}</span>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex flex-wrap items-center gap-2">
          {!vistaAsistencia ? (
            <>
              {turno.estado !== 'Cerrado' && (
                <>
                  <button
                    onClick={handleAutoAsignar}
                    disabled={!modoEdicion || interesados.length === 0}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    ✓ Auto-asignar con menos horas
                  </button>

                  <button
                    onClick={modoEdicion ? handleGuardarTurno : () => setModoEdicion(true)}
                    disabled={botonGuardarDeshabilitado}
                    className={`px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 ${
                      botonGuardarDeshabilitado
                        ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500'
                        : modoEdicion
                        ? 'bg-[#06113C] hover:bg-[#0a1a5c] text-white cursor-pointer'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    {guardando ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#43b0c4]" />
                    ) : modoEdicion ? (
                      <Save className="w-4 h-4 text-[#43b0c4]" />
                    ) : (
                      <Edit3 className="w-4 h-4 text-slate-500" />
                    )}
                    {modoEdicion ? 'Guardar turno' : '✎ Editar turno'}
                  </button>
                </>
              )}

              {turno.estado === 'Asignado' && (
                <button
                  onClick={() => {
                    armarListaAsistencia(interesados);
                    setVistaAsistencia(true);
                  }}
                  className="px-4 py-2.5 bg-[#43b0c4] hover:bg-[#389aa9] text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  Abrir lista de asistencia
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setVistaAsistencia(false)}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              ← Volver a Asignación
            </button>
          )}
        </div>
      </div>

      {/* Renderizado Condicional */}
      {!vistaAsistencia ? (
        <>
          {modoEdicion && turno.estado !== 'Cerrado' && fInicio && fTermino && (
            <BuscadorCortafuegos
              alumnosCatalogo={alumnosCatalogo}
              interesados={interesados}
              duracionTurno={duracionTurno}
              fInicio={fInicio}
              fTermino={fTermino}
              idTurno={idTurnoActual}
              onAgregar={handleAgregarInteresado}
            />
          )}

          <TablaComparativa
            interesados={interesados}
            modoEdicion={modoEdicion}
            estadoTurno={turno.estado}
            onToggleAsignado={handleToggleAsignado}
            onQuitar={handleQuitarInteresado}
          />
        </>
      ) : (
        <ListaAsistencia
          turno={turno}
          asistenciaRows={asistenciaRows}
          onCambioHora={handleCambioHoraAsistencia}
          onValidarHora={handleValidarHoraBlur}
          onTogglePresente={handleTogglePresenteAsistencia}
          onSellarTurno={handleSellarTurnoBD}
          guardando={guardando}
        />
      )}

      {alumnoParaBaja && (
        <ModalCancelacion
          alumno={alumnoParaBaja}
          onConfirmar={handleConfirmarBaja}
          onCerrar={() => setAlumnoParaBaja(null)}
        />
      )}
    </div>
  );
}