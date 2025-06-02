// components/Login.js
import React, { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  getAuth
} from "firebase/auth";
import { googleProvider, db, app } from "../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { setDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import "./estilos/Login.css"; // Ensure this path is correct
import futbolistaImg from '../img/Futbolista.png';

const authInstance = getAuth(app);
const TOTAL_REGISTRATION_STEPS = 2; // Define total steps for clarity

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1); // Start at step 1
  const navigate = useNavigate();
  const location = useLocation();

  const { intendedPlan } = location.state || {};

  const shape1Ref = useRef(null);
  const shape2Ref = useRef(null);

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    const normalizedDeltaX = (clientX - centerX) / centerX;
    const normalizedDeltaY = (clientY - centerY) / centerY;
    if (shape1Ref.current) {
      const moveX1 = normalizedDeltaX * -20;
      const moveY1 = normalizedDeltaY * -15;
      shape1Ref.current.style.transform = `translate(${moveX1}px, ${moveY1}px) scale(1)`;
    }
    if (shape2Ref.current) {
      const moveX2 = normalizedDeltaX * 10;
      const moveY2 = normalizedDeltaY * 18;
      const rotate2 = normalizedDeltaX * 2;
      const scaleX2 = 1 + normalizedDeltaX * 0.03;
      const scaleY2 = 1 - normalizedDeltaY * 0.03;
      shape2Ref.current.style.transform = `translate(${moveX2}px, ${moveY2}px) rotate(${rotate2}deg) scale(${scaleX2}, ${scaleY2})`;
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (shape1Ref.current) {
        shape1Ref.current.style.transform = 'translate(0,0) scale(1)';
      }
      if (shape2Ref.current) {
        shape2Ref.current.style.transform = 'translate(0,0) rotate(0) scale(1,1)';
      }
    };
  }, []);

  const handleAuthError = (firebaseError) => {
    switch (firebaseError.code) {
      case "auth/invalid-email": return "El formato del correo electrónico no es válido.";
      case "auth/user-disabled": return "Este usuario ha sido deshabilitado.";
      case "auth/user-not-found": case "auth/wrong-password": return "Correo electrónico o contraseña incorrectos.";
      case "auth/email-already-in-use": return "Este correo electrónico ya está registrado.";
      case "auth/weak-password": return "La contraseña debe tener al menos 6 caracteres.";
      case "auth/operation-not-allowed": return "Inicio de sesión con correo/contraseña no habilitado.";
      case "auth/popup-closed-by-user": return "El proceso de inicio de sesión con Google fue cancelado.";
      case "auth/cancelled-popup-request": return "Se canceló la solicitud de inicio de sesión con Google porque ya hay una abierta.";
      case "auth/account-exists-with-different-credential": return "Ya existe una cuenta con este correo electrónico pero con un método de inicio de sesión diferente.";
      default: console.error("Firebase Auth Error:", firebaseError); return "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
    }
  };

  const getPlanTierValue = (planName) => {
    if (planName === 'pro') return 3;
    if (planName === 'premium') return 2;
    return 1; // free
  };

  const completePlanUpgradeAfterLogin = async (userId, planToSet) => {
    if (!planToSet || planToSet === 'free') return;
    try {
      const userRef = doc(db, "usuarios", userId);
      const userDocSnap = await getDoc(userRef);
      if (userDocSnap.exists()) {
          const currentPlanInDb = userDocSnap.data().plan || 'free';
          if (getPlanTierValue(planToSet) > getPlanTierValue(currentPlanInDb)) {
                await updateDoc(userRef, { plan: planToSet });
                console.log(`Plan actualizado a ${planToSet} para usuario ${userId} después del login.`);
          } else {
              console.log(`El usuario ${userId} ya tiene el plan ${currentPlanInDb} o uno superior. No se actualizó a ${planToSet}.`);
          }
      } else {
          await setDoc(userRef, { plan: planToSet }, { merge: true });
          console.log(`Plan ${planToSet} establecido para (posiblemente nuevo) usuario ${userId} después del login.`);
      }
    } catch (error) {
      console.error(`Error al actualizar el plan a ${planToSet} después del login para ${userId}:`, error);
    }
  };

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }
    if (password.length > 64) {
      return "La contraseña no debe exceder los 64 caracteres.";
    }
    if (!/[A-Z]/.test(password)) {
      return "La contraseña debe contener al menos una letra mayúscula.";
    }
    if (!/[a-z]/.test(password)) {
      return "La contraseña debe contener al menos una letra minúscula.";
    }
    if (!/[0-9]/.test(password)) {
      return "La contraseña debe contener al menos un número.";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password)) {
      return "La contraseña debe contener al menos un carácter especial (!@#$%...).";
    }
    return null;
  };

  // New validation for name
  const validateName = (name) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return "El nombre debe tener al menos 3 caracteres.";
    }
    // Optional: regex to allow only letters, spaces, and specific accented characters
    const nameRegex = /^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/;
    if (!nameRegex.test(trimmedName)) {
      return "El nombre solo puede contener letras y espacios.";
    }
    return null;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError("");

    if (registrationStep === 1) {
      if (!email.trim() || !password || !confirmPassword) {
        setError("Correo, contraseña y confirmación son obligatorios.");
        return;
      }
      if (!validateEmail(email)) {
        setError("Por favor, introduce un correo electrónico válido.");
        return;
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      setRegistrationStep(2); // Move to next step
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (isLogin) {
      // Login specific validations
      if (!email.trim() || !password) {
        setError("Correo y contraseña son obligatorios.");
        setIsLoading(false);
        return;
      }
      if (!validateEmail(email)) {
        setError("Por favor, introduce un correo electrónico válido.");
        setIsLoading(false);
        return;
      }
    } else { // Registration - final step
      if (registrationStep === 2) {
        const nameError = validateName(nombre);
        if (nameError) {
          setError(nameError);
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
        await completePlanUpgradeAfterLogin(userCredential.user.uid, intendedPlan);
        navigate("/home");
      } else { // Registration - final step
        const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
          nombre: nombre.trim(),
          email: userCredential.user.email,
          fechaRegistro: new Date(),
          authProvider: "email/password",
          plan: intendedPlan || 'free',
        });
        navigate("/home");
      }
    } catch (firebaseError) {
      setError(handleAuthError(firebaseError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(authInstance, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let finalPlan = intendedPlan || (userDocSnap.exists() ? userDocSnap.data().plan : 'free') || 'free';
      if (intendedPlan && userDocSnap.exists()) {
          const currentPlanInDb = userDocSnap.data().plan || 'free';
          if (getPlanTierValue(intendedPlan) > getPlanTierValue(currentPlanInDb)) {
              finalPlan = intendedPlan;
          } else {
              finalPlan = currentPlanInDb;
          }
      }

      const userDataToSet = {
        nombre: user.displayName || (userDocSnap.exists() ? userDocSnap.data().nombre : "Usuario de Google"),
        email: user.email,
        photoURL: user.photoURL || (userDocSnap.exists() ? userDocSnap.data().photoURL : null),
        authProvider: "google",
        plan: finalPlan,
      };

      if (userDocSnap.exists()) {
        await updateDoc(userDocRef, { ...userDataToSet, ultimoLogin: new Date() });
      } else {
        await setDoc(userDocRef, { ...userDataToSet, fechaRegistro: new Date() });
      }
      navigate("/home");
    } catch (firebaseError) {
      setError(handleAuthError(firebaseError));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSwitching(true);
    setError("");
    setRegistrationStep(1); // Always reset to step 1 when switching modes
    setNombre("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setIsLogin(prevIsLogin => !prevIsLogin);
      setIsSwitching(false);
    }, 250);
  };

  const progressPercent = (registrationStep / TOTAL_REGISTRATION_STEPS) * 100;

  const isStep1Valid = () => {
    return email.trim() !== "" && password !== "" && confirmPassword !== "" && password === confirmPassword && validateEmail(email) && validatePassword(password) === null;
  };

  const isStep2Valid = () => {
    return validateName(nombre) === null;
  };

  return (
    <div className="login-page-container">
      <div ref={shape1Ref} className="animated-shape shape1-login"></div>
      <div ref={shape2Ref} className="animated-shape shape2-login"></div>
      <div className="sports-figure-background"></div>
      <div className="login-content-wrapper">
        <div className="login-image-display-area">
          <img src={futbolistaImg} alt="Futbolista en acción" className="futbolista-login-img" />
        </div>
        <div className="login-container">
          <h2 className={`login-title-animate ${isSwitching ? 'title-fading' : ''}`}>
            {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </h2>

          {!isLogin && (
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
              <span className="progress-step-text">
                Paso {registrationStep} de {TOTAL_REGISTRATION_STEPS}
              </span>
            </div>
          )}

          <form onSubmit={isLogin || registrationStep === TOTAL_REGISTRATION_STEPS ? handleSubmit : handleNextStep} className="login-form" noValidate>
            {(isLogin || registrationStep === 1) && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Correo electrónico</label>
                  <input className="form-input" type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required disabled={isLoading || isGoogleLoading || isSwitching} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Contraseña</label>
                  <input className="form-input" type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Introduce tu contraseña" required disabled={isLoading || isGoogleLoading || isSwitching} />
                </div>
                {!isLogin && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">Confirmar Contraseña</label>
                    <input className="form-input" type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite tu contraseña" required={!isLogin} disabled={isLoading || isGoogleLoading || isSwitching} />
                  </div>
                )}
              </>
            )}

            {!isLogin && registrationStep === 2 && (
              <div className={`registration-field-wrapper ${(!isLogin && registrationStep === 2 && !isSwitching) ? 'show' : ''}`}>
                <div className="form-group">
                  <label className="form-label" htmlFor="nombre">Nombre completo</label>
                  <input className="form-input" type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre y apellidos" required={!isLogin} disabled={isLoading || isGoogleLoading || isSwitching} aria-hidden={isLogin || isSwitching} tabIndex={(isLogin || isSwitching) ? -1 : 0} />
                </div>
              </div>
            )}

            {error && <p className="form-error-message">{error}</p>}
            
            {isLogin || registrationStep === TOTAL_REGISTRATION_STEPS ? (
              <button type="submit" className="form-button primary full-width" disabled={isLoading || isGoogleLoading || isSwitching || (!isLogin && !isStep2Valid())}>
                {isLoading ? "Procesando..." : isLogin ? "Iniciar Sesión" : "Registrarse"}
              </button>
            ) : (
              <button type="submit" className="form-button primary full-width" disabled={isLoading || isGoogleLoading || isSwitching || !isStep1Valid()}>
                Siguiente
              </button>
            )}
            
            {!isLogin && registrationStep === TOTAL_REGISTRATION_STEPS && (
              <button type="button" onClick={() => { setRegistrationStep(1); setError(""); }} className="form-button secondary full-width" disabled={isLoading || isGoogleLoading || isSwitching} style={{ marginTop: '0.5rem' }}>
                Volver
              </button>
            )}
          </form>
          
          <div className="google-signin-container" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <p style={{ textAlign: 'center', marginBottom: '0.75rem', color: '#ccc', fontSize: '0.9em' }}>Otras opciones</p>
            <button onClick={handleGoogleSignIn} className="form-button google-logo-button" disabled={isLoading || isGoogleLoading || isSwitching} title="Continuar con Google" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', width: '50px', height: '50px', borderRadius: '50%', margin: '0 auto', border: '1px solid #444', backgroundColor: '#2a2a2a' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                <path fill="none" d="M1 1h22v22H1z"/>
              </svg>
            </button>
          </div>
          <button onClick={toggleMode} className="toggle-link" disabled={isLoading || isGoogleLoading || isSwitching}>
            {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;