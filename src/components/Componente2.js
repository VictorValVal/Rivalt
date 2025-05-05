import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
import { FaEllipsisV, FaUser, FaTrash } from "react-icons/fa";

const db = getFirestore(app);
const auth = getAuth(app);

function Componente2() {
  const { id: torneoId } = useParams();
  const navigate = useNavigate();

  const [torneo, setTorneo] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarEquipoForm, setMostrarEquipoForm] = useState(false);
  const [menuParticipante, setMenuParticipante] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let isMounted = true;

    const fetchTorneo = async () => {
      if (!torneoId) {
        if (isMounted) {
          setError("No se proporcionó ID de torneo.");
          setTorneo(null);
        }
        return;
      }
      try {
        const torneoRef = doc(db, "torneos", torneoId);
        const torneoDoc = await getDoc(torneoRef);
        if (isMounted) {
          if (torneoDoc.exists()) {
            setTorneo({ id: torneoDoc.id, ...torneoDoc.data() });
          } else {
            console.log("No se encontró el torneo con ID:", torneoId);
            setError("El torneo no existe o fue eliminado.");
            setTorneo(null);
          }
        }
      } catch (err) {
        console.error("Error fetching tournament:", err);
        if (isMounted) {
          setError(`Error al cargar el torneo: ${err.message}`);
          setTorneo(null);
        }
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        if (authAttempted && fetchAttempted) {
          setLoading(false);
        }
      }
    });

    let authAttempted = false;
    let fetchAttempted = false;

    fetchTorneo().finally(() => {
      fetchAttempted = true;
      if (isMounted && authAttempted) {
        setLoading(false);
      }
    });

    authAttempted = true;
    if (fetchAttempted) {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, [torneoId]);

  const esCreador = useMemo(() => {
    return user?.uid && torneo?.creadorId && user.uid === torneo.creadorId;
  }, [user, torneo]);

  const participantesArray = useMemo(() => {
    return Array.isArray(torneo?.participantes) ? torneo.participantes : [];
  }, [torneo]);

  const estaParticipando = useMemo(() => {
    if (!user?.uid || participantesArray.length === 0) {
      return false;
    }
    const participaIndividual = participantesArray.includes(user.uid);
    const participaEquipo = participantesArray.some(
      (p) => typeof p === 'object' && p !== null && p.capitan === user.uid
    );
    return participaIndividual || participaEquipo;
  }, [user, participantesArray]);

  const puedeInscribirse = useMemo(() => {
    if (!user || estaParticipando || !torneo) {
      return false;
    }
    if (torneo.tipo === "individual") {
      return true;
    }
    return esCreador;
  }, [user, estaParticipando, torneo, esCreador]);

  const handleMostrarFormEquipo = () => {
    if (esCreador && torneo?.tipo !== "individual") {
      setMostrarEquipoForm(true);
    }
  };

  const handleInscripcionSubmit = async (datosInscripcion) => {
    if (!user?.uid || !torneoId || !datosInscripcion) {
      console.error("Preconditions failed for submission:", { user: !!user, torneoId, datosInscripcion });
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const torneoRef = doc(db, "torneos", torneoId);

    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(datosInscripcion)
      });

      const updatedTorneoDoc = await getDoc(torneoRef);

      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
        setMostrarEquipoForm(false);
      } else {
        console.error("Torneo no encontrado después de la actualización!");
        setError("Error al recargar datos después de la inscripción.");
        setTorneo(null);
      }

    } catch (err) {
      console.error("Error during participation submission:", err);
      setError(`Error al inscribirte: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerDetalles = (participanteId) => {
    if (participanteId) {
      navigate(`/torneo/${torneoId}/user/${participanteId}`);
    }
  };

  const handleEliminarParticipante = async (participanteParaEliminar) => {
    if (!esCreador) return;
    if (!window.confirm(`¿Seguro que quieres eliminar a "${typeof participanteParaEliminar === 'string' ? participanteParaEliminar.substring(0, 6) + '...' : participanteParaEliminar.nombre || 'Equipo (sin nombre)'}"?`)) {
      return;
    }

    const torneoRef = doc(db, "torneos", torneoId);
    try {
      await updateDoc(torneoRef, {
        participantes: arrayRemove(participanteParaEliminar)
      });
      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
      } else {
        setTorneo(null);
      }
      setMenuParticipante(null);

    } catch (err) {
      console.error("Error al eliminar participante:", err);
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const toggleMenuParticipante = (index) => {
    setMenuParticipante(menuParticipante === index ? null : index);
  };

  if (loading) {
    return <div className="componente-participantes loading">Cargando participantes...</div>;
  }

  if (error) {
    return <div className="componente-participantes error-message">Error: {error}</div>;
  }

  if (!torneo) {
    return <div className="componente-participantes error-message">No se encontró la información del torneo.</div>;
  }

  return (
    <div className="componente-participantes">

      {user && estaParticipando && (
        <p className="mensaje-participacion">✅ Ya estás participando en este torneo.</p>
      )}

      {puedeInscribirse && (
        <button
          onClick={() => {
            if (torneo.tipo === "individual") {
              handleInscripcionSubmit(user.uid);
            } else {
              handleMostrarFormEquipo();
            }
          }}
          className="button primary"
          disabled={isSubmitting || mostrarEquipoForm}
        >
          {isSubmitting ? "Inscribiendo..." : (torneo.tipo === "individual" ? "Participar Ahora" : "Inscribir mi Equipo")}
        </button>
      )}

      {mostrarEquipoForm && esCreador && torneo.tipo !== "individual" && (
        <EquipoForm
          onSubmit={(datosEquipo) => handleInscripcionSubmit({ ...datosEquipo, capitan: user.uid })}
          onCancel={() => setMostrarEquipoForm(false)}
          capitanId={user?.uid}
        />
      )}

      <h3>Participantes ({participantesArray.length})</h3>
      {participantesArray.length === 0 ? (
        <p>Aún no hay participantes inscritos.</p>
      ) : (
        <ul className="lista-participantes">
          {participantesArray.map((participante, index) => {
            const esEquipo = typeof participante === "object" && participante !== null;
            let nombreMostrar = "Participante Desconocido";
            let idParaDetalles = null;

            if (esEquipo) {
              if (participante.nombre && participante.nombre.trim() !== "") {
                nombreMostrar = participante.nombre;
              } else {
                nombreMostrar = `Equipo sin nombre (Cap: ${participante.capitan?.substring(0, 6)}...)`;
              }
              idParaDetalles = participante.capitan;
            } else if (typeof participante === 'string') {
              nombreMostrar = `Jugador (${participante.substring(0, 6)}...)`;
              idParaDetalles = participante;
            }

            return (
              <li key={index} className="participante-item">
                <span className="nombre-participante">{nombreMostrar}</span>
                <div className="opciones-participante">
                  <button
                    className="boton-opciones"
                    onClick={() => toggleMenuParticipante(index)}
                    aria-label="Opciones"
                    disabled={!esCreador && !idParaDetalles}
                  >
                    <FaEllipsisV />
                  </button>
                  {menuParticipante === index && (
                    <div className="menu-desplegable">
                      {idParaDetalles && (
                        <button
                          className="menu-item"
                          onClick={() => handleVerDetalles(idParaDetalles)}
                        >
                          <FaUser /> Ver detalles
                        </button>
                      )}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Componente2;