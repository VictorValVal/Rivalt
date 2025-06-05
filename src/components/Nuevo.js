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

// Nombres de visualización para los planes de usuario.
export const PLAN_DISPLAY_NAMES = {
  free: "Gratis",
  premium: "Premium",
  pro: "Pro"
};

// Lista de deportes predefinidos para la selección en el formulario.
const predefinedSports = [
  "Fútbol", "Baloncesto", "Tenis", "Pádel", "Voleibol", "Balonmano", "Fútbol Sala",
  "Hockey", "Rugby", "eSports", "Ajedrez", "Atletismo", "Bádminton", "Béisbol",
  "Boxeo", "Ciclismo", "Dardos", "Gimnasia", "Golf", "Judo", "Karate", "Lucha",
  "Natación", "Taekwondo", "Tenis de Mesa", "Tiro con Arco",
];

// Límites de creación de torneos por plan.
export const PLAN_LIMITS = {
  free: { torneo: 8, liga: 10, simultaneos: 2, label: "Gratis" },
  premium: { torneo: 16, liga: 20, simultaneos: 10, label: "Premium" },
  pro: { torneo: 32, liga: 40, simultaneos: 30, label: "Pro" },
};

// Opciones de número de participantes para torneos de eliminación.
const TORNEO_OPTIONS = [
    { value: 4, label: "4", planRequired: "free" },
    { value: 8, label: "8", planRequired: "free" },
    { value: 16, label: "16", planRequired: "premium" },
    { value: 32, label: "32", planRequired: "pro" },
];

// Opciones de número de participantes para torneos de liga.
const LIGA_OPTIONS_BASE = [...Array(19)].map((_, i) => i + 2);
const LIGA_OPTIONS = LIGA_OPTIONS_BASE.map(num => {
    let planRequired = "free";
    if (num > PLAN_LIMITS.free.liga && num <= PLAN_LIMITS.premium.liga) planRequired = "premium";
    else if (num > PLAN_LIMITS.premium.liga && num <= PLAN_LIMITS.pro.liga) planRequired = "pro";
    else if (num > PLAN_LIMITS.pro.liga) planRequired = "superpro";

    return { value: num, label: `${num}`, planRequired };
}).filter(opt => opt.value <= PLAN_LIMITS.pro.liga);

