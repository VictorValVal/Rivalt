import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, deleteDoc, collection, updateDoc, arrayRemove } from "firebase/firestore";
import { app } from "../firebase";
import { FaCopy,FaUserCircle, FaCheckCircle, FaSpinner, FaExclamationTriangle, FaUsers, FaFutbol, FaDesktop, FaTag, FaCalendarAlt, FaInfoCircle, FaLock, FaLockOpen, FaTrashAlt, FaSignOutAlt } from "react-icons/fa";
import NovedadesSection from './NovedadesSection';
import "./estilos/Informacion.css";
import { agregarNovedadConDebug } from "./utils/NovedadesUtils";

const db = getFirestore(app);
const auth = getAuth();

function Informacion({ torneoId, onUnreadNovedadesChange }) {
  const [torneo, setTorneo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);
  const [errorNovedades, setErrorNovedades] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Suscribe al estado de autenticación del usuario.
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("[Informacion.js] Cambio de estado de autenticación, usuario actual:", currentUser ? currentUser.uid : "null");
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchTorneoInfo = useCallback(async () => {
    if (!torneoId) {
      setError("No se proporcionó un ID de torneo.");
      setLoading(false);
      return;
    }
    console.log(`[Informacion.js] Iniciando la obtención de información para el torneo con ID: ${torneoId}`);
    setLoading(true);
    setError("");
    try {
      const torneoRef = doc(db, "torneos", torneoId);
      const torneoSnap = await getDoc(torneoRef);

      if (torneoSnap.exists()) {
        console.log("[Informacion.js] Torneo encontrado:", torneoSnap.data());
        setTorneo({ id: torneoSnap.id, ...torneoSnap.data() });
      } else {
        console.warn("[Informacion.js] No se encontró la información del torneo con ID:", torneoId);
        setError("No se encontró la información del torneo.");
        setTorneo(null);
      }
    } catch (err) {
      console.error("[Informacion.js] Error al obtener la información del torneo:", err);
      setError("Error al cargar la información del torneo. Inténtalo de nuevo.");
      setTorneo(null);
    } finally {
      setLoading(false);
      console.log(`[Informacion.js] Obtención de información del torneo finalizada para el ID: ${torneoId}`);
    }
  }, [torneoId]);

  useEffect(() => {
    fetchTorneoInfo();
  }, [fetchTorneoInfo]);

  const handleCopy = () => {
    if (torneo && torneo.codigo) {
      navigator.clipboard.writeText(torneo.codigo);
      setCopied(true);
      console.log("[Informacion.js] Código copiado:", torneo.codigo);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Verifica si el usuario actual es el creador del torneo.
  const esCreador = user && torneo && user.uid === torneo.creadorId;

  const handleEliminarTorneo = async () => {
    if (!esCreador) {
      alert("No tienes permiso para eliminar este torneo.");
      return;
    }
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el torneo "${torneo.titulo}" de forma permanente? Esta acción no se puede deshacer.`)) {
      return;
    }
    setIsDeleting(true);
    console.log(`[Informacion.js] Intentando eliminar torneo: ${torneo.id} por usuario: ${user.uid}`);
    try {
      await agregarNovedadConDebug(
        torneoId,
        `El torneo "${torneo.titulo}" ha sido eliminado por el creador ${user.displayName || user.email}.`,
        'tournament_deleted',
        { torneoTitulo: torneo.titulo, creadorId: user.uid, creadorNombre: user.displayName || user.email },
        "Informacion.js (EliminarTorneo)"
      );
      await deleteDoc(doc(db, "torneos", torneo.id));
      alert("Torneo eliminado con éxito.");
      console.log(`[Informacion.js] Torneo ${torneo.id} eliminado.`);
      navigate("/home");
    } catch (error) {
      console.error("[Informacion.js] Error al eliminar el torneo:", error);
      alert("Hubo un error al eliminar el torneo.");
      setIsDeleting(false);
    }
  };

  const handleAbandonarTorneo = async () => {
    if (!torneo || !user || esCreador) {
        alert("No puedes abandonar este torneo de esta manera.");
        return;
    }

    let participanteParaEliminar;
    let nombreConfirmacion;
    let dataExtraNovedad = {};

    // Determina el tipo de participante a abandonar (individual o equipo).
    if (torneo.modo === "individual") {
        if (torneo.participantes?.includes(user.uid)) {
            participanteParaEliminar = user.uid;
            nombreConfirmacion = user.displayName || user.email || `Jugador (${user.uid.substring(0,6)})`;
            dataExtraNovedad = { userId: user.uid, userName: nombreConfirmacion };
        }
    } else if (torneo.modo === "equipo") {
        participanteParaEliminar = torneo.participantes?.find(p => typeof p === 'object' && p.capitan === user.uid);
        if (participanteParaEliminar) {
            nombreConfirmacion = participanteParaEliminar.nombre || `tu equipo (Cap: ${user.displayName || user.email})`;
            dataExtraNovedad = { equipoNombre: participanteParaEliminar.nombre, capitanId: user.uid, capitanNombre: user.displayName || user.email };
        }
    }

    if (!participanteParaEliminar) {
        alert("No estás inscrito en este torneo como participante o capitán de equipo activo.");
        return;
    }

    if (!window.confirm(`¿Seguro que quieres abandonar el torneo "${torneo.titulo}" con "${nombreConfirmacion}"?`)) {
        return;
    }

    setIsLeaving(true);
    console.log(`[Informacion.js] Usuario ${user.uid} intentando abandonar torneo ${torneo.id} como: ${nombreConfirmacion}`);
    const torneoRef = doc(db, "torneos", torneoId);
    try {
        await updateDoc(torneoRef, {
            participantes: arrayRemove(participanteParaEliminar)
        });

        await agregarNovedadConDebug(
            torneoId,
            `${nombreConfirmacion} ha abandonado el torneo.`,
            'user_self_leave',
            dataExtraNovedad,
            "Informacion.js (AbandonarTorneo)"
        );
        alert("Has abandonado el torneo.");
        console.log(`[Informacion.js] Usuario ${user.uid} abandonó el torneo ${torneo.id}.`);
        fetchTorneoInfo();
    } catch (error) {
        console.error("[Informacion.js] Error al abandonar el torneo:", error);
        alert("Error al abandonar el torneo: " + error.message);
    } finally {
        setIsLeaving(false);
    }
  };

  // Obtiene el icono del deporte según el nombre del deporte.
  const getDeporteIcon = (deporte) => {
    if (!deporte) return <FaInfoCircle />;
    const deporteLowerCase = deporte.toLowerCase();
    if (deporteLowerCase.includes("fútbol") || deporteLowerCase.includes("soccer")) return <FaFutbol />;
    if (deporteLowerCase.includes("gaming") || deporteLowerCase.includes("esports") || deporteLowerCase.includes("videojuego")) return <FaDesktop />;
    return <FaFutbol />;
  };

  // Formatea un timestamp de Firebase a una cadena de fecha legible.
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "No especificada";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("es-ES", {
        year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // Comprueba si el usuario actual está inscrito en el torneo (como individual o capitán de equipo).
  const estaInscritoElUsuarioActual = torneo && user && torneo.participantes?.some(p => {
      if (typeof p === 'string') return p === user.uid;
      if (typeof p === 'object' && p !== null) return p.capitan === user.uid;
      return false;
  });

  // Muestra mensaje de carga si la información del torneo aún no está disponible.
  if (loading && !torneo) {
    return (
      <div className="informacion-page-layout2">
        <div className="novedades-section placeholder-novedades">
            <FaSpinner className="spinner-icon" />
            <p>Cargando...</p>
        </div>
        <div className="informacion-container loading-container main-loading">
          <FaSpinner className="spinner-icon" />
          <p>Cargando información del torneo...</p>
        </div>
      </div>
    );
  }

  // Muestra un mensaje de error si no se pudo cargar el torneo.
  if (error && !torneo) {
     return (
      <div className="informacion-page-layout2">
        <div className="novedades-section placeholder-novedades">
             <p>{errorNovedades || "Error al cargar novedades o ID de torneo no disponible."}</p>
        </div>
        <div className="informacion-container error-container">
          <FaExclamationTriangle className="error-icon" style={{ fontSize: '2rem', color: '#ff4d4d', marginBottom: '1rem' }} />
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{error}</p>
          <button onClick={fetchTorneoInfo} className="retry-button small-retry">Reintentar Carga</button>
        </div>
      </div>
    );
  }

  // Muestra un mensaje si no se encontró el torneo después de la carga inicial.
  if (!torneo && !loading) {
     return (
      <div className="informacion-page-layout2">
        <NovedadesSection torneoId={torneoId} onUnreadNovedadesChange={onUnreadNovedadesChange} />
        <div className="informacion-container error-container">
          <p>No hay información disponible para este torneo o el ID no es válido.</p>
          {error && <button onClick={fetchTorneoInfo} className="retry-button small-retry">Reintentar</button>}
        </div>
      </div>
    );
  }

  // Renderiza la información del torneo.
  return (
    <div className="informacion-page-layout2">
      <NovedadesSection torneoId={torneoId} onUnreadNovedadesChange={onUnreadNovedadesChange} />

      <div className="informacion-container">
        {/* Indicador de carga o mensaje de error de actualización si aplica. */}
        {loading && torneo && <div className="loading-inline"><FaSpinner className="spinner-icon small"/> Actualizando...</div>}
        {error && torneo && <p className="form-error-message main-error">{error} <button onClick={fetchTorneoInfo} className="retry-button small-retry">Reintentar</button></p>}

        {torneo && (
          <>
            <div className="informacion-contenido-scrollable">
              <div className="info-header">
                {getDeporteIcon(torneo.deporte)}
                <h1>{torneo.titulo || "Información del Torneo"}</h1>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <FaTag className="info-icon" />
                  <div>
                    <strong>Deporte:</strong>
                    <p>{torneo.deporte || "No especificado"}</p>
                  </div>
                </div>

                <div className="info-item">
                  <FaUsers className="info-icon" />
                  <div>
                    <strong>Participantes:</strong>
                    <p>{torneo.participantes?.length || 0} / {torneo.numEquipos || "Ilimitados"}</p>
                  </div>
                </div>

                <div className="info-item">
                  <FaInfoCircle className="info-icon" />
                  <div>
                    <strong>Tipo:</strong>
                    <p>{torneo.tipo || "No especificado"}</p>
                  </div>
                </div>

                <div className="info-item">
                  {torneo.modo === "equipo" ? <FaUsers className="info-icon" /> : <FaUserCircle className="info-icon" />}
                  <div>
                    <strong>Modo:</strong>
                    <p>{torneo.modo || "No especificado"}</p>
                  </div>
                </div>

                <div className="info-item">
                    <FaCalendarAlt className="info-icon" />
                    <div>
                        <strong>Fecha de Creación:</strong>
                        <p>{formatDate(torneo.fechaCreacion)}</p>
                    </div>
                </div>

                <div className="info-item">
                    {torneo.privado ? <FaLock className="info-icon" /> : <FaLockOpen className="info-icon" />}
                    <div>
                        <strong>Visibilidad:</strong>
                        <p>{torneo.privado ? "Privado" : "Público"}</p>
                    </div>
                </div>

                {torneo.descripcion && (
                    <div className="info-item full-width">
                        <FaInfoCircle className="info-icon" />
                        <div>
                            <strong>Descripción:</strong>
                            <p className="descripcion-text">{torneo.descripcion}</p>
                        </div>
                    </div>
                )}
              </div>
            </div>

            <div className="codigo-torneo-section">
              <h3>Código para Unirse al Torneo</h3>
              <div className="codigo-display-container">
                <input
                  type="text"
                  value={torneo.codigo || "N/A"}
                  readOnly
                  className="codigo-input"
                  aria-label="Código del torneo"
                />
                <button onClick={handleCopy} className="copy-button" disabled={!torneo.codigo || copied}>
                  {copied ? <FaCheckCircle /> : <FaCopy />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              {copied && <p className="copy-feedback">¡Código copiado al portapapeles!</p>}
            </div>

            <div className="danger-zone-section">
              {esCreador ? (
                <>
                  <h3 className="danger-zone-title">
                      <FaExclamationTriangle /> Eliminar Torneo
                  </h3>
                  <p className="danger-zone-description">
                    La eliminación del torneo es permanente y no se podrá recuperar.
                    Todos los datos asociados serán borrados.
                  </p>
                  <button
                    onClick={handleEliminarTorneo}
                    className="danger-zone-button"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <><FaSpinner className="spinner-icon"/> Eliminando...</> : <><FaTrashAlt /> Eliminar Torneo Permanentemente</>}
                  </button>
                </>
              ) : estaInscritoElUsuarioActual && user ? (
                <>
                  <h3 className="danger-zone-title">
                      <FaSignOutAlt /> Abandonar Torneo
                  </h3>
                  <p className="danger-zone-description">
                    Si abandonas el torneo, tu participación o la de tu equipo será eliminada.
                    Esta acción podría no ser reversible según la configuración del torneo.
                  </p>
                  <button
                    onClick={handleAbandonarTorneo}
                    className="danger-zone-button"
                    disabled={isLeaving}
                  >
                    {isLeaving ? <><FaSpinner className="spinner-icon"/> Abandonando...</> : <><FaSignOutAlt /> Abandonar Torneo</>}
                  </button>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Informacion;