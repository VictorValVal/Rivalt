import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import { FaBell, FaUsers, FaSpinner, FaUserPlus, FaUserSlash, FaPlusSquare, FaClipboardList, FaTrashAlt, FaSignOutAlt, FaEye } from "react-icons/fa";

const db = getFirestore(app);
const authInstance = getAuth();

function NovedadesSection({ torneoId, onUnreadStatusChange }) {
  const [novedades, setNovedades] = useState([]);
  const [loadingNovedades, setLoadingNovedades] = useState(true);
  const [errorNovedades, setErrorNovedades] = useState("");

  // Efecto para la suscripción en tiempo real a las novedades del torneo.
  // También gestiona el estado de "no leídas" basándose en la última visita del usuario.
  useEffect(() => {
    if (!torneoId) {
      setErrorNovedades("ID de torneo no disponible para cargar novedades.");
      setLoadingNovedades(false);
      if (onUnreadStatusChange) onUnreadStatusChange(false);
      return;
    }
    setLoadingNovedades(true);
    setErrorNovedades("");

    const currentUser = authInstance.currentUser;

    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    const q = query(novedadesRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const nuevasNovedades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNovedades(nuevasNovedades);

      let algunaNoLeida = false;
      if (currentUser) {
        const ultimaVisitaKey = `ultimaVisitaNovedades_${torneoId}_${currentUser.uid}`;
        const ultimaVisitaTimestampString = localStorage.getItem(ultimaVisitaKey);
        const ultimaVisitaTimestamp = ultimaVisitaTimestampString ? parseInt(ultimaVisitaTimestampString, 10) : null;

        algunaNoLeida = nuevasNovedades.some(novedad => {
          if (!novedad.timestamp || !novedad.timestamp.toMillis) {
            return false;
          }
          const novedadMillis = novedad.timestamp.toMillis();
          if (!ultimaVisitaTimestamp) {
            return true;
          }
          return novedadMillis > ultimaVisitaTimestamp;
        });
      }
      
      if (onUnreadStatusChange) {
        onUnreadStatusChange(algunaNoLeida);
      }
      setLoadingNovedades(false);
    }, (err) => {
      console.error("Error al obtener novedades:", err);
      setErrorNovedades("Error al cargar las novedades.");
      setLoadingNovedades(false);
      if (onUnreadStatusChange) onUnreadStatusChange(false);
    });

    return () => {
      unsubscribe();
    };
  }, [torneoId, onUnreadStatusChange]);

  // Formatea el timestamp de las novedades a un formato legible.
  const formatNovedadTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.seconds !== 'number') {
      return "Fecha pendiente...";
    }
    try {
        return new Date(timestamp.seconds * 1000).toLocaleString("es-ES", {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formateando timestamp:", timestamp, e);
        return "Fecha inválida";
    }
  };

  // Asigna un icono a cada tipo de novedad para una mejor representación visual.
  const getNovedadIcon = (tipo) => {
    switch (tipo) {
      case 'user_join':
        return <FaUserPlus style={{ color: '#2ecc71' }} title="Nuevo participante" />;
      case 'team_join':
        return <FaUsers style={{ color: '#3498db' }} title="Nuevo equipo" />;
      case 'spectator_join':
        return <FaEye style={{ color: '#9b59b6' }} title="Nuevo espectador" />;
      case 'user_leave':
        return <FaUserSlash style={{ color: '#e74c3c' }} title="Participante salió/eliminado por creador" />;
      case 'user_self_leave':
        return <FaSignOutAlt style={{ color: '#e67e22' }} title="Participante abandonó" />;
      case 'user_eliminated':
        return <FaTrashAlt style={{ color: '#c0392b' }} title="Participante eliminado del torneo" />;
      case 'match_add':
        return <FaPlusSquare style={{ color: '#3498db' }} title="Nuevo partido" />;
      case 'match_result':
        return <FaClipboardList style={{ color: '#9b59b6' }} title="Resultado de partido" />;
      case 'match_schedule_update':
        return <FaBell style={{ color: '#f1c40f' }} title="Partido actualizado" />;
      case 'match_delete':
        return <FaTrashAlt style={{ color: '#e74c3c' }} title="Partido eliminado" />;
      case 'tournament_deleted':
        return <FaTrashAlt style={{ color: '#7f8c8d' }} title="Torneo eliminado" />;
      default:
        return <FaBell style={{ color: '#f39c12' }} title={`Novedad: ${tipo || 'general'}`} />;
    }
  };

  return (
    <div className="novedades-section">
      <h2><FaBell /> Novedades y Alertas</h2>
      {/* Muestra un spinner de carga, un mensaje de error o la lista de novedades */}
      {loadingNovedades ? (
        <div className="loading-novedades">
          <FaSpinner className="spinner-icon" />
          <p>Cargando novedades...</p>
        </div>
      ) : errorNovedades ? (
        <p className="form-error-message" style={{ margin: '1rem 0'}}>{errorNovedades}</p>
      ) : novedades.length === 0 ? (
        <p className="no-novedades">No hay novedades recientes.</p>
      ) : (
        <ul className="novedades-list">
          {novedades.map(novedad => {
            const mensajeRenderizar = typeof novedad.mensaje === 'string' ? novedad.mensaje : "Mensaje no disponible";

            return (
              <li key={novedad.id} className="novedad-item">
                <span className="novedad-icon">
                  {getNovedadIcon(novedad.tipo)}
                </span>
                <div className="novedad-content">
                  <p className="novedad-mensaje">{mensajeRenderizar}</p>
                  <span className="novedad-timestamp">{formatNovedadTimestamp(novedad.timestamp)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default NovedadesSection;