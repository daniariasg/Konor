import React, { useState } from 'react';
import TablaDirectorio from './components/TablaDirectorio.jsx';
import PerfilAlumnoView from './views/PerfilAlumnoView.jsx';
import ModalRegistroManual from './components/ModalRegistroManual.jsx';

export default function Directorio() {
  const [vista, setVista] = useState('lista'); // 'lista' | 'perfil'
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [mesActivo, setMesActivo] = useState(new Date().getMonth() + 1);
  const [nombreMesActivo, setNombreMesActivo] = useState('este mes');
  const [modalManualAbierto, setModalManualAbierto] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSeleccionarAlumno = (alumno, mesNum, nombreMes) => {
    setAlumnoSeleccionado(alumno);
    setMesActivo(mesNum || (new Date().getMonth() + 1));
    setNombreMesActivo(nombreMes || 'este mes');
    setVista('perfil');
  };

  const handleVolverALista = () => {
    setVista('lista');
    setAlumnoSeleccionado(null);
  };

  if (vista === 'perfil' && alumnoSeleccionado) {
    return (
      <PerfilAlumnoView
        alumno={alumnoSeleccionado}
        mesActivo={mesActivo}
        nombreMesActivo={nombreMesActivo}
        onVolver={handleVolverALista}
        onActualizado={(alumnoActualizado) => {
          setAlumnoSeleccionado(alumnoActualizado);
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
      <TablaDirectorio
        refreshTrigger={refreshTrigger}
        onSeleccionarAlumno={handleSeleccionarAlumno}
        onAbrirRegistroManual={() => setModalManualAbierto(true)}
      />

      <ModalRegistroManual
        isOpen={modalManualAbierto}
        onClose={() => setModalManualAbierto(false)}
        onSuccess={() => {
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
}