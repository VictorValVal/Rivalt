// components/Main.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./estilos/Main.css";
import logoRivalt from "../img/logoRivaltN.png";
import imagenPrincipal from '../img/laptop.png';
import phoneImage from '../img/phone.png';
import JugadorBaloncestoPNG from '../img/JugadorBaloncesto.png';
import {
  FaFutbol,
  FaBasketballBall,
  FaFootballBall,
  FaBaseballBall,
  FaVolleyballBall,
  FaRegLightbulb, 
  FaUserCog, 
  FaChartLine 
} from 'react-icons/fa';
import Footer from './Footer';

// Constants for ball animations and glow effects (unchanged)
const RIVALT_ORANGE_RGB = '255, 109, 20';
const TENNIS_BALL_ICON = FaBaseballBall;
const TENNIS_BALL_SIZE = 28;
const OTHER_BALL_TYPES = [
  { id: 'soccer', IconComponent: FaFutbol, size: 40, weight: 1.0 },
  { id: 'basketball', IconComponent: FaBasketballBall, size: 45, weight: 1.2 },
  { id: 'rugby', IconComponent: FaFootballBall, size: 40, weight: 1.1 },
  { id: 'volleyball', IconComponent: FaVolleyballBall, size: 38, weight: 0.9 },
];
const TENNIS_BALL_WEIGHT = 0.3;
const TENNIS_GRAVITY = 0.6;
const TENNIS_BOUNCE_DAMPING = 0.75;
const TENNIS_GROUND_Y_PERCENT = 0.85;
const TENNIS_HORIZONTAL_SPEED_FACTOR = 13.5;
const TENNIS_INITIAL_VERTICAL_FACTOR = 4.5;

const OTHER_SPAWN_INTERVAL = 4000;
const OTHER_GRAVITY = 0.015;
const MAX_OTHER_BALLS_ON_SCREEN = 3;

const GLOW_EDGE_THRESHOLD_PERCENT = 7;
const GLOW_DURATION_MS = 300;
const GLOW_LENGTH_PX = 80;
const GLOW_THICKNESS_PX = 2;

const WALL_GLOW_BASE_ALPHA = 0.25;
const WALL_GLOW_SHADOW_ALPHA = 0.2;
const WALL_GLOW_SHADOW_BLUR = '4px';
const WALL_GLOW_SHADOW_SPREAD = '0px';

const BOUNCE_GLOW_BASE_ALPHA = 0.7;
const BOUNCE_GLOW_SHADOW_ALPHA = 0.6;
const BOUNCE_GLOW_SHADOW_BLUR = '12px';
const BOUNCE_GLOW_SHADOW_SPREAD = '3px';


