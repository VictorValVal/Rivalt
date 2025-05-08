// components/NovedadesSection.js
import React, { useState, useEffect } from "react";
import { getFirestore, collection, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Importar getAuth
import { app } from "../firebase";
import { FaBell, FaSpinner, FaUserPlus, FaUserSlash, FaPlusSquare, FaClipboardList, FaTrashAlt } from "react-icons/fa";

const db = getFirestore(app);
const auth = getAuth(); // Obtener la instancia de auth

function NovedadesSection({ torneoId, onUnreadStatusChange }) { // Se añade onUnreadStatusChange
  const [novedades, setNovedades] = useState([]);
  const [loadingNovedades, setLoadingNovedades] = useState(true);
  const [errorNovedades, setErrorNovedades] = useState("");
  // const [hayNoLeidas, setHayNoLeidas] = useState(false); // Estado local opcional

  useEffect(() => {
    if (!torneoId) {
      setErrorNovedades("ID de torneo no disponible para cargar novedades.");
      setLoadingNovedades(false);
      if (onUnreadStatusChange) onUnreadStatusChange(false);
      return;
    }
    setLoadingNovedades(true);
    setErrorNovedades("");

    const currentUser = auth.currentUser; // Obtener usuario actual

    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    const q = query(novedadesRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const nuevasNovedades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNovedades(nuevasNovedades);

      // --- LÓGICA PARA DETERMINAR NO LEÍDAS ---
      let algunaNoLeida = false;
      if (currentUser) { // Solo proceder si hay un usuario logueado
        // Ejemplo: considerar no leída si 'leidaPor' no contiene el UID del usuario actual
        // O si el timestamp de la novedad es posterior a un 'ultimaVisitaNovedades_[torneoId]' en localStorage
        const ultimaVisitaKey = `ultimaVisitaNovedades_${torneoId}_${currentUser.uid}`;
        const ultimaVisitaTimestamp = localStorage.getItem(ultimaVisitaKey);

        algunaNoLeida = nuevasNovedades.some(novedad => {
          if (!novedad.timestamp) return false; // Si no tiene timestamp, no podemos compararla

          // Opción 1: Usar un campo 'leidaPor' (array de UIDs)
          // return !(novedad.leidaPor && novedad.leidaPor.includes(currentUser.uid));

          // Opción 2: Usar localStorage para 'ultimaVisitaTimestamp'
           if (!ultimaVisitaTimestamp) return true; // Si nunca visitó, todas son no leídas
           return novedad.timestamp.toMillis() > parseInt(ultimaVisitaTimestamp);
        });
      }
      // setHayNoLeidas(algunaNoLeida); // Actualiza estado local si lo necesitas

      if (onUnreadStatusChange) {
        onUnreadStatusChange(algunaNoLeida); // Llama al callback del padre
      }
      // --- FIN LÓGICA NO LEÍDAS ---

      setLoadingNovedades(false);
    }, (err) => {
      console.error("Error al obtener novedades:", err);
      setErrorNovedades("Error al cargar las novedades.");
      setLoadingNovedades(false);
      if (onUnreadStatusChange) onUnreadStatusChange(false);
    });

    return () => unsubscribe();
  }, [torneoId, onUnreadStatusChange]); // Añadir onUnreadStatusChange

  // Función para marcar una novedad como leída (EJEMPLO con campo 'leidaPor')
  // Debes decidir cuándo y cómo llamar a esta función (ej. al hacer scroll, al hacer clic en una novedad, etc.)
  const marcarComoLeida = async (novedadId) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !novedadId) return;

    try {
      const novedadRef = doc(db, `torneos/${torneoId}/novedades`, novedadId);
      // Usar arrayUnion para añadir el UID del usuario al array 'leidaPor'
      // Asegúrate de que el campo 'leidaPor' exista o sea creado si es la primera vez.
      await updateDoc(novedadRef, {
        leidaPor: arrayUnion(currentUser.uid)
      });
      console.log(`Novedad ${novedadId} marcada como leída por ${currentUser.uid}`);
    } catch (error) {
      console.error("Error al marcar novedad como leída:", error);
    }
  };


  const formatNovedadTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "Fecha desconocida";
    return new Date(timestamp.seconds * 1000).toLocaleString("es-ES", {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getNovedadIcon = (tipo) => {
    switch (tipo) {
      case 'user_join': return <FaUserPlus style={{ color: '#2ecc71' }} title="Nuevo participante" />;
      case 'user_leave': return <FaUserSlash style={{ color: '#e74c3c' }} title="Participante salió/eliminado" />;
      case 'user_eliminated': return <FaTrashAlt style={{ color: '#c0392b' }} title="Participante eliminado" />;
      case 'match_add': return <FaPlusSquare style={{ color: '#3498db' }} title="Nuevo partido" />;
      case 'match_result': return <FaClipboardList style={{ color: '#9b59b6' }} title="Resultado de partido" />;
      case 'match_schedule_update': return <FaBell style={{ color: '#f1c40f' }} title="Partido actualizado" />;
      case 'match_delete': return <FaTrashAlt style={{ color: '#e74c3c' }} title="Partido eliminado" />;
      default: return <FaBell style={{ color: '#f39c12' }} title="Novedad general" />;
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
          {novedades.map(novedad => (
            <li key={novedad.id} className="novedad-item" /* onClick={() => marcarComoLeida(novedad.id)} */ >
              <span className="novedad-icon">
                {getNovedadIcon(novedad.tipo)}
              </span>
              <div className="novedad-content">
                <p className="novedad-mensaje">{novedad.mensaje}</p>
                <span className="novedad-timestamp">{formatNovedadTimestamp(novedad.timestamp)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NovedadesSection;