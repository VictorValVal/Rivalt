import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { app } from "../firebase";

const db = getFirestore(app);
const auth = getAuth(app);

function Nuevo() {
  const [step, setStep] = useState(1);
  const [titulo, setTitulo] = useState("");
  const [deporte, setDeporte] = useState("");
  const [modo, setModo] = useState("");
  const [tipo, setTipo] = useState("");
  const [numEquipos, setNumEquipos] = useState(0);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const codigo = uuidv4().slice(0, 6).toUpperCase();

    const torneoData = {
      titulo,
      deporte,
      modo,
      tipo,
      numEquipos,
      creadorId: user.uid,
      codigo,
      participantes: [], // Siempre inicializamos con un array vacío
      fechaCreacion: new Date(),
    };

    try {
      await addDoc(collection(db, "torneos"), torneoData);
      alert(`Torneo creado. Código: ${codigo}`);
    } catch (error) {
      console.error("Error creando torneo:", error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      {step === 1 && (
        <div>
          <h2>Paso 1: Información básica</h2>
          <input type="text" placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input type="text" placeholder="Deporte" value={deporte} onChange={(e) => setDeporte(e.target.value)} />
          <button onClick={() => setStep(2)}>Siguiente</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Paso 2: Tipo de participación</h2>
          <button onClick={() => { setModo("individual"); setStep(3); }}>
            Individual
          </button>
          <button onClick={() => { setModo("equipo"); setStep(3); }}>
            Por equipos
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Paso 3: Tipo de torneo</h2>
          <button onClick={() => { setTipo("liga"); setStep(4); }}>Liga</button>
          <button onClick={() => { setTipo("torneo"); setStep(4); }}>Torneo</button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2>Paso 4: Número de {modo === "equipo" ? "equipos" : "participantes"}</h2>
          <input
            type="number"
            value={numEquipos}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setNumEquipos(value);
            }}
            max={tipo === "liga" ? 20 : 16}
            min={2}
          />
          <button onClick={handleSubmit}>Crear torneo</button>
        </div>
      )}
    </div>
  );
}

export default Nuevo;