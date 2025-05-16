// components/NovedadesSection.js
import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase"; // Ajusta ruta si es necesario
import { FaBell, FaSpinner, FaUserPlus, FaUserSlash, FaPlusSquare, FaClipboardList, FaTrashAlt, FaSignOutAlt } from "react-icons/fa";

const db = getFirestore(app);
const auth = getAuth();

function NovedadesSection({ torneoId, onUnreadStatusChange }) {
  const [novedades, setNovedades] = useState([]);
  const [loadingNovedades, setLoadingNovedades] = useState(true);
  const [errorNovedades, setErrorNovedades] = useState("");

  useEffect(() => {
    if (!torneoId) {
      setErrorNovedades("ID de torneo no disponible para cargar novedades.");
      setLoadingNovedades(false);
      if (onUnreadStatusChange) onUnreadStatusChange(false);
      return;
    }
    setLoadingNovedades(true);
    setErrorNovedades("");
    console.log(`[NovedadesSection.js] Suscribiéndose a novedades para torneoId: ${torneoId}`);

    const currentUser = auth.currentUser;
    console.log("[NovedadesSection.js] useEffect - currentUser:", currentUser ? currentUser.uid : "null", "TorneoID:", torneoId);

    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    const q = query(novedadesRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const nuevasNovedades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[NovedadesSection.js] Novedades CRUDAS recibidas (${nuevasNovedades.length}):`, JSON.stringify(nuevasNovedades.map(n => ({id: n.id, tipo: n.tipo, msg: n.mensaje?.substring(0,30), ts: n.timestamp?.seconds, dataExtra: n.dataExtra})), null, 2) );
      setNovedades(nuevasNovedades);

      let algunaNoLeida = false;
      if (currentUser) {
        const ultimaVisitaKey = `ultimaVisitaNovedades_${torneoId}_${currentUser.uid}`;
        const ultimaVisitaTimestampString = localStorage.getItem(ultimaVisitaKey);
        const ultimaVisitaTimestamp = ultimaVisitaTimestampString ? parseInt(ultimaVisitaTimestampString, 10) : null;
        console.log(`[NovedadesSection.js] Para user ${currentUser.uid} en torneo ${torneoId} - Ultima Visita TS (localStorage):`, ultimaVisitaTimestamp);

        algunaNoLeida = nuevasNovedades.some(novedad => {
          if (!novedad.timestamp || !novedad.timestamp.toMillis) {
            console.warn(`[NovedadesSection.js] Novedad ${novedad.id} (Tipo: ${novedad.tipo}) sin timestamp válido. Mensaje: ${novedad.mensaje}`);
            return false;
          }
          const novedadMillis = novedad.timestamp.toMillis();
          if (!ultimaVisitaTimestamp) {
            console.log(`[NovedadesSection.js] Novedad ${novedad.id} (${novedad.tipo}, TS: ${novedadMillis}) es NO LEÍDA (sin visita previa).`);
            return true;
          }
          const esNoLeida = novedadMillis > ultimaVisitaTimestamp;
          if (esNoLeida) {
            console.log(`[NovedadesSection.js] Novedad ${novedad.id} (${novedad.tipo}, TS: ${novedadMillis}) es NO LEÍDA (comparada con ${ultimaVisitaTimestamp}).`);
          }
          return esNoLeida;
        });
      } else {
        console.log("[NovedadesSection.js] No hay currentUser, no se puede determinar 'no leídas'.");
      }
      console.log(`[NovedadesSection.js] ¿Alguna novedad no leída para ${currentUser ? currentUser.uid : 'anon'}? ${algunaNoLeida}`);
      
      if (onUnreadStatusChange) {
        onUnreadStatusChange(algunaNoLeida);
      }
      setLoadingNovedades(false);
    }, (err) => {
      console.error("[NovedadesSection.js] Error al obtener novedades:", err);
      setErrorNovedades("Error al cargar las novedades.");
      setLoadingNovedades(false);
      if (onUnreadStatusChange) onUnreadStatusChange(false);
    });

    return () => {
      console.log(`[NovedadesSection.js] Desuscribiéndose de novedades para torneoId: ${torneoId}`);
      unsubscribe();
    };
  }, [torneoId, onUnreadStatusChange]);


  const formatNovedadTimestamp = (timestamp) => {
    if (!timestamp || typeof timestamp.seconds !== 'number') { // Verificación más robusta
      console.warn(`[NovedadesSection.js] Timestamp inválido o sin propiedad .seconds numérica:`, timestamp);
      return "Fecha pendiente...";
    }
    try {
        return new Date(timestamp.seconds * 1000).toLocaleString("es-ES", {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        console.error("[NovedadesSection.js] Error formateando timestamp:", timestamp, e);
        return "Fecha inválida";
    }
  };

  const getNovedadIcon = (tipo) => {
    // console.log(`[NovedadesSection.js] getNovedadIcon llamado con tipo: ${tipo}`); // Log para ver qué tipos se procesan
    switch (tipo) {
      case 'user_join':
        return <FaUserPlus style={{ color: '#2ecc71' }} title="Nuevo participante" />;
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
        console.warn(`[NovedadesSection.js] Tipo de novedad desconocido en getNovedadIcon: "${tipo}"`);
        return <FaBell style={{ color: '#f39c12' }} title={`Novedad: ${tipo || 'general'}`} />;
    }
  };

  return (
    <div className="novedades-section">
      <h2><FaBell /> Novedades y Alertas</h2>
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
            // Log detallado de cada novedad antes de intentar renderizarla
            console.log("[NovedadesSection.js] Renderizando novedad:", { 
              id: novedad.id, 
              tipo: novedad.tipo, 
              mensaje: novedad.mensaje,
              timestamp_obj: novedad.timestamp, // Loguea el objeto timestamp completo
              dataExtra: novedad.dataExtra // Loguea dataExtra por si hay algo relevante
            });
            
            // Comprobación adicional por si el mensaje es undefined o null
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