import './App.css';
import Main from './components/Main';
import Home from './components/Home';
import Torneo from './components/Torneo';
import Login from './components/Login';
import Nuevo from './components/Nuevo';
import Unirse from './components/Unirse';
import User from './components/User';
import Equipo from './components/Equipo';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Main />} /> 
          <Route path="/home" element={<Home />} />
          <Route path="/torneo/:id" element={<Torneo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/nuevo" element={<Nuevo />} />
          <Route path="/unirse" element={<Unirse />} />
          <Route path="/torneo/:torneoId/user/:uid" element={<User />} />
          <Route path="/torneo/:torneoId/equipo/:equipoId" element={<Equipo />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;