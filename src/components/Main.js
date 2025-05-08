// components/Main.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./estilos/Main.css"; // Asegúrate que la ruta es correcta y Main.css está actualizado
import logoRivalt from "../img/logoRivaltN.png";
import imagenPrincipal from '../img/laptop.png';

import {
  FaFutbol,
  FaBasketballBall,
  FaGolfBall,
  FaFootballBall,
  FaBaseballBall,
  FaVolleyballBall
} from 'react-icons/fa';

const RIVALT_ORANGE_RGB = '255, 109, 20'; // Para usar en rgba()

// --- Configuración Estela ---
const MAX_TRAIL_SEGMENTS = 100; // Número de segmentos de línea en la estela.

// Opacidad MÁXIMA para cada segmento de la estela (del más nuevo al más viejo).
const SEGMENT_BASE_OPACITY = [0.6, 0.45, 0.3,0.2,0.27,0.25,0.2,0.17,0.15,0.15,0.15,0.12,0.10,0.06,0.03]; // Ajusta para MAX_TRAIL_SEGMENTS


// --- Configuración Pelota de Tenis ---
const TENNIS_BALL_ICON = FaBaseballBall;
const TENNIS_BALL_SIZE = 28; // Este valor se usará para el grosor de su estela
const TENNIS_BALL_WEIGHT = 0.3;
const TENNIS_GRAVITY = 0.3;
const TENNIS_BOUNCE_DAMPING = 0.75;
const TENNIS_GROUND_Y_PERCENT = 0.85;
const TENNIS_HORIZONTAL_SPEED_FACTOR = 13.5;
const TENNIS_INITIAL_VERTICAL_FACTOR = 4.5;

// --- Configuración Pelotas Aleatorias ---
const OTHER_BALL_TYPES = [
  { id: 'soccer', IconComponent: FaFutbol, size: 40, weight: 1.0 }, // 'size' se usará para el grosor
  { id: 'basketball', IconComponent: FaBasketballBall, size: 45, weight: 1.2 },
  { id: 'rugby', IconComponent: FaFootballBall, size: 40, weight: 1.1 },
  { id: 'volleyball', IconComponent: FaVolleyballBall, size: 38, weight: 0.9 },
];
const OTHER_SPAWN_INTERVAL = 4000;
const OTHER_GRAVITY = 0.015;
const MAX_OTHER_BALLS_ON_SCREEN = 3;

// Glow effect configuration
const GLOW_EDGE_THRESHOLD_PERCENT = 7;
const GLOW_DURATION_MS = 300;
const GLOW_LENGTH_PX = 80;
const GLOW_THICKNESS_PX = 2;


