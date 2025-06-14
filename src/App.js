import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Main from './components/Main';
import Login from './components/Login';
import Home from './components/Home';
import Nuevo from './components/Nuevo';
import Unirse from './components/Unirse';
import Torneo from './components/Torneo';
import DetallesParticipante from './components/DetallesParticipante';
import Planes from './components/Planes'; 
import Terminos from './components/Terminos';     
import Privacidad from './components/Privacidad'; 
import Preguntas from './components/Preguntas'; 
import Guia from './components/Guia';
import './App.css'; 

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
        <Route path="/torneo/:torneoId/participante/:tipo/:participanteId" element={<DetallesParticipante />} />
        <Route path="/Terminos" element={<Terminos />} />
        <Route path="/Privacidad" element={<Privacidad />} />
        <Route path="/Preguntas" element={<Preguntas />} />
        <Route path="/planes" element={<Planes />} /> 
        <Route path="/guia" element={<Guia />} />
      </Routes>
    </Router>
  );
}

export default App;
