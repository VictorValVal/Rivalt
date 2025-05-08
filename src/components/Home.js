// components/Home.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc,getDocs, deleteDoc } from "firebase/firestore"; // getDocs no se usa aquí
import { app } from "../firebase";
import { FaTrophy, FaPlus, FaSignInAlt, FaBell, FaSignOutAlt, FaUsers, FaCalendarDay, FaKey, FaPlayCircle, FaListOl, FaFutbol } from "react-icons/fa";
// Asegúrate de que la ruta de importación del CSS sea correcta
import "./estilos/Home.css";
import logoRivalt from "../img/logoRivaltN.png";

const db = getFirestore(app);
const auth = getAuth(app);

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return "Fecha no disponible";
  const date = timestamp.toDate();
  return date.toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' });
};

// Nota: La función checkUnreadNotifications no está definida en el Home.js que proporcionaste.
// La añadiré basada en el código previo para que la funcionalidad exista.
// Si no necesitas notificaciones, puedes eliminar esta función y su llamada.
const checkUnreadNotifications = async (torneoId, userId) => {
  if (!userId) return false; // No se pueden verificar notificaciones sin usuario
  try {
    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    const ultimaVisitaKey = `ultimaVisitaNovedades_${torneoId}_${userId}`;
    const ultimaVisitaTimestamp = localStorage.getItem(ultimaVisitaKey);
    const novedadesSnap = await getDocs(query(novedadesRef)); // Necesitas importar getDocs

    if (novedadesSnap.empty) return false;
    if (!ultimaVisitaTimestamp) return true; // Todas no leídas si nunca visitó

    const lastVisitTime = parseInt(ultimaVisitaTimestamp, 10);
    return novedadesSnap.docs.some(novedadDoc => {
      const novedadData = novedadDoc.data();
      return novedadData.timestamp && novedadData.timestamp.toMillis() > lastVisitTime;
    });
  } catch (error) {
    console.error(`Error checking notifications for torneo ${torneoId}:`, error);
    return false; // Asumir que no hay no leídas si hay error
  }
};


