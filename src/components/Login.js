import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { getFirestore, setDoc, doc } from "firebase/firestore";
const db = getFirestore();

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isLogin) {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          console.log("Usuario logueado:", userCredential.user);
          navigate("/home");
        })
        .catch((error) => {
          setError(error.message);
        });
    } else {
      createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
          console.log("Usuario registrado:", userCredential.user);
          await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            nombre,
            edad,
            email: userCredential.user.email,
          });
          navigate("/home");
        })
        .catch((error) => {
          setError(error.message);
        });
    }
  };

  return (
    <div>
      <h2>{isLogin ? "Iniciar sesión" : "Registrarse"}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Correo electrónico</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {!isLogin && (
          <>
            <div>
              <label htmlFor="nombre">Nombre completo</label>
              <input
                type="text"
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="edad">Edad</label>
              <input
                type="number"
                id="edad"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                required
              />
            </div>
          </>
        )}
        <button type="submit">{isLogin ? "Iniciar sesión" : "Registrarse"}</button>
      </form>

      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>

      {error && <p>{error}</p>}
    </div>
  );
}

export default Login;