function Main() {
  const navigate = useNavigate();
  const shape1Ref = useRef(null);
  const shape2Ref = useRef(null);
  const infoSectionRef = useRef(null);

  const [tennisBall, setTennisBall] = useState(null);
  const [randomOtherBalls, setRandomOtherBalls] = useState([]);
  const [activeGlows, setActiveGlows] = useState([]);

  const handleMouseMove = useCallback((event) => {
    const { clientX, clientY } = event;
    const windowWidth = window.innerWidth; const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2; const centerY = windowHeight / 2;
    const normalizedDeltaX = (clientX - centerX) / centerX;
    const normalizedDeltaY = (clientY - centerY) / centerY;

    if (shape1Ref.current) {
      const moveX1 = normalizedDeltaX * -30; const moveY1 = normalizedDeltaY * -20;
      const baseRadius = 50; const radiusVariation = 15;
      const r1 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius - normalizedDeltaX * radiusVariation));
      const r2 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius + normalizedDeltaX * radiusVariation));
      const r3 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius - normalizedDeltaY * radiusVariation));
      const r4 = Math.min(baseRadius + radiusVariation, Math.max(baseRadius - radiusVariation, baseRadius + normalizedDeltaY * radiusVariation));
      shape1Ref.current.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}%`;
      shape1Ref.current.style.transform = `translate(${moveX1}px, ${moveY1}px) scale(1)`;
    }
    if (shape2Ref.current) {
      const moveX2 = normalizedDeltaX * 15; const moveY2 = normalizedDeltaY * 25;
      const rotate2 = normalizedDeltaX * 3; const scaleX2 = 1 + normalizedDeltaX * 0.05; const scaleY2 = 1 - normalizedDeltaY * 0.05;
      shape2Ref.current.style.transform = `translate(${moveX2}px, ${moveY2}px) rotate(${rotate2}deg) scale(${scaleX2}, ${scaleY2})`;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    const observer = new IntersectionObserver((entries) => entries.forEach(entry => entry.target.classList.toggle("visible", entry.isIntersecting)), { threshold: 0.1 });
    if (infoSectionRef.current) observer.observe(infoSectionRef.current);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (infoSectionRef.current) observer.unobserve(infoSectionRef.current);
    };
  }, [handleMouseMove]);

  const handleLogin = () => navigate("/login");

  const initializeTennisBall = useCallback((serveFromLeft = true) => {
    const screenWidth = window.innerWidth; const screenHeight = window.innerHeight;
    let startX, velocityX, startY, velocityY;
    startY = screenHeight * 0.45 + Math.random() * (screenHeight * 0.15);
    if (serveFromLeft) {
      startX = -TENNIS_BALL_SIZE; velocityX = TENNIS_HORIZONTAL_SPEED_FACTOR + Math.random() * 1.0;
    } else {
      startX = screenWidth; velocityX = -(TENNIS_HORIZONTAL_SPEED_FACTOR + Math.random() * 1.0);
    }
    velocityY = -(TENNIS_INITIAL_VERTICAL_FACTOR + Math.random() * 1.0);
    setTennisBall({
      id: `tennis-ball-${Date.now()}`, IconComponent: TENNIS_BALL_ICON,
      size: TENNIS_BALL_SIZE, weight: TENNIS_BALL_WEIGHT, x: startX, y: startY,
      velocityX, velocityY, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 8,
      hasBouncedOnGround: false, isMovingLeftToRight: serveFromLeft,
      trail: [],
    });
  }, []);

  useEffect(() => {
    initializeTennisBall(Math.random() < 0.5);
  }, [initializeTennisBall]);

  const spawnRandomOtherBall = useCallback(() => {
    setRandomOtherBalls((prevBalls) => {
      if (prevBalls.length >= MAX_OTHER_BALLS_ON_SCREEN) return prevBalls;
      const ballType = OTHER_BALL_TYPES[Math.floor(Math.random() * OTHER_BALL_TYPES.length)];
      const id = `other-ball-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const screenWidth = window.innerWidth; const screenHeight = window.innerHeight;
      const fromLeft = Math.random() < 0.5;
      let startX, startY, velocityX, velocityY;
      startY = screenHeight * 0.25 + Math.random() * (screenHeight * 0.5);
      const horizontalSpeed = 8.0 + Math.random() * 9.0;
      const initialVerticalPush = 1.5 + Math.random() * 1.0;
      if (fromLeft) { startX = -ballType.size; velocityX = horizontalSpeed;
      } else { startX = screenWidth; velocityX = -horizontalSpeed; }
      velocityY = -(initialVerticalPush / (ballType.weight || 1));
      return [ ...prevBalls, {
          id, type: ballType, x: startX, y: startY,
          velocityX, velocityY, rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 4,
          trail: [],
        },
      ];
    });
  }, []);

  useEffect(() => {
    let intervalId = null;
    const handleVisibilityChange = () => {
      if (document.hidden) { if (intervalId) { clearInterval(intervalId); intervalId = null; }
      } else { if (!intervalId) { intervalId = setInterval(spawnRandomOtherBall, OTHER_SPAWN_INTERVAL); } }
    };
    if (!document.hidden) { intervalId = setInterval(spawnRandomOtherBall, OTHER_SPAWN_INTERVAL); }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { if (intervalId) { clearInterval(intervalId); } document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, [spawnRandomOtherBall]);

  const addGlowEffect = useCallback((edge, positionValue, yPosition = null) => {
    const newGlow = {
      id: Date.now() + Math.random(),
      edge,
      position: positionValue,
      yPosition: yPosition,
      length: GLOW_LENGTH_PX,
      thickness: GLOW_THICKNESS_PX,
      timestamp: Date.now(),
    };
  
    setActiveGlows((prevGlows) => [...prevGlows, newGlow]);
  }, []);

  useEffect(() => {
    let animationFrameId;
    const MAX_POINTS_FOR_TRAIL = MAX_TRAIL_SEGMENTS + 1;

    const animateAllBalls = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const edgeThresholdX = screenWidth * (GLOW_EDGE_THRESHOLD_PERCENT / 100);
      const edgeThresholdY = screenHeight * (GLOW_EDGE_THRESHOLD_PERCENT / 100);

      const checkAndTriggerWallGlow = (ball, currentX, currentY) => {
        if (!ball) return;
        const ballSize = ball.size || ball.type.size;
        if (currentX < edgeThresholdX || currentX < 0) {
          addGlowEffect('left', Math.max(0, Math.min(currentY + ballSize / 2 - GLOW_LENGTH_PX / 2, screenHeight - GLOW_LENGTH_PX)));
        }
        if (currentX + ballSize > screenWidth - edgeThresholdX || currentX + ballSize > screenWidth) {
          addGlowEffect('right', Math.max(0, Math.min(currentY + ballSize / 2 - GLOW_LENGTH_PX / 2, screenHeight - GLOW_LENGTH_PX)));
        }
        if (currentY < edgeThresholdY || currentY < 0) {
          addGlowEffect('top', Math.max(0, Math.min(currentX + ballSize / 2 - GLOW_LENGTH_PX / 2, screenWidth - GLOW_LENGTH_PX)));
        }
      };

      setTennisBall(prevTB => {
        if (!prevTB) return null;
        let { x, y, velocityX, velocityY, rotation, rotationSpeed, hasBouncedOnGround, isMovingLeftToRight, size, weight, trail } = prevTB;
        const currentTrailPoint = { x, y, id: Date.now() + Math.random() };
        let updatedTrail = [currentTrailPoint, ...(trail || [])];
        if (updatedTrail.length > MAX_POINTS_FOR_TRAIL) {
          updatedTrail = updatedTrail.slice(0, MAX_POINTS_FOR_TRAIL);
        }
        const nextX = x + velocityX;
        const nextY = y + velocityY;
        checkAndTriggerWallGlow(prevTB, nextX, nextY);
        const newVelocityY = velocityY + TENNIS_GRAVITY * weight;
        rotation += rotationSpeed;
        const groundContactY = screenHeight * TENNIS_GROUND_Y_PERCENT - size;
        if (nextY >= groundContactY && newVelocityY > 0 && !hasBouncedOnGround) {
          y = groundContactY;
          prevTB.velocityY = -newVelocityY * TENNIS_BOUNCE_DAMPING;
          prevTB.hasBouncedOnGround = true;
          prevTB.velocityX *= 0.98;
          prevTB.rotationSpeed *= 0.8;
        
          // Generar el glow del bote con las mismas propiedades que los glows de las paredes
          const ballCenterXOnBounce = x + size / 2;
          const glowStartX = Math.max(0, Math.min(ballCenterXOnBounce - GLOW_LENGTH_PX / 2, screenWidth - GLOW_LENGTH_PX));
          addGlowEffect('groundBounce', glowStartX, groundContactY);
        } else {
          y = nextY;
          prevTB.velocityY = newVelocityY;
        }
        x = nextX;
        const ballExitedRight = isMovingLeftToRight && x > screenWidth + size * 1.5;
        const ballExitedLeft = !isMovingLeftToRight && x < -size * 1.5;
        if (ballExitedRight || ballExitedLeft || y > screenHeight + size * 2) {
          initializeTennisBall(!isMovingLeftToRight);
          return null;
        }
        return { ...prevTB, x, y, rotation, velocityX: prevTB.velocityX, velocityY: prevTB.velocityY, rotationSpeed: prevTB.rotationSpeed, hasBouncedOnGround: prevTB.hasBouncedOnGround, trail: updatedTrail };
      });

      setRandomOtherBalls(currentBalls =>
        currentBalls.map(ball => {
          if (!ball) return null;
          let { x, y, velocityX, velocityY, rotation, rotationSpeed, type, trail } = ball;
          const currentTrailPoint = { x, y, id: Date.now() + Math.random() };
          let updatedTrail = [currentTrailPoint, ...(trail || [])];
          if (updatedTrail.length > MAX_POINTS_FOR_TRAIL) {
            updatedTrail = updatedTrail.slice(0, MAX_POINTS_FOR_TRAIL);
          }
          const nextX = x + velocityX;
          const nextY = y + velocityY;
          checkAndTriggerWallGlow(ball, nextX, nextY);
          const newVelocityY = velocityY + (OTHER_GRAVITY * (type.weight || 1));
          const newRotation = rotation + rotationSpeed;
          if ((velocityX > 0 && nextX > screenWidth + type.size * 2) ||
              (velocityX < 0 && nextX < -type.size * 2) ||
              (nextY > screenHeight + type.size * 2 && newVelocityY > 0) ||
              (nextY < -type.size * 3 && newVelocityY < 0)) {
            return null;
          }
          return { ...ball, x: nextX, y: nextY, velocityY: newVelocityY, rotation: newRotation, trail: updatedTrail };
        }).filter(Boolean)
      );

      setActiveGlows(prevGlows => prevGlows.filter(glow => Date.now() - glow.timestamp < GLOW_DURATION_MS));
      animationFrameId = requestAnimationFrame(animateAllBalls);
    };
    animationFrameId = requestAnimationFrame(animateAllBalls);
    return () => cancelAnimationFrame(animationFrameId);
  }, [addGlowEffect, initializeTennisBall]);

  return (
    <div className="main-page-container">
      <div className="localized-glow-container">
        {activeGlows.map(glow => {
          const timeElapsed = Date.now() - glow.timestamp;
          const opacity = Math.max(0, 1 - timeElapsed / GLOW_DURATION_MS);
          if (opacity <= 0) return null;
          const currentScrollX = window.scrollX;
          const currentScrollY = window.scrollY;
          const style = { position: 'fixed', opacity: opacity };
          if (glow.edge === 'top') {
            style.top = `0px`; style.left = `${glow.position - currentScrollX}px`;
            style.width = `${glow.length}px`; style.height = `${glow.thickness}px`;
          } else if (glow.edge === 'left') {
            style.left = `0px`; style.top = `${glow.position - currentScrollY}px`;
            style.height = `${glow.length}px`; style.width = `${glow.thickness}px`;
          } else if (glow.edge === 'right') {
            style.right = `0px`; style.top = `${glow.position - currentScrollY}px`;
            style.height = `${glow.length}px`; style.width = `${glow.thickness}px`;
          } else if (glow.edge === 'groundBounce' && glow.yPosition !== null) {
            style.top = `${glow.yPosition - glow.thickness / 2 - currentScrollY}px`;
            style.left = `${glow.position - currentScrollX}px`;
            style.width = `${glow.length}px`; style.height = `${glow.thickness}px`;
          } else { return null; }
          return <div key={glow.id} className="screen-edge-glow-segment" style={style}></div>;
        })}
      </div>

      <div ref={shape1Ref} className="animated-shape shape1"></div>
      <div ref={shape2Ref} className="animated-shape shape2"></div>

      {/* Estela de LÍNEA con GRADIENTE para la Pelota de Tenis */}
      {tennisBall && tennisBall.trail && tennisBall.trail.length > 1 &&
        tennisBall.trail.slice(0, -1).map((point, index) => {
          const nextPoint = tennisBall.trail[index + 1];
          if (!point || !nextPoint) return null;
          const deltaX = nextPoint.x - point.x;
          const deltaY = nextPoint.y - point.y;
          const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
          const baseOpacity = SEGMENT_BASE_OPACITY[index] !== undefined ? SEGMENT_BASE_OPACITY[index] : 0;
          if (baseOpacity <= 0 || length < 0.5) return null; // No dibujar líneas muy cortas o invisibles
          const gradientDirection = 'to right';
          const gradientColorStart = `rgba(${RIVALT_ORANGE_RGB}, ${baseOpacity})`;
          const gradientColorEnd = `rgba(${RIVALT_ORANGE_RGB}, 0)`;
          return (
            <div
              key={`tennis-trail-line-${point.id}`}
              className="ball-line-segment"
              style={{
                position: 'absolute',
                left: `${point.x + (tennisBall.size / 2)}px`,
                top: `${point.y + (tennisBall.size / 2)}px`,
                width: `${length}px`,
                height: `${tennisBall.size}px`, // Grosor igual al tamaño de la pelota
                background: `linear-gradient(${gradientDirection}, ${gradientColorStart}, ${gradientColorEnd})`,
                transform: `rotate(${angle}deg) translateY(-50%)`, // Centrar verticalmente la línea gruesa
                transformOrigin: '0 0',
                zIndex: 4,
                pointerEvents: 'none',
                borderRadius: `${tennisBall.size / 2}px`, // Extremos redondeados
              }}
            />
          );
        })}

      {tennisBall && (
        <div
          key={tennisBall.id} className="flying-ball tennis-rally-ball"
          style={{
            width: `${tennisBall.size}px`, height: `${tennisBall.size}px`, color: `rgba(${RIVALT_ORANGE_RGB}, 1)`, // Color de la pelota principal
            transform: `translate(${tennisBall.x}px, ${tennisBall.y}px) rotate(${tennisBall.rotation}deg)`,
            zIndex: 5
          }}>
          <tennisBall.IconComponent style={{ fontSize: `${tennisBall.size}px` }} />
        </div>
      )}

      {randomOtherBalls.map(ball => (
        ball.trail && ball.trail.length > 1 &&
        ball.trail.slice(0, -1).map((point, index) => {
          const nextPoint = ball.trail[index + 1];
          if (!point || !nextPoint) return null;
          const deltaX = nextPoint.x - point.x;
          const deltaY = nextPoint.y - point.y;
          const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
          const baseOpacity = SEGMENT_BASE_OPACITY[index] !== undefined ? SEGMENT_BASE_OPACITY[index] : 0;
          if (baseOpacity <= 0 || length < 0.5) return null;
          const gradientDirection = 'to right';
          const gradientColorStart = `rgba(${RIVALT_ORANGE_RGB}, ${baseOpacity})`;
          const gradientColorEnd = `rgba(${RIVALT_ORANGE_RGB}, 0)`;
          return (
            <div
              key={`other-trail-line-${ball.id}-${point.id}`}
              className="ball-line-segment"
              style={{
                position: 'absolute',
                left: `${point.x + (ball.type.size / 2)}px`,
                top: `${point.y + (ball.type.size / 2)}px`,
                width: `${length}px`,
                height: `${ball.type.size}px`, // Grosor igual al tamaño de la pelota
                background: `linear-gradient(${gradientDirection}, ${gradientColorStart}, ${gradientColorEnd})`,
                transform: `rotate(${angle}deg) translateY(-50%)`, // Centrar verticalmente
                transformOrigin: '0 0',
                zIndex: 4,
                pointerEvents: 'none',
                borderRadius: `${ball.type.size / 2}px`, // Extremos redondeados
              }}
            />
          );
        })
      ))}

      {randomOtherBalls.map(ball => {
        const BallIcon = ball.type.IconComponent;
        return (
          <div
            key={ball.id} className="flying-ball other-random-ball"
            style={{
              width: `${ball.type.size}px`, height: `${ball.type.size}px`, color: `rgba(${RIVALT_ORANGE_RGB},1)`,
              transform: `translate(${ball.x}px, ${ball.y}px) rotate(${ball.rotation}deg)`,
              zIndex: 5
            }}>
            <BallIcon style={{ fontSize: `${ball.type.size}px` }} />
          </div>
        );
      })}

      <header className="main-banner">
        <img src={logoRivalt} alt="Logo Rivalt" className="rivalt-logo" />
        <button onClick={handleLogin} className="form-button secondary login-button">
          Iniciar sesión
        </button>
      </header>

      <section className="main-content">
        <div className="content-grid">
          <div className="image-container">
            <img src={imagenPrincipal} alt="Presentación de la plataforma Rivalt" className="responsive-image" />
          </div>
          <div className="text-content">
            <h1>CREA TU PRÓXIMO TORNEO CON <span className="highlight">RIVALT</span></h1>
            <ul className="features-list">
              <li><span className="bullet">-</span> 100% Gratis</li>
              <li><span className="bullet">-</span> Fácil y rápido</li>
            </ul>
            <button onClick={handleLogin} className="form-button primary start-button">
              EMPEZAR AHORA
            </button>
          </div>
        </div>
      </section>

      <section ref={infoSectionRef} className="info-section">
        <h2>Descubre lo que puedes hacer</h2>
        <p>
          Rivalt te ofrece todas las herramientas necesarias para organizar
          y gestionar torneos de cualquier tipo de forma sencilla e intuitiva.
          Desde la creación de brackets hasta el seguimiento en tiempo real.
        </p>
        <div className="info-features">
          <div>Crea Torneos Personalizados</div>
          <div>Gestiona Participantes Fácilmente</div>
          <div>Resultados en Tiempo Real</div>
        </div>
      </section>

      <footer className="main-footer">
        <p>&copy; {new Date().getFullYear()} Rivalt. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default Main;