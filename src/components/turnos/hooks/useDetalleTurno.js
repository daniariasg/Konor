import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../config/supabase.js';

const extraerHora = (val) => {
  if (!val) return '--:--';
  const m = String(val).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : (/^\d{2}:\d{2}/.test(String(val)) ? String(val).slice(0, 5) : '--:--');
};

const extraerFecha = (val) => {
  if (!val) return '--/--/----';
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '--/--/----';
};

const calcularDuracion = (ini, fin) => {
  if (!ini || !fin || ini === '--:--' || fin === '--:--') return 0;
  const [h1, m1] = ini.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const min = (h2 * 60 + m2) - (h1 * 60 + m1);
  return min > 0 ? Number((min / 60).toFixed(1)) : 0;
};

const horaAMinutos = (hora) => {
  const [horas, minutos] = String(hora || '').split(':').map(Number);
  return horas * 60 + minutos;
};

const calcularHorasReales = (entrada, salida) => {
  let minutos = horaAMinutos(salida) - horaAMinutos(entrada);
  if (minutos < 0) minutos += 24 * 60;
  return minutos > 0 ? Number((minutos / 60).toFixed(2)) : 0;
};

const obtenerFechaLocal = () => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const parte = (tipo) => partes.find((p) => p.type === tipo)?.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
};

