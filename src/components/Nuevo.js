import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { app } from "../firebase";
import "./estilos/Nuevo.css"; // Ruta relativa al archivo Home.js
// Importa el CSS si decides crear un archivo separado, si no, asegúrate que App.css se carga globalmente.
// import './Nuevo.css'; // Opcional: Crear y usar Nuevo.css

const db = getFirestore(app);
const auth = getAuth(app);
const TOTAL_STEPS = 4; // Definir el número total de pasos

function Nuevo() {
  const [step, setStep] = useState(1);
  const [titulo, setTitulo] = useState("");
  const [deporte, setDeporte] = useState("");
  const [modo, setModo] = useState("");
  const [tipo, setTipo] = useState("");
  // Inicializar numEquipos a un valor por defecto válido para el select o input
  const [numEquipos, setNumEquipos] = useState(''); // Usar '' o un valor por defecto como 4 u 8

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para crear un torneo.");
      return;
    }
    if (!titulo || !deporte || !modo || !tipo || !numEquipos || numEquipos < 2) {
        alert("Por favor, completa todos los campos correctamente.");
        return;
    }


    const codigo = uuidv4().slice(0, 6).toUpperCase();

    const torneoData = {
      titulo,
      deporte,
      modo,
      tipo,
      // Asegúrate que numEquipos sea un número al guardar
      numEquipos: parseInt(numEquipos, 10),
      creadorId: user.uid,
      codigo,
      participantes: [],
      fechaCreacion: new Date(),
    };

    try {
      const docRef = await addDoc(collection(db, "torneos"), torneoData);
      alert(`Torneo "${titulo}" creado con éxito.\nCódigo: ${codigo}\nID: ${docRef.id}`);
      // Podrías redirigir al usuario aquí si quieres
      // navigate(`/torneo/${docRef.id}`);
      // O resetear el formulario
      setStep(1);
      setTitulo('');
      setDeporte('');
      setModo('');
      setTipo('');
      setNumEquipos('');

    } catch (error) {
      console.error("Error creando torneo:", error);
      alert("Hubo un error al crear el torneo. Por favor, inténtalo de nuevo.");
    }
  };

  const handleNextStep = () => setStep(prev => prev + 1);
  const handlePrevStep = () => setStep(prev => prev - 1); // Función para volver atrás (opcional)

  // Calcular progreso
  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    // Contenedor para centrar todo el componente
    <div className="nuevo-torneo-page-container">
      {/* Contenedor principal del formulario */}
      <div className="nuevo-torneo-container">

        {/* Barra de Progreso */}
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <span className="progress-step-text">Paso {step} de {TOTAL_STEPS}</span>

        {/* Contenido del paso actual */}
        <div className="form-step-content">
          {step === 1 && (
            <div className="form-step">
              <h2>Información básica</h2>
              <input
                className="form-input"
                type="text"
                placeholder="Título del Torneo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
              <input
                className="form-input"
                type="text"
                placeholder="Deporte"
                value={deporte}
                onChange={(e) => setDeporte(e.target.value)}
                required
              />
              <div className="form-navigation">
                 {/* No hay botón "Anterior" en el primer paso */}
                <button className="form-button primary" onClick={handleNextStep} disabled={!titulo || !deporte}>Siguiente</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Tipo de participación</h2>
              <div className="form-button-group">
                <button
                  className={`form-button choice ${modo === 'individual' ? 'selected' : ''}`}
                  onClick={() => { setModo("individual"); handleNextStep(); }}
                >
                  Individual
                </button>
                <button
                  className={`form-button choice ${modo === 'equipo' ? 'selected' : ''}`}
                  onClick={() => { setModo("equipo"); handleNextStep(); }}
                >
                  Por equipos
                </button>
              </div>
              <div className="form-navigation">
                <button className="form-button secondary" onClick={handlePrevStep}>Anterior</button>
                 {/* El "Siguiente" se activa al hacer clic en una opción */}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Formato del torneo</h2>
               <div className="form-button-group">
                <button
                  className={`form-button choice ${tipo === 'liga' ? 'selected' : ''}`}
                  onClick={() => { setTipo("liga"); handleNextStep(); }}
                >
                  Liga
                </button>
                <button
                  className={`form-button choice ${tipo === 'torneo' ? 'selected' : ''}`}
                  onClick={() => { setTipo("torneo"); handleNextStep(); }}
                >
                  Eliminatoria (Torneo)
                </button>
              </div>
               <div className="form-navigation">
                 <button className="form-button secondary" onClick={handlePrevStep}>Anterior</button>
                 {/* El "Siguiente" se activa al hacer clic en una opción */}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Número de {modo === "equipo" ? "equipos" : "participantes"}</h2>
              {/* Cambiado a select para ambos casos para limitar opciones */}
              <select
                className="form-input" // Reutilizamos la clase de input para el select
                value={numEquipos}
                onChange={(e) => setNumEquipos(e.target.value)}
                required
              >
                <option value="" disabled>Seleccionar número...</option>
                {/* Opciones condicionales o fijas */}
                {tipo === 'torneo' ? (
                  // Potencias de 2 para eliminatorias
                  <>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={32}>32</option>
                  </>
                ) : (
                  // Rango para ligas
                  <>
                    {[...Array(19)].map((_, i) => ( // Genera números del 2 al 20
                        <option key={i + 2} value={i + 2}>{i + 2}</option>
                    ))}
                  </>
                )}
              </select>

              <div className="form-navigation">
                 <button className="form-button secondary" onClick={handlePrevStep}>Anterior</button>
                <button className="form-button primary" onClick={handleSubmit} disabled={!numEquipos}>Crear Torneo</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Nuevo;