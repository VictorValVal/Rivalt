// components/Participantes.js
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
import { FaEllipsisV, FaUser, FaTrash, FaUserPlus, FaSpinner, FaUserCircle } from "react-icons/fa";
import "./estilos/Participantes.css";
import { agregarNovedadConDebug } from "./utils/NovedadesUtils";

const db = getFirestore(app);
const auth = getAuth(app);

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
  const [individualParticipantDetails, setIndividualParticipantDetails] = useState({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    let isMounted = true;

    const fetchTorneoAndParticipantDetails = async () => {
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
            const currentTorneoData = { id: torneoDoc.id, ...torneoDoc.data() };
            setTorneo(currentTorneoData);

            if (currentTorneoData.modo === "individual" && Array.isArray(currentTorneoData.participantes)) {
              const UIDsToFetch = currentTorneoData.participantes.filter(uid =>
                typeof uid === 'string' && !individualParticipantDetails[uid]
              );
              if (UIDsToFetch.length > 0) {
                const newDetailsPromises = UIDsToFetch.map(async (uid) => {
                  try {
                    const userDocRef = doc(db, "usuarios", uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                      return {
                        [uid]: {
                          displayName: userDocSnap.data().nombre || userDocSnap.data().email || `Usuario (${uid.substring(0, 6)}...)`,
                          photoURL: userDocSnap.data().photoURL || null,
                          email: userDocSnap.data().email || null
                        }
                      };
                    } else {
                      return { [uid]: { displayName: `Usuario (${uid.substring(0, 6)}...)`, photoURL: null, email: null } };
                    }
                  } catch (detailErr) {
                    console.error(`Error fetching details for user ${uid}:`, detailErr);
                    return { [uid]: { displayName: `Usuario (${uid.substring(0, 6)}...) (Error)`, photoURL: null, email: null } };
                  }
                });
                const resolvedDetails = await Promise.all(newDetailsPromises);
                const newDetailsMap = resolvedDetails.reduce((acc, current) => ({ ...acc, ...current }), {});
                setIndividualParticipantDetails(prev => ({ ...prev, ...newDetailsMap }));
              }
            }
          } else {
            console.log("No se encontró el torneo con ID:", torneoId);
            setError("El torneo no existe o fue eliminado.");
            setTorneo(null);
          }
        }
      } catch (err) {
        console.error("Error fetching tournament or participant details:", err);
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
        console.log("[Participantes.js] Auth state changed, currentUser:", currentUser ? currentUser.uid : "null");
        setUser(currentUser);
        authAttempted = true;
        if (fetchAttempted) {
          setLoading(false);
        }
      }
    });

    fetchTorneoAndParticipantDetails().finally(() => {
      fetchAttempted = true;
      if (isMounted && authAttempted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, [torneoId, individualParticipantDetails]);


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
    // Asegurarse de que numEquipos existe y es un número antes de la comparación
    const maxParticipantes = typeof torneo.numEquipos === 'number' ? torneo.numEquipos : Infinity;
    return !estaInscritoElUsuarioActual && (participantesArray.length || 0) < maxParticipantes;
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

    console.log("[Participantes.js] handleInscripcionDirecta - Usuario actual:", user ? user.uid : "null");
    const nombreUsuario = user.displayName || user.email || `Usuario (${user.uid.substring(0, 6)}...)`;

    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(user.uid),
      });

      await agregarNovedadConDebug(
        torneoId,
        `${nombreUsuario} se ha unido al torneo.`,
        'user_join',
        { userId: user.uid, userName: nombreUsuario },
        "Participantes.js (InscripcionDirecta)"
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

    console.log("[Participantes.js] handleInscripcionEquipoSubmit - Usuario (Capitán) actual:", user ? user.uid : "null");
    const capitanNombre = user.displayName || user.email || `Cap. (${user.uid.substring(0, 6)}...)`;
    console.log("[Participantes.js] handleInscripcionEquipoSubmit - Nombre capitán para novedad:", capitanNombre);

    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(datosEquipo),
      });

      await agregarNovedadConDebug(
        torneoId,
        `El equipo "${datosEquipo.nombre}" (Capitán: ${capitanNombre}) se ha unido al torneo.`,
        'team_join',
        { equipoNombre: datosEquipo.nombre, capitanId: user.uid, capitanNombre: capitanNombre, esEquipo: true },
        "Participantes.js (InscripcionEquipo)"
      );

      if (miembrosEquipo && miembrosEquipo.length > 0) {
        for (const miembroId of miembrosEquipo) {
          if (miembroId === user.uid) continue;

          let miembroNombre = `Miembro (${miembroId.substring(0, 6)}...)`;
          try {
            const miembroDocRef = doc(db, "usuarios", miembroId);
            const miembroDocSnap = await getDoc(miembroDocRef);
            if (miembroDocSnap.exists()) {
              miembroNombre = miembroDocSnap.data().nombre || miembroDocSnap.data().email || miembroNombre;
            }
          } catch (fetchError) {
            console.error(`Error buscando nombre del miembro ${miembroId}:`, fetchError);
          }

          await agregarNovedadConDebug(
            torneoId,
            `${miembroNombre} se ha unido al torneo como parte del equipo "${datosEquipo.nombre}".`,
            'user_join',
            {
              userId: miembroId,
              userName: miembroNombre,
              equipoNombre: datosEquipo.nombre,
              capitanId: user.uid,
              esMiembroDeEquipo: true
            },
            "Participantes.js (InscripcionMiembroEquipo)"
          );
        }
      }

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
      navigate(`/torneo/${torneoId}/participante/equipo/${participante.capitan}`, { state: { equipoData: participante, nombreTorneo: torneo?.titulo } });
    } else if (typeof participante === 'string') {
      navigate(`/torneo/${torneoId}/participante/usuario/${participante}`, { state: { nombreTorneo: torneo?.titulo } });
    }
  };

  const handleEliminarParticipante = async (participanteParaEliminar) => {
    if (!esCreador || !torneo) return;

    const esObjEquipo = typeof participanteParaEliminar === 'object' && participanteParaEliminar !== null;
    let nombreConfirmacion = "Participante";

    if (esObjEquipo) {
      nombreConfirmacion = participanteParaEliminar.nombre || `Equipo (Cap: ${participanteParaEliminar.capitan?.substring(0, 6)}...)`;
    } else if (typeof participanteParaEliminar === 'string') {
      const details = individualParticipantDetails[participanteParaEliminar];
      nombreConfirmacion = details?.displayName || `Jugador (ID: ${participanteParaEliminar.substring(0, 6)}...)`;
    }

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

      const tipoNovedad = 'user_leave';
      let nombreParaNovedad = nombreConfirmacion;

      await agregarNovedadConDebug(
        torneoId,
        `${nombreParaNovedad} ha sido eliminado del torneo por el creador.`,
        tipoNovedad,
        esObjEquipo
          ? { equipoNombre: participanteParaEliminar.nombre, capitanId: participanteParaEliminar.capitan, eliminadoPorCreador: true }
          : { userId: participanteParaEliminar, userName: nombreParaNovedad, eliminadoPorCreador: true },
        "Participantes.js (EliminarParticipante)"
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
  const esEspectador = useMemo(() => {
    return Array.isArray(torneo?.espectadores) && user?.uid && torneo.espectadores.includes(user.uid);
  }, [torneo, user]);

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

  let errorDisplay = null;
  if (error && torneo) {
    errorDisplay = <p className="form-error-message" style={{ marginBottom: '1rem' }}>{error}</p>;
  }


  let botonInscripcionPrincipal = null;
  if (user && puedeUsuarioActualInscribirse && !esEspectador) {
    if (torneo.modo === "individual") {
      botonInscripcionPrincipal = (
        <button
          onClick={handleInscripcionDirecta}
          className="button primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <><FaSpinner className="spinner-icon-button" /> Inscribiendo...</> : <><FaUserPlus /> Participar Ahora</>}
        </button>
      );
    } else if (torneo.modo === "equipo") {
      botonInscripcionPrincipal = (
        <button
          onClick={handleMostrarFormEquipo}
          className="button primary"
          disabled={isSubmitting || mostrarEquipoForm}
        >
          {isSubmitting ? <><FaSpinner className="spinner-icon-button" /> Procesando...</> : <><FaUser /> Inscribir mi Equipo</>}
        </button>
      );
    }
  }


  return (
    <div className="componente-participantes">
      {errorDisplay}

      {user && estaInscritoElUsuarioActual && (
        <p className="mensaje-participacion">Ya estás participando en este torneo.</p>
      )}

      {botonInscripcionPrincipal}

      {mostrarEquipoForm && torneo.modo === "equipo" && (
        <div className="equipo-form-container"> {/* Envolver EquipoForm en su contenedor */}
          <EquipoForm
            onSubmit={handleInscripcionEquipoSubmit}
            onCancel={() => { setMostrarEquipoForm(false); setError(""); }}
            maxMiembros={torneo.maxMiembrosPorEquipo || 10} // Asumiendo que tienes esta propiedad
          />
        </div>
      )}

      <h3>Participantes ({participantesArray.length} / {torneo.numEquipos || "Ilimitados"})</h3>
      {participantesArray.length === 0 ? (
        <p>Aún no hay participantes inscritos.</p>
      ) : (
        <ul className="lista-participantes">
          {participantesArray.map((participante, index) => {
            const esObjEquipo = typeof participante === "object" && participante !== null && participante.capitan;
            let nombreMostrar = "Desconocido";
            let idParaMenuYAcciones = null;
            let participantPhoto = null;
            let participantInitial = "?";

            if (esObjEquipo) {
              nombreMostrar = participante.nombre || `Equipo (Cap: ${participante.capitan?.substring(0, 6)}...)`;
              idParaMenuYAcciones = participante.capitan;
            } else if (typeof participante === 'string') {
              idParaMenuYAcciones = participante;
              const details = individualParticipantDetails[participante];
              if (details) {
                nombreMostrar = details.displayName;
                participantPhoto = details.photoURL;
                participantInitial = details.displayName
                  ? details.displayName.charAt(0).toUpperCase()
                  : (details.email ? details.email.charAt(0).toUpperCase() : "?");
              } else {
                nombreMostrar = `Cargando... (${participante.substring(0, 6)}...)`;
                participantInitial = participante.charAt(0).toUpperCase();
              }
            }

            return (
              <li key={index} className={`participante-item ${esObjEquipo ? 'item-equipo' : 'item-individual'}`}>
                {torneo.modo === "individual" && !esObjEquipo && (
                  <div className="participante-avatar-container">
                    {typeof participantPhoto === "string" && participantPhoto.trim().length > 0 ? (
                      <img src={participantPhoto} alt={`Avatar de ${nombreMostrar}`} className="participante-avatar-img" />
                    ) : (
                      <div className="participante-avatar-default">{participantInitial}</div>
                    )}
                  </div>
                )}
                <span className="nombre-participante">{nombreMostrar}</span>
                {/* Mostrar el menú de opciones para todos los usuarios */}
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
                      {/* El botón de eliminar solo se muestra si el usuario actual es el creador */}
                      {/* y no está intentando eliminarse a sí mismo (si es un participante individual) */}
                      {esCreador && (user?.uid !== idParaMenuYAcciones || esObjEquipo) && (
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Participantes;