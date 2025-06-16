import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { app } from "../firebase";
import {
  FaTrophy, FaPlus, FaSignInAlt, FaSignOutAlt, FaUser, FaCalendarDay, FaKey,
  FaPlayCircle, FaListOl, FaFutbol, FaEye, FaCrown, FaUserCircle,
  FaChevronDown, FaChevronUp, FaStar, FaRocket, FaExternalLinkAlt
} from "react-icons/fa";
import "./estilos/Home.css";
import logoRivalt from "../img/logoRivaltN.png";
import Tutorial from "./Tutorial";
import Planes from './Planes';
import { PLAN_LIMITS } from './Nuevo';

// Inicialización de Firestore y Firebase Auth
const db = getFirestore(app);
const auth = getAuth(app);

// Constantes para los pasos del tutorial
const ADD_BUTTON_STEP = 0;
const JOIN_BUTTON_STEP = 1;

// Configuración de los pasos del tutorial, incluyendo el texto y la referencia al botón
const TUTORIAL_CONFIG = [
  { id: 'add_tournament', text: "Este botón es para añadir un nuevo torneo. ¡Crea el tuyo!", refName: 'addTournamentButtonRef' },
  { id: 'join_tournament', text: "Usa este botón para unirte a un torneo existente con un código.", refName: 'joinTournamentButtonRef' }
];

// Etiquetas y propiedades para los diferentes planes de usuario
const PLAN_LABELS = {
  free: { label: "Gratis", icon: null, order: 1 },
  premium: { label: "Premium", icon: <FaStar style={{ color: '#FFD700', marginRight: '4px' }} />, order: 2 },
  pro: { label: "Pro", icon: <FaRocket style={{ color: '#AFEEEE', marginRight: '4px' }} />, order: 3 },
};

// Función para formatear un timestamp de Firebase a una fecha legible
const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return "Fecha no disponible";
  const date = timestamp.toDate();
  return date.toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' });
};

