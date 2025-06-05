import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import './estilos/Planes.css';
import {
  FaStar, FaCheckCircle, FaRocket, FaUserFriends, FaSpinner, FaTimes, FaArrowLeft
} from 'react-icons/fa';
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);
const auth = getAuth();

// Componente `Planes` para mostrar y gestionar los planes de suscripción.
// `isVisible` controla la visibilidad si se usa como modal, `onClose` para cerrarlo.
// `onPlanChange` notifica cambios de plan y `isAuthenticated` indica el estado de la sesión.
const Planes = ({ isVisible, onClose, onPlanChange, isAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pricingSectionRef = useRef(null);
  const modalContentRef = useRef(null);

  const [isLoading, setIsLoading] = useState({ premium: false, pro: false });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentUserPlan, setCurrentUserPlan] = useState('free');
  const [intendedPlanFromRoute, setIntendedPlanFromRoute] = useState(null);

  // Efecto para controlar el scroll del body cuando el modal está visible.
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isVisible]);

  // Efecto para la animación de entrada y scroll a la sección si no es un modal.
  useEffect(() => {
    if (!isVisible) {
        const observerOptions = { threshold: 0.1 };
        const observerCallback = (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) { // Only add if intersecting
              entry.target.classList.add("visible");
            }
            // Removed the else part to prevent removing the 'visible' class
          });
        };
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        const currentRef = pricingSectionRef.current;
        if (currentRef) {
          observer.observe(currentRef);
        }
        return () => {
          if (currentRef) {
            observer.unobserve(currentRef);
          }
        };
    }
    // Verifica si hay un plan intencionado en el estado de la ruta.
    if (location.state?.intendedPlan) {
      setIntendedPlanFromRoute(location.state.intendedPlan);
      navigate(location.pathname, { replace: true, state: {} });
    } else {
      setIntendedPlanFromRoute(null);
    }

  }, [location.hash, isVisible, location.state, navigate]);

  // Efecto para cerrar el modal al hacer clic fuera de su contenido.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isVisible && onClose && modalContentRef.current && !modalContentRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isVisible && onClose) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onClose, modalContentRef]);

  // Efecto para obtener el plan actual del usuario.
  useEffect(() => {
    const fetchCurrentUserPlan = async () => {
      if (isAuthenticated && auth.currentUser) {
        const userDocRef = doc(db, "usuarios", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserPlan(userDocSnap.data().plan || 'free');
        }
      } else if (!isAuthenticated) {
          setCurrentUserPlan('free');
      }
    };
    fetchCurrentUserPlan();
  }, [isAuthenticated, isVisible]);

  // Maneja la selección de un plan (Premium o Pro).
  const handlePlanSelection = async (selectedPlan) => {
    const currentUser = auth.currentUser;

    if (!isAuthenticated || !currentUser) {
      setFeedbackMessage(`Para elegir el plan ${selectedPlan === 'premium' ? 'Premium' : (selectedPlan === 'pro' ? 'Pro' : selectedPlan)}, primero debes iniciar sesión o registrarte.`);
      setTimeout(() => setFeedbackMessage(""), 4000);
      navigate("/login", { state: { intendedPlan: selectedPlan, fromPage: location.pathname } });
      if (onClose) onClose();
      return;
    }

    if (selectedPlan === 'premium' && (currentUserPlan === 'premium' || currentUserPlan === 'pro')) {
      setFeedbackMessage(`Ya tienes el plan ${currentUserPlan === 'premium' ? 'Premium' : 'Pro'} o uno superior.`);
      setTimeout(() => setFeedbackMessage(""), 3000);
      return;
    }
    if (selectedPlan === 'pro' && currentUserPlan === 'pro') {
      setFeedbackMessage("Ya tienes el plan Pro.");
      setTimeout(() => setFeedbackMessage(""), 3000);
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres cambiar al plan ${selectedPlan === 'premium' ? 'Premium' : 'Pro'}? (Esto es una simulación)`)) {
      return;
    }

    setIsLoading(prev => ({ ...prev, [selectedPlan]: true }));
    setFeedbackMessage("");

    try {
      const userRef = doc(db, "usuarios", currentUser.uid);
      await updateDoc(userRef, {
        plan: selectedPlan
      });
      setFeedbackMessage(`¡Felicidades! Has "actualizado" al plan ${selectedPlan === 'premium' ? 'Premium' : 'Pro'}.`);
      setCurrentUserPlan(selectedPlan);
      if (onPlanChange) {
        onPlanChange(selectedPlan);
      }
      setTimeout(() => {
        if (onClose) onClose();
        if (!onClose && isAuthenticated && currentUser) {
            navigate("/home");
        }
      }, 2000);
    } catch (error) {
      console.error("Error al actualizar el plan:", error);
      setFeedbackMessage("Error al actualizar el plan. Inténtalo de nuevo.");
    } finally {
      setIsLoading(prev => ({ ...prev, [selectedPlan]: false }));
      if (!onClose) setTimeout(() => setFeedbackMessage(""), 5000);
    }
  };

  // Maneja la acción para el plan Gratuito.
  const handleFreePlanAction = () => {
    if (!isAuthenticated) {
      navigate("/login");
      if (onClose) onClose();
    } else {
        navigate("/home");
        if (onClose) onClose();
    }
  };

  // Continúa a la página de inicio si ya se tiene un plan.
  const handleContinueWithPlan = () => {
    navigate("/home");
    if (onClose) onClose();
  };
  
  // Verifica si un plan es el plan actual del usuario.
  const isCurrentPlan = (planName) => isAuthenticated && currentUserPlan === planName;

  // Maneja el botón de volver (para modales o navegación general).
  const handleVolverClick = () => {
    if (onClose) {
      onClose();
    }
    navigate(-1);
  };

  // Determina si el plan actual del usuario es superior al plan dado.
  const isHigherPlan = (planName) => {
      const planOrder = { 'free': 0, 'premium': 1, 'pro': 2 };
      return planOrder[currentUserPlan] > planOrder[planName];
  };

  // No renderiza el componente si es un modal y no está visible.
  if (isVisible === false) {
    return null;
  }

  const sectionClassName = `pricing-section ${isVisible === true ? 'planes-modal-version' : ''}`;

  return (
    <section ref={pricingSectionRef} id="planes-section" className={sectionClassName}>
      <div className="pricing-section-content" ref={modalContentRef}>
        {isVisible === true && onClose && (
          <button onClick={onClose} className="planes-modal-close-button" aria-label="Cerrar selector de planes">
            <FaTimes />
          </button>
        )}
        <h2>Elige el Plan Perfecto para Ti</h2>
        <p className="pricing-subtitle">
          Comienza gratis o desbloquea más potencia con nuestros planes premium.
        </p>
        {feedbackMessage && <p className={`plan-feedback-message ${feedbackMessage.toLowerCase().includes("error") ? 'error' : ''}`}>{feedbackMessage}</p>}
        <div className="pricing-plans-container">
          {/* Plan Gratuito */}
          <div className={`plan-card plan-free ${isCurrentPlan('free') ? 'current-plan-active' : ''} ${isVisible === true ? 'modal-card' : ''}`}>
            <div className="plan-icon-container"><FaUserFriends className="plan-icon" /></div>
            <h3>Gratis</h3>
            <p className="plan-price">0€ <span className="price-period">/siempre</span></p>
            <ul className="plan-features">
              <li><FaCheckCircle /> Hasta 8 equipos en torneo</li>
              <li><FaCheckCircle /> Hasta 10 equipos en liga</li>
              <li><FaCheckCircle /> Máximo 2 torneos simultáneos</li>
              <li><FaCheckCircle /> Funcionalidades básicas</li>
            </ul>
            {isCurrentPlan('free') ? (
                <button onClick={handleContinueWithPlan} className="form-button secondary plan-button">
                    Continuar con Gratis
                </button>
            ) : (
                <button
                    onClick={handleFreePlanAction}
                    className={`form-button secondary plan-button ${isHigherPlan('free') ? 'disabled-by-plan' : ''}`}
                    disabled={isHigherPlan('free')}
                >
                    {isHigherPlan('free') ? "Plan Gratis" : "Comenzar Gratis"}
                </button>
            )}
          </div>

          {/* Plan Premium */}
          <div className={`plan-card plan-premium ${isCurrentPlan('premium') ? 'current-plan-active' : ''} ${isVisible === true ? 'modal-card' : ''}`}>
            <div className="plan-icon-container"><FaStar className="plan-icon" /></div>
            <h3>Premium</h3>
            <p className="plan-price">4.99€ <span className="price-period">/año</span></p>
            <ul className="plan-features">
              <li><FaCheckCircle /> Hasta 16 equipos en torneo</li>
              <li><FaCheckCircle /> Hasta 20 equipos en liga</li>
              <li><FaCheckCircle /> Máximo 15 torneos simultáneos</li>
              <li><FaCheckCircle /> Soporte prioritario</li>
            </ul>
            {isCurrentPlan('premium') ? (
                <button onClick={handleContinueWithPlan} className="form-button secondary plan-button">
                    Continuar con Premium
                </button>
            ) : (
                <button
                    onClick={() => handlePlanSelection('premium')}
                    className="form-button primary plan-button"
                    disabled={isLoading.premium || isLoading.pro || isHigherPlan('premium')}
                >
                    {isLoading.premium ? <FaSpinner className="icon-spin" /> :
                        (isHigherPlan('premium') ? "Plan Premium" : "Elegir Premium")
                    }
                </button>
            )}
          </div>

          {/* Plan Pro */}
          <div className={`plan-card plan-pro ${isCurrentPlan('pro') ? 'current-plan-active' : ''} ${isVisible === true ? 'modal-card' : ''}`}>
             <div className="plan-icon-container"><FaRocket className="plan-icon" /></div>
            <h3>Pro</h3>
            <p className="plan-price">14.99€ <span className="price-period">/año</span></p>
            <ul className="plan-features">
              <li><FaCheckCircle /> Hasta 32 equipos en torneo</li>
              <li><FaCheckCircle /> Hasta 40 equipos en liga</li>
              <li><FaCheckCircle /> Máximo 30 torneos simultáneos</li>
              <li><FaCheckCircle /> Todas las funcionalidades avanzadas</li>
            </ul>
            {isCurrentPlan('pro') ? (
                <button onClick={handleContinueWithPlan} className="form-button secondary plan-button">
                    Continuar con Pro
                </button>
            ) : (
                <button
                    onClick={() => handlePlanSelection('pro')}
                    className="form-button primary plan-button"
                    disabled={isLoading.pro || isLoading.premium || isHigherPlan('pro')}
                >
                    {isLoading.pro ? <FaSpinner className="icon-spin" /> : "Elegir Pro"}
                </button>
            )}
          </div>
        </div>
        {isVisible && (
          <div className="planes-modal-footer-actions">
            <button onClick={handleVolverClick} className="form-button secondary planes-modal-volver-button">
              <FaArrowLeft style={{ marginRight: '8px' }} /> Volver
            </button>
            <button onClick={onClose} className="form-button secondary planes-modal-later-button">
                Más tarde
            </button>
          </div>
        )}
      </div>
      {/* Las formas de fondo se ocultan si es un modal */}
      {isVisible !== true && (
        <>
          <div className="pricing-shape pricing-shape-1"></div>
          <div className="pricing-shape pricing-shape-2"></div>
        </>
      )}
    </section>
  );
};

export default Planes;