import React, { useState } from 'react';
import TablaDirectorio from './components/TablaDirectorio.jsx';
import PerfilAlumnoView from './views/PerfilAlumnoView.jsx';

export default function Directorio() {
  const [vista, setVista] = useState('directorio'); // 'directorio' | 'perfil'
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [mesActivo, setMesActivo] = useState(new Date().getMonth());
  const [nombreMesActivo, setNombreMesActivo] = useState('');

  const handleSeleccionarAlumno = (alumno, mesNum, nombreMes) => {
    setAlumnoSeleccionado(alumno);
    setMesActivo(typeof mesNum === 'number' ? mesNum : new Date().getMonth());
    setNombreMesActivo(nombreMes || 'este mes');
    setVista('perfil');
  };

  const handleVolver = () => {
    setVista('directorio');
    setAlumnoSeleccionado(null);
  };

  const handleAlumnoActualizado = (alumnoActualizado) => {
    setAlumnoSeleccionado((prev) => ({
      ...prev,
      ...alumnoActualizado
    }));
  };

  return (
    <div className="konor-directorio-container">
      {vista === 'directorio' ? (
        <TablaDirectorio onSeleccionarAlumno={handleSeleccionarAlumno} />
      ) : (
        <PerfilAlumnoView
          alumno={alumnoSeleccionado}
          mesActivo={mesActivo}
          nombreMesActivo={nombreMesActivo}
          onVolver={handleVolver}
          onActualizado={handleAlumnoActualizado}
        />
      )}
    </div>
  );
}