import React, { useState } from 'react';
import { UserPlus, X, Loader2, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { insertAlumnoIndividual, updateAlumnoConAuditoria } from '../../../services/alumnosService.js';
import { supabase } from '../../../config/supabase.js';
import './ModalesDirectorio.css';

function validarRutChileno(rutCompleto) {
  if (!rutCompleto || typeof rutCompleto !== 'string') return false;
  const limpio = rutCompleto.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const resto = suma % 11;
  const dvEsperado = 11 - resto;
  let dvCalculado = '';
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = String(dvEsperado);

  return dv === dvCalculado;
}

function formatearRut(rut) {
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length <= 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFormateado}-${dv}`;
}

export default function ModalRegistroManual({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: '',
    rut: '',
    correo: '',
    jornada: 'Diurno',
  });

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [colision, setColision] = useState(null);

  // Estado para el Sub-Modal Simplificado de Justificación Obligatoria
  const [mostrarModalJustificacion, setMostrarModalJustificacion] = useState(false);
  const [motivoDetallado, setMotivoDetallado] = useState('');
  const [errorJustificacion, setErrorJustificacion] = useState(null);

  if (!isOpen) return null;

  const handleRutChange = (e) => {
    const formateado = formatearRut(e.target.value);
    setForm({ ...form, rut: formateado });
    setErrorMsg(null);
    setColision(null);
  };

  const resetFormulario = () => {
    setForm({ nombre: '', rut: '', correo: '', jornada: 'Diurno' });
    setErrorMsg(null);
    setColision(null);
    setMostrarModalJustificacion(false);
    setMotivoDetallado('');
    setErrorJustificacion(null);
  };

  const handleClose = () => {
    resetFormulario();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setColision(null);

    if (!form.nombre.trim() || !form.rut.trim() || !form.correo.trim()) {
      setErrorMsg('Por favor completa todos los campos obligatorios (*).');
      return;
    }

    if (!validarRutChileno(form.rut)) {
      setErrorMsg('El RUT ingresado no es válido. Verifica el número y dígito verificador.');
      return;
    }

    try {
      setGuardando(true);

      const { data: alumnosExistentes, error: queryError } = await supabase
        .from('alumno')
        .select('id_alumno, nombre, rut, correo')
        .or(`rut.eq.${form.rut.trim()},correo.eq.${form.correo.trim().toLowerCase()}`);

      if (queryError) throw queryError;

      if (alumnosExistentes && alumnosExistentes.length > 0) {
        const coincidencia = alumnosExistentes[0];
        const campoRepetido = coincidencia.rut.toLowerCase() === form.rut.trim().toLowerCase() ? 'RUT' : 'Correo';

        setColision({
          campo: campoRepetido,
          alumnoExistente: coincidencia,
        });
        setGuardando(false);
        return;
      }

      await insertAlumnoIndividual({
        nombre: form.nombre,
        rut: form.rut,
        correo: form.correo.toLowerCase(),
        jornada: form.jornada,
        activo: true,
      });

      if (onSuccess) onSuccess('Alumno ayudante registrado exitosamente.');
      handleClose();
    } catch (err) {
      console.error('Error al registrar estudiante:', err);
      setErrorMsg('Error al conectar con la base de datos de Supabase.');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarSobrescritura = () => {
    setErrorJustificacion(null);
    setMostrarModalJustificacion(true);
  };

  const handleConfirmarSobrescritura = async () => {
    if (!colision || !colision.alumnoExistente) return;

    if (!motivoDetallado.trim()) {
      setErrorJustificacion('Debes ingresar obligatoriamente el motivo del caso excepcional.');
      return;
    }

    const eventoAuditoria = {
      id: Date.now().toString(),
      fecha: new Date().toLocaleDateString('es-CL'),
      tipo: 'actualizacion_datos',
      motivo: motivoDetallado.trim(),
      autor: 'Administrador',
    };

    try {
      setGuardando(true);
      await updateAlumnoConAuditoria(colision.alumnoExistente.id_alumno, {
        nombre: form.nombre,
        rut: form.rut,
        correo: form.correo.toLowerCase(),
        jornada: form.jornada,
        activo: true,
      }, eventoAuditoria);

      if (onSuccess) onSuccess(`Datos actualizados exitosamente para el estudiante ${form.nombre}.`);
      handleClose();
    } catch (err) {
      console.error('Error al sobreponer alumno:', err);
      setErrorJustificacion('Error al actualizar los datos en Supabase.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {/* 1. Modal Principal de Formulario */}
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-header-clean">
            <div className="modal-title-clean">
              <UserPlus className="w-5 h-5 text-[#43b0c4]" />
              <h3>Registrar Alumno Ayudante</h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="modal-close-btn-clean"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="modal-alert-error">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Alerta de Conflicto por Duplicado con truncamiento del nombre */}
          {colision && (
            <div className="modal-alert-collision" style={{ margin: '12px 20px 4px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong className="collision-title">
                    Atención: {colision.campo} ya registrado
                  </strong>
                  <p className="collision-desc" style={{ marginTop: '2px' }}>
                    El {colision.campo} <strong>{colision.campo === 'RUT' ? form.rut : form.correo}</strong> ya se encuentra registrado para el estudiante{' '}
                    <strong 
                      className="truncate-collision-inline" 
                      title={colision.alumnoExistente.nombre}
                    >
                      {colision.alumnoExistente.nombre}
                    </strong>.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={iniciarSobrescritura}
                      disabled={guardando}
                      className="btn-collision-override"
                    >
                      Sobreponer datos
                    </button>
                    <button
                      type="button"
                      onClick={() => setColision(null)}
                      className="btn-collision-cancel"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="modal-body-form">
            <div className="modal-field">
              <label htmlFor="reg-nombre" className="modal-label">
                Nombre Completo *
              </label>
              <input
                id="reg-nombre"
                name="nombre"
                type="text"
                required
                autoComplete="name"
                maxLength={150}
                placeholder="Ej: Sofía Castro Morales"
                value={form.nombre}
                onChange={(e) => { setForm({ ...form, nombre: e.target.value }); setColision(null); }}
                className="modal-input"
                disabled={guardando}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="reg-rut" className="modal-label">
                RUT del estudiante *
              </label>
              <input
                id="reg-rut"
                name="rut"
                type="text"
                required
                autoComplete="off"
                placeholder="Ej: 21.876.123-5"
                value={form.rut}
                onChange={handleRutChange}
                className="modal-input modal-input-mono"
                disabled={guardando}
                maxLength={12}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="reg-correo" className="modal-label">
                Correo Electrónico *
              </label>
              <input
                id="reg-correo"
                name="correo"
                type="email"
                required
                autoComplete="email"
                maxLength={150}
                placeholder="Ej: sofia.castro@konor.cl"
                value={form.correo}
                onChange={(e) => { setForm({ ...form, correo: e.target.value }); setColision(null); }}
                className="modal-input"
                disabled={guardando}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="reg-jornada" className="modal-label">
                Jornada Académica *
              </label>
              <select
                id="reg-jornada"
                name="jornada"
                value={form.jornada}
                onChange={(e) => setForm({ ...form, jornada: e.target.value })}
                className="modal-select"
                disabled={guardando}
              >
                <option value="Diurno">Diurno</option>
                <option value="Vespertino">Vespertino</option>
              </select>
            </div>

            <div className="modal-footer-clean">
              <button
                type="button"
                onClick={handleClose}
                disabled={guardando}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || Boolean(colision)}
                className="btn-primary"
              >
                {guardando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#43b0c4]" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Alumno</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Sub-Modal Simplificado: Justificación Obligatoria de Caso Excepcional */}
      {mostrarModalJustificacion && colision && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-card modal-card-compact">
            <div className="modal-header">
              <div className="modal-title">
                <ShieldCheck className="w-4 h-4 text-[#43b0c4]" />
                <span>Justificación de Sobrescritura</span>
              </div>
            </div>

            <div className="modal-body modal-body-compact">
              <p className="modal-question" style={{ color: '#334155', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                Indica el motivo del caso excepcional por el cual se sobreponen los datos de:{' '}
                <strong 
                  className="truncate-collision-inline" 
                  title={colision.alumnoExistente.nombre}
                >
                  {colision.alumnoExistente.nombre}
                </strong>{' '}
                (RUT: {colision.alumnoExistente.rut}).
              </p>

              {errorJustificacion && (
                <div className="modal-alert-error" style={{ margin: 0 }}>
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorJustificacion}</span>
                </div>
              )}

              <div className="reason-input-box" style={{ marginTop: '4px' }}>
                <label htmlFor="motivo-excepcional-input">
                  Motivo de la sobrescritura *:
                </label>
                <textarea
                  id="motivo-excepcional-input"
                  name="motivoExcepcional"
                  rows={3}
                  className="modal-input modal-textarea"
                  placeholder="Detalla la justificación del cambio o caso excepcional..."
                  value={motivoDetallado}
                  onChange={(e) => {
                    setMotivoDetallado(e.target.value);
                    setErrorJustificacion(null);
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setMostrarModalJustificacion(false)}
                disabled={guardando}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarSobrescritura}
                disabled={guardando}
                className="btn-primary"
              >
                {guardando ? 'Guardando...' : 'Confirmar y Sobreponer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}