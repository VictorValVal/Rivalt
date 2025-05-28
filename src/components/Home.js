// components/Home.js
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react"; // Added useRef
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import { app } from "../firebase";
import { FaTrophy, FaPlus, FaSignInAlt, FaSignOutAlt, FaUser, FaCalendarDay, FaKey, FaPlayCircle, FaListOl, FaFutbol, FaEye, FaCrown, FaUserCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./estilos/Home.css";
import logoRivalt from "../img/logoRivaltN.png";
import Tutorial from "./Tutorial"; // Import the tutorial component

const db = getFirestore(app);
const auth = getAuth(app);

// Constants for tutorial steps
const ADD_BUTTON_STEP = 0;
const JOIN_BUTTON_STEP = 1;

const TUTORIAL_CONFIG = [
  {
    id: 'add_tournament',
    text: "Este botón es para añadir un nuevo torneo. ¡Crea el tuyo!",
    refName: 'addTournamentButtonRef',
  },
  {
    id: 'join_tournament',
    text: "Usa este botón para unirte a un torneo existente con un código.",
    refName: 'joinTournamentButtonRef',
  }
];


const formatDate = (timestamp) => {
  // ... (formatDate function remains the same)
  if (!timestamp || !timestamp.seconds) return "Fecha no disponible";
  const date = timestamp.toDate();
  return date.toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' });
};

function Home() {
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState([]);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for tutorial elements
  const addTournamentButtonRef = useRef(null);
  const joinTournamentButtonRef = useRef(null);
  const buttonRefs = { addTournamentButtonRef, joinTournamentButtonRef };

  // State for tutorial
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(ADD_BUTTON_STEP);
  const [tutorialTargetRect, setTutorialTargetRect] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to initialize and manage tutorial visibility & state
  useEffect(() => {
    const tutorialSeen = localStorage.getItem('homeTutorialSeen_v1'); // Use a versioned key
    if (!tutorialSeen) {
      if (isMobileView && !isMobileMenuOpen) {
        setIsMobileMenuOpen(true); // Attempt to open mobile menu for button visibility
      }
      setShowTutorial(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileView]); // Only depends on isMobileView for initial setup logic related to mobile menu


  // Effect to calculate target element's position for the spotlight
  useEffect(() => {
    if (showTutorial) {
      const currentStepConfig = TUTORIAL_CONFIG[tutorialStep];
      const targetRef = buttonRefs[currentStepConfig.refName];

      if (targetRef && targetRef.current) {
        const calculateRect = () => {
          if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) { // Check if element is rendered and has size
              setTutorialTargetRect(rect);
            } else {
              setTutorialTargetRect(null); // Element not ready or visible
              // Consider closing tutorial or retrying if buttons are not interactable
            }
          }
        };

        // If on mobile and menu is opening, wait for CSS transitions
        const delay = (isMobileView && isMobileMenuOpen) ? 450 : 0; // Based on Home.css transition for .action-buttons-container
        
        const timerId = setTimeout(calculateRect, delay);
        return () => clearTimeout(timerId);

      } else {
        setTutorialTargetRect(null); // Target ref not available
      }
    } else {
      setTutorialTargetRect(null); // Clear rect if tutorial is not shown
    }
  }, [showTutorial, tutorialStep, isMobileView, isMobileMenuOpen, buttonRefs]);


  // --- Firebase Auth and Firestore useEffect ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        // ... (your existing auth and firestore logic remains the same)
      if (currentUser) {
        try {
          const userDocRef = doc(db, "usuarios", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserName(userData.nombre || currentUser.email);
            setUser({ ...currentUser, photoURL: userData.photoURL || null });
          } else {
            setUserName(currentUser.email);
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName(currentUser.email);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setTorneos([]);
        setUserName("");
      }

      if (!currentUser) return;

      const processAndSetTorneos = async (listenersResults) => {
        const allFetchedTorneos = listenersResults.flat();
        const torneosToProcess = allFetchedTorneos.filter(Boolean);

        const uniqueTorneosMap = new Map();
        torneosToProcess.forEach(t => {
          if (!uniqueTorneosMap.has(t.id)) {
            uniqueTorneosMap.set(t.id, t);
          }
        });
        setTorneos(Array.from(uniqueTorneosMap.values()));
      };

      const qCreados = query(collection(db, "torneos"), where("creadorId", "==", currentUser.uid));
      const qParticipantesIndividual = query(collection(db, "torneos"), where("participantes", "array-contains", currentUser.uid));
      const qTodos = collection(db, "torneos");
      const qEspectador = query(collection(db, "torneos"), where("espectadores", "array-contains", currentUser.uid));

      let creadosData = [], individualData = [], equipoData = [], espectadorData = [];

      const unsubCreados = onSnapshot(qCreados, (snapshot) => {
        creadosData = snapshot.docs.map(d => ({ id: d.id, ...d.data(), origen: 'creados' }));
        processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]);
      }, err => console.error("Error listener creados:", err));

      const unsubIndividual = onSnapshot(qParticipantesIndividual, (snapshot) => {
        individualData = snapshot.docs
          .map(d => ({ id: d.id, ...d.data(), origen: 'individual' }))
          .filter(t => t.creadorId !== currentUser.uid);
        processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]);
      }, err => console.error("Error listener individual:", err));

      const unsubEquipos = onSnapshot(qTodos, (snapshot) => {
        equipoData = snapshot.docs
          .map(d => ({ id: d.id, ...d.data(), origen: 'equipo' }))
          .filter(t =>
            t.creadorId !== currentUser.uid &&
            !individualData.some(ind => ind.id === t.id) &&
            t.modo === "equipo" &&
            Array.isArray(t.participantes) &&
            t.participantes.some(p => typeof p === 'object' && p?.capitan === currentUser.uid)
          );
        processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]);
      }, err => console.error("Error listener equipos:", err));

      const unsubEspectador = onSnapshot(qEspectador, (snapshot) => {
        espectadorData = snapshot.docs
          .map(d => ({ id: d.id, ...d.data(), origen: 'espectador' }))
          .filter(t =>
            t.creadorId !== currentUser.uid &&
            !individualData.some(ind => ind.id === t.id) &&
            !equipoData.some(eq => eq.id === t.id)
          );
        processAndSetTorneos([creadosData, individualData, equipoData, espectadorData]);
      }, err => console.error("Error listener espectador:", err));

      return () => {
        unsubCreados();
        unsubIndividual();
        unsubEquipos();
        unsubEspectador();
      };
    });
    return () => unsubscribeAuth();
  }, []);

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

  // Tutorial navigation handlers
  const handleTutorialNext = () => {
    if (tutorialStep < TUTORIAL_CONFIG.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      localStorage.setItem('homeTutorialSeen_v1', 'true');
      // Optionally close mobile menu if it was opened by the tutorial
      // if (isMobileView && isMobileMenuOpen) setIsMobileMenuOpen(false); 
    }
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    localStorage.setItem('homeTutorialSeen_v1', 'true');
    // Optionally close mobile menu
    // if (isMobileView && isMobileMenuOpen) setIsMobileMenuOpen(false);
  };


  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh' }}>
      <div className="home-background-shapes-container">
        <div className="home-animated-shape home-shape-1"></div>
        <div className="home-animated-shape home-shape-2"></div>
        <div className="home-animated-shape home-shape-3"></div>
      </div>

      <header className="home-banner">
        {/* ... (header content) ... */}
        <img src={logoRivalt} alt="Logo Rivalt" className="rivalt-logo-home" />
        {user && (
          <div className="user-controls">
            {user.photoURL ? (
              <img src={user.photoURL} alt="User Avatar" className="user-avatar" />
            ) : (
              <div className="user-avatar user-avatar-default">
                {userName ? userName.charAt(0).toUpperCase() : <FaUserCircle />}
              </div>
            )}
            <div className="user-welcome-text">{userName}</div>
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

        <div className="card-grid-container">
          {/* ... (torneosParaRender.map remains the same) ... */}
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
                  {/* CARA FRONTAL */}
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

                  {/* CARA TRASERA */}
                  <div className="card-v2-back">
                    <h3 className="card-v2-back-title">
                      {torneo.titulo || "Detalles"}
                    </h3>
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
                        <FaFutbol className="detail-icon" />
                        <div><strong>Deporte:</strong> {torneo.deporte || "N/A"}</div>
                      </li>
                      <li>
                        <FaUser className="detail-icon" />
                        <div>
                          <strong>Participantes:</strong>
                          {` ${Array.isArray(torneo.participantes) ? torneo.participantes.length : 0} / ${torneo.numEquipos || "Ilimitados"}`}
                        </div>
                      </li>
                      <li>
                        <FaKey className="detail-icon" />
                        <div><strong>Código:</strong> <span className="join-code-v2">{torneo.codigo || "N/A"}</span></div>
                      </li>
                      {torneo.fechaCreacion && (
                        <li>
                          <FaCalendarDay className="detail-icon" />
                          <div><strong>Creado:</strong> {formatDate(torneo.fechaCreacion)}</div>
                        </li>
                      )}
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

      {/* Render Tutorial Overlay */}
      {showTutorial && tutorialTargetRect && TUTORIAL_CONFIG[tutorialStep] && (
        <Tutorial
          targetRect={tutorialTargetRect}
          text={TUTORIAL_CONFIG[tutorialStep].text}
          onNext={handleTutorialNext}
          onClose={handleTutorialClose}
          isLastStep={tutorialStep === TUTORIAL_CONFIG.length - 1}
          spotlightPadding={10} // Padding around the button for the spotlight
        />
      )}
    </div>
  );
}

export default Home;