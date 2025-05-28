import React, { useEffect } from 'react';
import './estilos/Legales.css'; // Usaremos el mismo CSS

const Privacidad = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="legal-container">
            <h1>Política de Privacidad de Rivalt</h1>
            <p className="last-updated"><strong>Fecha de Última Actualización:</strong> 21 de mayo de 2025</p>

            <p>Bienvenido/a a Rivalt ("nosotros", "nuestro", o "Rivalt"). Nos comprometemos a proteger tu privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y salvaguardamos tu información cuando visitas nuestra plataforma web [https://rivalt.example.com] (o la URL final de tu proyecto) y utilizas nuestros servicios de gestión de torneos (colectivamente, los "Servicios").</p>
            <p>Por favor, lee esta política de privacidad cuidadosamente. Si no estás de acuerdo con los términos de esta política de privacidad, por favor no accedas a la plataforma.</p>

            <h2>1. Información que Recopilamos</h2>
            <p>Podemos recopilar información sobre ti de varias maneras. La información que podemos recopilar en la Plataforma incluye:</p>

            <h3>a. Datos Personales</h3>
            <p>Información de identificación personal, como tu nombre, nombre de usuario, dirección de correo electrónico, y cualquier otra información que nos proporciones voluntariamente al registrarte en la Plataforma o al participar en actividades relacionadas con los Servicios, como crear un perfil, unirte a un torneo o contactarnos.</p>

            <h3>b. Datos Derivados (Datos de Uso)</h3>
            <p>Información que nuestros servidores recopilan automáticamente cuando accedes a la Plataforma, como tu dirección IP, tipo de navegador, sistema operativo, tiempos de acceso y las páginas que has visto directamente antes y después de acceder a la Plataforma. Si accedes a los Servicios a través de un dispositivo móvil, esta información también puede incluir el nombre de tu dispositivo, tipo, sistema operativo, número de teléfono, país e información de geolocalización (si la has habilitado).</p>

            <h3>c. Datos de Servicios de Terceros (Firebase)</h3>
            <p>Utilizamos Firebase para servicios de autenticación y base de datos. Cuando te registras o inicias sesión utilizando Firebase Authentication, podemos recibir información de tu cuenta de Firebase (como tu ID de usuario de Firebase, correo electrónico y nombre para mostrar). La información almacenada en nuestra base de datos de Firebase (como detalles del torneo, información del equipo, resultados) está sujeta a las medidas de seguridad de Firebase.</p>

            <h3>d. Cookies y Tecnologías de Seguimiento</h3>
            <p>Podemos usar cookies, balizas web, píxeles de seguimiento y otras tecnologías de seguimiento en la Plataforma para ayudar a personalizar la Plataforma y mejorar tu experiencia. Para más información sobre cómo usamos las cookies, por favor consulta nuestra Política de Cookies (si tienes una separada, o incluye una sección aquí). La mayoría de los navegadores están configurados para aceptar cookies por defecto. Puedes eliminar o rechazar las cookies, pero ten en cuenta que tal acción podría afectar la disponibilidad y funcionalidad de la Plataforma.</p>

            <h2>2. Cómo Usamos Tu Información</h2>
            <p>Tener información precisa sobre ti nos permite proporcionarte una experiencia fluida, eficiente y personalizada. Específicamente, podemos usar la información recopilada sobre ti a través de la Plataforma para:</p>
            <ul>
                <li>Crear y gestionar tu cuenta.</li>
                <li>Facilitar la creación, gestión y participación en torneos.</li>
                <li>Mostrar tu perfil, nombre de equipo y participación en torneos a otros usuarios de la Plataforma.</li>
                <li>Enviarte correos electrónicos administrativos, técnicos o de servicio.</li>
                <li>Responder a tus solicitudes y resolver disputas.</li>
                <li>Monitorear y analizar el uso y las tendencias para mejorar tu experiencia con la Plataforma.</li>
                <li>Prevenir actividades fraudulentas, monitorear contra robos y proteger contra actividades delictivas.</li>
                <li>Cumplir con las obligaciones legales y regulatorias.</li>
                <li>Solicitar retroalimentación y contactarte sobre tu uso de la Plataforma.</li>
                <li>[Cualquier otro uso específico de Rivalt].</li>
            </ul>

            <h2>3. Divulgación de Tu Información</h2>
            <p>No compartiremos, venderemos, alquilaremos ni comercializaremos tu información personal con terceros para sus fines promocionales sin tu consentimiento, excepto como se describe a continuación:</p>
            <h3>a. Por Ley o para Proteger Derechos</h3>
            <p>Si creemos que la divulgación de información sobre ti es necesaria para responder a un proceso legal, para investigar o remediar posibles violaciones de nuestras políticas, o para proteger los derechos, la propiedad y la seguridad de otros, podemos compartir tu información según lo permitido o requerido por cualquier ley, regla o regulación aplicable.</p>
            <h3>b. Proveedores de Servicios de Terceros</h3>
            <p>Podemos compartir tu información con terceros que realizan servicios para nosotros o en nuestro nombre, incluyendo procesamiento de datos, análisis de datos, servicios de correo electrónico, servicios de hosting (como Firebase), servicio al cliente y asistencia de marketing. Estos proveedores de servicios tendrán acceso a tu información personal solo para realizar estas tareas en nuestro nombre y están obligados a no divulgarla ni usarla para ningún otro propósito.</p>
            <h3>c. Servicios de Firebase/Google</h3>
            <p>Como se mencionó, utilizamos Firebase (un servicio de Google). Google puede recopilar y procesar datos de acuerdo con sus propias políticas de privacidad. Te recomendamos que revises la Política de Privacidad de Google: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>.</p>
            <h3>d. Transferencias Comerciales</h3>
            <p>Podemos compartir o transferir tu información en conexión con, o durante las negociaciones de, cualquier fusión, venta de activos de la empresa, financiación o adquisición de la totalidad o una parte de nuestro negocio a otra empresa.</p>
            <h3>e. Con Tu Consentimiento</h3>
            <p>Podemos divulgar tu información personal para cualquier otro propósito con tu consentimiento.</p>
            <h3>f. Información Pública</h3>
            <p>Cierta información que proporcionas, como tu nombre de usuario, nombre de equipo, y tu participación y resultados en torneos, puede ser visible públicamente en la Plataforma.</p>

            <h2>4. Seguridad de Tu Información</h2>
            <p>Utilizamos medidas de seguridad administrativas, técnicas y físicas para ayudar a proteger tu información personal. Si bien hemos tomado medidas razonables para asegurar la información personal que nos proporcionas, ten en cuenta que a pesar de nuestros esfuerzos, ninguna medida de seguridad es perfecta o impenetrable, y ningún método de transmisión de datos puede garantizarse contra cualquier intercepción u otro tipo de uso indebido. Cualquier información divulgada en línea es vulnerable a la intercepción y al uso indebido por parte de partes no autorizadas.</p>

            <h2>5. Retención de Datos</h2>
            <p>Retendremos tu información personal solo durante el tiempo que sea necesario para los fines establecidos en esta Política de Privacidad. Retendremos y utilizaremos tu información en la medida necesaria para cumplir con nuestras obligaciones legales (por ejemplo, si estamos obligados a retener tus datos para cumplir con las leyes aplicables), resolver disputas y hacer cumplir nuestros acuerdos y políticas legales.</p>
            <p>Los datos de uso generalmente se retienen por un período de tiempo más corto, excepto cuando estos datos se utilizan para fortalecer la seguridad o para mejorar la funcionalidad de nuestro Servicio, o estamos legalmente obligados a retener estos datos por períodos de tiempo más largos.</p>

            <h2>6. Tus Derechos de Protección de Datos (RGPD y LOPDGDD)</h2>
            <p>Si eres residente del Espacio Económico Europeo (EEE) o te encuentras en España, tienes ciertos derechos de protección de datos bajo el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica de Protección de Datos y garantía de los derechos digitales (LOPDGDD). Rivalt tiene como objetivo tomar medidas razonables para permitirte corregir, modificar, eliminar o limitar el uso de tus Datos Personales.</p>
            <ul>
                <li><strong>Derecho de Acceso</strong>: Tienes derecho a solicitar copias de tus datos personales.</li>
                <li><strong>Derecho de Rectificación</strong>: Tienes derecho a solicitar que corrijamos cualquier información que creas que es inexacta. También tienes derecho a solicitar que completemos la información que creas que está incompleta.</li>
                <li><strong>Derecho de Supresión (Derecho al Olvido)</strong>: Tienes derecho a solicitar que eliminemos tus datos personales, bajo ciertas condiciones.</li>
                <li><strong>Derecho a la Limitación del Tratamiento</strong>: Tienes derecho a solicitar que restrinjamos el tratamiento de tus datos personales, bajo ciertas condiciones.</li>
                <li><strong>Derecho de Oposición al Tratamiento</strong>: Tienes derecho a oponerte a nuestro tratamiento de tus datos personales, bajo ciertas condiciones.</li>
                <li><strong>Derecho a la Portabilidad de los Datos</strong>: Tienes derecho a solicitar que transfiramos los datos que hemos recopilado a otra organización, o directamente a ti, bajo ciertas condiciones.</li>
            </ul>
            <p>Si deseas ejercer alguno de estos derechos, por favor contáctanos en [contacto@rivalt.example.com]. Responderemos a tu solicitud dentro de un mes. Ten en cuenta que podemos pedirte que verifiques tu identidad antes de responder a tales solicitudes.</p>
            <p>También tienes derecho a presentar una reclamación ante una Autoridad de Control de Protección de Datos sobre nuestra recopilación y uso de tus Datos Personales. Para más información, por favor contacta a tu autoridad local de protección de datos en el Espacio Económico Europeo (EEE) o la Agencia Española de Protección de Datos (AEPD) si te encuentras en España.</p>

            <h2>7. Privacidad de los Niños</h2>
            <p>Nuestros Servicios no están dirigidos a personas menores de 16 años ("Niños"). No recopilamos deliberadamente información de identificación personal de Niños. Si eres un padre o tutor y sabes que tus Hijos nos han proporcionado Datos Personales, por favor contáctanos. Si nos damos cuenta de que hemos recopilado Datos Personales de niños sin verificación del consentimiento parental, tomamos medidas para eliminar esa información de nuestros servidores.</p>

            <h2>8. Cambios a Esta Política de Privacidad</h2>
            <p>Podemos actualizar nuestra Política de Privacidad de vez en cuando. Te notificaremos cualquier cambio publicando la nueva Política de Privacidad en esta página y actualizando la "Fecha de Última Actualización" en la parte superior de esta Política de Privacidad.</p>
            <p>Se te aconseja revisar esta Política de Privacidad periódicamente para cualquier cambio. Los cambios a esta Política de Privacidad son efectivos cuando se publican en esta página. Para cambios materiales, podemos proporcionar un aviso más prominente (como una notificación por correo electrónico o en la Plataforma).</p>

            <h2>9. Contacto</h2>
            <p>Si tienes alguna pregunta sobre esta Política de Privacidad, por favor contáctanos:</p>
            <p><strong>Rivalt</strong><br />
            Correo Electrónico: [contacto@rivalt.example.com]<br />
            [Opcional: Dirección Postal si aplica]</p>
        </div>
    );
};

export default Privacidad;