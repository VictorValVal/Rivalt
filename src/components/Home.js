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

const db = getFirestore(app);
const auth = getAuth(app);

const ADD_BUTTON_STEP = 0;
const JOIN_BUTTON_STEP = 1;

const TUTORIAL_CONFIG = [
  { id: 'add_tournament', text: "Este botón es para añadir un nuevo torneo. ¡Crea el tuyo!", refName: 'addTournamentButtonRef' },
  { id: 'join_tournament', text: "Usa este botón para unirte a un torneo existente con un código.", refName: 'joinTournamentButtonRef' }
];

const PLAN_LABELS = {
  free: { label: "Gratis", icon: null, order: 1 },
  premium: { label: "Premium", icon: <FaStar style={{ color: '#FFD700', marginRight: '4px' }} />, order: 2 },
  pro: { label: "Pro", icon: <FaRocket style={{ color: '#AFEEEE', marginRight: '4px' }} />, order: 3 },
};

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return "Fecha no disponible";
  const date = timestamp.toDate();
  return date.toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' });
};

function Home() {
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState([]);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userPlan, setUserPlan] = useState('free');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userTotalTournaments, setUserTotalTournaments] = useState(0);
  const [isLoadingUserPlanData, setIsLoadingUserPlanData] = useState(true);

  const addTournamentButtonRef = useRef(null);
  const joinTournamentButtonRef = useRef(null);
  const buttonRefs = { addTournamentButtonRef, joinTournamentButtonRef };

  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(ADD_BUTTON_STEP);
  const [tutorialTargetRect, setTutorialTargetRect] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

  const fetchUserData = useCallback(async (currentUser) => {
    if (currentUser) {
      try {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserName(userData.nombre || currentUser.email);
          setUser({ ...currentUser, photoURL: userData.photoURL || null });
          setUserPlan(userData.plan || 'free');
        } else {
          setUserName(currentUser.email);
          setUser(currentUser);
          setUserPlan('free');
        }
      } catch (error) {
        console.error("Error al obtener datos de usuario:", error);
        setUserName(currentUser.email);
        setUser(currentUser);
        setUserPlan('free');
      }
    } else {
      setUser(null);
      setTorneos([]);
      setUserName("");
      setUserPlan('free');
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (showTutorial && isMobileView) {
      setIsMobileMenuOpen(true);
    } else if (!showTutorial && isMobileView) {
      setIsMobileMenuOpen(false);
    }
  }, [showTutorial, isMobileView]);

  useEffect(() => {
    const tutorialSeen = localStorage.getItem('homeTutorialSeen_v1');
    if (!tutorialSeen) {
      setShowTutorial(true);
    }
  }, [isMobileView]);

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
        const delay = (isMobileView && isMobileMenuOpen) ? 450 : 50;
        const timerId = setTimeout(calculateRect, delay);
        return () => clearTimeout(timerId);
      } else setTutorialTargetRect(null);
    } else setTutorialTargetRect(null);
  }, [showTutorial, tutorialStep, isMobileView, isMobileMenuOpen, buttonRefs]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      fetchUserData(currentUser);

      if (!currentUser) return;

      setIsLoadingUserPlanData(true);

      const processAndSetTorneos = (listenersResults) => {
        const allFetchedTorneos = listenersResults.flat();
        const torneosToProcess = allFetchedTorneos.filter(Boolean);
        const uniqueTorneosMap = new Map();
        torneosToProcess.forEach(t => { if (!uniqueTorneosMap.has(t.id)) uniqueTorneosMap.set(t.id, t); });
        setTorneos(Array.from(uniqueTorneosMap.values()));

        setUserTotalTournaments(uniqueTorneosMap.size);
        setIsLoadingUserPlanData(false);
      };
      const qCreados = query(collection(db, "torneos"), where("creadorId", "==", currentUser.uid));
      const qParticipantesIndividual = query(collection(db, "torneos"), where("participantes", "array-contains", currentUser.uid));
      const qTodos = collection(db, "torneos");
      const qEspectador = query(collection(db, "torneos"), where("espectadores", "array-contains", currentUser.uid));
      let creadosData = [], individualData = [], equipoData = [], espectadorData = [];
      const unsubCreados = onSnapshot(qCreados, (s) => { creadosData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'creados' })); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en creados:", e));
      const unsubIndividual = onSnapshot(qParticipantesIndividual, (s) => { individualData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'individual' })).filter(t => t.creadorId !== currentUser.uid); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en individual:", e));
      const unsubEquipos = onSnapshot(qTodos, (s) => { equipoData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'equipo' })).filter(t => t.creadorId !== currentUser.uid && !individualData.some(ind => ind.id === t.id) && t.modo === "equipo" && Array.isArray(t.participantes) && t.participantes.some(p => typeof p === 'object' && p?.capitan === currentUser.uid)); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en equipos:", e));
      const unsubEspectador = onSnapshot(qEspectador, (s) => { espectadorData = s.docs.map(d => ({ id: d.id, ...d.data(), origen: 'espectador' })).filter(t => t.creadorId !== currentUser.uid && !individualData.some(ind => ind.id === t.id) && !equipoData.some(eq => eq.id === t.id)); processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]); }, e => console.error("Error en espectador:", e));
      return () => { unsubCreados(); unsubIndividual(); unsubEquipos(); unsubEspectador(); };
    });
    return () => unsubscribeAuth();
  }, [fetchUserData]);

  const handlePlanChanged = useCallback(() => {
    if (auth.currentUser) {
      fetchUserData(auth.currentUser);
    }
  }, [fetchUserData]);

  const handleNuevoTorneo = useCallback(() => {
    navigate("/nuevo");
    if (isMobileView && isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [navigate, isMobileView, isMobileMenuOpen]);

  const handleUnirseTorneo = useCallback(() => {
    navigate("/unirse");
    if (isMobileView && isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [navigate, isMobileView, isMobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, [navigate]);

  const handleClickTorneo = useCallback((id) => {
    navigate(`/torneo/${id}`);
  }, [navigate]);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const torneosParaRender = useMemo(() => torneos, [torneos]);

  const handleTutorialNext = () => {
    if (tutorialStep < TUTORIAL_CONFIG.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      localStorage.setItem('homeTutorialSeen_v1', 'true');
    }
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    localStorage.setItem('homeTutorialSeen_v1', 'true');
  };

  const currentPlanDetails = PLAN_LABELS[userPlan] || PLAN_LABELS.free;
  const currentSimultaneousLimit = PLAN_LIMITS[userPlan]?.simultaneos;

  const handlePlanBannerClick = () => {
    if (userPlan !== 'pro') {
      navigate("/#planes-section");
    }
  };

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh' }}>
      <div className="home-background-shapes-container">
        <div className="home-animated-shape home-shape-1"></div>
        <div className="home-animated-shape home-shape-2"></div>
        <div className="home-animated-shape home-shape-3"></div>
      </div>

      <header className="home-banner">
        <img src={logoRivalt} alt="Logo Rivalt" className="rivalt-logo-home" />
        {user && (
          <div className="user-controls">
            <div className="user-welcome-text">{userName}</div>
            <div
              className={`user-plan-display ${userPlan !== 'pro' ? 'plan-upgradeable' : ''}`}
              title={userPlan !== 'pro' ? "Ver otros planes" : `Plan actual: ${currentPlanDetails.label}`}
              onClick={handlePlanBannerClick}
            >
              {currentPlanDetails.icon}
              <span className="user-plan-label">{currentPlanDetails.label}</span>
              {userPlan !== 'pro' && <FaExternalLinkAlt className="plan-upgrade-icon" />}
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="User Avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar user-avatar-default">
                {userName ? userName.charAt(0).toUpperCase() : <FaUserCircle />}
              </div>
            )}
            <button onClick={handleLogout} className="logout-button-home" title="Cerrar Sesión">
              <FaSignOutAlt className="logout-icon" />
              <span className="logout-text">Cerrar Sesión</span>
            </button>
          </div>
        )}
      </header>

      <main style={{ position: "relative", padding: "1rem", paddingTop: "80px" }}>
        <div className={`main-buttons ${isMobileMenuOpen ? 'active' : ''}`}>
          <div className="action-buttons-container">
            <button ref={addTournamentButtonRef} onClick={handleNuevoTorneo} title="Añadir Torneo"><FaPlus /></button>
            <button ref={joinTournamentButtonRef} onClick={handleUnirseTorneo} title="Unirse a Torneo"><FaSignInAlt /></button>
          </div>
          <button onClick={handleToggleMobileMenu} className="toggle-button-mobile" title="Menú de Acciones">
            {isMobileMenuOpen ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        <div className="tournament-content-wrapper">
          {!isLoadingUserPlanData && user && currentSimultaneousLimit !== undefined && (
              <div className="tournament-count-display">
                  Torneos: {userTotalTournaments}/{currentSimultaneousLimit}
              </div>
          )}

          <div className="card-grid-container">
            {torneosParaRender.map((torneo) => {
              const esCreador = user && user.uid === torneo.creadorId;
              const esParticipante = user && (
                torneo.participantes?.includes(user.uid) ||
                (torneo.modo === "equipo" && Array.isArray(torneo.participantes) && torneo.participantes.some(p => typeof p === 'object' && p?.capitan === user.uid))
              );
              const esEspectadorReal = user && torneo.espectadores?.includes(user.uid);

              let topCornerRoleIcon = null;
              if (esCreador) {
                  topCornerRoleIcon = <FaCrown key="creator-role" className="status-icon creator-role-icon" title="Eres el creador" />;
              } else if (esParticipante) {
                  topCornerRoleIcon = <FaUser key="participant-role" className="status-icon participant-role-icon" title="Eres participante" />;
              } else if (esEspectadorReal) {
                  topCornerRoleIcon = <FaEye key="spectator-role" className="status-icon spectator-role-icon" title="Eres espectador" />;
              }

              return (
                <div
                  key={torneo.id}
                  onClick={() => handleClickTorneo(torneo.id)}
                  className="card-v2"
                >
                  <div className="card-v2-content">
                    <div className="card-v2-front">
                      <div className="card-v2-front-header-icons">
                          {topCornerRoleIcon}
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