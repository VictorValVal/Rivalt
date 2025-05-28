import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Main from './components/Main';
import Login from './components/Login';
import Home from './components/Home';
import Nuevo from './components/Nuevo';
import Unirse from './components/Unirse';
import Torneo from './components/Torneo';
import DetallesParticipante from './components/DetallesParticipante';
import Footer from './components/Footer'; // Importamos el Footer

// Importamos los componentes para las páginas legales
import Terminos from './components/Terminos';     // Asegúrate que la ruta es correcta y el componente existe
import Privacidad from './components/Privacidad'; // Asegúrate que la ruta es correcta y el componente existe
import Preguntas from './components/Preguntas'; // Asegúrate que la ruta es correcta y el componente existe

import './App.css'; // Asegúrate de que la ruta sea correcta

function App() {
  return (
    <Router>
      {/* El Navbar/Header iría aquí si lo tuvieras como un componente separado fuera de las Routes */}
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/nuevo" element={<Nuevo />} />
        <Route path="/unirse" element={<Unirse />} />
        <Route path="/torneo/:id" element={<Torneo />} />
        <Route path="/torneo/:torneoId/participante/:tipo/:participanteId" element={<DetallesParticipante />} />

        {/* Nuevas rutas para las páginas legales */}
        <Route path="/Terminos" element={<Terminos />} />
        <Route path="/Privacidad" element={<Privacidad />} />
        <Route path="/Preguntas" element={<Preguntas />} />

        {/* Si tienes otras páginas como Guía, Centro de Ayuda, etc., sus rutas irían aquí también */}
        {/* Ejemplo:
        <Route path="/guia" element={<GuiaComponent />} />
        <Route path="/centro-de-ayuda" element={<CentroAyudaComponent />} />
        <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentesComponent />} />
        */}
      </Routes>
    </Router>
  );
}

export default App;
