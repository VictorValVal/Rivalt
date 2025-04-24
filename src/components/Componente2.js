import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { app } from "../firebase";
import EquipoForm from "./EquipoForm";
import { FaEllipsisV, FaUser, FaTrash } from "react-icons/fa"; // Importa iconos

const db = getFirestore(app);
const auth = getAuth(app);

function Componente2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [torneo, setTorneo] = useState(null);
  const [user, setUser] = useState(null);
  const [mostrarEquipoForm, setMostrarEquipoForm] = useState(false);
  const [menuParticipante, setMenuParticipante] = useState(null); // Estado para el menú desplegable

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
      const torneoDoc = await getDoc(doc(db, "torneos", id));
      if (torneoDoc.exists()) {
        setTorneo({ id: torneoDoc.id, ...torneoDoc.data() });
      }
    } catch (error) {
      console.error("Error al añadir equipo:", error);
    }
  };

  const handleVerDetalles = (uid) => {
    navigate(`/torneo/${id}/user/${uid}`);
  };
  const handleEliminarParticipante = async (participante) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar a este participante?")) {
      return;
    }
    try {
      await updateDoc(doc(db, "torneos", id), {
        participantes: Array.isArray(participante)
          ? arrayRemove(participante)
          : arrayRemove(participante),
      });
      const torneoDoc = await getDoc(doc(db, "torneos", id));
      if (torneoDoc.exists()) {
        setTorneo({ id: torneoDoc.id, ...torneoDoc.data() });
      }
    } catch (error) {
      console.error("Error al eliminar participante:", error);
    }
  };

  const toggleMenuParticipante = (index) => {
    setMenuParticipante(menuParticipante === index ? null : index);
  };

  if (!torneo) {
    return <div className="loading">Cargando participantes...</div>;
  }

  const esCreador = user?.uid === torneo.creadorId;
  const yaParticipaIndividual = torneo.participantes.includes(user?.uid);
  const yaParticipaEquipo = torneo.participantes.some(
    (participante) =>
      typeof participante === "object" && participante?.capitan === user?.uid
  );
  const puedeParticipar =
  !yaParticipaIndividual &&
  !yaParticipaEquipo &&
  (torneo.tipo === "individual" || esCreador); // Permitir solo si es individual o el creador puede participar

  return (
    <div className="componente-participantes">
      <h2>Participantes</h2>
      {puedeParticipar && (
        <button
          onClick={() => {
            if (torneo.tipo === "individual") {
              handleEquipoSubmit(user?.uid); // Autoinscribir al creador como participante individual
            } else {
              handleParticipar(); // Mostrar formulario para equipos
            }
          }}
          className="button primary"
        >
          {torneo.tipo === "individual" ? "Participar" : "Participar con un equipo"}
        </button>
      )}
      {mostrarEquipoForm && (
        <EquipoForm
          onSubmit={handleEquipoSubmit}
          onCancel={() => setMostrarEquipoForm(false)}
        />
      )}
      {torneo.participantes.length === 0 ? (
        <p>Aún no hay participantes en este torneo.</p>
      ) : (
        <ul className="lista-participantes">
          {torneo.participantes.map((participante, index) => (
            <li key={index} className="participante-item">
              <span className="nombre-participante">
                {typeof participante === "string"
                  ? ` ${participante.substring(0, 6)}...` // Mostrar UID parcial si es un string
                  : participante.nombre || `Equipo ${participante.capitan.substring(0, 6)}...`}
              </span>
              <div className="opciones-participante">
                <button
                  className="boton-opciones"
                  onClick={() => toggleMenuParticipante(index)}
                >
                  <FaEllipsisV />
                </button>
                {menuParticipante === index && (
                  <div className="menu-desplegable">
                    <button
                      className="menu-item"
                      onClick={() =>
                        handleVerDetalles(
                          typeof participante === "string"
                            ? participante
                            : participante.capitan
                        )
                      }
                    >
                      <FaUser /> Ver detalles
                    </button>
                    {esCreador && (
                      <button
                        className="menu-item eliminar"
                        onClick={() => handleEliminarParticipante(participante)}
                      >
                        <FaTrash /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default Componente2;