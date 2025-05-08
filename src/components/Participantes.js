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
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { app } from "../firebase";
import EquipoForm from "./EquipoForm";
import { FaEllipsisV, FaUser, FaTrash, FaUserPlus, FaUsers, FaSpinner } from "react-icons/fa";
import "./estilos/Participantes.css";

const db = getFirestore(app);
const auth = getAuth(app);

const agregarNovedad = async (torneoId, mensaje, tipo, dataExtra = {}) => {
  try {
    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    await addDoc(novedadesRef, {
      mensaje,
      tipo,
      timestamp: serverTimestamp(),
      ...dataExtra,
    });
  } catch (error) {
    console.error("Error al agregar novedad:", error);
  }
};


function Participantes() {
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

    let authAttempted = false;
    let fetchAttempted = false;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        authAttempted = true;
        if (fetchAttempted) {
          setLoading(false);
        }
      }
    });

    fetchTorneo().finally(() => {
      fetchAttempted = true;
      if (isMounted && authAttempted) {
        setLoading(false);
      }
    });

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

  const estaInscritoElUsuarioActual = useMemo(() => {
    if (!user?.uid || !torneo || participantesArray.length === 0) {
      return false;
    }
    if (participantesArray.includes(user.uid)) {
      return true;
    }
    return participantesArray.some(
      (p) => typeof p === "object" && p !== null && p.capitan === user.uid
    );
  }, [user, torneo, participantesArray]);

  const puedeUsuarioActualInscribirse = useMemo(() => {
    if (!user || !torneo || estaInscritoElUsuarioActual) {
      return false;
    }
    return !estaInscritoElUsuarioActual && (participantesArray.length || 0) < (torneo.numEquipos || Infinity);
  }, [user, torneo, estaInscritoElUsuarioActual, participantesArray]);


  const handleInscripcionDirecta = async () => {
    if (!user?.uid || !torneoId || torneo?.modo !== "individual") {
      setError("No se puede realizar la inscripción individual.");
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const torneoRef = doc(db, "torneos", torneoId);

    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(user.uid),
      });
      
      const nombreUsuario = user.displayName || user.email || `Usuario (${user.uid.substring(0,6)})`;
      await agregarNovedad(
        torneoId,
        `${nombreUsuario} se ha unido al torneo.`,
        'user_join',
        { userId: user.uid, userName: nombreUsuario }
      );

      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
      }
    } catch (err) {
      console.error("Error en inscripción individual:", err);
      setError(`Error al inscribirte: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMostrarFormEquipo = () => {
    if (torneo?.modo === "equipo") {
        setMostrarEquipoForm(true);
    }
  };


  const handleInscripcionEquipoSubmit = async (nombreEquipo, miembrosEquipo) => {
    if (!user?.uid || !torneoId || !nombreEquipo || !miembrosEquipo) {
      console.error("Datos incompletos para inscripción de equipo.");
      setError("Datos incompletos para la inscripción del equipo.");
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const torneoRef = doc(db, "torneos", torneoId);

    const datosEquipo = {
      nombre: nombreEquipo.trim(),
      capitan: user.uid,
      miembros: miembrosEquipo, 
    };

    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(datosEquipo),
      });

      await agregarNovedad(
        torneoId,
        `El equipo "${datosEquipo.nombre}" (Capitán: ${user.displayName || user.email}) se ha unido al torneo.`,
        'user_join', 
        { equipoNombre: datosEquipo.nombre, capitanId: user.uid }
      );

      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
        setMostrarEquipoForm(false);
      }
    } catch (err) {
      console.error("Error en inscripción de equipo:", err);
      setError(`Error al inscribir al equipo: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleVerDetalles = (participante) => {
    if (!torneoId || !participante) return;

    const esObjEquipo = typeof participante === "object" && participante !== null && participante.capitan;
    
    if (esObjEquipo) {
      console.log("Navegando a detalles del equipo, capitán ID:", participante.capitan);
      navigate(`/torneo/${torneoId}/participante/equipo/${participante.capitan}`, { state: { equipoData: participante, nombreTorneo: torneo?.titulo } });
    } else if (typeof participante === 'string') {
      console.log("Navegando a detalles del usuario:", participante);
      navigate(`/torneo/${torneoId}/participante/usuario/${participante}`, { state: { nombreTorneo: torneo?.titulo } });
    }
  };

  const handleEliminarParticipante = async (participanteParaEliminar) => {
    if (!esCreador || !torneo) return;

    const esObjEquipo = typeof participanteParaEliminar === 'object' && participanteParaEliminar !== null;
    const nombreConfirmacion = esObjEquipo
        ? participanteParaEliminar.nombre || `Equipo (Cap: ${participanteParaEliminar.capitan?.substring(0,6)}...)`
        : `Jugador (${String(participanteParaEliminar).substring(0,6)}...)`;

    if (!window.confirm(`¿Seguro que quieres eliminar a "${nombreConfirmacion}" del torneo?`)) {
      return;
    }
    
    setIsSubmitting(true); 
    setError(null);
    const torneoRef = doc(db, "torneos", torneoId);
    try {
      await updateDoc(torneoRef, {
        participantes: arrayRemove(participanteParaEliminar),
      });
      
      const tipoNovedad = esObjEquipo ? 'user_leave' : 'user_leave'; 
      const dataExtraNovedad = esObjEquipo 
        ? { equipoNombre: participanteParaEliminar.nombre, capitanId: participanteParaEliminar.capitan } 
        : { userId: participanteParaEliminar };
      await agregarNovedad(
        torneoId,
        `${nombreConfirmacion} ha sido eliminado del torneo por el creador.`,
        tipoNovedad, 
        dataExtraNovedad
      );

      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
      } else {
        setTorneo(null);
      }
      setMenuParticipante(null);
    } catch (err) {
      console.error("Error al eliminar participante:", err);
      setError(`Error al eliminar: ${err.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const toggleMenuParticipante = (index) => {
    setMenuParticipante(menuParticipante === index ? null : index);
  };

  if (loading) {
    return (
        <div className="componente-participantes loading">
            <FaSpinner className="spinner-icon" />
            Cargando participantes...
        </div>
    );
  }

  if (error && !torneo) {
    return <div className="componente-participantes error-message">Error: {error}</div>;
  }
  
  if (!torneo) {
    return <div className="componente-participantes error-message">No se encontró la información del torneo.</div>;
  }

  let botonInscripcionPrincipal;
  if (user && puedeUsuarioActualInscribirse) {
    if (torneo.modo === "individual") {
      botonInscripcionPrincipal = (
        <button
          onClick={handleInscripcionDirecta}
          className="button primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <><FaSpinner className="spinner-icon-button"/> Inscribiendo...</> : <><FaUserPlus /> Participar Ahora</>}
        </button>
      );
    } else if (torneo.modo === "equipo") {
      botonInscripcionPrincipal = (
        <button
          onClick={handleMostrarFormEquipo}
          className="button primary"
          disabled={isSubmitting || mostrarEquipoForm}
        >
          {isSubmitting ? <><FaSpinner className="spinner-icon-button"/> Procesando...</> : <><FaUsers /> Inscribir mi Equipo</>}
        </button>
      );
    }
  }


  return (
    <div className="componente-participantes">
      {error && <p className="form-error-message">{error}</p>}

      {user && estaInscritoElUsuarioActual && (
        <p className="mensaje-participacion">Ya estás participando en este torneo.</p>
      )}

      {botonInscripcionPrincipal}

      {mostrarEquipoForm && torneo.modo === "equipo" && (
        <EquipoForm
          onSubmit={handleInscripcionEquipoSubmit}
          onCancel={() => { setMostrarEquipoForm(false); setError("");}}
          maxMiembros={torneo.maxMiembrosPorEquipo || 10}
        />
      )}

      <h3>Participantes ({participantesArray.length} / {torneo.numEquipos || "Ilimitados"})</h3>
      {participantesArray.length === 0 ? (
        <p>Aún no hay participantes inscritos.</p>
      ) : (
        <ul className="lista-participantes">
          {participantesArray.map((participante, index) => {
            const esObjEquipo = typeof participante === "object" && participante !== null && participante.capitan;
            let nombreMostrar = "Desconocido";
            let idParaMenu = null;

            if (esObjEquipo) {
                nombreMostrar = participante.nombre || `Equipo (Cap: ${participante.capitan?.substring(0,6)}...)`;
                idParaMenu = participante.capitan;
            } else if (typeof participante === 'string') {
                nombreMostrar = `Jugador (ID: ${participante.substring(0, 6)}...)`;
                idParaMenu = participante;
            }

            return (
              <li key={index} className={`participante-item ${esObjEquipo ? 'item-equipo' : 'item-individual'}`}>
                <span className="nombre-participante">{nombreMostrar}</span>
                {(esCreador || (user && user.uid === idParaMenu)) && (
                  <div className="opciones-participante">
                    <button
                      className="boton-opciones"
                      onClick={() => toggleMenuParticipante(index)}
                      aria-label="Opciones del participante"
                      disabled={isSubmitting && menuParticipante === index}
                    >
                      <FaEllipsisV />
                    </button>
                    {menuParticipante === index && (
                      <div className="menu-desplegable">
                        <button
                            className="menu-item"
                            onClick={() => {
                                handleVerDetalles(participante);
                                setMenuParticipante(null);
                            }}
                            title="Ver perfil o detalles"
                        >
                            <FaUser /> Ver Detalles
                        </button>
                        {esCreador && (
                          <button
                            className="menu-item eliminar"
                            onClick={() => handleEliminarParticipante(participante)}
                            title="Eliminar del torneo"
                          >
                            <FaTrash /> Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Participantes;