function Home() {
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState([]);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(""); // Añadido para mostrar nombre

  // useEffect del Home.js proporcionado por el usuario, con adaptaciones
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => { // Hacer async para await getDoc
      setUser(currentUser);
      if (!currentUser) {
        setTorneos([]);
        setUserName(""); // Limpiar nombre al desloguear
        return;
      }

      // Obtener nombre de usuario (añadido)
      try {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserName(userDocSnap.data().nombre || currentUser.email);
        } else {
          setUserName(currentUser.email); // Fallback al email
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
        setUserName(currentUser.email);
      }


      // Combina las consultas en una sola lógica de actualización para evitar duplicados fácilmente
      const processAndSetTorneos = async (listenersResults) => {
         const allFetchedTorneos = listenersResults.flat(); // Combina resultados de todos los listeners
         const torneosConNotificaciones = await Promise.all(
              allFetchedTorneos.map(async (torneo) => {
                   if (!torneo) return null;
                   const tieneNotificaciones = await checkUnreadNotifications(torneo.id, currentUser.uid);
                   return { ...torneo, tieneNotificacionesNoLeidas: tieneNotificaciones };
              })
         );

         // Filtrar nulos y duplicados por ID
         const uniqueTorneosMap = new Map();
         torneosConNotificaciones.filter(Boolean).forEach(t => {
           if (!uniqueTorneosMap.has(t.id)) { // Da prioridad a la primera vez que aparece (ej: 'creados')
              uniqueTorneosMap.set(t.id, t);
           }
         });
         setTorneos(Array.from(uniqueTorneosMap.values()));
      };


      const qCreados = query(collection(db, "torneos"), where("creadorId", "==", currentUser.uid));
      const qParticipantesIndividual = query(collection(db, "torneos"), where("participantes", "array-contains", currentUser.uid));
      const qTodos = collection(db, "torneos"); // Para buscar equipos

      let creadosData = [], individualData = [], equipoData = [];

      const unsubCreados = onSnapshot(qCreados, (snapshot) => {
        creadosData = snapshot.docs.map(d => ({ id: d.id, ...d.data(), origen: 'creados' }));
        processAndSetTorneos([creadosData, individualData, equipoData]);
      }, err => console.error("Error listener creados:", err));

      const unsubIndividual = onSnapshot(qParticipantesIndividual, (snapshot) => {
        individualData = snapshot.docs
            .map(d => ({ id: d.id, ...d.data(), origen: 'individual' }))
            .filter(t => t.creadorId !== currentUser.uid); // Excluir los ya listados en creados
        processAndSetTorneos([creadosData, individualData, equipoData]);
      }, err => console.error("Error listener individual:", err));

      const unsubEquipos = onSnapshot(qTodos, (snapshot) => {
          equipoData = snapshot.docs
            .map(d => ({ id: d.id, ...d.data(), origen: 'equipo' }))
            .filter(t =>
                t.creadorId !== currentUser.uid && // No es creador
                !individualData.some(ind => ind.id === t.id) && // No listado como individual
                t.modo === "equipo" &&
                Array.isArray(t.participantes) &&
                t.participantes.some(p => typeof p === 'object' && p?.capitan === currentUser.uid) // Es capitán
            );
          processAndSetTorneos([creadosData, individualData, equipoData]);
      }, err => console.error("Error listener equipos:", err));


      // Cleanup function
      return () => {
        unsubCreados();
        unsubIndividual();
        unsubEquipos();
      };
    });

    // Cleanup auth listener
    return () => unsubscribeAuth();
  }, []); // Ejecutar solo una vez al montar


  const handleNuevoTorneo = useCallback(() => navigate("/nuevo"), [navigate]);
  const handleUnirseTorneo = useCallback(() => navigate("/unirse"), [navigate]);
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirige a la página principal o de login
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, [navigate]);

  const handleClickTorneo = useCallback((id) => {
    navigate(`/torneo/${id}`);
  }, [navigate]);

  // handleEliminarTorneo del JS proporcionado, añadiendo event.stopPropagation()
  const handleEliminarTorneo = useCallback(async (id, event) => {
    event.stopPropagation(); // FUNDAMENTAL para evitar el click de la tarjeta

    // Añadir verificación de usuario y permiso (más robusto)
    if (!user) {
        alert("Debes estar logueado para eliminar torneos.");
        return;
    }
    const torneo = torneos.find(t => t.id === id); // Busca en el estado actual
    if (!torneo || torneo.creadorId !== user.uid) {
        alert("No tienes permiso para eliminar este torneo o ya no existe.");
        return;
    }

    // Confirmación
    if (!window.confirm(`¿Seguro que quieres eliminar el torneo "${torneo.titulo || id}"?`)) {
      return;
    }

    // Eliminación
    try {
      const torneoRef = doc(db, "torneos", id);
      await deleteDoc(torneoRef);
      // No necesitas setTorneos aquí, el listener onSnapshot lo hará
      console.log(`Torneo con ID ${id} eliminado.`);
    } catch (error) {
      console.error("Error al eliminar el torneo:", error);
      alert("Error al eliminar torneo.");
    }
  }, [user, torneos, db]); // Incluir 'db' si se usa directamente aquí, aunque ya está en el scope global

  // useMemo para evitar recalcular en cada render si 'torneos' no cambia
  const torneosParaRender = useMemo(() => torneos, [torneos]);

  return (
    <div>
       {/* Banner (igual que en la versión anterior) */}
      <header className="home-banner">
        <img src={logoRivalt} alt="Logo Rivalt" className="rivalt-logo-home" />
        {user && <div className="user-info-home"><span>Bienvenido, {userName}</span></div>}
        {user && (
          <button onClick={handleLogout} className="logout-button-home" title="Cerrar Sesión">
            <FaSignOutAlt /> Cerrar Sesión
          </button>
        )}
      </header>

      <main style={{ position: "relative", padding: "1rem", paddingTop: "80px" }}>
         {/* Botones flotantes (igual que en la versión anterior) */}
        <div className="main-buttons">
          <button onClick={handleNuevoTorneo} title="Añadir Torneo"><FaPlus /></button>
          <button onClick={handleUnirseTorneo} title="Unirse a Torneo"><FaSignInAlt /></button>
        </div>

        {/* Aplicar el contenedor de grid del nuevo diseño */}
        <div className="card-grid-container">
          {torneosParaRender.map((torneo) => {
            const esCreador = user && user.uid === torneo.creadorId;
            return (
              // Usar la estructura y clases de card-v2
              <div
                key={torneo.id}
                // Click en toda la tarjeta para navegar (handleClickTorneo se encarga de no navegar si viene de FaTrash)
                onClick={() => handleClickTorneo(torneo.id)}
                className="card-v2"
              >
                <div className="card-v2-content">
                  {/* CARA FRONTAL (Nuevo diseño) */}
                  <div className="card-v2-front">
                    <div className="card-v2-front-header-icons">
                      {/* Campana: visible si hay notificaciones Y NO es el creador */}
                      {torneo.tieneNotificacionesNoLeidas && !esCreador && (
                        <FaBell className="notification-badge-card" title="Nuevas novedades"/>
                      )}
                      {/* Papelera: visible si ES el creador */}
                      
                    </div>
                    {/* Contenido principal frontal */}
                    <FaTrophy className="card-v2-front-trophy" />
                    <h2 className="card-v2-front-title">{torneo.titulo || "Torneo sin título"}</h2>
                    <p className="card-v2-front-subtitle">{torneo.deporte || "Deporte"}</p>
                    <div className="card-v2-front-footer">
                      <span>{esCreador ? "Gestionar torneo" : "Ver detalles"}</span>
                    </div>
                  </div>

                  {/* CARA TRASERA (Nuevo diseño con MÁS información) */}
                  <div className="card-v2-back">
                    {/* No hay papelera aquí */}
                    <h3 className="card-v2-back-title">{torneo.titulo || "Detalles"}</h3>
                    {/* Lista de detalles */}
                    <ul className="card-v2-back-details">
                      <li>
                        <FaPlayCircle className="detail-icon" />
                        <div><strong>Modo:</strong> {torneo.modo || "N/A"}</div>
                      </li>
                      <li>
                        <FaListOl className="detail-icon" />
                        <div><strong>Tipo:</strong> {torneo.tipo || "N/A"}</div>
                      </li>
                      <li>
                        <FaFutbol className="detail-icon" /> {/* O un icono genérico */}
                        <div><strong>Deporte:</strong> {torneo.deporte || "N/A"}</div>
                      </li>
                      <li>
                        <FaUsers className="detail-icon" />
                        <div>
                          <strong>Participantes:</strong>
                          {/* Asegurarse de que participantes sea un array antes de length */}
                          {` ${Array.isArray(torneo.participantes) ? torneo.participantes.length : 0} / ${torneo.numEquipos || "Ilimitados"}`}
                        </div>
                      </li>
                      <li>
                        <FaKey className="detail-icon" />
                        <div><strong>Código:</strong> <span className="join-code-v2">{torneo.codigo || "N/A"}</span></div>
                      </li>
                      {/* Mostrar fecha de creación si existe */}
                      {torneo.fechaCreacion && (
                        <li>
                          <FaCalendarDay className="detail-icon" />
                          <div><strong>Creado:</strong> {formatDate(torneo.fechaCreacion)}</div>
                        </li>
                      )}
                      {/* Puedes añadir más detalles si están disponibles en torneoData */}
                      {/* Ejemplo: Descripción */}
                      {/* {torneo.descripcion && <li><FaInfoCircle className="detail-icon" /><div><strong>Desc:</strong> {torneo.descripcion.substring(0, 30)}{torneo.descripcion.length > 30 ? '...' : ''}</div></li>} */}
                    </ul>
                    <div className="card-v2-back-footer">
                      <span>Clic para gestionar/ver</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default Home;