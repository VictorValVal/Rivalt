// components/Main.js
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./estilos/Main.css";
import logoRivalt from "../img/logoRivaltN.png"; // Asegúrate que esta ruta también sea correcta

// IMPORTA LA NUEVA IMAGEN AQUÍ
// La ruta '../img/' asume que Main.js está en 'components' y 'img' está en 'src'
// Ajusta la ruta si tu estructura es diferente.
import imagenPrincipal from '../img/laptop.png';

function Main() {
  const navigate = useNavigate();
  const shape1Ref = useRef(null);
  const shape2Ref = useRef(null);
  // const shape3Ref = useRef(null); // Eliminado según tu solicitud anterior

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    const normalizedDeltaX = (clientX - centerX) / centerX;
    const normalizedDeltaY = (clientY - centerY) / centerY;

    if (shape1Ref.current) {
      const moveX1 = normalizedDeltaX * -30;
      const moveY1 = normalizedDeltaY * -20;
      const baseRadius = 50;
      const radiusVariation = 15;

      const r1 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius - normalizedDeltaX * radiusVariation));
      const r2 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius + normalizedDeltaX * radiusVariation));
      const r3 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius - normalizedDeltaY * radiusVariation));
      const r4 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius + normalizedDeltaY * radiusVariation));

      shape1Ref.current.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}%`;
      shape1Ref.current.style.transform = `translate(${moveX1}px, ${moveY1}px) scale(1)`;
    }

    if (shape2Ref.current) {
      const moveX2 = normalizedDeltaX * 15;
      const moveY2 = normalizedDeltaY * 25;
      const rotate2 = normalizedDeltaX * 3;
      const scaleX2 = 1 + normalizedDeltaX * 0.05;
      const scaleY2 = 1 - normalizedDeltaY * 0.05;

      shape2Ref.current.style.transform = `translate(${moveX2}px, ${moveY2}px) rotate(${rotate2}deg) scale(${scaleX2}, ${scaleY2})`;
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (shape1Ref.current) {
        shape1Ref.current.style.transform = 'translate(0,0) scale(1)';
        shape1Ref.current.style.borderRadius = '50%';
      }
      if (shape2Ref.current) {
        shape2Ref.current.style.transform = 'translate(0,0) rotate(0) scale(1,1)';
        // shape2Ref.current.style.borderRadius = '60% 40% 30% 70% / 60% 30% 70% 40%'; // Si quieres resetear su borderRadius específico
      }
    };
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div className="main-page-container">
      <div ref={shape1Ref} className="animated-shape shape1"></div>
      <div ref={shape2Ref} className="animated-shape shape2"></div>

      <header className="main-banner">
        <img src={logoRivalt} alt="Logo Rivalt" className="rivalt-logo" />
        <button
          onClick={handleLogin}
          className="form-button secondary login-button"
        >
          Iniciar sesión
        </button>
      </header>

      <section className="main-content">
        <div className="content-grid">
          {/* MODIFICACIÓN AQUÍ para mostrar la imagen */}
          <div className="image-container"> {/* Cambiamos la clase para mejor semántica o reutilizamos .image-placeholder */}
            <img src={imagenPrincipal} alt="Presentación de la plataforma Rivalt" className="responsive-image" />
          </div>
          <div className="text-content">
            <h1>
              CREA TU PRÓXIMO TORNEO CON{" "}
              <span className="highlight">RIVALT</span>
            </h1>
            <ul className="features-list">
              <li><span className="bullet">-</span> 100% Gratis</li>
              <li><span className="bullet">-</span> Fácil y rápido</li>
            </ul>
            <button
              onClick={handleLogin}
              className="form-button primary start-button"
            >
              EMPEZAR AHORA
            </button>
          </div>
        </div>
      </section>

    </div>
    
  );
}

export default Main;