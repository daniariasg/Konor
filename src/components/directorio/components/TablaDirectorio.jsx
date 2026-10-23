import React from 'react';
import { 
  Search, 
  Calendar, 
  FileDown, 
  ArrowRight, 
  Loader2, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { useTablaDirectorio, MESES } from '../hooks/useTablaDirectorio.js';
import './TablaDirectorio.css';

export default function TablaDirectorio({ 
  onSeleccionarAlumno, 
  onAbrirRegistroManual, 
  refreshTrigger 
}) {
  const {
    alumnosPaginados,
    totalPaginas,
    paginaActual,
    setPaginaActual,
    totalAlumnos,
    indiceInicio,
    FILAS_POR_PAGINA,
    loading,
    busqueda,
    setBusqueda,
    mesActivo,
    nombreMesActivo,
    cambiarMes,
    menuMesAbierto,
    setMenuMesAbierto,
    calendarRef,
    sortConfig,
    ordenarPor,
    valorHoraTarifa,
    exportarExcel,
  } = useTablaDirectorio(refreshTrigger);

  // Renderiza el indicador de ordenamiento como un triángulo discreto
  const renderSortIndicator = (columnaKey) => {
    const estaActiva = sortConfig?.key === columnaKey;

    if (!estaActiva) {
      return (
        <span className="sort-triangle sort-triangle-neutral" aria-hidden="true">
          ▴▾
        </span>
      );
    }

    return (
      <span className="sort-triangle sort-triangle-active" aria-hidden="true">
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="directorio-layout">
      {/* 1. Header con mes dinámico */}
      <div className="directorio-top-header">
        <h1 className="directorio-page-title">
          Alumnos ayudantes: {nombreMesActivo}
        </h1>
      </div>

      {/* 2. Barra de acciones y buscador limpio */}
      <div className="directorio-toolbar">
        <div className="toolbar-left-group">
          <div className="figma-search-box">
            <label htmlFor="tabla-search-input" className="sr-only">
              Buscar alumno ayudante
            </label>
            <Search className="w-4 h-4 figma-search-icon" aria-hidden="true" />
            <input
              id="tabla-search-input"
              name="busquedaAlumnos"
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
              className="figma-search-input"
            />
          </div>

          {/* Selector de Mes (Popover) */}
          <div className="calendar-picker-wrapper" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setMenuMesAbierto(!menuMesAbierto)}
              title="Cambiar mes del periodo"
              className={`btn-icon-calendar ${menuMesAbierto ? 'active' : ''}`}
              aria-label="Seleccionar mes del periodo"
              aria-expanded={menuMesAbierto}
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
            </button>

            {menuMesAbierto && (
              <div className="month-dropdown-menu" role="menu">
                {MESES.map((mes, idx) => {
                  const numeroMes = idx + 1;
                  const esSeleccionado = mesActivo === numeroMes;
                  return (
                    <button
                      key={mes}
                      type="button"
                      role="menuitem"
                      onClick={() => cambiarMes(numeroMes)}
                      className={`month-option-btn ${esSeleccionado ? 'selected' : ''}`}
                    >
                      {mes}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-right-group">
          {/* Botón Exportar Nómina a Excel */}
          <button
            type="button"
            onClick={exportarExcel}
            title="Descargar nómina del mes en Excel"
            className="btn-icon-export"
            aria-label="Exportar nómina a Excel"
          >
            <FileDown className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Botón + Agregar alumno */}
          <button
            type="button"
            onClick={onAbrirRegistroManual}
            className="btn-figma-add"
          >
            + Agregar alumno
          </button>
        </div>
      </div>

      {/* 3. Tabla con columna RUT y ordenamiento */}
      <div className="figma-table-container">
        <table className="figma-table">
          <thead>
            <tr>
              <th 
                onClick={() => ordenarPor('rut')} 
                className="th-interactive" 
                style={{ width: '135px' }}
                scope="col"
              >
                <div className="th-header-inner">
                  <span>RUT</span>
                  {renderSortIndicator('rut')}
                </div>
              </th>
              <th 
                onClick={() => ordenarPor('nombre')} 
                className="th-interactive"
                scope="col"
              >
                <div className="th-header-inner">
                  <span>Nombre alumno</span>
                  {renderSortIndicator('nombre')}
                </div>
              </th>
              <th 
                onClick={() => ordenarPor('horas_validadas')} 
                className="th-interactive"
                scope="col"
              >
                <div className="th-header-inner">
                  <span>Horas Total</span>
                  {renderSortIndicator('horas_validadas')}
                </div>
              </th>
              <th 
                onClick={() => ordenarPor('horas_validadas')} 
                className="th-interactive"
                scope="col"
              >
                <div className="th-header-inner">
                  <span>Monto ($)</span>
                  {renderSortIndicator('horas_validadas')}
                </div>
              </th>
              <th scope="col" style={{ textAlign: 'right', paddingRight: '2rem' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="table-empty-message">
                  <Loader2 className="w-6 h-6 animate-spin text-[#43b0c4] mx-auto mb-2" aria-hidden="true" />
                  Calculando registros de {nombreMesActivo}...
                </td>
              </tr>
            ) : alumnosPaginados.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-empty-message">
                  {busqueda
                    ? `No se encontraron resultados para "${busqueda}".`
                    : 'No hay alumnos registrados para este periodo.'}
                </td>
              </tr>
            ) : (
              alumnosPaginados.map((alumno) => {
                const horas = parseFloat(alumno.horas_validadas || 0);
                const monto = Math.round(horas * valorHoraTarifa);
                const horasFormato = horas % 1 === 0 
                  ? horas.toString() 
                  : horas.toFixed(1).replace('.', ',');

                return (
                  <tr
                    key={alumno.id_alumno}
                    onClick={() => onSeleccionarAlumno(alumno, mesActivo, nombreMesActivo)}
                    title="Haz clic para ver el perfil completo"
                  >
                    {/* Celda RUT en formato monoespaciado alineado */}
                    <td 
                      className="td-rut"
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        color: '#334155',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {alumno.rut}
                    </td>
                    <td className="td-nombre">{alumno.nombre}</td>
                    <td className="td-horas">{horasFormato} hrs</td>
                    <td className="td-monto">${monto.toLocaleString('es-CL')}</td>
                    <td className="td-acciones">
                      <button
                        type="button"
                        className="btn-table-arrow-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeleccionarAlumno(alumno, mesActivo, nombreMesActivo);
                        }}
                        aria-label={`Ver perfil de ${alumno.nombre}`}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <ArrowRight className="w-4 h-4 action-arrow" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 4. Paginación Inferior */}
        {totalAlumnos > 0 && (
          <div className="table-pagination-footer">
            <span className="pagination-label">
              Mostrando {indiceInicio + 1} - {Math.min(indiceInicio + FILAS_POR_PAGINA, totalAlumnos)} de {totalAlumnos} alumnos
            </span>
            <div className="pagination-actions">
              <button
                type="button"
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                className="btn-page-nav"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Anterior
              </button>

              <span className="pagination-label" style={{ fontWeight: 600, margin: '0 4px' }}>
                Página {paginaActual} de {totalPaginas}
              </span>

              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                className="btn-page-nav"
                aria-label="Página siguiente"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}