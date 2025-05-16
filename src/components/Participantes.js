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
  // collection, // No se usa directamente aquí si agregarNovedadConDebug lo maneja
  // addDoc, // No se usa directamente aquí
  // serverTimestamp // No se usa directamente aquí
} from "firebase/firestore";
import { app } from "../firebase";
import EquipoForm from "./EquipoForm";
import { FaEllipsisV, FaUser, FaTrash, FaUserPlus, FaUsers, FaSpinner } from "react-icons/fa";
import "./estilos/Participantes.css";
import { agregarNovedadConDebug } from "./utils/NovedadesUtils"; // Asegúrate que la ruta sea correcta

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
        console.log("[Participantes.js] Auth state changed, currentUser:", currentUser ? currentUser.uid : "null");
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
  
    console.log("[Participantes.js] handleInscripcionDirecta - Usuario actual:", user ? user.uid : "null");
    const nombreUsuario = user.displayName || user.email || `Usuario (${user.uid.substring(0,6)}...)`;
  
    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(user.uid),
      });
  
      // Asegúrate de que esta función se llame correctamente
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
    const capitanNombre = user.displayName || user.email || `Cap. (${user.uid.substring(0,6)}...)`;
    console.log("[Participantes.js] handleInscripcionEquipoSubmit - Nombre capitán para novedad:", capitanNombre);

    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(datosEquipo),
      });

      // Notificación para el equipo que se une (capitán)
      await agregarNovedadConDebug(
        torneoId,
        `El equipo "${datosEquipo.nombre}" (Capitán: ${capitanNombre}) se ha unido al torneo.`,
        'user_join', // Podría ser 'team_join' si se prefiere diferenciar
        { equipoNombre: datosEquipo.nombre, capitanId: user.uid, capitanNombre: capitanNombre, esEquipo: true },
        "Participantes.js (InscripcionEquipo)"
      );

      // **INICIO DE MODIFICACIÓN: Notificaciones para miembros individuales del equipo**
      if (miembrosEquipo && miembrosEquipo.length > 0) {
        for (const miembroId of miembrosEquipo) {
          if (miembroId === user.uid) continue; // Saltar al capitán, ya notificado con el equipo

          let miembroNombre = `Miembro (${miembroId.substring(0, 6)}...)`; // Nombre por defecto
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
            'user_join', // Usamos 'user_join', el mensaje lo diferencia
            { 
              userId: miembroId, 
              userName: miembroNombre, 
              equipoNombre: datosEquipo.nombre, 
              capitanId: user.uid, // Opcional: para contexto
              esMiembroDeEquipo: true 
            },
            "Participantes.js (InscripcionMiembroEquipo)"
          );
        }
      }
      // **FIN DE MODIFICACIÓN**

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
      // Para equipos, el ID del participante en la URL es el UID del capitán
      navigate(`/torneo/${torneoId}/participante/equipo/${participante.capitan}`, { state: { equipoData: participante, nombreTorneo: torneo?.titulo } });
    } else if (typeof participante === 'string') {
      // Para individuales, el ID es el UID del usuario
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

      const tipoNovedad = 'user_leave'; // Para eliminación por creador
      const dataExtraNovedad = esObjEquipo
        ? { equipoNombre: participanteParaEliminar.nombre, capitanId: participanteParaEliminar.capitan, eliminadoPorCreador: true }
        : { userId: participanteParaEliminar, eliminadoPorCreador: true }; // `participanteParaEliminar` es el UID aquí

      // Obtener nombre del usuario/equipo para la novedad
      let nombreParaNovedad = "Participante";
      if (esObjEquipo) {
          nombreParaNovedad = participanteParaEliminar.nombre || `Equipo (Cap. ${participanteParaEliminar.capitan?.substring(0,6)})`;
      } else {
          // Si es individual, necesitaríamos buscar su nombre si solo tenemos UID.
          // Por ahora, se usa el nombreConfirmacion que ya tiene esta lógica.
          nombreParaNovedad = nombreConfirmacion;
      }
      
      // Añadir el nombre del usuario/equipo a dataExtraNovedad si no está
      if (esObjEquipo && !dataExtraNovedad.equipoNombre) dataExtraNovedad.equipoNombre = nombreParaNovedad;
      if (!esObjEquipo && !dataExtraNovedad.userName) {
         // Para individuales, necesitamos el nombre del usuario si es posible
         // Esto requeriría buscar el nombre en la DB o pasarlo.
         // Por ahora, usamos el nombreConfirmacion que ya lo tiene formateado.
         dataExtraNovedad.userName = nombreParaNovedad;
      }


      await agregarNovedadConDebug( // USO DE LA FUNCIÓN MEJORADA
        torneoId,
        `${nombreParaNovedad} ha sido eliminado del torneo por el creador.`,
        tipoNovedad,
        dataExtraNovedad,
        "Participantes.js (EliminarParticipante)"
      );

      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
      } else {
        setTorneo(null); // El torneo podría haber sido eliminado concurrentemente
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

  let errorDisplay = null;
  if (error && torneo) {
      errorDisplay = <p className="form-error-message" style={{marginBottom: '1rem'}}>{error}</p>;
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
      {errorDisplay}

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
            let idParaMenuYAcciones = null;

            if (esObjEquipo) {
                nombreMostrar = participante.nombre || `Equipo (Cap: ${participante.capitan?.substring(0,6)}...)`;
                idParaMenuYAcciones = participante.capitan; // El capitán es el "dueño" del equipo para acciones
            } else if (typeof participante === 'string') {
                // Para individuales, el UID es la clave
                // Intentar buscar nombre del participante para mostrarlo si está en el estado 'participantes' del torneo (ya debería tenerlo si se formatea bien al cargar)
                // O, si 'participante' es un UID, buscar en una lista de usuarios cargados (más complejo)
                nombreMostrar = `Jugador (ID: ${participante.substring(0, 6)}...)`; // Placeholder si no hay nombre
                // Si tienes los nombres de los usuarios individuales cargados en algún sitio, úsalos aquí.
                // Ejemplo (necesitarías tener 'nombresUsuarios' como un Map<UID, Nombre>):
                // nombreMostrar = nombresUsuarios.get(participante) || `Jugador (ID: ${participante.substring(0, 6)}...)`;
                idParaMenuYAcciones = participante;
            }

            return (
              <li key={index} className={`participante-item ${esObjEquipo ? 'item-equipo' : 'item-individual'}`}>
                <span className="nombre-participante">{nombreMostrar}</span>
                {(esCreador || (user && user.uid === idParaMenuYAcciones)) && (
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
                        {esCreador && user.uid !== idParaMenuYAcciones && ( // Creador puede eliminar a otros
                          <button
                            className="menu-item eliminar"
                            onClick={() => handleEliminarParticipante(participante)}
                            title="Eliminar del torneo"
                          >
                            <FaTrash /> Eliminar
                          </button>
                        )}
                        {/* Lógica para "Abandonar Torneo" para el propio participante (si no es creador)
                            Esto podría ir aquí o en la sección de Información como ya está.
                            Si se pone aquí, asegurarse que 'participante' es el objeto correcto.
                        */}
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