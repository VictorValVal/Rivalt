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
import EquipoForm from "./EquipoForm"; // Asegúrate que la ruta sea correcta
import { FaEllipsisV, FaUser, FaTrash, FaUserPlus, FaUsers } from "react-icons/fa"; // Iconos actualizados
import "./estilos/Participantes.css"; // Asegúrate que la ruta sea correcta

const db = getFirestore(app);
const auth = getAuth(app);

function Participantes() { // Renombrado de Componente2 a Participantes
  const { id: torneoId } = useParams();
  const navigate = useNavigate();

  const [torneo, setTorneo] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarEquipoForm, setMostrarEquipoForm] = useState(false);
  const [menuParticipante, setMenuParticipante] = useState(null); // Para el menú desplegable de cada participante
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
          // setLoading(false); // Asegurar que loading se actualice
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
      // No colocar setLoading(false) aquí si auth no ha terminado
    };

    let authAttempted = false; // Flag para saber si onAuthStateChanged ya corrió una vez
    let fetchAttempted = false; // Flag para saber si fetchTorneo ya corrió una vez

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        authAttempted = true;
        // Solo finalizar carga si ambas operaciones (auth y fetch) han intentado completarse
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
    // Comprobar si el UID del usuario actual está directamente en el array (inscripción individual)
    if (participantesArray.includes(user.uid)) {
      return true;
    }
    // Comprobar si el usuario actual es capitán de algún equipo inscrito
    return participantesArray.some(
      (p) => typeof p === "object" && p !== null && p.capitan === user.uid
    );
  }, [user, torneo, participantesArray]);


  // CORRECCIÓN: Lógica para determinar si el creador PUEDE inscribirse
  // El creador NO debería poder inscribirse a su propio torneo como participante individual o equipo nuevo.
  // Pero sí podría tener un botón "Inscribir participante" para añadir a OTROS manualmente si fuera necesario (no implementado aquí).
  // La lógica actual de `puedeInscribirse` se enfoca en si el *usuario actual* puede pulsar el botón de "Participar" o "Inscribir mi equipo".
  const puedeUsuarioActualInscribirse = useMemo(() => {
    if (!user || !torneo || estaInscritoElUsuarioActual) { // Si no hay usuario, torneo, o ya está inscrito, no puede.
      return false;
    }
    // Si es el creador, generalmente no se inscribe a sí mismo mediante este botón,
    // a menos que sea un torneo individual y quiera participar (aunque esto podría ser confuso).
    // Por ahora, si es el creador, el botón de inscripción será para "Inscribir mi Equipo" si el torneo es por equipos.
    // O "Participar Ahora" si es individual (y él no es el único participante posible).
    // La lógica original de `puedeInscribirse` es un poco confusa aquí. Simplifiquemos:
    return !estaInscritoElUsuarioActual && (torneo.participantes?.length || 0) < (torneo.numEquipos || Infinity);
  }, [user, torneo, estaInscritoElUsuarioActual]);


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
      // Actualizar estado local del torneo
      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
      }
      // alert("¡Te has inscrito al torneo con éxito!"); // Opcional
    } catch (err) {
      console.error("Error en inscripción individual:", err);
      setError(`Error al inscribirte: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMostrarFormEquipo = () => {
    if (torneo?.modo === "equipo") { // Solo mostrar si es modo equipo
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

    // El capitán es el usuario actual
    const datosEquipo = {
      nombre: nombreEquipo,
      capitan: user.uid, // El usuario actual es el capitán
      miembros: miembrosEquipo, // Array de emails/UIDs de los miembros (EquipoForm debería asegurar esto)
      // Puedes añadir un ID único para el equipo si es necesario aquí con uuidv4()
    };

    try {
      await updateDoc(torneoRef, {
        participantes: arrayUnion(datosEquipo),
      });
      // Actualizar estado local del torneo
      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
        setMostrarEquipoForm(false); // Ocultar formulario tras éxito
      }
      // alert("¡Equipo inscrito con éxito!"); // Opcional
    } catch (err) {
      console.error("Error en inscripción de equipo:", err);
      setError(`Error al inscribir al equipo: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleVerDetalles = (participanteId) => {
    // Esta función podría navegar a un perfil de usuario o equipo.
    // Por ahora, solo hacemos console.log o podrías abrir un modal.
    if (participanteId) {
      console.log("Ver detalles de:", participanteId);
      // navigate(`/perfil/${participanteId}`); // Ejemplo de navegación
    }
  };

  const handleEliminarParticipante = async (participanteParaEliminar) => {
    if (!esCreador || !torneo) return; // Solo el creador puede eliminar

    const nombreConfirmacion = typeof participanteParaEliminar === 'string'
        ? `Jugador (${participanteParaEliminar.substring(0,6)}...)`
        : participanteParaEliminar.nombre || `Equipo (Cap: ${participanteParaEliminar.capitan?.substring(0,6)}...)`;

    if (!window.confirm(`¿Seguro que quieres eliminar a "${nombreConfirmacion}" del torneo?`)) {
      return;
    }

    const torneoRef = doc(db, "torneos", torneoId);
    try {
      await updateDoc(torneoRef, {
        participantes: arrayRemove(participanteParaEliminar),
      });
      // Actualizar estado local
      const updatedTorneoDoc = await getDoc(torneoRef);
      if (updatedTorneoDoc.exists()) {
        setTorneo({ id: updatedTorneoDoc.id, ...updatedTorneoDoc.data() });
      } else {
        setTorneo(null); // O manejar el error de que el torneo ya no exista
      }
      setMenuParticipante(null); // Cerrar el menú
    } catch (err) {
      console.error("Error al eliminar participante:", err);
      setError(`Error al eliminar: ${err.message}`);
    }
  };

  const toggleMenuParticipante = (index) => {
    setMenuParticipante(menuParticipante === index ? null : index);
  };


  // --- RENDERIZADO ---
  if (loading) {
    return <div className="participantes-container loading">Cargando participantes...</div>;
  }

  if (error && !torneo) { // Si hay un error fatal que impide cargar el torneo
    return <div className="participantes-container error-message">Error: {error}</div>;
  }
  
  if (!torneo) {
    return <div className="participantes-container error-message">No se encontró la información del torneo.</div>;
  }

  // Determinar el texto y la acción del botón principal de inscripción
  let botonInscripcionPrincipal;
  if (user && puedeUsuarioActualInscribirse) {
    if (torneo.modo === "individual") {
      botonInscripcionPrincipal = (
        <button
          onClick={handleInscripcionDirecta}
          className="button primary inscripcion-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Inscribiendo..." : <><FaUserPlus /> Participar Ahora</>}
        </button>
      );
    } else if (torneo.modo === "equipo") {
      botonInscripcionPrincipal = (
        <button
          onClick={handleMostrarFormEquipo}
          className="button primary inscripcion-button"
          disabled={isSubmitting || mostrarEquipoForm}
        >
          {isSubmitting ? "Procesando..." : <><FaUsers /> Inscribir mi Equipo</>}
        </button>
      );
    }
  }


  return (
    <div className="participantes-container">
      {error && <p className="error-message form-error-message">{error}</p>} {/* Mostrar errores no fatales */}

      {user && estaInscritoElUsuarioActual && (
        <p className="mensaje-participacion">✅ Ya estás participando en este torneo.</p>
      )}

      {/* Botón principal de inscripción (individual o para mostrar form de equipo) */}
      {botonInscripcionPrincipal}


      {/* Formulario para inscribir equipo (solo si modo=equipo y se activa) */}
      {mostrarEquipoForm && torneo.modo === "equipo" && (
        <EquipoForm
          onSubmit={handleInscripcionEquipoSubmit}
          onCancel={() => { setMostrarEquipoForm(false); setError("");}}
          // capitanId={user?.uid} // EquipoForm ya asume que el que lo abre es el capitán
          maxMiembros={torneo.maxMiembrosPorEquipo || 10} // Ejemplo, este valor debería venir del torneo
        />
      )}

      <h3>Participantes ({participantesArray.length} / {torneo.numEquipos || "Ilimitados"})</h3>
      {participantesArray.length === 0 ? (
        <p className="no-participantes-mensaje">Aún no hay participantes inscritos.</p>
      ) : (
        <ul className="lista-participantes">
          {participantesArray.map((participante, index) => {
            const esObjEquipo = typeof participante === "object" && participante !== null && participante.capitan;
            let nombreMostrar = "Desconocido";
            let idParaDetalles = null; // UID del usuario o del capitán del equipo
            let esEquipoRegistrado = false;

            if (esObjEquipo) {
                nombreMostrar = participante.nombre || `Equipo (Cap: ${participante.capitan.substring(0, 6)}...)`;
                idParaDetalles = participante.capitan;
                esEquipoRegistrado = true;
            } else if (typeof participante === 'string') { // UID de un participante individual
                // Aquí podrías tener una lógica para buscar el nombre del usuario si solo tienes el UID
                // Por ahora, mostramos el UID truncado.
                nombreMostrar = `Jugador (${participante.substring(0, 6)}...)`;
                idParaDetalles = participante;
            }


            return (
              <li key={index} className={`participante-item ${esEquipoRegistrado ? 'item-equipo' : 'item-individual'}`}>
                <span className="nombre-participante">{nombreMostrar}</span>
                {(esCreador || (user && user.uid === idParaDetalles)) && ( // Solo creador o el propio participante/capitán ven opciones
                  <div className="opciones-participante">
                    <button
                      className="boton-opciones"
                      onClick={() => toggleMenuParticipante(index)}
                      aria-label="Opciones del participante"
                    >
                      <FaEllipsisV />
                    </button>
                    {menuParticipante === index && (
                      <div className="menu-desplegable">
                        {idParaDetalles && (
                          <button
                            className="menu-item"
                            onClick={() => handleVerDetalles(idParaDetalles)}
                            title="Ver perfil o detalles del participante"
                          >
                            <FaUser /> Ver Detalles
                          </button>
                        )}
                        {esCreador && ( // Solo el creador puede eliminar
                          <button
                            className="menu-item eliminar"
                            onClick={() => handleEliminarParticipante(participante)}
                            title="Eliminar este participante del torneo"
                          >
                            <FaTrash /> Eliminar
                          </button>
                        )}
                        {/* Aquí podrías añadir más opciones, como "Abandonar Torneo" si user.uid === idParaDetalles */}
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