// Componente principal de la página de inicio
function Home() {
  const navigate = useNavigate(); // Hook para la navegación
  const [torneos, setTorneos] = useState([]); // Estado para almacenar la lista de torneos
  const [user, setUser] = useState(null); // Estado para la información del usuario autenticado
  const [userName, setUserName] = useState(""); // Estado para el nombre del usuario
  const [userPlan, setUserPlan] = useState('free'); // Estado para el plan del usuario
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Estado para controlar el menú móvil
  const [userTotalTournaments, setUserTotalTournaments] = useState(0); // Estado para el total de torneos del usuario
  const [isLoadingUserPlanData, setIsLoadingUserPlanData] = useState(true); // Estado para el control de carga del plan

  // Referencias para los botones del tutorial para posicionar el spotlight
  const addTournamentButtonRef = useRef(null);
  const joinTournamentButtonRef = useRef(null);
  const buttonRefs = { addTournamentButtonRef, joinTournamentButtonRef };

  const [showTutorial, setShowTutorial] = useState(false); // Estado para mostrar/ocultar el tutorial
  const [tutorialStep, setTutorialStep] = useState(ADD_BUTTON_STEP); // Estado para el paso actual del tutorial
  const [tutorialTargetRect, setTutorialTargetRect] = useState(null); // Estado para las dimensiones del objetivo del tutorial
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768); // Estado para detectar vista móvil

  // Función useCallback para obtener los datos del usuario desde Firestore
  const fetchUserData = useCallback(async (currentUser) => {
    if (currentUser) {
      try {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserName(userData.nombre || currentUser.email); // Establece el nombre de usuario o email
          setUser({ ...currentUser, photoURL: userData.photoURL || null }); // Establece el usuario con su foto de perfil
          setUserPlan(userData.plan || 'free'); // Establece el plan del usuario
        } else {
          setUserName(currentUser.email); // Si no hay datos, usa el email
          setUser(currentUser);
          setUserPlan('free'); // Por defecto, plan gratis
        }
      } catch (error) {
        console.error("Error al obtener datos de usuario:", error);
        setUserName(currentUser.email);
        setUser(currentUser);
        setUserPlan('free');
      }
    } else {
      // Si no hay usuario autenticado, reinicia los estados
      setUser(null);
      setTorneos([]);
      setUserName("");
      setUserPlan('free');
    }
  }, []);

  // Efecto para manejar el redimensionamiento de la ventana y detectar la vista móvil
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Efecto para controlar la apertura del menú móvil durante el tutorial
  useEffect(() => {
    if (showTutorial && isMobileView) {
      setIsMobileMenuOpen(true);
    } else if (!showTutorial && isMobileView) {
      setIsMobileMenuOpen(false);
    }
  }, [showTutorial, isMobileView]);

  // Efecto para verificar si el tutorial ya ha sido visto
  useEffect(() => {
    const tutorialSeen = localStorage.getItem('homeTutorialSeen_v1');
    if (!tutorialSeen) {
      setShowTutorial(true); // Si no se ha visto, muestra el tutorial
    }
  }, [isMobileView]);

  // Efecto para actualizar la posición del spotlight del tutorial
  useEffect(() => {
    if (showTutorial) {
      const currentStepConfig = TUTORIAL_CONFIG[tutorialStep];
      const targetRef = buttonRefs[currentStepConfig.refName];
      if (targetRef && targetRef.current) {
        const calculateRect = () => {
          if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) setTutorialTargetRect(rect);
            else setTutorialTargetRect(null);
          }
        };
        // Retraso para dar tiempo a que el menú móvil se abra si es necesario
        const delay = (isMobileView && isMobileMenuOpen) ? 450 : 50;
        const timerId = setTimeout(calculateRect, delay);
        return () => clearTimeout(timerId);
      } else setTutorialTargetRect(null);
    } else setTutorialTargetRect(null);
  }, [showTutorial, tutorialStep, isMobileView, isMobileMenuOpen, buttonRefs]);

  // Efecto para la autenticación y suscripción a los cambios en los torneos
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      fetchUserData(currentUser); // Obtiene los datos del usuario

      if (!currentUser) return; // Si no hay usuario, termina el efecto

      setIsLoadingUserPlanData(true); // Inicia la carga de datos del plan

      // Función para procesar y actualizar la lista de torneos combinada
      const processAndSetTorneos = (listenersResults) => {
        const allFetchedTorneos = listenersResults.flat(); // Combina los resultados de todos los listeners
        const torneosToProcess = allFetchedTorneos.filter(Boolean);
        const uniqueTorneosMap = new Map(); // Usa un mapa para almacenar torneos únicos
        torneosToProcess.forEach(t => { if (!uniqueTorneosMap.has(t.id)) uniqueTorneosMap.set(t.id, t); });
        setTorneos(Array.from(uniqueTorneosMap.values())); // Actualiza el estado de los torneos

        setUserTotalTournaments(uniqueTorneosMap.size); // Actualiza el contador de torneos
        setIsLoadingUserPlanData(false); // Finaliza la carga de datos del plan
      };

      // Queries para obtener torneos donde el usuario es creador, participante individual, capitán de equipo o espectador
      const qCreados = query(collection(db, "torneos"), where("creadorId", "==", currentUser.uid));
      const qParticipantesIndividual = query(collection(db, "torneos"), where("participantes", "array-contains", currentUser.uid));
      const qTodos = collection(db, "torneos"); // Necesario para filtrar equipos por capitán localmente
      const qEspectador = query(collection(db, "torneos"), where("espectadores", "array-contains", currentUser.uid));

      let creadosData = [], individualData = [], equipoData = [], espectadorData = [];

      // Suscripciones a los cambios en tiempo real de los diferentes tipos de torneos
      const unsubCreados = onSnapshot(qCreados, (s) => { creadosData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'creados' })); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en creados:", e));
      const unsubIndividual = onSnapshot(qParticipantesIndividual, (s) => { individualData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'individual' })).filter(t => t.creadorId !== currentUser.uid); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en individual:", e));
      const unsubEquipos = onSnapshot(qTodos, (s) => { equipoData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'equipo' })).filter(t => t.creadorId !== currentUser.uid && !individualData.some(ind => ind.id === t.id) && t.modo === "equipo" && Array.isArray(t.participantes) && t.participantes.some(p => typeof p === 'object' && p?.capitan === currentUser.uid)); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en equipos:", e));
      const unsubEspectador = onSnapshot(qEspectador, (s) => { espectadorData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'espectador' })).filter(t => t.creadorId !== currentUser.uid && !individualData.some(ind => ind.id === t.id) && !equipoData.some(eq => eq.id === t.id)); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en espectador:", e));

      // Función de limpieza para desuscribirse al desmontar el componente
      return () => { unsubCreados(); unsubIndividual(); unsubEquipos(); unsubEspectador(); };
    });
    return () => unsubscribeAuth();
  }, [fetchUserData]);

  // Callback para cuando el plan del usuario ha cambiado
  const handlePlanChanged = useCallback(() => {
    if (auth.currentUser) {
      fetchUserData(auth.currentUser);
    }
  }, [fetchUserData]);

  // Manejador para navegar a la página de creación de un nuevo torneo
  const handleNuevoTorneo = useCallback(() => {
    navigate("/nuevo");
    if (isMobileView && isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [navigate, isMobileView, isMobileMenuOpen]);

  // Manejador para navegar a la página de unión a un torneo
  const handleUnirseTorneo = useCallback(() => {
    navigate("/unirse");
    if (isMobileView && isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [navigate, isMobileView, isMobileMenuOpen]);

  // Manejador para cerrar sesión
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, [navigate]);

  // Manejador para navegar a la página de un torneo específico
  const handleClickTorneo = useCallback((id) => {
    navigate(`/torneo/${id}`);
  }, [navigate]);

  // Manejador para alternar el menú móvil
  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Memoriza la lista de torneos para evitar recálculos innecesarios
  const torneosParaRender = useMemo(() => torneos, [torneos]);

  // Manejador para avanzar al siguiente paso del tutorial
  const handleTutorialNext = () => {
    if (tutorialStep < TUTORIAL_CONFIG.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false); // Si es el último paso, oculta el tutorial
      localStorage.setItem('homeTutorialSeen_v1', 'true'); // Marca el tutorial como visto
    }
  };

  // Manejador para cerrar el tutorial
  const handleTutorialClose = () => {
    setShowTutorial(false);
    localStorage.setItem('homeTutorialSeen_v1', 'true'); // Marca el tutorial como visto
  };

  // Obtiene los detalles del plan actual y los límites de torneos simultáneos
  const currentPlanDetails = PLAN_LABELS[userPlan] || PLAN_LABELS.free;
  const currentSimultaneousLimit = PLAN_LIMITS[userPlan]?.simultaneos;

  // Manejador para hacer scroll a la sección de planes al hacer clic en el banner del plan
  const handlePlanBannerClick = () => {
  if (userPlan !== 'pro') {
    const planesSection = document.getElementById('planes-section');
    if (planesSection) {
      planesSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh' }}>
      {/* Contenedor de las formas de fondo animadas */}
      <div className="home-background-shapes-container">
        <div className="home-animated-shape home-shape-1"></div>
        <div className="home-animated-shape home-shape-2"></div>
        <div className="home-animated-shape home-shape-3"></div>
      </div>

      {/* Cabecera de la página de inicio */}
      <header className="home-banner">
        <img src={logoRivalt} alt="Logo Rivalt" className="rivalt-logo-home" />
        {user && ( // Muestra los controles de usuario si hay un usuario autenticado
          <div className="user-controls">
            <div className="user-welcome-text">{userName}</div>
            {/* Muestra el plan actual del usuario, con opción de mejora si no es Pro */}
            <div
              className={`user-plan-display ${userPlan !== 'pro' ? 'plan-upgradeable' : ''}`}
              title={userPlan !== 'pro' ? "Ver otros planes" : `Plan actual: ${currentPlanDetails.label}`}
              onClick={handlePlanBannerClick}
            >
              {currentPlanDetails.icon}
              <span className="user-plan-label">{currentPlanDetails.label}</span>
              {userPlan !== 'pro' && <FaExternalLinkAlt className="plan-upgrade-icon" />}
            </div>
            {/* Avatar del usuario (imagen o iniciales) */}
            {user.photoURL ? (
              <img src={user.photoURL} alt="User Avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar user-avatar-default">
                {userName ? userName.charAt(0).toUpperCase() : <FaUserCircle />}
              </div>
            )}
            {/* Botón de cerrar sesión */}
            <button onClick={handleLogout} className="logout-button-home" title="Cerrar Sesión">
              <FaSignOutAlt className="logout-icon" />
              <span className="logout-text">Cerrar Sesión</span>
            </button>
          </div>
        )}
      </header>

      {/* Contenido principal de la página */}
      <main style={{ position: "relative", padding: "1rem", paddingTop: "80px" }}>
        {/* Botones flotantes para añadir/unirse a torneos */}
        <div className={`main-buttons ${isMobileMenuOpen ? 'active' : ''}`}>
          <div className="action-buttons-container">
            <button ref={addTournamentButtonRef} onClick={handleNuevoTorneo} title="Añadir Torneo"><FaPlus /></button>
            <button ref={joinTournamentButtonRef} onClick={handleUnirseTorneo} title="Unirse a Torneo"><FaSignInAlt /></button>
          </div>
          {/* Botón de alternancia para el menú móvil */}
          <button onClick={handleToggleMobileMenu} className="toggle-button-mobile" title="Menú de Acciones">
            {isMobileMenuOpen ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        {/* Contenedor de torneos */}
        <div className="tournament-content-wrapper">
          {/* Muestra el contador de torneos si los datos del plan ya han cargado */}
          {!isLoadingUserPlanData && user && currentSimultaneousLimit !== undefined && (
              <div className="tournament-count-display">
                  Torneos: {userTotalTournaments}/{currentSimultaneousLimit}
              </div>
          )}

          {/* Cuadrícula de tarjetas de torneos */}
          <div className="card-grid-container">
            {torneosParaRender.map((torneo) => {
              // Determina el rol del usuario en cada torneo
              const esCreador = user && user.uid === torneo.creadorId;
              const esParticipante = user && (
                torneo.participantes?.includes(user.uid) ||
                (torneo.modo === "equipo" && Array.isArray(torneo.participantes) && torneo.participantes.some(p => typeof p === 'object' && p?.capitan === user.uid))
              );
              const esEspectadorReal = user && torneo.espectadores?.includes(user.uid);

              let topCornerRoleIcon = null;
              // Asigna el icono de rol correspondiente
              if (esCreador) {
                  topCornerRoleIcon = <FaCrown key="creator-role" className="status-icon creator-role-icon" title="Eres el creador" />;
              } else if (esParticipante) {
                  topCornerRoleIcon = <FaUser key="participant-role" className="status-icon participant-role-icon" title="Eres participante" />;
              } else if (esEspectadorReal) {
                  topCornerRoleIcon = <FaEye key="spectator-role" className="status-icon spectator-role-icon" title="Eres espectador" />;
              }

              return (
                // Tarjeta de torneo individual
                <div
                  key={torneo.id}
                  onClick={() => handleClickTorneo(torneo.id)}
                  className="card-v2"
                >
                  <div className="card-v2-content">
                    {/* Cara frontal de la tarjeta */}
                    <div className="card-v2-front">
                      <div className="card-v2-front-header-icons">
                          {topCornerRoleIcon} {/* Icono de rol */}
                      </div>
                      <FaTrophy className="card-v2-front-trophy" />
                      <h2 className="card-v2-front-title">{torneo.titulo || "Torneo sin título"}</h2>
                      <p className="card-v2-front-subtitle">{torneo.deporte || "Deporte"}</p>
                      <div className="card-v2-front-footer">
                        <span>
                          {esCreador
                            ? "Gestionar torneo"
                            : "Ver detalles"}
                        </span>
                      </div>
                    </div>
                    {/* Cara trasera de la tarjeta (detalles al voltear) */}
                    <div className="card-v2-back">
                      <h3 className="card-v2-back-title">
                        {torneo.titulo || "Detalles"}
                      </h3>
                      <ul className="card-v2-back-details">
                        <li><FaPlayCircle className="detail-icon" /><div><strong>Modo:</strong> {torneo.modo || "N/A"}</div></li>
                        <li><FaListOl className="detail-icon" /><div><strong>Tipo:</strong> {torneo.tipo || "N/A"}</div></li>
                        <li><FaFutbol className="detail-icon" /><div><strong>Deporte:</strong> {torneo.deporte || "N/A"}</div></li>
                        <li><FaUser className="detail-icon" /><div><strong>Participantes:</strong>{` ${Array.isArray(torneo.participantes) ? torneo.participantes.length : 0} / ${torneo.numEquipos || "Ilimitados"}`}</div></li>
                        <li><FaKey className="detail-icon" /><div><strong>Código:</strong> <span className="join-code-v2">{torneo.codigo || "N/A"}</span></div></li>
                        {torneo.fechaCreacion && (<li><FaCalendarDay className="detail-icon" /><div><strong>Creado:</strong> {formatDate(torneo.fechaCreacion)}</div></li>)}
                      </ul>
                      <div className="card-v2-back-footer"><span>Clic para gestionar/ver</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Componente del tutorial, visible si showTutorial es true y se ha detectado el objetivo */}
      {showTutorial && tutorialTargetRect && TUTORIAL_CONFIG[tutorialStep] && (
        <Tutorial
          targetRect={tutorialTargetRect}
          text={TUTORIAL_CONFIG[tutorialStep].text}
          onNext={handleTutorialNext}
          onClose={handleTutorialClose}
          isLastStep={tutorialStep === TUTORIAL_CONFIG.length - 1}
          spotlightPadding={10}
        />
      )}
    </div>
  );
}

export default Home;