import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Main from './components/Main';
import Login from './components/Login';
import Home from './components/Home';
import Nuevo from './components/Nuevo';
import Unirse from './components/Unirse';
import Torneo from './components/Torneo';
import DetallesParticipante from './components/DetallesParticipante';
import './App.css'; // Asegúrate de que la ruta sea correcta

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/nuevo" element={<Nuevo />} />
        <Route path="/unirse" element={<Unirse />} />
        <Route path="/torneo/:id" element={<Torneo />} />
        {/* Ruta para DetallesParticipante */}
        <Route path="/torneo/:torneoId/participante/:tipo/:participanteId" element={<DetallesParticipante />} />
        {/* Puedes añadir más rutas aquí */}
      </Routes>
    </Router>
  );
}

export default App;