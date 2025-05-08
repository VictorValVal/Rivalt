import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Importar useNavigate y useParams
import { getAuth,onAuthStateChanged } from "firebase/auth"; // Importar getAuth
import { getFirestore, doc, getDoc, deleteDoc } from "firebase/firestore"; // Importar deleteDoc
import { app } from "../firebase";
import { FaCopy, FaCheckCircle, FaSpinner, FaExclamationTriangle, FaUsers, FaFutbol, FaDesktop, FaTag, FaCalendarAlt, FaInfoCircle, FaLock, FaLockOpen, FaTrashAlt } from "react-icons/fa";
import NovedadesSection from './NovedadesSection';
import "./estilos/Informacion.css";

const db = getFirestore(app);
const auth = getAuth(); // Inicializar auth

function Informacion({ torneoId, onUnreadNovedadesChange }) { // Recibir onUnreadNovedadesChange
  const [torneo, setTorneo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null); // Estado para el usuario actual
  const [isDeleting, setIsDeleting] = useState(false); // Estado para la eliminación

  const navigate = useNavigate(); // Hook para navegación
  // useParams no es necesario aquí si torneoId se pasa como prop

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
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
    setLoading(true);
    setError("");
    try {
      const torneoRef = doc(db, "torneos", torneoId);
      const torneoSnap = await getDoc(torneoRef);

      if (torneoSnap.exists()) {
        setTorneo({ id: torneoSnap.id, ...torneoSnap.data() });
      } else {
        setError("No se encontró la información del torneo.");
        setTorneo(null); // Asegurarse que torneo es null si no se encuentra
      }
    } catch (err) {
      console.error("Error al obtener la información del torneo:", err);
      setError("Error al cargar la información del torneo. Inténtalo de nuevo.");
      setTorneo(null);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    fetchTorneoInfo();
  }, [fetchTorneoInfo]);

  const handleCopy = () => {
    if (torneo && torneo.codigo) {
      navigator.clipboard.writeText(torneo.codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEliminarTorneo = async () => {
    if (!torneo || !user || user.uid !== torneo.creadorId) {
      alert("No tienes permiso para eliminar este torneo.");
      return;
    }
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el torneo "${torneo.titulo}" de forma permanente? Esta acción no se puede deshacer.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "torneos", torneo.id));
      alert("Torneo eliminado con éxito.");
      navigate("/home"); 
    } catch (error) {
      console.error("Error al eliminar el torneo:", error);
      alert("Hubo un error al eliminar el torneo.");
      setIsDeleting(false);
    }
  };


  const getDeporteIcon = (deporte) => {
    if (!deporte) return <FaInfoCircle />;
    const deporteLowerCase = deporte.toLowerCase();
    if (deporteLowerCase.includes("fútbol") || deporteLowerCase.includes("soccer")) return <FaFutbol />;
    if (deporteLowerCase.includes("gaming") || deporteLowerCase.includes("esports") || deporteLowerCase.includes("videojuego")) return <FaDesktop />;
    return <FaFutbol />;
  };

  if (loading && !torneo) {
    return (
      <div className="informacion-page-layout">
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

  if (error && !torneo) {
     return (
      <div className="informacion-page-layout">
        <div className="novedades-section placeholder-novedades">
             <p>{error ? `Error Novedades: ${error}` : "Cargando Novedades..."}</p>
        </div>
        <div className="informacion-container error-container">
          <FaExclamationTriangle className="error-icon" />
          <p>{error}</p>
          <button onClick={fetchTorneoInfo} className="retry-button small-retry">Reintentar</button>
        </div>
      </div>
    );
  }
  
  if (!torneo && !loading) {
     return (
      <div className="informacion-page-layout">
        <NovedadesSection torneoId={torneoId} onUnreadStatusChange={onUnreadNovedadesChange} />
        <div className="informacion-container error-container">
          <p>No hay información disponible para este torneo o ha ocurrido un error.</p>
          {error && <button onClick={fetchTorneoInfo} className="retry-button small-retry">Reintentar</button>}
        </div>
      </div>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "No especificada";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("es-ES", {
        year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const esCreador = user && torneo && user.uid === torneo.creadorId;

  return (
    <div className="informacion-page-layout">
      <NovedadesSection torneoId={torneoId} onUnreadStatusChange={onUnreadNovedadesChange} />
      
      <div className="informacion-container">
        {loading && torneo && <div className="loading-inline"><FaSpinner className="spinner-icon small"/> Actualizando...</div>}
        {error && torneo && <p className="form-error-message main-error">{error} <button onClick={fetchTorneoInfo} className="retry-button small-retry">Reintentar</button></p>}

        {torneo && (
          <>
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
                  <p>{torneo.participantes?.length || 0} / {torneo.numEquipos || torneo.maxParticipantes || "Ilimitados"}</p>
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
                {torneo.modo === "equipo" ? <FaUsers className="info-icon" /> : <FaInfoCircle className="info-icon" />}
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

            <div className="codigo-torneo-section">
              <h3>Código para Unirse al Torneo</h3>
              <div className="codigo-display-container">
                <input
                  type="text"
                  value={torneo.codigo || "N/A"}
                  readOnly
                  className="codigo-input"
                />
                <button onClick={handleCopy} className="copy-button" disabled={!torneo.codigo || copied}>
                  {copied ? <FaCheckCircle /> : <FaCopy />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              {copied && <p className="copy-feedback">¡Código copiado al portapapeles!</p>}
            </div>

            {esCreador && (
              <div className="danger-zone-section">
                <h3 className="danger-zone-title"><FaExclamationTriangle /> Zona de Peligro</h3>
                <p className="danger-zone-description">
                  La eliminación del torneo es permanente y no se podrá recuperar.
                  Todos los datos asociados, incluyendo participantes, partidos y resultados, serán borrados.
                </p>
                <button 
                  onClick={handleEliminarTorneo} 
                  className="danger-zone-button"
                  disabled={isDeleting}
                >
                  {isDeleting ? <><FaSpinner className="spinner-icon"/> Eliminando...</> : <><FaTrashAlt /> Eliminar Torneo Permanentemente</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Informacion;