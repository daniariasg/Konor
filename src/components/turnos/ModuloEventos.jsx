import React, { useState, useEffect } from 'react';
import ListaTurnos from './views/ListaTurnos.jsx';
import DetalleTurno from './components/DetalleTurno.jsx';
import FormCrearTurno from './components/FormCrearTurno.jsx';

export default function ModuloEventos({ turnoSeleccionadoDirecto, onLimpiarTurnoDirecto }) {
  const [vista, setVista] = useState('lista'); // 'lista' | 'crear' | 'detalle'
  const [turnoActivo, setTurnoActivo] = useState(null);

  // Efecto que detecta cuando se invoca un turno directo desde el Dashboard
  useEffect(() => {
    if (turnoSeleccionadoDirecto && turnoSeleccionadoDirecto.id_turno) {
      setTurnoActivo(turnoSeleccionadoDirecto);
      setVista('detalle');
    }
  }, [turnoSeleccionadoDirecto]);

  // Al hacer clic en una tarjeta de la lista general
  const handleSeleccionarTurno = (turno) => {
    if (!turno) return;
    setTurnoActivo(turno);
    setVista('detalle');
  };

  // Al presionar '+ Crear Turno'
  const handleAbrirCrear = () => {
    setTurnoActivo(null);
    if (onLimpiarTurnoDirecto) onLimpiarTurnoDirecto();
    setVista('crear');
  };

  // Al completar la creación en FormCrearTurno
  const handleTurnoCreado = (nuevoTurno) => {
    const turnoResuelto = nuevoTurno?.data || nuevoTurno;
    if (turnoResuelto && turnoResuelto.id_turno) {
      setTurnoActivo(turnoResuelto);
      setVista('detalle');
    } else {
      setVista('lista');
    }
  };

  // Botón volver
  const handleVolver = () => {
    setTurnoActivo(null);
    if (onLimpiarTurnoDirecto) onLimpiarTurnoDirecto();
    setVista('lista');
  };

  return (
    <div className="konor-modulo-container">
      {vista === 'lista' && (
        <ListaTurnos
          onSeleccionarTurno={handleSeleccionarTurno}
          onAbrirCrear={handleAbrirCrear}
        />
      )}

      {vista === 'crear' && (
        <FormCrearTurno
          onTurnoCreado={handleTurnoCreado}
          onVolver={handleVolver}
        />
      )}

      {vista === 'detalle' && turnoActivo && (
        <DetalleTurno
          turno={turnoActivo}
          onVolver={handleVolver}
        />
      )}
    </div>
  );
}