import React, { useState, useEffect, useMemo } from 'react';
import { getAlumnosParaTurno, guardarAsignaciones } from '../services/turnosService';

export default function AsignacionTurno() {
  const [alumnosBase, setAlumnosBase] = useState([]);
  const [interesados, setInteresados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const ID_TURNO_ACTUAL = 1;
  const DURACION_TURNO = 2.0;
  const MAX_CUPOS = 5;
  const TOPE_MENSUAL = 60.0;

  useEffect(() => {
    async function cargarDatos() {
      try {
        setCargando(true);
        const data = await getAlumnosParaTurno();
        setAlumnosBase(data);

        // Pre-cargar 3 interesados iniciales de menor carga para agilidad
        const disponiblesIniciales = data
          .filter((a) => a.estado === 'disponible' && a.horas + DURACION_TURNO <= TOPE_MENSUAL)
          .sort((a, b) => a.horas - b.horas)
          .slice(0, 3)
          .map((a) => ({ ...a, asignado: false }));

        setInteresados(disponiblesIniciales);
      } catch (err) {
        console.error('Fallo de carga:', err);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  const totalAsignados = useMemo(
    () => interesados.filter((i) => i.asignado).length,
    [interesados]
  );

  // Ordenamiento inteligente: Asignados fijos arriba, luego por horas ASC, inhabilitados al fondo
  const listaOrdenada = useMemo(() => {
    return [...interesados].sort((a, b) => {
      const aInvalido = a.estado === 'ocupado' || a.horas + DURACION_TURNO > TOPE_MENSUAL;
      const bInvalido = b.estado === 'ocupado' || b.horas + DURACION_TURNO > TOPE_MENSUAL;

      if (a.asignado && !b.asignado) return -1;
      if (!a.asignado && b.asignado) return 1;
      if (!aInvalido && bInvalido) return -1;
      if (aInvalido && !bInvalido) return 1;
      return a.horas - b.horas;
    });
  }, [interesados]);

  // Alumnos para el dropdown de búsqueda con filtrado
  const resultadosBusqueda = useMemo(() => {
    if (!busqueda.trim()) return [];
    const query = busqueda.toLowerCase();
    return alumnosBase.filter((a) =>
      a.nombre.toLowerCase().includes(query) || a.rut.toLowerCase().includes(query)
    );
  }, [busqueda, alumnosBase]);

  const toggleInteresadoDesdeBuscador = (alumno) => {
    const yaExiste = interesados.some((i) => i.id === alumno.id);
    if (yaExiste) {
      setInteresados((prev) => prev.filter((i) => i.id !== alumno.id));
    } else {
      setInteresados((prev) => [...prev, { ...alumno, asignado: false }]);
    }
  };

  const toggleAsignacion = (id) => {
    if (!modoEdicion) return;

    setInteresados((prev) => {
      const target = prev.find((a) => a.id === id);
      if (!target) return prev;

      const esInvalido = target.estado === 'ocupado' || target.horas + DURACION_TURNO > TOPE_MENSUAL;
      if (esInvalido) return prev;

      if (!target.asignado && totalAsignados >= MAX_CUPOS) {
        alert('Se ha alcanzado el límite máximo de 5 cupos para este turno.');
        return prev;
      }

      return prev.map((a) =>
        a.id === id ? { ...a, asignado: !a.asignado } : a
      );
    });
  };

  const handleGuardarOEditar = async () => {
    if (modoEdicion) {
      setGuardando(true);
      try {
        const idsAsignados = interesados.filter((a) => a.asignado).map((a) => a.id);
        await guardarAsignaciones(ID_TURNO_ACTUAL, idsAsignados);
        setModoEdicion(false);
      } catch (e) {
        alert('Hubo un error al persistir el turno en Supabase.');
      } finally {
        setGuardando(false);
      }
    } else {
      setModoEdicion(true);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0">
        <div>
          <div className="px-6 py-5 border-b border-slate-800">
            <h1 className="text-xl font-bold tracking-wider text-white">KONOR</h1>
            <p className="text-xs text-slate-400">Gestor de Alumnos Ayudantes</p>
          </div>
          <nav className="mt-4 px-3 space-y-1">
            <button className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition">
              Dashboard
            </button>
            <button className="w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white shadow-sm">
              Eventos
            </button>
            <button className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition">
              Alumnos Ayudantes
            </button>
            <button className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition">
              Configuración
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER SUPERIOR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Lista de turno: <span className="text-emerald-700 font-semibold">'Limpiar bodega'</span>
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <button className="text-sm text-slate-500 hover:text-slate-700 font-medium">
              Ayuda
            </button>
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                AD
              </div>
              <span className="text-sm font-medium text-slate-700">Admin Base</span>
            </div>
          </div>
        </header>

        {/* CONTENIDO VISTA */}
        <main className="flex-1 p-8 flex flex-col min-h-0 overflow-hidden">
          {/* TARJETA METADATA DEL TURNO */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-8">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Día del Evento</span>
                <span className="text-sm font-bold text-slate-800">15/05/2026</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Hora Inicio</span>
                <span className="text-sm font-bold text-slate-800">10:00</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Hora Salida</span>
                <span className="text-sm font-bold text-slate-800">12:00 (2 hrs)</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cupos</span>
                <span className="text-sm font-bold text-slate-800">{MAX_CUPOS} personas</span>
              </div>
            </div>

            {/* BADGE DINÁMICO DE ASIGNACIÓN */}
            <div>
              <span
                className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all shadow-sm ${
                  totalAsignados === 0
                    ? 'bg-slate-200 text-slate-700 border border-slate-300'
                    : totalAsignados < MAX_CUPOS
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {totalAsignados}/{MAX_CUPOS} Asignados
              </span>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA Y DROPDOWN INTERACTIVO */}
          <div className="relative mb-4">
            <div className="flex items-center">
              <input
                type="text"
                disabled={!modoEdicion}
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setDropdownAbierto(true);
                }}
                onFocus={() => setDropdownAbierto(true)}
                placeholder="Buscar alumno por nombre o RUT para agregar a la lista..."
                className={`w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  !modoEdicion ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''
                }`}
              />
            </div>

            {/* DROPDOWN FLOTANTE */}
            {dropdownAbierto && busqueda.trim().length > 0 && modoEdicion && (
              <div className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-60 overflow-y-auto">
                {resultadosBusqueda.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">No se encontraron alumnos</div>
                ) : (
                  resultadosBusqueda.map((alumno) => {
                    const enTabla = interesados.some((i) => i.id === alumno.id);
                    const ocupado = alumno.estado === 'ocupado';
                    const sobregira = alumno.horas + DURACION_TURNO > TOPE_MENSUAL;

                    return (
                      <div
                        key={alumno.id}
                        className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{alumno.nombre}</p>
                          <p className="text-xs text-slate-400">
                            {alumno.rut} • {alumno.horas} hrs acumuladas
                          </p>
                        </div>

                        <div>
                          {ocupado ? (
                            <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded font-semibold">
                              Ocupado
                            </span>
                          ) : sobregira ? (
                            <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded font-semibold">
                              Supera límite (60h)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                toggleInteresadoDesdeBuscador(alumno);
                                setDropdownAbierto(false);
                                setBusqueda('');
                              }}
                              className={`text-xs px-3 py-1.5 rounded font-medium transition ${
                                enTabla
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                              }`}
                            >
                              {enTabla ? '✕ Quitar' : '+ Agregar a lista'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* TABLA COMPARATIVA CON SCROLL */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">
                      Asignar
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Alumno
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      RUT
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Horas Acumuladas
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Estado / Validación
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargando ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-sm text-slate-400">
                        Cargando alumnos desde Supabase...
                      </td>
                    </tr>
                  ) : listaOrdenada.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-sm text-slate-400">
                        Aún no hay alumnos interesados en la tabla. Usa el buscador para agregarlos.
                      </td>
                    </tr>
                  ) : (
                    listaOrdenada.map((item) => {
                      const ocupado = item.estado === 'ocupado';
                      const sobregira = item.horas + DURACION_TURNO > TOPE_MENSUAL;
                      const bloqueado = ocupado || sobregira || !modoEdicion;

                      return (
                        <tr
                          key={item.id}
                          style={item.asignado ? { backgroundColor: '#ecfdf5' } : {}}
                          className={`transition ${!item.asignado ? 'hover:bg-slate-50' : ''}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              disabled={bloqueado}
                              checked={item.asignado}
                              onChange={() => toggleAsignacion(item.id)}
                              className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 disabled:opacity-40 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                            {item.nombre}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {item.rut}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-700">
                            {item.horas.toFixed(1)} hrs
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {item.asignado ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                ✓ Asignado
                              </span>
                            ) : ocupado ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                Ocupado
                              </span>
                            ) : sobregira ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                Supera límite mensual (60h)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                En espera (Respaldo)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            {modoEdicion && (
                              <button
                                type="button"
                                onClick={() => setInteresados((prev) => prev.filter((i) => i.id !== item.id))}
                                className="text-slate-400 hover:text-red-500 font-bold px-2 py-1"
                                title="Quitar de la lista"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BOTONES INFERIORES */}
          <footer className="mt-6 flex items-center justify-between shrink-0">
            <button
              disabled
              title="Solo disponible el día del evento"
              className="px-5 py-2.5 bg-slate-200 text-slate-400 rounded-lg text-sm font-semibold cursor-not-allowed"
            >
              Cerrar lista (Inhabilitado)
            </button>

            <button
              onClick={handleGuardarOEditar}
              disabled={guardando}
              className={`px-6 py-2.5 text-sm font-bold rounded-lg transition shadow-sm ${
                modoEdicion
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {guardando
                ? 'Guardando...'
                : modoEdicion
                ? 'Guardar turno'
                : '✎ Editar turno'}
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}