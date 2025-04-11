import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { app } from "../firebase";
import EquipoForm from "./EquipoForm"; // Importa el componente EquipoForm

const db = getFirestore(app);
const auth = getAuth(app);

function Componente2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [torneo, setTorneo] = useState(null);
  const [user, setUser] = useState(null);
  const [mostrarEquipoForm, setMostrarEquipoForm] = useState(false);

  useEffect(() => {
    const fetchTorneo = async () => {
      const torneoDoc = await getDoc(doc(db, "torneos", id));
      if (torneoDoc.exists()) {
        setTorneo({ id: torneoDoc.id, ...torneoDoc.data() });
      } else {
        console.log("No se encontró el torneo");
      }
    };

    fetchTorneo();

    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, [id]);

  const handleParticipar = () => {
    setMostrarEquipoForm(true);
  };

  const handleEquipoSubmit = async (equipo) => {
    try {
      await updateDoc(doc(db, "torneos", id), {
        participantes: arrayUnion(equipo),
      });
      setMostrarEquipoForm(false);
      // Actualizar el estado del torneo para reflejar el cambio
      const torneoDoc = await getDoc(doc(db, "torneos", id));
      if (torneoDoc.exists()) {
        setTorneo({ id: torneoDoc.id, ...torneoDoc.data() });
      }
    } catch (error) {
      console.error("Error al añadir equipo:", error);
    }
  };

  if (!torneo) {
    return <div>Cargando...</div>;
  }

  const esCreador = user?.uid === torneo.creadorId;
  const yaParticipa = torneo.participantes.some(
    (participante) =>
      typeof participante === "object" && participante?.capitan === user?.uid
  );

  return (
    <div>
      <h1>{torneo.titulo}</h1>
      {/* ... (Mostrar otra información del torneo) */}
      <h2>Participantes</h2>
      <ul>
        {torneo.participantes.map((participante, index) => (
          <li key={index}>
            {typeof participante === "string"
              ? participante
              : participante.nombre || participante.capitan}
          </li>
        ))}
      </ul>
      {esCreador && !yaParticipa && (
        <button onClick={handleParticipar}>Participar</button>
      )}
      {mostrarEquipoForm && (
        <EquipoForm onSubmit={handleEquipoSubmit} onCancel={() => setMostrarEquipoForm(false)} />
      )}
    </div>
  );
}

export default Componente2;