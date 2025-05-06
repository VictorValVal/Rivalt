import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import "./estilos/Login.css"; // Ruta relativa al archivo Home.js

// Asumiendo que db se configura en firebase.js y se exporta desde allí
// import { db } from "../firebase"; // Descomenta si db no se importa/configura aquí

const db = getFirestore(); // Mantenlo si la configuración es correcta aquí

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Añadir estado de carga
  const navigate = useNavigate();

  const handleAuthError = (firebaseError) => {
    // Mapeo básico de errores comunes a mensajes más amigables
    switch (firebaseError.code) {
      case "auth/invalid-email":
        return "El formato del correo electrónico no es válido.";
      case "auth/user-disabled":
        return "Este usuario ha sido deshabilitado.";
      case "auth/user-not-found":
      case "auth/wrong-password": // Combinamos no encontrado y contraseña incorrecta
        return "Correo electrónico o contraseña incorrectos.";
      case "auth/email-already-in-use":
        return "Este correo electrónico ya está registrado.";
      case "auth/weak-password":
        return "La contraseña debe tener al menos 6 caracteres.";
      case "auth/operation-not-allowed":
        return "Inicio de sesión con correo/contraseña no habilitado.";
      default:
        console.error("Firebase Auth Error:", firebaseError); // Loguea el error original para depuración
        return "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.";
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Limpiar errores previos
    setIsLoading(true);

    // Validaciones básicas adicionales (opcional)
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
        navigate("/home"); // Redirige a Home tras login exitoso
      } else {
        // Registro
        if (parseInt(edad) <= 0 || parseInt(edad) > 120) {
             setError("Por favor, introduce una edad válida.");
             setIsLoading(false);
             return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Usuario registrado:", userCredential.user.uid);
        // Guardar datos adicionales en Firestore
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
          nombre: nombre.trim(),
          edad: parseInt(edad), // Guardar edad como número
          email: userCredential.user.email, // Guardar email
          fechaRegistro: new Date(), // Guardar fecha de registro
        });
        navigate("/home"); // Redirige a Home tras registro exitoso
      }
    } catch (firebaseError) {
      setError(handleAuthError(firebaseError)); // Usa la función para obtener mensaje amigable
    } finally {
      setIsLoading(false); // Finaliza la carga independientemente del resultado
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(""); // Limpiar error al cambiar de modo
    // Limpiar campos al cambiar a Login si se desea
    // if (!isLogin) {
    //   setNombre("");
    //   setEdad("");
    // }
  };

  return (
    // Contenedor para centrar en la página
    <div className="login-page-container">
      {/* Contenedor principal del formulario */}
      <div className="login-container">
        <h2>{isLogin ? "Iniciar Sesión" : "Crear Cuenta"}</h2>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo electrónico</label>
            <input
              className="form-input" // Reutiliza la clase
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
              className="form-input" // Reutiliza la clase
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Introduce tu contraseña"
              required
              disabled={isLoading}
            />
          </div>

          {/* Campos adicionales para Registro */}
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="nombre">Nombre completo</label>
                <input
                  className="form-input" // Reutiliza la clase
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
                  className="form-input" // Reutiliza la clase
                  type="number"
                  id="edad"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  placeholder="Tu edad"
                  required
                  min="1" // Validación básica HTML5
                  disabled={isLoading}
                />
              </div>
            </>
          )}

           {/* Muestra mensaje de error si existe */}
          {error && <p className="form-error-message">{error}</p>}


          <button
            type="submit"
            // Reutiliza clases y añade full-width
            className="form-button primary full-width"
            disabled={isLoading} // Deshabilita mientras carga
          >
            {isLoading
              ? "Procesando..."
              : isLogin
              ? "Iniciar Sesión"
              : "Registrarse"}
          </button>
        </form>

        {/* Botón para cambiar entre Login y Registro */}
        <button
          onClick={toggleMode}
          className="toggle-link" // Clase específica para este botón
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