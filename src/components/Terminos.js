// Terminos.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { FaArrowLeft } from 'react-icons/fa'; // Import FaArrowLeft
import './estilos/Legales.css';
import Footer from './Footer';

const Terminos = () => {
    const navigate = useNavigate(); // Initialize useNavigate

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <>
            <div className="legal-container">
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    title="Volver"
                    className="guia-back-to-top-button" // Reusing the same class for consistent styling
                >
                    <FaArrowLeft />
                </button>
                <h1>Términos y Condiciones de Rivalt</h1>
                <p className="last-updated"><strong>Fecha de Última Actualización:</strong> 21 de mayo de 2025</p>

                <p>Bienvenido/a a Rivalt (en adelante, "la Plataforma"). Estos Términos y Condiciones (en adelante, "Términos") rigen tu acceso y uso de la Plataforma y todos los servicios relacionados ofrecidos a través de https://rivalt-torneo.web.app (en adelante, "los Servicios").</p>
                <p>Al acceder o utilizar nuestros Servicios, aceptas estar sujeto a estos Términos. Si no estás de acuerdo con alguna parte de los Términos, no podrás acceder a los Servicios.</p>

                <h2>1. Definiciones</h2>
                <ul>
                    <li><strong>"Plataforma"</strong>: Se refiere al sitio web Rivalt, accesible en https://rivalt-torneo.web.app y cualquier aplicación móvil o software asociado.</li>
                    <li><strong>"Servicios"</strong>: Incluye la creación, gestión, participación e información sobre torneos, así como cualquier otra funcionalidad ofrecida por la Plataforma Rivalt.</li>
                    <li><strong>"Usuario" / "Tú"</strong>: Cualquier persona que acceda o utilice la Plataforma.</li>
                    <li><strong>"Organizador"</strong>: Usuario que crea y gestiona torneos en la Plataforma.</li>
                    <li><strong>"Participante"</strong>: Usuario que se inscribe y/o participa en torneos.</li>
                    <li><strong>"Contenido de Usuario"</strong>: Cualquier información, dato, texto, software, música, sonido, fotografía, gráfico, video, mensaje, etiqueta u otro material que los Usuarios publiquen, suban, enlacen o transmitan de cualquier otra forma a través de la Plataforma.</li>
                </ul>

                <h2>2. Elegibilidad y Cuentas de Usuario</h2>
                <ul>
                    <li><strong>Edad Mínima</strong>: Debes tener al menos 16 años para usar nuestros Servicios. Si tienes entre 16 y 18 años (o la mayoría de edad legal en tu jurisdicción), solo puedes usar los Servicios bajo la supervisión de un padre o tutor legal que acepte estar sujeto a estos Términos.</li>
                    <li><strong>Registro de Cuenta</strong>: Para acceder a ciertas funcionalidades (como crear torneos, unirse a equipos, participar), es posible que necesites registrarte para obtener una cuenta, utilizando los servicios de autenticación proporcionados (por ejemplo, Firebase). Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta.</li>
                    <li><strong>Información Precisa</strong>: Te comprometes a proporcionar información precisa, actual y completa durante el proceso de registro y a actualizar dicha información para mantenerla precisa, actual y completa.</li>
                    <li><strong>Seguridad de la Cuenta</strong>: Notificarás inmediatamente a Rivalt (a través de [contacto@rivalt.example.com]) cualquier uso no autorizado de tu cuenta o cualquier otra violación de seguridad. Rivalt no será responsable de ninguna pérdida o daño que surja de tu incumplimiento de esta sección.</li>
                </ul>

                <h2>3. Uso Aceptable de los Servicios</h2>
                <p>Te comprometes a no utilizar los Servicios para:</p>
                <ul>
                    <li>Publicar o transmitir cualquier Contenido de Usuario que sea ilegal, dañino, amenazante, abusivo, acosador, difamatorio, vulgar, obsceno, invasivo de la privacidad de otros, odioso o racial, étnica o de cualquier otra manera objetable.</li>
                    <li>Suplantar a cualquier persona o entidad, o declarar falsamente o tergiversar tu afiliación con una persona o entidad.</li>
                    <li>Publicar o transmitir cualquier Contenido de Usuario que no tengas derecho a transmitir bajo ninguna ley o bajo relaciones contractuales o fiduciarias.</li>
                    <li>Publicar o transmitir cualquier Contenido de Usuario que infrinja cualquier patente, marca registrada, secreto comercial, derecho de autor u otros derechos de propiedad de cualquier parte.</li>
                    <li>Interferir o interrumpir los Servicios o servidores o redes conectadas a los Servicios.</li>
                    <li>Violar cualquier ley local, autonómica, nacional o internacional aplicable.</li>
                    <li>Recolectar o almacenar datos personales sobre otros usuarios en conexión con la conducta y actividades prohibidas establecidas anteriormente.</li>
                    <li>Participar en cualquier actividad que sea fraudulenta, engañosa o perjudicial para Rivalt o sus usuarios.</li>
                    <li>Utilizar cualquier medio automatizado (bots, scrapers) para acceder a los Servicios para cualquier propósito sin nuestro permiso expreso por escrito.</li>
                </ul>

                <h2>4. Contenido de Usuario</h2>
                <ul>
                    <li><strong>Responsabilidad</strong>: Eres el único responsable de todo el Contenido de Usuario que publiques (nombres de equipo, logotipos, resultados informados, etc.). Rivalt no controla el Contenido de Usuario publicado a través de los Servicios y, como tal, no garantiza la exactitud, integridad o calidad de dicho Contenido de Usuario.</li>
                    <li><strong>Licencia a Rivalt</strong>: Al publicar Contenido de Usuario en o a través de los Servicios, otorgas a Rivalt una licencia mundial, no exclusiva, libre de regalías, sublicenciable y transferible para usar, reproducir, distribuir, preparar trabajos derivados, display y ejecutar el Contenido de Usuario en conexión con la provisión, mantenimiento y mejora de los Servicios y el negocio de Rivalt, incluyendo, sin limitación, para la promoción y redistribución de parte o la totalidad de los Servicios (y trabajos derivados de los mismos) en cualquier formato de medios y a través de cualquier canal de medios. Esta licencia continúa incluso si dejas de usar nuestros Servicios, principalmente para fines operativos y de archivo.</li>
                    <li><strong>Derecho a Eliminar</strong>: Rivalt se reserva el derecho (pero no la obligación) de preseleccionar, rechazar o eliminar cualquier Contenido de Usuario a su sola discreción si considera que dicho contenido viola estos Términos o es de alguna manera perjudicial u objetable.</li>
                </ul>

                <h2>5. Reglas Específicas de Torneos</h2>
                <ul>
                    <li><strong>Reglas del Organizador</strong>: Los Organizadores pueden establecer reglas específicas para sus torneos. Los Participantes son responsables de leer y cumplir con dichas reglas. Rivalt no es responsable de la aplicación o el incumplimiento de las reglas específicas del torneo establecidas por los Organizadores.</li>
                    <li><strong>Conducta</strong>: Se espera que todos los usuarios (Organizadores y Participantes) mantengan un espíritu deportivo y una conducta respetuosa durante todos los eventos y comunicaciones relacionadas con los torneos. El acoso, las trampas o cualquier comportamiento antideportivo pueden resultar en la suspensión o eliminación de la cuenta.</li>
                    <li><strong>Resultados</strong>: Rivalt puede proporcionar herramientas para registrar y mostrar resultados. Los Organizadores y/o Participantes designados son responsables de ingresar los resultados con precisión. Rivalt no es responsable de la exactitud o validez final de dichos resultados, que en última instancia pueden ser determinados por los Organizadores del torneo. Las disputas sobre los resultados deben resolverse entre los participantes y el organizador del torneo.</li>
                </ul>

                <h2>6. Propiedad Intelectual</h2>
                <ul>
                    <li><strong>Nuestros Derechos</strong>: Los Servicios y su contenido original (excluyendo el Contenido de Usuario), características y funcionalidades (incluyendo pero no limitado a todo el software, texto, muestras, gráficos, interfaces visuales, marcas comerciales, logotipos, sonidos, música, arte y código informático) son y seguirán siendo propiedad exclusiva de Rivalt y sus licenciantes. Los Servicios están protegidos por derechos de autor, marcas registradas y otras leyes tanto de España como de países extranjeros. Nuestras marcas registradas y nuestra imagen comercial no pueden ser utilizadas en conexión con ningún producto o servicio sin el consentimiento previo por escrito de Rivalt.</li>
                    <li><strong>Tus Derechos</strong>: No reclamamos la propiedad de tu Contenido de Usuario. Sin embargo, al proporcionarlo, nos otorgas la licencia descrita en la Sección 4.</li>
                </ul>

                <h2>7. Servicios de Terceros</h2>
                <p>La Plataforma utiliza servicios de terceros, notablemente Firebase (proporcionado por Google), para funcionalidades esenciales como:</p>
                <ul>
                    <li>Autenticación de usuarios.</li>
                    <li>Almacenamiento de base de datos (Firestore/Realtime Database).</li>
                    <li>Hosting.</li>
                </ul>
                <p>Rivalt no tiene control sobre, y no asume ninguna responsabilidad por, el contenido, las políticas de privacidad o las prácticas de los sitios web o servicios de terceros como Firebase. Reconoces y aceptas que Rivalt no será responsable, directa o indirectamente, por ningún daño o pérdida causada o presuntamente causada por o en conexión con el uso o la confianza en cualquier contenido, bienes o servicios disponibles en o a través de dichos sitios web o servicios.</p>
                <p>Te recomendamos encarecidamente que leas los términos y condiciones y las políticas de privacidad de cualquier sitio web o servicio de terceros que visites, incluyendo los de Google/Firebase:</p>
                <ul>
                    <li>Términos de Servicio de Google: <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">https://policies.google.com/terms</a></li>
                    <li>Política de Privacidad de Google: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
                </ul>

                <h2>8. Privacidad</h2>
                <p>Tu privacidad es importante para nosotros. Nuestra Política de Privacidad explica cómo recopilamos, usamos y compartimos tu información personal. Al utilizar nuestros Servicios, aceptas la recopilación y el uso de información de acuerdo con nuestra <strong>Política de Privacidad</strong>, la cual forma parte integral de estos Términos. Puedes consultarla en <a href="/politica-privacidad">/politica-privacidad</a>.</p>

                <h2>9. Modificaciones a los Términos</h2>
                <p>Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, intentaremos proporcionar un aviso de al menos 30 días antes de que los nuevos términos entren en vigor (por ejemplo, mediante una notificación en la Plataforma o por correo electrónico). Lo que constituye un cambio material se determinará a nuestra sola discreción.</p>
                <p>Al continuar accediendo o utilizando nuestros Servicios después de que esas revisiones entren en vigor, aceptas estar sujeto a los términos revisados. Si no estás de acuerdo con los nuevos términos, total o parcialmente, por favor deja de usar la Plataforma y los Servicios.</p>

                <h2>10. Terminación</h2>
                <p>Podemos terminar o suspender tu acceso a nuestros Servicios y tu cuenta inmediatamente, sin previo aviso ni responsabilidad, por cualquier motivo, incluyendo, sin limitación, si incumples los Términos.</p>
                <p>Tras la terminación, tu derecho a utilizar los Servicios cesará inmediatamente. Si deseas terminar tu cuenta, puedes simplemente dejar de utilizar los Servicios o contactarnos en [contacto@rivalt.example.com] para solicitar la eliminación de tu cuenta.</p>
                <p>Todas las disposiciones de los Términos que por su naturaleza deban sobrevivir a la terminación sobrevivirán a la terminación, incluyendo, sin limitación, las disposiciones de propiedad, las renuncias de garantía, la indemnización y las limitaciones de responsabilidad.</p>

                <h2>11. Renuncia de Garantías</h2>
                <p>LOS SERVICIOS SE PROPORCIONAN "TAL CUAL" Y "SEGÚN DISPONIBILIDAD", SIN GARANTÍAS DE NINGÚN TIPO, YA SEAN EXPRESAS O IMPLÍCITAS, INCLUYENDO, PERO NO LIMITADO A, GARANTÍAS IMPLÍCITAS DE COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR, NO INFRACCIÓN O CURSO DE DESEMPEÑO.</p>
                <p>RIVALT, SUS SUBSIDIARIAS, AFILIADOS Y SUS LICENCIANTES NO GARANTIZAN QUE A) LOS SERVICIOS FUNCIONARÁN DE FORMA ININTERRUMPIDA, SEGURA O DISPONIBLE EN CUALQUIER MOMENTO O LUGAR EN PARTICULAR; B) CUALQUIER ERROR O DEFECTO SERÁ CORREGIDO; C) LOS SERVICIOS ESTÉN LIBRES DE VIRUS U OTROS COMPONENTES DAÑINOS; O D) LOS RESULTADOS DEL USO DE LOS SERVICIOS CUMPLIRÁN CON TUS REQUISITOS. ALGUNAS JURISDICCIONES NO PERMITEN LA EXCLUSIÓN DE CIERTAS GARANTÍAS, POR LO QUE ALGUNAS DE LAS EXCLUSIONES ANTERIORES PUEDEN NO APLICARSE EN TU CASO.</p>

                <h2>12. Limitación de Responsabilidad</h2>
                <p>EN NINGÚN CASO RIVALT, NI SUS DIRECTORES, EMPLEADOS, SOCIOS, AGENTES, PROVEEDORES O AFILIADOS, SERÁN RESPONSABLES POR NINGÚN DAÑO INDIRECTO, INCIDENTAL, ESPECIAL, CONSECUENTE O PUNITIVO, INCLUYENDO, SIN LIMITACIÓN, PÉRDIDA DE BENEFICIOS, DATOS, USO, FONDO DE COMERCIO U OTRAS PÉRDIDAS INTANGIBLES, RESULTANTES DE (I) TU ACCESO O USO O INCAPACIDAD DE ACCEDER O USAR LOS SERVICIOS; (II) CUALQUIER CONDUCTA O CONTENIDO DE CUALQUIER TERCERO EN LOS SERVICIOS; (III) CUALQUIER CONTENIDO OBTENIDO DE LOS SERVICIOS; Y (IV) ACCESO NO AUTORIZADO, USO O ALTERACIÓN DE TUS TRANSMISIONES O CONTENIDO, YA SEA BASADO EN GARANTÍA, CONTRATO, AGRAVIO (INCLUYENDO NEGLIGENCIA) O CUALQUIER OTRA TEORÍA LEGAL, YA SEA QUE HAYAMOS SIDO INFORMADOS O NO DE LA POSIBILIDAD DE DICHO DAÑO, E INCLUSO SI SE ENCUENTRA QUE UN RECURSO ESTABLECIDO EN ESTE DOCUMENTO HA FALLADO EN SU PROPÓSITO ESENCIAL.</p>

                <h2>13. Indemnización</h2>
                <p>Aceptas defender, indemnizar y eximir de responsabilidad a Rivalt y a sus licenciatarios y licenciantes, y a sus empleados, contratistas, agentes, funcionarios y directores, de y contra todas y cada una de las reclamaciones, daños, obligaciones, pérdidas, responsabilidades, costos o deudas, y gastos (incluidos, entre otros, los honorarios de abogados), resultantes de o que surjan de a) tu uso y acceso a los Servicios, por ti o cualquier persona que use tu cuenta y contraseña; b) una violación de estos Términos, o c) Contenido de Usuario publicado en los Servicios.</p>

                <h2>14. Ley Aplicable y Jurisdicción</h2>
                <p>Estos Términos se regirán e interpretarán de acuerdo con las leyes de España, sin tener en cuenta sus disposiciones sobre conflicto de leyes. Cualquier disputa, controversia o reclamación que surja de o esté relacionada con estos Términos, o el incumplimiento, terminación o invalidez de los mismos, se resolverá exclusivamente ante los tribunales competentes de [Ciudad donde se establecerá la empresa, ej: Madrid, Barcelona].</p>
                <p>Nuestra incapacidad para hacer cumplir cualquier derecho o disposición de estos Términos no se considerará una renuncia a dichos derechos. Si alguna disposición de estos Términos es considerada inválida o inaplicable por un tribunal, las disposiciones restantes de estos Términos seguirán en vigor. Estos Términos constituyen el acuerdo completo entre nosotros con respecto a nuestros Servicios, y reemplazan y sustituyen cualquier acuerdo anterior que pudiéramos tener entre nosotros con respecto a los Servicios.</p>

                <h2>15. Disposiciones Generales</h2>
                <ul>
                    <li><strong>Notificaciones</strong>: Cualquier notificación u otra comunicación proporcionada por Rivalt bajo estos Términos, incluyendo aquellas relacionadas con modificaciones a estos Términos, será dada: (i) vía correo electrónico a la dirección asociada con tu cuenta; o (ii) publicando en los Servicios. Para notificaciones hechas por correo electrónico, la fecha de recepción se considerará la fecha en que se transmite dicha notificación.</li>
                    <li><strong>Divisibilidad</strong>: Si alguna disposición de estos Términos se considera inválida o inaplicable, dicha disposición se limitará o eliminará en la medida mínima necesaria, y las disposiciones restantes de estos Términos permanecerán en pleno vigor y efecto.</li>
                    <li><strong>No Renuncia</strong>: Ninguna renuncia a cualquier término de estos Términos se considerará una renuncia adicional o continua de dicho término o cualquier otro término, y el hecho de que Rivalt no haga valer ningún derecho o disposición bajo estos Términos no constituirá una renuncia a dicho derecho o disposición.</li>
                    <li><strong>Cesión</strong>: No puedes ceder ni transferir estos Términos, por ministerio de la ley o de otro modo, sin el consentimiento previo por escrito de Rivalt. Cualquier intento por tu parte de ceder o transferir estos Términos, sin dicho consentimiento, será nulo y sin efecto. Rivalt puede ceder o transferir libremente estos Términos sin restricción. Sujeto a lo anterior, estos Términos vincularán y redundarán en beneficio de las partes, sus sucesores y cesionarios permitidos.</li>
                </ul>

                <h2>16. Contacto</h2>
                <p>Si tienes alguna pregunta sobre estos Términos, por favor contáctanos en:</p>
                <p><strong>Rivalt</strong><br />
                    Correo Electrónico: rivalt.contacto@gmail.com<br />
                </p>

            </div>
            <Footer />
        </>

    );
};

export default Terminos;