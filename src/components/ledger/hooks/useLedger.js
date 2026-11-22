import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase.js';
import { obtenerAjustesLedger, registrarAjusteLedger } from '../../../services/ledgerService.js';

export function useLedger() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ajustes, setAjustes] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [turnosCerrados, setTurnosCerrados] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [resAlumnos, resTurnos] = await Promise.all([
        supabase.from('alumno').select('id_alumno, nombre, rut').eq('activo', true).order('nombre'),
        supabase.from('turno').select('id_turno, nombre_evento, fecha_inicio').eq('estado', 'Cerrado').order('fecha_inicio', { ascending: false }).limit(20)
      ]);

      if (resAlumnos.data) setAlumnos(resAlumnos.data);
      if (resTurnos.data) setTurnosCerrados(resTurnos.data);
    } catch (err) {
      console.error('Error cargando catálogos para Ledger:', err);
    }
  }, []);

  const cargarAjustes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await obtenerAjustesLedger();
      setAjustes(data);
    } catch (err) {
      console.error('Error cargando historial de Ledger:', err);
      setMensaje({ tipo: 'error', texto: 'No se pudo cargar el historial de ajustes contables.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
    cargarAjustes();
  }, [cargarCatalogos, cargarAjustes]);

  const handleCrearAjuste = async (datos) => {
    try {
      setGuardando(true);
      setMensaje(null);
      await registrarAjusteLedger(datos);
      setMensaje({ tipo: 'exito', texto: 'Ajuste retroactivo registrado e incorporado a la contabilidad.' });
      setModalAbierto(false);
      await cargarAjustes();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Error al persistir el ajuste contable.' };
    } finally {
      setGuardando(false);
    }
  };

  return {
    loading,
    guardando,
    ajustes,
    alumnos,
    turnosCerrados,
    modalAbierto,
    setModalAbierto,
    mensaje,
    setMensaje,
    handleCrearAjuste,
    recargar: cargarAjustes
  };
}