import React, { useState, useRef, useEffect } from 'react';
import { useTablaDirectorio } from '../hooks/useTablaDirectorio.js';
import ModalRegistroManual from './ModalRegistroManual.jsx';
import { 
  Search, 
  FileSpreadsheet, 
  Plus, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle 
} from 'lucide-react';
import './TablaDirectorio.css';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function TablaDirectorio({ onSeleccionarAlumno }) {
  const {
    loading,
    errorMsg,
    nombreMesActual,
    terminoBusqueda,
    setTerminoBusqueda,
    mesSeleccionado,
    setMesSeleccionado,
    anioSeleccionado,
    setAnioSeleccionado,
    alumnosPaginados,
    alumnosOrdenados,
    paginaActual,
    setPaginaActual,
    totalPaginas,
    indiceInicio,
    elementosPorPagina,
    columnaOrden,
    direccionOrden,
    handleOrdenar,
    modalRegistroOpen,
    setModalRegistroOpen,
    handleAlumnoCreado,
    handleExportarExcel
  } = useTablaDirectorio();

  const [popoverMesAbierto, setPopoverMesAbierto] = useState(false);
  const [anioVisual, setAnioVisual] = useState(() => anioSeleccionado || new Date().getFullYear());
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverMesAbierto(false);
      }
    };
    if (popoverMesAbierto) {
      document.addEventListener('mousedown', handleClickFuera);
    }
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [popoverMesAbierto]);

  const anioActivo = anioSeleccionado || anioVisual;

  const handleSeleccionarMes = (indiceMes) => {
    setMesSeleccionado(indiceMes);
    if (typeof setAnioSeleccionado === 'function') {
      setAnioSeleccionado(anioVisual);
    }
    setPopoverMesAbierto(false);
  };

  const renderSortIcon = (columna) => {
    if (columnaOrden !== columna) {
      return <ArrowUpDown size={14} className="sort-icon-inactive" />;
    }
    return direccionOrden === 'asc' 
      ? <ArrowUp size={14} className="sort-icon-active" /> 
      : <ArrowDown size={14} className="sort-icon-active" />;
  };

  return (
    <div className="konor-directorio-view">
      <div className="konor-directorio-header">
        <div>
          <h1 className="konor-directorio-title">
            Alumnos ayudantes: {nombreMesActual} {anioActivo}
          </h1>
          <p className="konor-directorio-subtitle">
            Directorio general de ayudantes, saldo contable y asignación mensual
          </p>
        </div>
      </div>

      <div className="konor-directorio-toolbar">
        <div className="konor-toolbar-left">
          <div className="konor-search-directorio-wrapper">
            <Search size={16} className="konor-search-icon" />
            <input
              type="text"
              placeholder="Buscar por Nombre o RUT..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              className="konor-search-directorio-input"
            />
          </div>

          <div className="konor-mes-selector-container" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setPopoverMesAbierto((prev) => !prev)}
              className="konor-mes-trigger-btn"
            >
              <Calendar size={16} className="text-[#43b0c4]" />
              <span>{nombreMesActual} {anioActivo}</span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>

            {popoverMesAbierto && (
              <div className="konor-calendar-popover">
                <div className="calendar-popover-header">
                  <button
                    type="button"
                    onClick={() => setAnioVisual((a) => a - 1)}
                    className="calendar-nav-arrow"
                    title="Año anterior"
                  >
                    &lt;
                  </button>
                  <span className="calendar-current-year">{anioVisual}</span>
                  <button
                    type="button"
                    onClick={() => setAnioVisual((a) => a + 1)}
                    className="calendar-nav-arrow"
                    title="Año siguiente"
                  >
                    &gt;
                  </button>
                </div>

                <div className="calendar-months-grid">
                  {MESES_CORTOS.map((mesNombre, idx) => {
                    const isSelected = mesSeleccionado === idx && anioActivo === anioVisual;
                    return (
                      <button
                        key={mesNombre}
                        type="button"
                        onClick={() => handleSeleccionarMes(idx)}
                        className={`calendar-month-cell ${isSelected ? 'is-selected' : ''}`}
                      >
                        {mesNombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="konor-toolbar-right">
          <button
            type="button"
            onClick={handleExportarExcel}
            className="konor-btn-exportar-excel"
            title="Exportar nómina visible a Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setModalRegistroOpen(true)}
            className="konor-btn-primary"
          >
            <Plus size={16} />
            <span>Agregar alumno</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="konor-directorio-alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="konor-directorio-card">
        {loading ? (
          <div className="table-responsive-wrapper animate-pulse">
            <table className="tabla-oficial-konor">
              <thead>
                <tr>
                  <th style={{ width: '22%' }} className="th-left"><div className="konor-skeleton-block" style={{ width: '50px', height: '14px' }} /></th>
                  <th style={{ width: '38%' }}><div className="konor-skeleton-block" style={{ width: '130px', height: '14px' }} /></th>
                  <th style={{ width: '18%' }} className="th-center"><div className="konor-skeleton-block" style={{ width: '85px', height: '14px', margin: '0 auto' }} /></th>
                  <th style={{ width: '16%' }} className="th-right"><div className="konor-skeleton-block" style={{ width: '70px', height: '14px', marginLeft: 'auto' }} /></th>
                  <th style={{ width: '6%' }} className="th-center"><div className="konor-skeleton-block" style={{ width: '35px', height: '14px', margin: '0 auto' }} /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <tr key={n} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td className="td-left">
                      <div className="konor-skeleton-block" style={{ width: '90px', height: '14px' }} />
                    </td>
                    <td className="col-nombre-td">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="konor-skeleton-block" style={{ width: '160px', height: '15px' }} />
                        <div className="konor-skeleton-block" style={{ width: '100px', height: '11px' }} />
                      </div>
                    </td>
                    <td className="th-center">
                      <div className="konor-skeleton-block" style={{ width: '60px', height: '14px', margin: '0 auto' }} />
                    </td>
                    <td className="th-right">
                      <div className="konor-skeleton-block" style={{ width: '70px', height: '14px', marginLeft: 'auto' }} />
                    </td>
                    <td className="th-center">
                      <div className="konor-skeleton-block" style={{ width: '18px', height: '18px', borderRadius: '4px', margin: '0 auto' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="tabla-oficial-konor">
              <thead>
                <tr>
                  <th 
                    style={{ width: '22%' }}
                    onClick={() => handleOrdenar('rut')}
                    className="th-sortable th-left"
                  >
                    <div className="th-content">
                      <span>RUT</span>
                      {renderSortIcon('rut')}
                    </div>
                  </th>
                  <th 
                    style={{ width: '38%' }}
                    onClick={() => handleOrdenar('nombre')}
                    className="th-sortable col-nombre-th"
                  >
                    <div className="th-content-left">
                      <span>NOMBRE ALUMNO</span>
                      {renderSortIcon('nombre')}
                    </div>
                  </th>
                  <th 
                    style={{ width: '18%' }}
                    onClick={() => handleOrdenar('horas_total')}
                    className="th-sortable th-center"
                  >
                    <div className="th-content th-center-content">
                      <span>HORAS TOTAL</span>
                      {renderSortIcon('horas_total')}
                    </div>
                  </th>
                  <th 
                    style={{ width: '16%' }}
                    onClick={() => handleOrdenar('monto_total')}
                    className="th-sortable th-right"
                  >
                    <div className="th-content th-right-content">
                      <span>MONTO ($)</span>
                      {renderSortIcon('monto_total')}
                    </div>
                  </th>
                  <th style={{ width: '6%' }} className="th-center">
                    ACCIONES
                  </th>
                </tr>
              </thead>
              <tbody>
                {alumnosPaginados.length === 0 ? (
                  <tr className="empty-table-row">
                    <td colSpan={5}>
                      <div className="empty-content">
                        <AlertCircle size={36} className="empty-icon" />
                        <p>No se encontraron alumnos ayudantes registrados con los filtros aplicados.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  alumnosPaginados.map((al) => (
                    <tr
                      key={al.id_alumno}
                      className="fila-alumno cursor-pointer"
                      onClick={() => onSeleccionarAlumno && onSeleccionarAlumno(al, mesSeleccionado, nombreMesActual)}
                    >
                      <td className="td-left">
                        <span className="font-mono text-xs text-slate-600" style={{ fontWeight: '400', fontVariantNumeric: 'tabular-nums' }}>
                          {al.rut || '--'}
                        </span>
                      </td>

                      <td className="col-nombre-td">
                        <div className="alumno-nombre-container">
                          <span className="alumno-nombre-txt" style={{ color: '#334155', fontWeight: '400' }}>
                            {al.nombre}
                          </span>
                          {al.carrera && (
                            <span className="alumno-carrera-sub" style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: '400', marginTop: '1px' }}>
                              {al.carrera}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="th-center">
                        <span className="font-mono hours-col text-slate-600" style={{ fontWeight: '400', fontVariantNumeric: 'tabular-nums' }}>
                          {(al.horas_total || 0).toFixed(1).replace('.', ',')} hrs
                        </span>
                      </td>

                      <td className="th-right">
                        <span className="font-mono text-slate-600" style={{ fontWeight: '400', fontVariantNumeric: 'tabular-nums' }}>
                          ${Number(al.monto_total || 0).toLocaleString('es-CL')}
                        </span>
                      </td>

                      <td className="th-center">
                        <button
                          type="button"
                          className="konor-btn-row-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSeleccionarAlumno) onSeleccionarAlumno(al, mesSeleccionado, nombreMesActual);
                          }}
                          title="Ver perfil del alumno"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && alumnosOrdenados.length > 0 && (
          <div className="konor-directorio-pagination">
            <span className="pagination-info">
              Mostrando {indiceInicio + 1} a {Math.min(indiceInicio + elementosPorPagina, alumnosOrdenados.length)} de {alumnosOrdenados.length} alumnos
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                disabled={paginaActual === 1}
                className="btn-pagination"
              >
                <ChevronLeft size={16} />
                <span>Anterior</span>
              </button>
              <span className="pagination-page-current">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPaginaActual((p) => Math.min(p + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas}
                className="btn-pagination"
              >
                <span>Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalRegistroOpen && (
        <ModalRegistroManual
          isOpen={modalRegistroOpen}
          onClose={() => setModalRegistroOpen(false)}
          onCerrar={() => setModalRegistroOpen(false)}
          onAlumnoCreado={handleAlumnoCreado}
        />
      )}
    </div>
  );
}