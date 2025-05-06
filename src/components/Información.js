import React, { useState, useEffect, useCallback } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebase"; // Asegúrate que la ruta a firebase.js sea correcta
import { FaCopy, FaCheckCircle, FaSpinner, FaExclamationTriangle, FaUsers, FaFutbol, FaDesktop, FaTag, FaCalendarAlt, FaInfoCircle, FaLock, FaLockOpen } from "react-icons/fa"; // Iconos
import "./estilos/Informacion.css"; // Crearemos este archivo CSS

const db = getFirestore(app);

function Informacion({ torneoId }) {
  const [torneo, setTorneo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
      }
    } catch (err) {
      console.error("Error al obtener la información del torneo:", err);
      setError("Error al cargar la información del torneo. Inténtalo de nuevo.");
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
      setTimeout(() => setCopied(false), 2000); // Resetear el estado de copiado después de 2 segundos
    }
  };

  // Función para obtener un icono según el deporte (ejemplo)
  const getDeporteIcon = (deporte) => {
    if (!deporte) return <FaInfoCircle />;
    const deporteLowerCase = deporte.toLowerCase();
    if (deporteLowerCase.includes("fútbol") || deporteLowerCase.includes("soccer")) return <FaFutbol />;
    if (deporteLowerCase.includes("gaming") || deporteLowerCase.includes("esports") || deporteLowerCase.includes("videojuego")) return <FaDesktop />;
    // Añade más deportes e iconos aquí
    return <FaFutbol />; // Icono por defecto
  };

  if (loading) {
    return (
      <div className="informacion-container loading-container">
        <FaSpinner className="spinner-icon" />
        <p>Cargando información del torneo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="informacion-container error-container">
        <FaExclamationTriangle className="error-icon" />
        <p>{error}</p>
        <button onClick={fetchTorneoInfo} className="retry-button">Reintentar</button>
      </div>
    );
  }

  if (!torneo) {
    return (
      <div className="informacion-container error-container">
        <p>No hay información disponible para este torneo.</p>
      </div>
    );
  }

  // Formatear fecha si existe
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "No especificada";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("es-ES", {
        year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="informacion-container">
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
            <p>{torneo.participantes?.length || 0} / {torneo.maxParticipantes || "Ilimitados"}</p>
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
                <strong>Fecha de Inicio:</strong>
                <p>{formatDate(torneo.fechaInicio)}</p>
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
          <button onClick={handleCopy} className="copy-button" disabled={!torneo.codigo}>
            {copied ? <FaCheckCircle /> : <FaCopy />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        {copied && <p className="copy-feedback">¡Código copiado al portapapeles!</p>}
      </div>

      {/* Puedes añadir más secciones aquí, por ejemplo: */}
      {/* - Lista de participantes/equipos */}
      {/* - Reglas del torneo */}
      {/* - Enlace a la vista de llaves/brackets si aplica */}

    </div>
  );
}

export default Informacion;