function Main() {
  const navigate = useNavigate();
  const shape1Ref = useRef(null);
  const shape2Ref = useRef(null);
  // infoSectionRef is removed
  const mobilePromoSectionRef = useRef(null);
  const basketballPromoSectionRef = useRef(null); 

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

    const observerOptions = { threshold: 0.1 }; 

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle("visible", entry.isIntersecting);
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // infoSectionRef.current removed from this array
    const sectionsToObserve = [
        mobilePromoSectionRef.current,
        basketballPromoSectionRef.current 
    ];
    sectionsToObserve.forEach(section => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      sectionsToObserve.forEach(section => {
        if (section) {
          observer.unobserve(section);
        }
      });
    };
  }, [handleMouseMove]); 

  const handleLogin = () => navigate("/login");

  // Logic for tennis ball (unchanged)
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
    });
  }, []);

  useEffect(() => {
    initializeTennisBall(Math.random() < 0.5);
  }, [initializeTennisBall]);

  // Logic for other random balls (unchanged)
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

  // Logic for glow effects (unchanged)
  const addGlowEffect = useCallback((edge, positionValue, yPosition = null, glowType = 'wall') => {
    const newGlow = {
      id: Date.now() + Math.random(),
      edge,
      position: positionValue,
      yPosition: yPosition,
      length: GLOW_LENGTH_PX,
      thickness: GLOW_THICKNESS_PX,
      timestamp: Date.now(),
      type: glowType,
    };
    setActiveGlows((prevGlows) => [...prevGlows, newGlow]);
  }, []);

  // Animation loop for all balls and glows (unchanged)
  useEffect(() => {
    let animationFrameId;
    const animateAllBalls = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const edgeThresholdX = screenWidth * (GLOW_EDGE_THRESHOLD_PERCENT / 100);
      const edgeThresholdY = screenHeight * (GLOW_EDGE_THRESHOLD_PERCENT / 100);

      const checkAndTriggerWallGlow = (ball, currentX, currentY) => {
        if (!ball) return;
        const ballSize = ball.size || ball.type.size;
        if (currentX < edgeThresholdX || currentX < 0) {
          addGlowEffect('left', Math.max(0, Math.min(currentY + ballSize / 2 - GLOW_LENGTH_PX / 2, screenHeight - GLOW_LENGTH_PX)), null, 'wall');
        }
        if (currentX + ballSize > screenWidth - edgeThresholdX || currentX + ballSize > screenWidth) {
          addGlowEffect('right', Math.max(0, Math.min(currentY + ballSize / 2 - GLOW_LENGTH_PX / 2, screenHeight - GLOW_LENGTH_PX)), null, 'wall');
        }
        if (currentY < edgeThresholdY || currentY < 0) {
          addGlowEffect('top', Math.max(0, Math.min(currentX + ballSize / 2 - GLOW_LENGTH_PX / 2, screenWidth - GLOW_LENGTH_PX)), null, 'wall');
        }
      };

      setTennisBall(prevTB => {
        if (!prevTB) return null;
        let { x, y, velocityX, velocityY, rotation, rotationSpeed, hasBouncedOnGround, isMovingLeftToRight, size, weight } = prevTB;
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
          const ballCenterXOnBounce = x + size / 2;
          const glowStartX = Math.max(0, Math.min(ballCenterXOnBounce - GLOW_LENGTH_PX / 2, screenWidth - GLOW_LENGTH_PX));
          addGlowEffect('groundBounce', glowStartX, groundContactY, 'bounce');
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
        return { ...prevTB, x, y, rotation, velocityX: prevTB.velocityX, velocityY: prevTB.velocityY, rotationSpeed: prevTB.rotationSpeed, hasBouncedOnGround: prevTB.hasBouncedOnGround };
      });

      setRandomOtherBalls(currentBalls =>
        currentBalls.map(ball => {
          if (!ball) return null;
          let { x, y, velocityX, velocityY, rotation, rotationSpeed, type } = ball;
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
          return { ...ball, x: nextX, y: nextY, velocityY: newVelocityY, rotation: newRotation };
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
      {/* Glow Container (unchanged) */}
      <div className="localized-glow-container">
        {activeGlows.map(glow => {
           const timeElapsed = Date.now() - glow.timestamp;
           let visualOpacity = Math.max(0, 1 - timeElapsed / GLOW_DURATION_MS);
           if (visualOpacity <= 0) return null;
           const currentScrollX = window.scrollX;
           const currentScrollY = window.scrollY;
           const isBounceGlow = glow.type === 'bounce';
           const baseAlpha = isBounceGlow ? BOUNCE_GLOW_BASE_ALPHA : WALL_GLOW_BASE_ALPHA;
           const shadowAlpha = isBounceGlow ? BOUNCE_GLOW_SHADOW_ALPHA : WALL_GLOW_SHADOW_ALPHA;
           const shadowBlur = isBounceGlow ? BOUNCE_GLOW_SHADOW_BLUR : WALL_GLOW_SHADOW_BLUR;
           const shadowSpread = isBounceGlow ? BOUNCE_GLOW_SHADOW_SPREAD : WALL_GLOW_SHADOW_SPREAD;
           const style = {
             position: 'fixed',
             opacity: visualOpacity,
             backgroundColor: `rgba(${RIVALT_ORANGE_RGB}, ${baseAlpha})`,
             boxShadow: `0 0 ${shadowBlur} ${shadowSpread} rgba(${RIVALT_ORANGE_RGB}, ${shadowAlpha})`,
             borderRadius: '1px',
           };
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

      {/* Tennis ball rendering (unchanged) */}
      {tennisBall && (
        <div
          key={tennisBall.id} className="flying-ball tennis-rally-ball"
          style={{
            width: `${tennisBall.size}px`, height: `${tennisBall.size}px`, color: `rgba(${RIVALT_ORANGE_RGB}, 1)`,
            transform: `translate(${tennisBall.x}px, ${tennisBall.y}px) rotate(${tennisBall.rotation}deg)`,
            zIndex: 5
          }}>
          <tennisBall.IconComponent style={{ fontSize: `${tennisBall.size}px` }} />
        </div>
      )}

      {/* Other random balls rendering (unchanged) */}
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

      {/* Header (unchanged) */}
      <header className="main-banner">
        <img src={logoRivalt} alt="Logo Rivalt" className="rivalt-logo" />
        <button onClick={handleLogin} className="form-button secondary login-button">
          Iniciar sesión
        </button>
      </header>

      {/* Main Content Section (hero) (unchanged) */}
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

      {/* Basketball Promo Section - MODIFIED CONTENT, ORIGINAL POSITION (NOW FIRST PROMO) */}
      <section ref={basketballPromoSectionRef} className="basketball-promo-section">
        <div className="basketball-promo-bg-shape"></div>
        <div className="basketball-promo-content">
          <div className="basketball-promo-text-container">
            {/* Content from old info-section */}
            <h2>Descubre lo que puedes hacer</h2>
            <p>
              Rivalt te ofrece todas las herramientas necesarias para organizar
              y gestionar torneos de cualquier tipo de forma sencilla e intuitiva.
              Desde la creación de brackets hasta el seguimiento en tiempo real.
            </p>
            {/* Features from old info-section */}
            <div className="info-features"> {/* Retaining class for styling */}
              <div><FaRegLightbulb /> Crea Torneos Personalizados</div>
              <div><FaUserCog /> Gestiona Participantes Fácilmente</div>
              <div><FaChartLine /> Resultados en Tiempo Real</div>
            </div>
          </div>
          <div className="basketball-promo-image-container">
            <img src={JugadorBaloncestoPNG} alt="Jugador de Baloncesto con Rivalt" className="basketball-player-image" />
            <div className="basketball-floating-ball">
              <FaBasketballBall />
            </div>
          </div>
        </div>
      </section>

      {/* info-section is REMOVED */}

      {/* Mobile Promo Section (unchanged content, now second promo section) */}
      <section ref={mobilePromoSectionRef} className="mobile-promo-section">
        <div className="mobile-promo-shape mobile-promo-shape-1"></div>
        <div className="mobile-promo-shape mobile-promo-shape-2"></div>
        <div className="mobile-promo-shape mobile-promo-shape-3"></div>
        <div className="mobile-promo-content">
          <div className="mobile-promo-image-container">
            <img src={phoneImage} alt="Rivalt en el móvil" />
          </div>
          <div className="mobile-promo-text-container">
            <h2>Rivalt donde quieras</h2>
            <p>
              Lleva la gestión de tus torneos contigo. Rivalt también está
              disponible en móvil, para que no te pierdas ni un detalle.
              Accede y administra desde cualquier dispositivo.
            </p>
            {/* Assuming this button was meant to stay or be here, it's part of original mobile promo */}
            {/* <button className="form-button promo-button">Conoce Más</button> */}
          </div>
        </div>
      </section>
      
     <Footer />
    </div>
  );
}

export default Main;