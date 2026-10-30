import { useState, useEffect, useCallback } from 'react';
import { fetchTurnos, cancelarTurno, duplicarTurno } from '../../../services/turnosService.js';

export function useListaTurnos() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarTurnos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTurnos();
      setTurnos(data || []);
    } catch (err) {
      console.error('Error al cargar turnos:', err);
      setError('No fue posible cargar el listado de turnos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTurnos();
  }, [cargarTurnos]);

  const handleCancelar = async (idTurno) => {
    if (!window.confirm('¿Estás seguro de cancelar este turno?')) return;
    try {
      const { error: err } = await cancelarTurno(idTurno);
      if (err) throw new Error(err);
      await cargarTurnos();
    } catch (err) {
      alert(`Error al cancelar turno: ${err.message}`);
    }
  };

  const handleDuplicar = async (idTurno, nuevaFechaInicio, nuevaFechaTermino) => {
    try {
      const { error: err } = await duplicarTurno(idTurno, nuevaFechaInicio, nuevaFechaTermino);
      if (err) throw new Error(err);
      await cargarTurnos();
    } catch (err) {
      alert(`Error al duplicar turno: ${err.message}`);
    }
  };

  return {
    turnos,
    loading,
    error,
    recargarTurnos: cargarTurnos,
    cancelarTurno: handleCancelar,
    duplicarTurno: handleDuplicar,
  };
}