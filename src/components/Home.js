import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { app } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { FaTrophy, FaTrash, FaPlus, FaSignInAlt } from "react-icons/fa";
import "./estilos/Home.css"; // Ruta relativa al archivo Home.js

const db = getFirestore(app);
const auth = getAuth(app);

function Home() {
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState([]);
  const [user, setUser] = useState(null);

  // ... (useEffect y otras funciones sin cambios) ...
    useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTorneos([]);
        return;
      }


      const qCreados = query(
        collection(db, "torneos"),
        where("creadorId", "==", currentUser.uid)
      );


      const qParticipantesIndividual = query(
        collection(db, "torneos"),
        where("participantes", "array-contains", currentUser.uid)
      );

      // Suscripción a torneos creados
      const unsubscribeCreados = onSnapshot(qCreados, (snapshot) => {
        const nuevosTorneos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTorneos((prev) => [...prev, ...nuevosTorneos]);
      });

      // Suscripción a torneos individuales participados
      const unsubscribeParticipantesIndividual = onSnapshot(
        qParticipantesIndividual,
        (snapshot) => {
          const nuevosTorneos = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTorneos((prev) => [...prev, ...nuevosTorneos]);
        }
      );

      // Suscripción a torneos por equipos
      const unsubscribeAllTorneos = onSnapshot(
        collection(db, "torneos"),
        (snapshot) => {
          const nuevosTorneos = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              // Verificar si es un torneo por equipos donde el usuario es capitán
              if (data.modo === "equipo" && Array.isArray(data.participantes)) {
                const esParticipante = data.participantes.some(
                  (p) => p?.capitan === currentUser.uid
                );
                if (esParticipante) {
                  return { id: doc.id, ...data };
                }
              }
              return null;
            })
            .filter(Boolean);

          setTorneos((prev) => {
            // Filtrar duplicados
            const uniqueTorneos = [...prev, ...nuevosTorneos].reduce(
              (acc, current) => {
                const x = acc.find((item) => item.id === current.id);
                if (!x) {
                  return acc.concat([current]);
                } else {
                  return acc;
                }
              },
              []
            );
            return uniqueTorneos;
          });
        }
      );

      return () => {
        unsubscribeCreados();
        unsubscribeParticipantesIndividual();
        unsubscribeAllTorneos();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  const handleNuevoTorneo = () => navigate("/nuevo");
  const handleUnirseTorneo = () => navigate("/unirse");

  const handleClickTorneo = (id) => {
    navigate(`/torneo/${id}`);
  };

  const torneosUnicos = torneos.reduce((acc, current) => {
    const x = acc.find((item) => item.id === current.id);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);
  const handleEliminarTorneo = async (id) => {
    try {
      const torneoRef = doc(db, "torneos", id); // Referencia al documento del torneo
      await deleteDoc(torneoRef); // Elimina el documento de Firebase
      setTorneos((prev) => prev.filter((torneo) => torneo.id !== id)); // Actualiza el estado local
      console.log(`Torneo con ID ${id} eliminado correctamente.`);
    } catch (error) {
      console.error("Error al eliminar el torneo:", error);
    }
  };


  return (
    <div>
      <header></header>
      <main style={{ position: "relative", padding: "1rem" }}>
      <div className="main-buttons">
          {/* --- Botón Añadir Modificado --- */}
          <button onClick={handleNuevoTorneo} title="Añadir Torneo"> {/* title para tooltip */}
            <FaPlus /> {/* Icono */}
          </button>
          {/* --- Botón Unirse Modificado --- */}
          <button onClick={handleUnirseTorneo} title="Unirse a Torneo"> {/* title para tooltip */}
            <FaSignInAlt /> {/* Icono */}

          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "50px" }}>
          {torneosUnicos.map((torneo) => (
            <div
              key={torneo.id}
              onClick={() => handleClickTorneo(torneo.id)}
              className="card"
            >
              <div className="content">
                {/* === CARA POSTERIOR === */}
                <div className="back">
                  <div className="back-content">
                    {/* --- Icono de papelera ELIMINADO de aquí --- */}
                    <svg
                      stroke="#ffffff"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 50 50"
                      height="50px"
                      width="50px"
                      fill="#ffffff"
                    >
                      <g strokeWidth="0" id="SVGRepo_bgCarrier"></g>
                      <g strokeLinejoin="round" strokeLinecap="round" id="SVGRepo_tracerCarrier"></g>
                      <g id="SVGRepo_iconCarrier">
                        <FaTrophy size={50} color="white" />
                      </g>
                    </svg>
                    <strong>{torneo.titulo}</strong>
                  </div>
                </div>
                {/* === CARA FRONTAL === */}
                <div className="front">
                  <div className="img">
                    <div className="circle"></div>
                    <div className="circle" id="right"></div>
                    <div className="circle" id="bottom"></div>
                  </div>
                  <div className="front-content">
                    {/* --- Icono de papelera AÑADIDO aquí --- */}
                    <FaTrash
                      className="trash-icon" // Usaremos esta clase para el CSS
                      onClick={(e) => {
                        e.stopPropagation(); // Importante para no navegar al hacer clic
                        handleEliminarTorneo(torneo.id);
                      }}
                      />
                    <small className="badge">{torneo.deporte}</small>
                    <div className="description">
                      <div className="title">
                        <p className="title">
                          <strong>{torneo.titulo}</strong>
                        </p>
                      </div>
                      <p className="card-footer">
                        {torneo.tipo} &nbsp; | &nbsp; {torneo.participantes.length} Participantes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Home;