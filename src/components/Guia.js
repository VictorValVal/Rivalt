import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './estilos/Guia.css';
import Footer from './Footer';

const Guia = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <div className="guia-page-container">
        <div className="guia-content">
          <header className="guia-header">
            {/* Back button with FaArrowLeft - positioning moved to CSS */}
            <button
              onClick={() => navigate(-1)}
              title="Volver"
              className="guia-back-to-top-button" // New class for centered, top positioning
            >
              <FaArrowLeft />
            </button>
            <h1>Guía del Usuario de Rivalt</h1>
            <p className="guia-intro">
              Bienvenido a Rivalt. Aquí encontrarás todo lo que necesitas saber para empezar a crear, gestionar y participar en torneos.
            </p>
          </header>

          <section id="primeros-pasos" className="guia-section">
            <h2>1. Primeros Pasos</h2>

            <article className="guia-article">
              <h3>1.1 Crear o Iniciar Sesión</h3>
              <p>
                Para comenzar a utilizar Rivalt, primero necesitas una cuenta. Puedes registrarte con tu correo electrónico o iniciar sesión directamente si ya tienes una.
              </p>
              <h4>Registro</h4>
              <p>
                En la página de inicio de sesión, haz clic en <strong>"¿No tienes cuenta? Regístrate"</strong>. Sigue los pasos: introduce tu email, crea una contraseña segura (mínimo 8 caracteres, mayúsculas, minúsculas, números, símbolos) y tu nombre completo.
              </p>

              <h4>Inicio de Sesión</h4>
              <p>
                Introduce tu email y contraseña, o usa la opción de <strong>Google Sign-in</strong> para acceder rápidamente.
              </p>
            </article>

            <article className="guia-article">
              <h3>1.2 Tu Página Principal (Home)</h3>
              <p>
                Al iniciar sesión, accederás a tu página principal, tu centro de operaciones en Rivalt.
              </p>

              <h4>Barra Superior</h4>
              <p>
                En la parte superior encontrarás el logo de Rivalt, tu nombre de usuario, tu plan actual (Gratis, Premium, Pro) y un botón para "Cerrar Sesión".
              </p>

              <h4>Botones Principales</h4>
              <p>
                Dos botones flotantes te dan acceso rápido a las acciones más importantes:
              </p>
              <ul>
                <li><strong>Añadir Torneo:</strong> Para crear una nueva competición desde cero.</li>
                <li><strong>Unirse a Torneo:</strong> Para participar en un torneo existente mediante un código.</li>
              </ul>

              <h4>Tarjetas de Torneos</h4>
              <p>
                Verás una tarjeta por cada torneo que has creado o en el que participas. Cada tarjeta te muestra tu rol (Creador, Participante, etc.). Al pasar el cursor sobre una tarjeta, esta se volteará para mostrarte más detalles, como el código para unirse. Haz clic en una tarjeta para ir a la página de gestión de ese torneo.
              </p>
            </article>
          </section>

          <section id="funcionalidades-clave" className="guia-section">
            <h2>2. Funcionalidades Clave</h2>

            <article className="guia-article">
              <h3>2.1 Crear un Nuevo Torneo</h3>
              <p>
                Haz clic en el botón <strong>"Añadir Torneo"</strong> para iniciar el asistente de creación de 4 pasos:
              </p>
              <ol>
                <li><strong>Paso 1:</strong> Define el <strong>título</strong> y el <strong>deporte</strong>. Puedes elegir "Otro" si tu deporte no está en la lista.</li>
                <li><strong>Paso 2:</strong> Elige el tipo de participación: <strong>Individual</strong> o <strong>Por Equipos</strong>.</li>
                <li><strong>Paso 3:</strong> Selecciona el formato del torneo: <strong>Liga</strong> (todos contra todos) o <strong>Eliminatoria</strong> (llaves de eliminación directa).</li>
                <li><strong>Paso 4:</strong> Especifica el <strong>número de participantes o equipos</strong>. Tu plan (Gratis, Premium, Pro) limita el número máximo de participantes y la cantidad de torneos simultáneos que puedes tener. Si alcanzas tu límite, te propondremos mejorar tu plan.</li>
              </ol>
            </article>

            <article className="guia-article">
              <h3>2.2 Unirse a un Torneo Existente</h3>
              <p>
                Para unirte a un torneo, haz clic en <strong>"Unirse a Torneo"</strong> e introduce el código de 6 caracteres que te haya proporcionado el organizador. Luego, elige tu rol:
              </p>
              <ul>
                <li><strong>Participante:</strong> Si el torneo es individual, te unirás directamente. Si es por equipos, se te pedirá que rellenes un formulario con el nombre de tu equipo y sus miembros.</li>
                <li><strong>Espectador:</strong> Te permite seguir el progreso del torneo, ver los resultados y la clasificación sin competir.</li>
              </ul>
            </article>

            <article className="guia-article">
              <h3>2.3 Gestión del Torneo</h3>
              <p>
                Dentro de la página de un torneo, un menú lateral te da acceso a todas las herramientas de gestión:
              </p>

              <h4>Información</h4>
              <ul>
                <li><strong>Detalles:</strong> Consulta toda la información clave del torneo.</li>
                <li><strong>Código para Unirse:</strong> Copia y comparte el código para invitar a otros.</li>
                <li><strong>Novedades y Alertas:</strong> Un feed de actividad con todo lo que ocurre en el torneo.</li>
                <li><strong>Zona de Peligro:</strong> Como creador, puedes <strong>eliminar el torneo</strong>. Como participante, puedes <strong>abandonarlo</strong>.</li>
              </ul>

              <h4>Participantes</h4>
              <ul>
                <li>Visualiza la lista de jugadores o equipos inscritos.</li>
                <li>Si no estás inscrito y hay plazas, puedes unirte desde aquí.</li>
                <li>Haz clic en un participante para <strong>Ver Detalles</strong>.</li>
                <li>Si eres el creador, puedes <strong>eliminar participantes</strong> del torneo.</li>
              </ul>

              <h4>Calendario</h4>
              <p>Aquí se listan todos los partidos programados con su fecha, hora y resultado. Si eres el creador:</p>
              <ul>
                <li>En torneos de <strong>Liga</strong>, puedes <strong>añadir nuevos partidos</strong> manualmente.</li>
                <li>Puedes <strong>añadir o editar los resultados</strong> de cualquier partido.</li>
              </ul>

              <h4>Clasificación</h4>
              <p>El corazón de la competición, donde se visualiza el progreso.</p>
              <ul>
                <li><strong>Torneos de Liga:</strong> Muestra una tabla de clasificación tradicional (puntos, victorias, etc.).</li>
                <li><strong>Torneos de Eliminatoria:</strong> Muestra el cuadro de las llaves (bracket), donde los ganadores avanzan automáticamente.</li>
              </ul>
              <p>Como creador, en las llaves de eliminatoria, puedes hacer clic en cada casilla para definir los detalles del partido (fecha, hora) y añadir sus resultados.</p>
              <p>Además, puedes ver la clasificación/llaves en <strong>pantalla completa</strong> y <strong>descargarlas como imagen PNG</strong>.</p>
            </article>
          </section>

          <section id="planes-precios" className="guia-section">
            <h2>3. Planes y Precios</h2>
            <article className="guia-article">
              <p>
                Rivalt ofrece varios planes para adaptarse a tus necesidades:
              </p>
              <ul>
                <li><strong>Gratis:</strong> Ideal para empezar, con funcionalidades básicas y límites en el tamaño y número de torneos.</li>
                <li><strong>Premium / Pro:</strong> Aumentan los límites de participantes, equipos y torneos simultáneos, además de desbloquear funciones avanzadas.</li>
              </ul>
              <p>Puedes gestionar y mejorar tu plan en cualquier momento desde la sección de <strong>"Planes"</strong>.</p>
            </article>
          </section>

          <section id="ayuda-soporte" className="guia-section">
            <h2>4. Ayuda y Soporte</h2>
            <article className="guia-article">
              <p>
                Si tienes dudas o necesitas ayuda, estamos aquí para ti.
              </p>
              <ul>
                <li><strong>Preguntas Frecuentes (FAQ):</strong> Visita nuestra sección de <Link to="/preguntas">Preguntas Frecuentes</Link> para encontrar respuestas rápidas a las dudas más comunes.</li>
                <li><strong>Contacto:</strong> Para cualquier otra consulta, no dudes en escribirnos a <a href="mailto:rivalt.contacto@gmail.com">rivalt.contacto@gmail.com</a>.</li>
              </ul>
            </article>
          </section>

          <section id="informacion-legal" className="guia-section">
            <h2>5. Información Legal</h2>
            <article className="guia-article">
              <p>
                Tu confianza y seguridad son importantes para nosotros.
              </p>
              <ul>
                <li><strong>Términos y Condiciones:</strong> Consulta nuestras reglas de uso en la página de <Link to="/terminos">Términos y Condiciones</Link>.</li>
                <li><strong>Política de Privacidad:</strong> Entiende cómo gestionamos tus datos en nuestra <Link to="/privacidad">Política de Privacidad</Link>.</li>
              </ul>
            </article>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Guia;