export function useDetalleTurno(input) {
  const turno = input?.id_turno ? input : (input?.turno || {});
  const idTurno = turno?.id_turno;

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [catalogoAlumnos, setCatalogoAlumnos] = useState([]);
  const [interesados, setInteresados] = useState([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [modoEdicion, setModoEdicion] = useState(true);
  const [turnoYaGuardado, setTurnoYaGuardado] = useState(false);
  const [alumnoParaBaja, setAlumnoParaBaja] = useState(null);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [estadoTurno, setEstadoTurno] = useState(turno?.estado || '');
  const [topeHorasMensual, setTopeHorasMensual] = useState(60);

  const storageKey = idTurno ? `konor_borrador_turno_${idTurno}` : null;

  const cuposTotales = Number(turno?.cupos) > 0 ? Number(turno.cupos) : 1;
  const fechaStr = extraerFecha(turno?.fecha_inicio || turno?.fecha);
  const horaInicioBase = extraerHora(turno?.fecha_inicio || turno?.hora_inicio);
  const horaTerminoBase = extraerHora(turno?.fecha_termino || turno?.hora_termino);
  const duracionTurno = calcularDuracion(horaInicioBase, horaTerminoBase);

  // Helper para guardar en borrador local cada vez que cambien los interesados
  const actualizarInteresadosConBorrador = (actualizador) => {
    setInteresados((prev) => {
      const nuevaLista = typeof actualizador === 'function' ? actualizador(prev) : actualizador;
      if (storageKey && modoEdicion && estadoTurno !== 'Cerrado') {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(nuevaLista));
        } catch (e) {
          console.warn('No se pudo guardar el borrador en sessionStorage', e);
        }
      }
      return nuevaLista;
    });
  };

  const cargarDatos = useCallback(async () => {
    if (!idTurno) return;
    try {
      setLoading(true);

      const ahora = new Date();
      const año = ahora.getFullYear();
      const mes = ahora.getMonth();
      const primerDiaUTC = new Date(Date.UTC(año, mes, 1, 0, 0, 0)).toISOString();
      const ultimoDiaUTC = new Date(Date.UTC(año, mes + 1, 0, 23, 59, 59, 999)).toISOString();

      // CONSULTA CONSOLIDADA: Catálogo, Turnos Cerrados, Ajustes Ledger y Configuración
      const [resAlumnos, resAsig, resLedger, resConfig] = await Promise.all([
        supabase
          .from('alumno')
          .select('id_alumno, nombre, rut, correo, jornada, activo')
          .order('nombre', { ascending: true }),

        supabase
          .from('asignacion_turno')
          .select('id_alumno, horas_validadas, turno!inner(fecha_inicio)')
          .in('estado_asignacion', ['Asistió', 'Ausente'])
          .gte('turno.fecha_inicio', primerDiaUTC)
          .lte('turno.fecha_inicio', ultimoDiaUTC),

        supabase
          .from('ajuste_ledger')
          .select('id_alumno, delta_horas, fecha_registro')
          .gte('fecha_registro', primerDiaUTC)
          .lte('fecha_registro', ultimoDiaUTC),

        supabase
          .from('configuracion_sistema')
          .select('tope_horas_mensual')
          .limit(1)
          .maybeSingle()
      ]);

      if (resConfig.data?.tope_horas_mensual) {
        setTopeHorasMensual(Number(resConfig.data.tope_horas_mensual));
      }

      // Mapa de horas de turnos
      const horasMap = (resAsig.data || []).reduce((acc, curr) => {
        acc[curr.id_alumno] = (acc[curr.id_alumno] || 0) + (parseFloat(curr.horas_validadas) || 0);
        return acc;
      }, {});

      // Suma algebraica con asientos del Ledger
      (resLedger.data || []).forEach((adj) => {
        const id = adj.id_alumno;
        horasMap[id] = (horasMap[id] || 0) + (parseFloat(adj.delta_horas) || 0);
      });

      const catalogo = (resAlumnos.data || []).map((al) => ({
        ...al,
        horas_acumuladas: Math.max(0, horasMap[al.id_alumno] || 0)
      }));
      setCatalogoAlumnos(catalogo);

      // 1. Verificar si existe borrador temporal no guardado en la sesión
      const borradorGuardado = storageKey ? sessionStorage.getItem(storageKey) : null;

      const { data: asignacionesBD } = await supabase
        .from('asignacion_turno')
        .select(`
          id_asignacion, id_turno, id_alumno, estado_asignacion,
          motivo_cancelacion, horas_validadas,
          hora_entrada_real, hora_salida_real, fecha_cierre
        `)
        .eq('id_turno', idTurno);

      const existeEnBD = asignacionesBD && asignacionesBD.length > 0;

      if (borradorGuardado) {
        try {
          const parsed = JSON.parse(borradorGuardado);
          // Actualizar las horas acumuladas del borrador con las horas reales sincronizadas
          const borradorSincronizado = parsed.map((item) => {
            const alumnoReal = catalogo.find((c) => String(c.id_alumno) === String(item.id_alumno));
            return {
              ...item,
              horas_acumuladas: alumnoReal?.horas_acumuladas ?? item.horas_acumuladas
            };
          });

          setInteresados(borradorSincronizado);
          setTurnoYaGuardado(existeEnBD);
          setModoEdicion(true);
          return;
        } catch (e) {
          console.error('Error parseando borrador local:', e);
        }
      }

      // 2. Si no hay borrador, cargar directamente de la base de datos
      if (existeEnBD) {
        const mapeados = asignacionesBD.map((asig) => {
          const alumnoReal = catalogo.find((c) => String(c.id_alumno) === String(asig.id_alumno));
          const cancelo = asig.estado_asignacion === 'Canceló turno';
          const asignadoOriginal = ['Asignado', 'Asistió', 'Ausente'].includes(
            asig.estado_asignacion
          );
          const asistenciaActiva = asig.estado_asignacion !== 'Ausente' && !cancelo;

          return {
            id_alumno: asig.id_alumno,
            id_asignacion: asig.id_asignacion,
            nombre: alumnoReal?.nombre || 'Sin nombre',
            rut: alumnoReal?.rut || '',
            horas_acumuladas: alumnoReal?.horas_acumuladas || 0,
            asignado: asignadoOriginal,
            asignadoOriginal,
            asistenciaActiva,
            hora_entrada_real: asig.hora_entrada_real ? String(asig.hora_entrada_real).slice(0, 5) : horaInicioBase,
            hora_salida_real: asig.hora_salida_real ? String(asig.hora_salida_real).slice(0, 5) : horaTerminoBase,
            horas_validadas: Number(asig.horas_validadas) || 0,
            hora_entrada_borrador: null,
            hora_salida_borrador: null,
            cancelo,
            motivo_cancelacion: asig.motivo_cancelacion || '',
            estado_asignacion: asig.estado_asignacion || 'En espera'
          };
        });

        mapeados.sort((a, b) => {
          if (a.cancelo && !b.cancelo) return 1;
          if (!a.cancelo && b.cancelo) return -1;
          return (a.horas_acumuladas || 0) - (b.horas_acumuladas || 0);
        });

        setInteresados(mapeados);
        setTurnoYaGuardado(true);
        setModoEdicion(false);
      } else {
        setInteresados([]);
        setTurnoYaGuardado(false);
        setModoEdicion(true);
      }
    } catch (err) {
      console.error('Error cargando turno:', err);
    } finally {
      setLoading(false);
    }
  }, [idTurno, horaInicioBase, horaTerminoBase, storageKey]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    setEstadoTurno(turno?.estado || '');
  }, [idTurno, turno?.estado]);

  const totalAsignados = useMemo(
    () => interesados.filter((i) => i.asignado && !i.cancelo).length,
    [interesados]
  );

  const resultadosBusqueda = useMemo(() => {
    const q = terminoBusqueda.trim().toLowerCase();
    if (q.length < 1) return [];

    return catalogoAlumnos
      .filter((al) => {
        const coincide = (al.nombre || '').toLowerCase().includes(q) || (al.rut || '').toLowerCase().includes(q);
        const yaEnLista = interesados.some((i) => String(i.id_alumno) === String(al.id_alumno));
        return coincide && !yaEnLista;
      })
      .map((al) => ({
        ...al,
        supera_limite: (al.horas_acumuladas + duracionTurno) > topeHorasMensual
      }))
      .slice(0, 8);
  }, [terminoBusqueda, catalogoAlumnos, interesados, duracionTurno, topeHorasMensual]);

  const handleAgregarInteresado = (al) => {
    if (!modoEdicion || estadoTurno === 'Cerrado') return;
    if (interesados.some((i) => String(i.id_alumno) === String(al.id_alumno))) return;

    const nuevo = {
      id_alumno: al.id_alumno,
      id_asignacion: null,
      nombre: al.nombre,
      rut: al.rut,
      horas_acumuladas: Number(al.horas_acumuladas) || 0,
      asignado: false,
      asignadoOriginal: false,
      asistenciaActiva: true,
      hora_entrada_real: horaInicioBase,
      hora_salida_real: horaTerminoBase,
      hora_entrada_borrador: null,
      hora_salida_borrador: null,
      horas_validadas: 0,
      cancelo: false,
      motivo_cancelacion: '',
      estado_asignacion: 'En espera'
    };

    actualizarInteresadosConBorrador((prev) => {
      const lista = [...prev, nuevo];
      lista.sort((a, b) => {
        if (a.cancelo && !b.cancelo) return 1;
        if (!a.cancelo && b.cancelo) return -1;
        return (a.horas_acumuladas || 0) - (b.horas_acumuladas || 0);
      });
      return lista;
    });

    setTerminoBusqueda('');
  };

  const handleQuitarInteresado = (idAlumno) => {
    if (!modoEdicion || estadoTurno === 'Cerrado') return;

    const target = interesados.find(
      (alumno) => String(alumno.id_alumno) === String(idAlumno)
    );

    if (!target) return;

    if (turnoYaGuardado && target.asignadoOriginal) {
      setAlumnoParaBaja(target);
      return;
    }

    actualizarInteresadosConBorrador((actuales) =>
      actuales.filter((alumno) => String(alumno.id_alumno) !== String(idAlumno))
    );
  };

  const handleToggleAsignado = (idAlumno) => {
    if (!modoEdicion || estadoTurno === 'Cerrado') return;
    const target = interesados.find((i) => String(i.id_alumno) === String(idAlumno));
    if (!target || target.cancelo) return;

    if (target.asignado && turnoYaGuardado && target.asignadoOriginal) {
      setAlumnoParaBaja(target);  
      return;
    }
    if (!target.asignado && totalAsignados >= cuposTotales) return;

    actualizarInteresadosConBorrador((prev) =>
      prev.map((i) =>
        String(i.id_alumno) === String(idAlumno)
          ? { 
              ...i, 
              asignado: !i.asignado, 
              estado_asignacion: !i.asignado ? 'Asignado' : 'En espera',
              asistenciaActiva: true,
              hora_entrada_real: i.hora_entrada_real || horaInicioBase,
              hora_salida_real: i.hora_salida_real || horaTerminoBase
            }
          : i
      )
    );
  };

  const handleAutoAsignar = () => {
    if (!modoEdicion || estadoTurno === 'Cerrado') return;
    let libres = cuposTotales;
    const actualizados = [...interesados]
      .sort((a, b) => {
        if (a.cancelo && !b.cancelo) return 1;
        if (!a.cancelo && b.cancelo) return -1;
        return (a.horas_acumuladas || 0) - (b.horas_acumuladas || 0);
      })
      .map((al) => {
        if (al.cancelo) return al;
        if (libres > 0) {
          libres--;
          return {
            ...al,
            asignado: true,
            estado_asignacion: 'Asignado',
            asistenciaActiva: true,
            hora_entrada_real: al.hora_entrada_real || horaInicioBase,
            hora_salida_real: al.hora_salida_real || horaTerminoBase
          };
        }
        return { ...al, asignado: false, estado_asignacion: 'En espera' };
      });

    actualizarInteresadosConBorrador(actualizados);
  };

  const handleConfirmarBaja = async ({ tipo, motivo }) => {
    if (!alumnoParaBaja || !idTurno) return;

    const esCancelacion = tipo === 'cancelacion';
    const motivoFinal = esCancelacion ? (motivo || 'Canceló turno') : null;

    try {
      setGuardando(true);

      const { error } = await supabase.rpc('registrar_baja_turno', {
        p_id_turno: Number(idTurno),
        p_id_alumno: Number(alumnoParaBaja.id_alumno),
        p_tipo: tipo,
        p_motivo: motivoFinal
      });

      if (error) throw error;

      actualizarInteresadosConBorrador((prev) =>
        prev.map((item) =>
          String(item.id_alumno) === String(alumnoParaBaja.id_alumno)
            ? {
                ...item,
                asignado: false,
                asignadoOriginal: false,
                cancelo: esCancelacion,
                motivo_cancelacion: motivoFinal || '',
                estado_asignacion: esCancelacion ? 'Canceló turno' : 'En espera'
              }
            : item
        )
      );

      setAlumnoParaBaja(null);
    } catch (err) {
      console.error('Error guardando la baja:', err);
    } finally {
      setGuardando(false);
    }
  };

  // PERSISTENCIA DEFINITIVA: Guarda en Supabase y destruye el borrador local
  const handleGuardarTurno = async () => {
    if (!idTurno) return;
    try {
      setGuardando(true);
      const registros = interesados.map((item) => {
        const cancelo = item.cancelo || item.estado_asignacion === 'Canceló turno';
        const asignado = item.asignado || item.estado_asignacion === 'Asignado';
        const estado = cancelo ? 'Canceló turno' : asignado ? 'Asignado' : 'En espera';
        return {
          id_turno: Number(idTurno),
          id_alumno: Number(item.id_alumno),
          estado_asignacion: estado,
          motivo_cancelacion: cancelo ? (item.motivo_cancelacion || 'Canceló turno') : null,
          horas_validadas: 0
        };
      });

      if (registros.length > 0) {
        const { error } = await supabase
          .from('asignacion_turno')
          .upsert(registros, { onConflict: 'id_turno,id_alumno' });
        if (error) throw error;
      }

      await supabase.from('turno').update({ estado: 'Asignado' }).eq('id_turno', idTurno);
      
      if (storageKey) {
        sessionStorage.removeItem(storageKey);
      }

      setTurnoYaGuardado(true);
      setModoEdicion(false);
      await cargarDatos();
    } catch (err) {
      console.error('Error guardando turno:', err);
    } finally {
      setGuardando(false);
    }
  };

  const fechaEvento = String(turno?.fecha_inicio || '').slice(0, 10);
  const hoyLocal = obtenerFechaLocal();

  const puedeAbrirLista =
    fechaEvento === hoyLocal &&
    estadoTurno !== 'Cerrado';

  const modoEjecucion = listaAbierta || estadoTurno === 'Cerrado';

  const asistenciaRows = useMemo(() => {
    return interesados
      .filter((al) => (al.asignadoOriginal || al.asignado) && !al.cancelo)
      .map((al) => {
        const entrada = al.hora_entrada_borrador ?? al.hora_entrada_real ?? horaInicioBase;
        const salida = al.hora_salida_borrador ?? al.hora_salida_real ?? horaTerminoBase;
        const estaPresente = al.asistenciaActiva !== false;

        return {
          id_alumno: al.id_alumno,
          id_asignacion: al.id_asignacion,
          nombre: al.nombre,
          rut: al.rut,
          asistio: estaPresente,
          hora_entrada: entrada,
          hora_salida: salida,
          horas_calculadas: estaPresente
            ? calcularHorasReales(entrada, salida).toFixed(2)
            : '0.00'
        };
      });
  }, [interesados, horaInicioBase, horaTerminoBase]);

  const registrarAuditoria = async (registro) => {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!data.user) throw new Error('Debes iniciar sesión para registrar cambios.');

    const { error } = await supabase.from('asistencia_auditoria').insert({
      ...registro,
      id_turno: Number(idTurno),
      usuario_id: data.user.id
    });

    if (error) throw error;
  };

  const handleAbrirLista = () => {
    actualizarInteresadosConBorrador((prev) =>
      prev.map((al) => {
        const esTitular = (al.asignado || al.asignadoOriginal) && !al.cancelo;
        if (!esTitular) return al;

        return {
          ...al,
          asistenciaActiva: al.asistenciaActiva ?? true,
          hora_entrada_real: al.hora_entrada_real && al.hora_entrada_real !== '--:--'
            ? al.hora_entrada_real
            : horaInicioBase,
          hora_salida_real: al.hora_salida_real && al.hora_salida_real !== '--:--'
            ? al.hora_salida_real
            : horaTerminoBase,
          horas_validadas: al.horas_validadas || duracionTurno
        };
      })
    );

    setListaAbierta(true);
  };

  const handleCambioHora = (idAlumno, campo, valor) => {
    const campoBorrador = campo === 'hora_entrada'
      ? 'hora_entrada_borrador'
      : 'hora_salida_borrador';

    setInteresados((prev) =>
      prev.map((al) =>
        String(al.id_alumno) === String(idAlumno)
          ? { ...al, [campoBorrador]: valor }
          : al
      )
    );
  };

  const handleValidarHora = async (idAlumno, campo) => {
    const al = interesados.find((i) => String(i.id_alumno) === String(idAlumno));
    if (!al) return;

    const entradaEditada = campo === 'hora_entrada';
    const campoReal = entradaEditada ? 'hora_entrada_real' : 'hora_salida_real';
    const campoBorrador = entradaEditada
      ? 'hora_entrada_borrador'
      : 'hora_salida_borrador';
    const nuevoValor = al[campoBorrador];
    if (nuevoValor == null) return;

    const formatoValido = /^([01]\d|2[0-3]):[0-5]\d$/;
    const descartar = () => setInteresados((prev) =>
      prev.map((i) =>
        String(i.id_alumno) === String(idAlumno)
          ? { ...i, [campoBorrador]: null }
          : i
      )
    );

    if (!formatoValido.test(nuevoValor)) {
      descartar();
      return;
    }

    const entrada = entradaEditada ? nuevoValor : al.hora_entrada_real;
    const salida = entradaEditada ? al.hora_salida_real : nuevoValor;

    const horas = calcularHorasReales(entrada, salida);
    if (horas <= 0) {
      descartar();
      return;
    }

    try {
      if (al.id_asignacion && al[campoReal] !== nuevoValor) {
        await registrarAuditoria({
          id_alumno: Number(idAlumno),
          id_asignacion: al.id_asignacion,
          tipo_evento: 'cambio_hora',
          campo: campoReal,
          valor_anterior: al[campoReal],
          valor_nuevo: nuevoValor
        });
      }

      setInteresados((prev) =>
        prev.map((i) =>
          String(i.id_alumno) === String(idAlumno)
            ? {
                ...i,
                [campoReal]: nuevoValor,
                [campoBorrador]: null,
                horas_validadas: i.asistenciaActiva ? horas : 0
              }
            : i
        )
      );
    } catch (err) {
      console.error('Error registrando cambio horario:', err);
    }
  };

  const handleTogglePresente = async (idAlumno) => {
    const al = interesados.find((i) => String(i.id_alumno) === String(idAlumno));
    if (!al || estadoTurno === 'Cerrado') return;

    const asistio = !al.asistenciaActiva;

    try {
      if (al.id_asignacion) {
        await registrarAuditoria({
          id_alumno: Number(idAlumno),
          id_asignacion: al.id_asignacion,
          tipo_evento: 'asistencia',
          campo: 'asistio',
          valor_anterior: al.asistenciaActiva,
          valor_nuevo: asistio
        });
      }

      setInteresados((prev) =>
        prev.map((i) =>
          String(i.id_alumno) === String(idAlumno)
            ? {
                ...i,
                asistenciaActiva: asistio,
                horas_validadas: asistio
                  ? calcularHorasReales(i.hora_entrada_real, i.hora_salida_real)
                  : 0
              }
            : i
        )
      );
    } catch (err) {
      console.error('Error en cambio de asistencia:', err);
    }
  };

  const handleCerrarLista = async () => {
    if (estadoTurno === 'Cerrado') return;

    const titulares = interesados.filter((al) => (al.asignadoOriginal || al.asignado) && !al.cancelo);

    try {
      setGuardando(true);

      for (const al of titulares) {
        const horas = al.asistenciaActiva
          ? calcularHorasReales(al.hora_entrada_real, al.hora_salida_real)
          : 0;

        const cambios = {
          estado_asignacion: al.asistenciaActiva ? 'Asistió' : 'Ausente',
          hora_entrada_real: al.asistenciaActiva ? al.hora_entrada_real : null,
          hora_salida_real: al.asistenciaActiva ? al.hora_salida_real : null,
          horas_validadas: horas,
          fecha_cierre: new Date().toISOString()
        };

        const { error } = await supabase
          .from('asignacion_turno')
          .update(cambios)
          .eq('id_asignacion', al.id_asignacion);

        if (error) throw error;

        await registrarAuditoria({
          id_alumno: Number(al.id_alumno),
          id_asignacion: al.id_asignacion,
          tipo_evento: 'cierre_lista',
          campo: 'asistencia',
          valor_anterior: { asistio: al.asistenciaActiva },
          valor_nuevo: { asistio: al.asistenciaActiva, horas_validadas: horas }
        });
      }

      const { error } = await supabase
        .from('turno')
        .update({ estado: 'Cerrado' })
        .eq('id_turno', idTurno);

      if (error) throw error;

      if (storageKey) {
        sessionStorage.removeItem(storageKey);
      }

      setEstadoTurno('Cerrado');
      setListaAbierta(false);
    } catch (err) {
      console.error('Error al cerrar el turno:', err);
    } finally {
      setGuardando(false);
    }
  };

  return {
    turno,
    idTurnoActual: idTurno,
    loading,
    cargando: loading,
    guardando,
    modoEdicion,
    setModoEdicion,
    cuposTotales,
    fechaStr,
    fechaFormateada: fechaStr,
    horaInicioBase,
    horaTerminoBase,
    duracionTurno,
    interesados,
    totalAsignados,
    terminoBusqueda,
    setTerminoBusqueda,
    resultadosBusqueda,
    alumnoParaBaja,
    setAlumnoParaBaja,
    handleAgregarInteresado,
    handleSeleccionarEnBuscador: handleAgregarInteresado,
    handleQuitarInteresado,
    handleRemoverInteresado: handleQuitarInteresado,
    handleToggleAsignado,
    handleAutoAsignar,
    handleConfirmarBaja,
    handleGuardarTurno,
    listaAbierta,
    setListaAbierta,
    estadoTurno,
    setEstadoTurno,
    turnoYaGuardado,
    modoEjecucion,
    asistenciaRows,
    puedeAbrirLista,
    handleAbrirLista,
    handleCambioHora,
    handleValidarHora,
    handleTogglePresente,
    handleCerrarLista,
  };
}