function Nuevo() {
  // Estados para el formulario de creación de torneo.
  const [step, setStep] = useState(1);
  const [titulo, setTitulo] = useState("");
  const [deporte, setDeporte] = useState("");
  const [otroDeporte, setOtroDeporte] = useState("");
  const [showOtroDeporteInput, setShowOtroDeporteInput] = useState(false);
  const [modo, setModo] = useState("");
  const [tipo, setTipo] = useState("");
  const [numEquipos, setNumEquipos] = useState('');
  const navigate = useNavigate();

  // Estados relacionados con el usuario y su plan de suscripción.
  const [currentUser, setCurrentUser] = useState(null);
  const [userPlan, setUserPlan] = useState('free');
  const [userTotalTournaments, setUserTotalTournaments] = useState(0);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [formError, setFormError] = useState("");

  // Estados para el modal de plan requerido.
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [modalRequiredPlan, setModalRequiredPlan] = useState("");
  const [modalSelectedOptionLabel, setModalSelectedOptionLabel] = useState("");

  // Efecto para inicializar ReactModal y gestionar el estado de autenticación del usuario.
  // También establece listeners para contar el total de torneos a los que pertenece el usuario.
  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (appRoot) {
      ReactModal.setAppElement('#root');
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

        const allUserTournamentIds = new Set();
        const unsubscribes = [];

        const updateCombinedCount = () => {
            setUserTotalTournaments(allUserTournamentIds.size);
            setIsLoadingPlan(false);
        };

        const qCreados = query(collection(db, "torneos"), where("creadorId", "==", user.uid));
        unsubscribes.push(onSnapshot(qCreados, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }));

        const qParticipantesIndividual = query(collection(db, "torneos"), where("participantes", "array-contains", user.uid));
        unsubscribes.push(onSnapshot(qParticipantesIndividual, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }));

        const qParticipantesEquipoCapitan = query(collection(db, "torneos"), where("participantes", "array-contains", { capitan: user.uid }));
        unsubscribes.push(onSnapshot(qParticipantesEquipoCapitan, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }));

        const qEspectador = query(collection(db, "torneos"), where("espectadores", "array-contains", user.uid));
        unsubscribes.push(onSnapshot(qEspectador, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") allUserTournamentIds.add(change.doc.id);
                if (change.type === "removed") allUserTournamentIds.delete(change.doc.id);
            });
            updateCombinedCount();
        }));

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

  // Efecto para mostrar u ocultar el input de "Otro Deporte".
  useEffect(() => {
    if (deporte === "Otro") {
      setShowOtroDeporteInput(true);
    } else {
      setShowOtroDeporteInput(false);
      setOtroDeporte("");
    }
  }, [deporte]);

  // Verifica si el usuario puede crear más torneos según su plan.
  const canCreateMoreTorneos = () => {
    if (isLoadingPlan) return false;
    const limit = PLAN_LIMITS[userPlan]?.simultaneos;
    if (typeof limit === 'number') {
        return userTotalTournaments < limit;
    }
    return false;
  };

  // Maneja el envío final del formulario para crear un torneo.
  const handleSubmit = async () => {
    if (!currentUser) {
      setFormError("Debes iniciar sesión para crear un torneo.");
      return;
    }

    const currentPlanLimits = PLAN_LIMITS[userPlan];
    if (!currentPlanLimits || typeof currentPlanLimits.simultaneos !== 'number' || typeof currentPlanLimits.label === 'undefined') {
        setFormError("No se pudo determinar el límite de torneos para tu plan actual. Intenta recargar.");
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

  // Funciones para navegar entre los pasos del formulario.
  const handleNextStep = () => setStep(prev => prev + 1);
  const handlePrevStep = () => setStep(prev => prev - 1);

  // Calcula el porcentaje de progreso del formulario.
  const progressPercent = (step / TOTAL_STEPS) * 100;

  // Valida el primer paso del formulario.
  const isStep1Valid = () => {
    if (!titulo.trim()) return false;
    if (deporte === "Otro") {
      return otroDeporte.trim() !== "";
    }
    return deporte !== "";
  };

  // Obtiene el valor numérico de un plan para comparaciones.
  const getPlanTierValue = (planName) => {
    if (planName === 'pro') return 3;
    if (planName === 'premium') return 2;
    return 1;
  };

  const currentUserPlanTier = getPlanTierValue(userPlan);
  const optionsForSelect = tipo === 'torneo' ? TORNEO_OPTIONS : LIGA_OPTIONS;

  // Maneja el cambio en el número de equipos, abriendo un modal si el plan es insuficiente.
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

  // Cierra el modal de plan requerido.
  const closePlanModal = () => {
    setIsPlanModalOpen(false);
    setModalRequiredPlan("");
    setModalSelectedOptionLabel("");
  };

  // Navega a la sección de planes desde el modal.
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
        {/* Barra de progreso del formulario */}
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <span className="progress-step-text">
            Paso {step} de {TOTAL_STEPS}
        </span>

        {/* Mensajes de error y carga */}
        {formError && <p className="form-error-message-nuevo">{formError}</p>}
        {isLoadingPlan && <p className="loading-plan-message">Cargando datos del plan...</p>}

        <div className="form-step-content">
          {/* Paso 1: Información básica del torneo */}
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

          {/* Paso 2: Tipo de participación (individual/equipo) */}
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

          {/* Paso 3: Formato del torneo (liga/eliminatoria) */}
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

          {/* Paso 4: Número de equipos/participantes */}
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
                    if (labelSuffix) labelSuffix += ")";
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

      {/* Modal para indicar la necesidad de mejorar el plan */}
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