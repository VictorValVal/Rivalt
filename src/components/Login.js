import React, { useState, useEffect, useRef } from "react"; // Añadido useEffect y useRef
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import "./estilos/Login.css";

const db = getFirestore();

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // --- Inicio: Lógica para formas animadas (similar a Main.js) ---
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
      const moveX1 = normalizedDeltaX * -20; // Ajusta la sensibilidad si es necesario
      const moveY1 = normalizedDeltaY * -15;
      const baseRadius = 50;
      const radiusVariation = 10;

      const r1 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius - normalizedDeltaX * radiusVariation));
      const r2 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius + normalizedDeltaX * radiusVariation));
      const r3 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius - normalizedDeltaY * radiusVariation));
      const r4 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius + normalizedDeltaY * radiusVariation));
      
      shape1Ref.current.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}%`;
      shape1Ref.current.style.transform = `translate(${moveX1}px, ${moveY1}px) scale(1)`;
    }

    if (shape2Ref.current) {
      const moveX2 = normalizedDeltaX * 10; // Ajusta la sensibilidad
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
      // Resetea estilos si es necesario al desmontar para evitar que afecten otras vistas
      if (shape1Ref.current) {
        shape1Ref.current.style.transform = 'translate(0,0) scale(1)';
        shape1Ref.current.style.borderRadius = '50%'; // O su border-radius original de CSS
      }
      if (shape2Ref.current) {
        shape2Ref.current.style.transform = 'translate(0,0) rotate(0) scale(1,1)';
      }
    };
  }, []);
  // --- Fin: Lógica para formas animadas ---


  const handleAuthError = (firebaseError) => {
    switch (firebaseError.code) {
      case "auth/invalid-email":
        return "El formato del correo electrónico no es válido.";
      case "auth/user-disabled":
        return "Este usuario ha sido deshabilitado.";
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Correo electrónico o contraseña incorrectos.";
      case "auth/email-already-in-use":
        return "Este correo electrónico ya está registrado.";
      case "auth/weak-password":
        return "La contraseña debe tener al menos 6 caracteres.";
      case "auth/operation-not-allowed":
        return "Inicio de sesión con correo/contraseña no habilitado.";
      default:
        console.error("Firebase Auth Error:", firebaseError);
        return "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!isLogin && (!nombre || !edad)) {
        setError("Por favor, completa todos los campos para registrarte.");
        setIsLoading(false);
        return;
    }
    if (!email || !password) {
        setError("Correo y contraseña son obligatorios.");
        setIsLoading(false);
        return;
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Usuario logueado:", userCredential.user.uid);
        navigate("/home");
      } else {
        if (parseInt(edad) <= 0 || parseInt(edad) > 120) {
             setError("Por favor, introduce una edad válida.");
             setIsLoading(false);
             return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Usuario registrado:", userCredential.user.uid);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
          nombre: nombre.trim(),
          edad: parseInt(edad),
          email: userCredential.user.email,
          fechaRegistro: new Date(),
        });
        navigate("/home");
      }
    } catch (firebaseError) {
      setError(handleAuthError(firebaseError));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
  };

  return (
    <div className="login-page-container">
      {/* Formas de fondo */}
      <div ref={shape1Ref} className="animated-shape shape1-login"></div>
      <div ref={shape2Ref} className="animated-shape shape2-login"></div>

      <div className="login-container">
        <h2>{isLogin ? "Iniciar Sesión" : "Crear Cuenta"}</h2>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input
              className="form-input"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              className="form-input"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introduce tu contraseña"
              required
              disabled={isLoading}
            />
          </div>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="nombre">Nombre completo</label>
                <input
                  className="form-input"
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre y apellidos"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edad">Edad</label>
                <input
                  className="form-input"
                  type="number"
                  id="edad"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  placeholder="Tu edad"
                  required
                  min="1"
                  disabled={isLoading}
                />
              </div>
            </>
          )}
          {error && <p className="form-error-message">{error}</p>}
          <button
            type="submit"
            className="form-button primary full-width"
            disabled={isLoading}
          >
            {isLoading
              ? "Procesando..."
              : isLogin
              ? "Iniciar Sesión"
              : "Registrarse"}
          </button>
        </form>
        <button
          onClick={toggleMode}
          className="toggle-link"
          disabled={isLoading}
        >
          {isLogin
            ? "¿No tienes cuenta? Regístrate"
            : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}

export default Login;