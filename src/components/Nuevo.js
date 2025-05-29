// components/Nuevo.js
import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDoc, doc, onSnapshot } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { app } from "../firebase";
import "./estilos/Nuevo.css";
import { FaArrowLeft, FaStar, FaRocket, FaExclamationTriangle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import ReactModal from 'react-modal';

const db = getFirestore(app);
const auth = getAuth(app);
const TOTAL_STEPS = 4;

export const PLAN_DISPLAY_NAMES = { // Exported
  free: "Gratis",
  premium: "Premium",
  pro: "Pro"
};

const predefinedSports = [
  "Fútbol", "Baloncesto", "Tenis", "Pádel", "Voleibol", "Balonmano", "Fútbol Sala",
  "Hockey", "Rugby", "eSports", "Ajedrez", "Atletismo", "Bádminton", "Béisbol",
  "Boxeo", "Ciclismo", "Dardos", "Gimnasia", "Golf", "Judo", "Karate", "Lucha",
  "Natación", "Taekwondo", "Tenis de Mesa", "Tiro con Arco",
];

export const PLAN_LIMITS = { // Exported
  free: { torneo: 8, liga: 10, simultaneos: 2, label: "Gratis" },
  premium: { torneo: 16, liga: 20, simultaneos: 10, label: "Premium" },
  pro: { torneo: 32, liga: 40, simultaneos: 30, label: "Pro" },
};

const TORNEO_OPTIONS = [
    { value: 4, label: "4", planRequired: "free" },
    { value: 8, label: "8", planRequired: "free" },
    { value: 16, label: "16", planRequired: "premium" },
    { value: 32, label: "32", planRequired: "pro" },
];

const LIGA_OPTIONS_BASE = [...Array(19)].map((_, i) => i + 2);
const LIGA_OPTIONS = LIGA_OPTIONS_BASE.map(num => {
    let planRequired = "free";
    if (num > PLAN_LIMITS.free.liga && num <= PLAN_LIMITS.premium.liga) planRequired = "premium";
    else if (num > PLAN_LIMITS.premium.liga && num <= PLAN_LIMITS.pro.liga) planRequired = "pro";
    else if (num > PLAN_LIMITS.pro.liga) planRequired = "superpro";

    return { value: num, label: `${num}`, planRequired };
}).filter(opt => opt.value <= PLAN_LIMITS.pro.liga);

function Nuevo() {
  const [step, setStep] = useState(1);
  const [titulo, setTitulo] = useState("");
  const [deporte, setDeporte] = useState("");
  const [otroDeporte, setOtroDeporte] = useState("");
  const [showOtroDeporteInput, setShowOtroDeporteInput] = useState(false);
  const [modo, setModo] = useState("");
  const [tipo, setTipo] = useState("");
  const [numEquipos, setNumEquipos] = useState('');
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [userPlan, setUserPlan] = useState('free');
  const [userTotalTournaments, setUserTotalTournaments] = useState(0);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [formError, setFormError] = useState("");

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState("");
  const [modalSelectedOptionLabel, setModalSelectedOptionLabel] = useState("");

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (appRoot) {
      ReactModal.setAppElement('#root');
    } else {
      console.warn("ReactModal: App element #root not found. Accessibility features may be impaired. Please ensure your root element has id='root' or set appElement appropriately.");
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsLoadingPlan(true);

        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserPlan(userDocSnap.data().plan || 'free');
        } else {
          setUserPlan('free');
        }

        // MODIFIED: Centralized tournament tracking
        const allUserTournamentIds = new Set();
        const unsubscribes = [];

        const updateCombinedCount = () => {
            setUserTotalTournaments(allUserTournamentIds.size);
            setIsLoadingPlan(false);
        };

        // Listener for tournaments where user is creator
        const qCreados = query(collection(db, "torneos"), where("creadorId", "==", user.uid));
        unsubscribes.push(onSnapshot(qCreados, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }, (error) => console.error("Error fetching created tournaments:", error)));

        // Listener for tournaments where user is an individual participant
        const qParticipantesIndividual = query(collection(db, "torneos"), where("participantes", "array-contains", user.uid));
        unsubscribes.push(onSnapshot(qParticipantesIndividual, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }, (error) => console.error("Error fetching individual participant tournaments:", error)));

        // Listener for tournaments where user is a team captain or member (if `participantes` includes UIDs for members)
        // This query is a bit more complex as `array-contains-any` with objects isn't direct.
        // A common approach is to listen to all tournaments and then filter client-side for team participation.
        // For simplicity, let's query where `participantes` array contains team objects where `capitan` is the user's UID.
        // If `miembros` field of team objects also contains UIDs, and you want to count them as "belonging",
        // you would need another query or more complex client-side filtering.
        const qParticipantesEquipoCapitan = query(collection(db, "torneos"), where("participantes", "array-contains", { capitan: user.uid }));
        unsubscribes.push(onSnapshot(qParticipantesEquipoCapitan, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }, (error) => console.error("Error fetching team participant (captain) tournaments:", error)));


        // Listener for tournaments where user is a spectator
        const qEspectador = query(collection(db, "torneos"), where("espectadores", "array-contains", user.uid));
        unsubscribes.push(onSnapshot(qEspectador, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }, (error) => console.error("Error fetching spectated tournaments:", error)));

        return () => {
          unsubscribes.forEach(unsub => unsub());
        };

      } else {
        setCurrentUser(null);
        setUserPlan('free');
        setUserTotalTournaments(0);
        setIsLoadingPlan(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);


  useEffect(() => {
    if (deporte === "Otro") {
      setShowOtroDeporteInput(true);
    } else {
      setShowOtroDeporteInput(false);
      setOtroDeporte("");
    }
  }, [deporte]);

  const canCreateMoreTorneos = () => {
    if (isLoadingPlan) return false;
    const limit = PLAN_LIMITS[userPlan]?.simultaneos;
    if (typeof limit === 'number') {
        return userTotalTournaments < limit;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setFormError("Debes iniciar sesión para crear un torneo.");
      return;
    }

    const currentPlanLimits = PLAN_LIMITS[userPlan];
    if (!currentPlanLimits || typeof currentPlanLimits.simultaneos !== 'number' || typeof currentPlanLimits.label === 'undefined') {
        setFormError("No se pudo determinar el límite de torneos para tu plan actual. Intenta recargar.");
        console.error("Error: Plan de usuario no encontrado o mal configurado en PLAN_LIMITS:", userPlan);
        return;
    }

    if (!canCreateMoreTorneos()) {
        setFormError(`Has alcanzado el límite de ${currentPlanLimits.simultaneos} torneos (creados o unidos) para el plan ${currentPlanLimits.label}. Considera mejorar tu plan.`);
        return;
    }

    const finalDeporte = deporte === "Otro" ? otroDeporte.trim() : deporte;

    if (!titulo || !finalDeporte || !modo || !tipo || !numEquipos) {
      setFormError("Por favor, completa todos los campos correctamente.");
      return;
    }
    const numEquiposInt = parseInt(numEquipos, 10);
    if (numEquiposInt < 2) {
        setFormError("El número de participantes/equipos debe ser al menos 2.");
        return;
    }

    const maxAllowedByPlan = tipo === 'torneo' ? currentPlanLimits.torneo : currentPlanLimits.liga;
    if (numEquiposInt > maxAllowedByPlan) {
        setFormError(`Tu plan ${currentPlanLimits.label} permite hasta ${maxAllowedByPlan} ${modo === 'equipo' ? 'equipos' : 'participantes'} para este tipo de competición. Selecciona un número menor o mejora tu plan.`);
        return;
    }

    if (deporte === "Otro" && !otroDeporte.trim()) {
      setFormError("Por favor, especifica el nombre del deporte si seleccionas 'Otro'.");
      return;
    }
    setFormError("");

    const codigo = uuidv4().slice(0, 6).toUpperCase();

    const torneoData = {
      titulo,
      deporte: finalDeporte,
      modo,
      tipo,
      numEquipos: numEquiposInt,
      creadorId: currentUser.uid,
      codigo,
      participantes: [],
      fechaCreacion: new Date(),
      planCreadoCon: userPlan,
    };

    try {
      const docRef = await addDoc(collection(db, "torneos"), torneoData);
      alert(`Torneo "${titulo}" creado con éxito.\nCódigo: ${codigo}\nID: ${docRef.id}`);
      navigate("/home");
    } catch (error) {
      console.error("Error creando torneo:", error);
      setFormError("Hubo un error al crear el torneo. Por favor, inténtalo de nuevo.");
    }
  };

  const handleNextStep = () => setStep(prev => prev + 1);
  const handlePrevStep = () => setStep(prev => prev - 1);

  const progressPercent = (step / TOTAL_STEPS) * 100;

  const isStep1Valid = () => {
    if (!titulo.trim()) return false;
    if (deporte === "Otro") {
      return otroDeporte.trim() !== "";
    }
    return deporte !== "";
  };

  const getPlanTierValue = (planName) => {
    if (planName === 'pro') return 3;
    if (planName === 'premium') return 2;
    return 1; // free
  };

  const currentUserPlanTier = getPlanTierValue(userPlan);
  const optionsForSelect = tipo === 'torneo' ? TORNEO_OPTIONS : LIGA_OPTIONS;

  const handleNumEquiposChange = (e) => {
    const selectedValue = e.target.value;
    const option = optionsForSelect.find(opt => opt.value.toString() === selectedValue);

    if (option) {
      const requiredPlanTierForSelected = getPlanTierValue(option.planRequired);
      if (currentUserPlanTier < requiredPlanTierForSelected) {
        setModalRequiredPlan(option.planRequired);
        setModalSelectedOptionLabel(option.label);
        setIsPlanModalOpen(true);
      } else {
        setNumEquipos(selectedValue);
        setFormError("");
      }
    }
  };

  const closePlanModal = () => {
    setIsPlanModalOpen(false);
    setModalRequiredPlan("");
    setModalSelectedOptionLabel("");
  };

  const handleUpgradePlanFromModal = () => {
    closePlanModal();
    navigate('/#planes-section');
  };

  return (
    <div className="nuevo-torneo-page-container">
      <div className="unirse-header" style={{ alignItems: 'center', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 3, width: '100%', maxWidth: '550px', margin: '0 auto 1.5rem auto' }}>
        <button
          onClick={() => navigate(-1)}
          title="Volver"
          className="torneo-header-home-button"
          style={{ color: '#E0E0E0', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', position: 'absolute', left: '0' }}
        >
          <FaArrowLeft />
        </button>
      </div>

      <div className="nuevo-torneo-container">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <span className="progress-step-text">
            Paso {step} de {TOTAL_STEPS}
        </span>

        {formError && <p className="form-error-message-nuevo">{formError}</p>}
        {isLoadingPlan && <p className="loading-plan-message">Cargando datos del plan...</p>}

        <div className="form-step-content">
          {step === 1 && (
            <div className="form-step">
              <h2>Información básica</h2>
              <input
                className="form-input"
                type="text"
                placeholder="Título del Torneo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
              <select
                className="form-input"
                value={deporte}
                onChange={(e) => setDeporte(e.target.value)}
                required
              >
                <option value="" disabled>Selecciona un deporte...</option>
                {predefinedSports.map((sportName) => (
                  <option key={sportName} value={sportName}>
                    {sportName}
                  </option>
                ))}
                <option value="Otro">Otro...</option>
              </select>
              {showOtroDeporteInput && (
                <input
                  className="form-input"
                  type="text"
                  placeholder="Especifica el deporte"
                  value={otroDeporte}
                  onChange={(e) => setOtroDeporte(e.target.value)}
                  required={deporte === "Otro"}
                  style={{ marginTop: '1rem' }}
                />
              )}
              <div className="form-navigation">
                <button
                  className="form-button primary"
                  onClick={handleNextStep}
                  disabled={!isStep1Valid()}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Tipo de participación</h2>
              <div className="form-button-group">
                <button
                  className={`form-button choice ${modo === 'individual' ? 'selected' : ''}`}
                  onClick={() => { setModo("individual"); handleNextStep(); }}
                >
                  Individual
                </button>
                <button
                  className={`form-button choice ${modo === 'equipo' ? 'selected' : ''}`}
                  onClick={() => { setModo("equipo"); handleNextStep(); }}
                >
                  Por equipos
                </button>
              </div>
              <div className="form-navigation">
                <button className="form-button secondary" onClick={handlePrevStep}>Anterior</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Formato del torneo</h2>
              <div className="form-button-group">
                <button
                  className={`form-button choice ${tipo === 'liga' ? 'selected' : ''}`}
                  onClick={() => { setTipo("liga"); handleNextStep(); }}
                >
                  Liga
                </button>
                <button
                  className={`form-button choice ${tipo === 'torneo' ? 'selected' : ''}`}
                  onClick={() => { setTipo("torneo"); handleNextStep(); }}
                >
                  Eliminatoria (Torneo)
                </button>
              </div>
              <div className="form-navigation">
                <button className="form-button secondary" onClick={handlePrevStep}>Anterior</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Número de {modo === "equipo" ? "equipos" : "participantes"}</h2>
              <select
                className="form-input"
                value={numEquipos}
                onChange={handleNumEquiposChange}
                required
                disabled={isLoadingPlan}
              >
                <option value="" disabled>Seleccionar número...</option>
                {optionsForSelect.map(opt => {
                  const requiredPlanTier = getPlanTierValue(opt.planRequired);
                  const isOptionDisabledByPlan = currentUserPlanTier < requiredPlanTier;
                  let labelSuffix = "";

                  if (isOptionDisabledByPlan) {
                    if (opt.planRequired === "premium") {
                        labelSuffix = ` (requiere Premium`;
                    } else if (opt.planRequired === "pro") {
                        labelSuffix = ` (requiere Pro`;
                    }
                    if (labelSuffix) labelSuffix += ")"; // Add closing parenthesis if labelSuffix exists
                  }

                  return (
                    <option
                      key={opt.value}
                      value={opt.value}
                      disabled={isOptionDisabledByPlan && false}
                      className={isOptionDisabledByPlan ? 'option-disabled-by-plan' : ''}
                      data-plan-required={opt.planRequired}
                    >
                      {opt.label}
                      {isOptionDisabledByPlan && <span className="option-plan-indicator">{labelSuffix.includes("Premium") ? " ✨" : (labelSuffix.includes("Pro") ? " 🚀" : "")}</span>}
                      {isOptionDisabledByPlan && !labelSuffix.includes(")") && labelSuffix !== "" && <span>)</span>}
                    </option>
                  );
                })}
              </select>
              {!isLoadingPlan && !canCreateMoreTorneos() && (
                 <p className="form-error-message-nuevo" style={{marginTop: '10px'}}>
                    Has alcanzado el límite de {PLAN_LIMITS[userPlan]?.simultaneos} torneos (creados o unidos) para tu plan {PLAN_LIMITS[userPlan]?.label}.
                 </p>
              )}

              <div className="form-navigation">
                <button className="form-button secondary" onClick={handlePrevStep}>Anterior</button>
                <button
                  className="form-button primary"
                  onClick={handleSubmit}
                  disabled={!numEquipos || isLoadingPlan || !canCreateMoreTorneos()}
                >
                  Crear Torneo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReactModal
        isOpen={isPlanModalOpen}
        onRequestClose={closePlanModal}
        contentLabel="Mejora de Plan Requerida"
        className="ReactModal__Content"
        overlayClassName="ReactModal__Overlay"
      >
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
            <FaExclamationTriangle size={30} style={{ color: '#FFC107' }} />
        </div>
        <h3>Plan Requerido</h3>
        <p style={{ textAlign: 'center', fontSize: '1rem', lineHeight: '1.6' }}>
          La opción de <strong>{modalSelectedOptionLabel} {modo === "equipo" ? "equipos" : "participantes"}</strong> requiere el plan <strong>{PLAN_DISPLAY_NAMES[modalRequiredPlan] || modalRequiredPlan}</strong>.
        </p>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#bbb', marginBottom: '2rem' }}>
          Tu plan actual es {PLAN_DISPLAY_NAMES[userPlan]}. ¿Deseas mejorar tu plan para seleccionar esta opción?
        </p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button type="button" onClick={closePlanModal} className="form-button secondary">
            Más tarde
          </button>
          <button type="button" onClick={handleUpgradePlanFromModal} className="form-button primary">
            {modalRequiredPlan === 'premium' && <FaStar style={{ marginRight: '8px' }} />}
            {modalRequiredPlan === 'pro' && <FaRocket style={{ marginRight: '8px' }} />}
            Mejorar Plan
          </button>
        </div>
      </ReactModal>
    </div>
  );
}

export default Nuevo;