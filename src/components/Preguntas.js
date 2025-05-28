// components/FAQ.js
import React, { useState, useRef, useEffect } from 'react';
import './estilos/Preguntas.css'; // Asegúrate de que este archivo CSS exista y esté actualizado
import Footer from './Footer'; // Asumiendo que quieres el footer en esta página

// DATOS DE FAQ (reestructurados por categoría)
const faqDataCategorized = [
    {
        id: 'general',
        categoryTitle: 'Información General',
        questions: [
            {
                id: 'general-q1',
                question: '¿Qué es RIVALT?',
                answer: 'RIVALT es una plataforma online versátil diseñada para facilitar la creación, gestión y participación en una amplia gama de torneos, ligas y competiciones, tanto de deportes tradicionales y actividades físicas como de eSports y otros eventos competitivos.'
            },
            {
                id: 'general-q2',
                question: '¿Quién puede usar RIVALT?',
                answer: 'RIVALT está pensado para cualquier persona, club deportivo, organización, grupo de amigos o entidad que desee organizar sus propias competiciones o buscar y unirse a torneos y ligas creadas por otros usuarios en diversas disciplinas.'
            },
            {
                id: 'general-q3',
                question: '¿Usar RIVALT tiene algún costo?',
                answer: 'Actualmente, la creación, gestión y participación en competiciones a través de RIVALT es gratuita. En el futuro, podríamos introducir características premium opcionales con funcionalidades avanzadas.'
            },
            {
                id: 'general-q4',
                question: '¿Qué tipo de deportes o actividades se pueden organizar en RIVALT?',
                answer: 'Los organizadores pueden especificar la disciplina deportiva o actividad al crear una competición (por ejemplo: fútbol, baloncesto, pádel, tenis, ajedrez, atletismo, así como torneos de videojuegos, y mucho más). La flexibilidad de RIVALT permite alojar una gran variedad de eventos competitivos.'
            }
        ]
    },
    {
        id: 'cuenta-perfil',
        categoryTitle: 'Gestión de Cuenta y Perfil',
        questions: [
            {
                id: 'cuenta-q1',
                question: '¿Cómo creo una cuenta en RIVALT?',
                answer: 'Puedes crear una cuenta fácilmente haciendo clic en el botón "Registrarse" o "Crear Cuenta" en nuestra página de inicio. Solo necesitarás seguir unos sencillos pasos, que usualmente incluyen proporcionar una dirección de correo electrónico y establecer una contraseña segura.'
            },
            {
                id: 'cuenta-q2',
                question: 'He olvidado mi contraseña, ¿cómo puedo recuperarla?',
                answer: 'Si olvidaste tu contraseña, dirígete a la página de inicio de sesión y busca la opción "¿Olvidaste tu contraseña?" o "Restablecer Contraseña". Sigue las instrucciones que te enviaremos por correo electrónico para crear una nueva.'
            },
            {
                id: 'cuenta-q3',
                question: '¿Cómo puedo actualizar mi información personal o la de mi equipo?',
                answer: 'Una vez hayas iniciado sesión, podrás acceder a tu perfil de usuario desde el menú principal o tu panel de control. Allí encontrarás las opciones para editar tus datos personales, información de contacto y, si aplica, los detalles de los equipos que administres.'
            },
            {
                id: 'cuenta-q4',
                question: '¿Cómo se garantiza la seguridad de mis datos en la plataforma?',
                answer: 'La seguridad de tu información es una prioridad para nosotros. Implementamos medidas de seguridad robustas, como el uso de Firebase Authentication para inicios de sesión seguros, y seguimos las mejores prácticas del sector para proteger tus datos personales y los de tus competiciones. Para más información, te invitamos a consultar nuestra Política de Privacidad.'
            }
        ]
    },
    {
        id: 'organizadores',
        categoryTitle: 'Para Organizadores de Competiciones',
        questions: [
            {
                id: 'org-q1',
                question: '¿Cómo puedo crear un nuevo torneo o liga en RIVALT?',
                answer: 'Tras iniciar sesión, busca una opción claramente visible como "Crear Competición", "Nuevo Torneo" o similar. Nuestra plataforma te guiará a través de un formulario intuitivo donde podrás definir todos los aspectos de tu evento: nombre, deporte o actividad, reglamento específico, formato (liga, eliminación directa, grupos, etc.), calendario, límite de participantes o equipos, y la gestión de premios si los hubiera.'
            },
            {
                id: 'org-q2',
                question: '¿Qué formatos de competición soporta RIVALT?',
                answer: 'RIVALT es compatible con una variedad de formatos populares, incluyendo sistemas de liga (con opciones de ida y vuelta o solo ida), cuadros de eliminación directa (knockout), fases de grupos con rondas eliminatorias posteriores, y estamos trabajando para añadir más opciones. Podrás seleccionar el que mejor se adapte a tu disciplina y al número de contendientes.'
            },
            {
                id: 'org-q3',
                question: '¿Es posible modificar los detalles de mi competición una vez creada?',
                answer: 'Sí, como organizador, tendrás la flexibilidad de editar la mayoría de los detalles de tu competición incluso después de haberla publicado. No obstante, algunas modificaciones podrían tener restricciones si el evento ya ha comenzado o si las inscripciones están cerradas, para garantizar la equidad.'
            },
            {
                id: 'org-q4',
                question: '¿Cómo administro a los participantes o equipos inscritos?',
                answer: 'Desde tu panel de control de la competición, tendrás acceso a herramientas para visualizar la lista de inscritos, aceptar o denegar solicitudes de participación (si has configurado la inscripción con moderación), y gestionar el estado de los participantes o equipos (por ejemplo, en caso de retiradas o para aplicar sanciones leves según el reglamento).'
            },
            {
                id: 'org-q5',
                question: '¿La plataforma ayuda a generar los calendarios o los cuadros de enfrentamientos?',
                answer: '¡Sí! En base al formato de competición que elijas y la lista final de participantes o equipos confirmados, RIVALT te ofrecerá herramientas para generar automáticamente los calendarios de partidos, los cuadros de eliminación o los emparejamientos de las fases de grupos, ahorrándote tiempo y esfuerzo.'
            }
        ]
    },
    {
        id: 'participantes',
        categoryTitle: 'Para Participantes y Equipos',
        questions: [
            {
                id: 'part-q1',
                question: '¿Cómo puedo encontrar y unirme a una competición en RIVALT?',
                answer: 'Explora las competiciones disponibles en la plataforma utilizando nuestros filtros de búsqueda por deporte/actividad, formato, ubicación (si aplica) o fechas. Cuando encuentres una competición que te interese, haz clic para ver los detalles y busca el botón de "Inscribirse", "Unirse al Torneo" o similar.'
            },
            {
                id: 'part-q2',
                question: '¿Dónde puedo consultar el reglamento específico de una competición?',
                answer: 'El reglamento detallado de cada competición es establecido por su respectivo organizador. Debería estar claramente visible en la página de información principal del torneo o liga, o bien como un documento descargable adjunto.'
            },
            {
                id: 'part-q3',
                question: '¿Cuál es el procedimiento para reportar los resultados de los partidos o encuentros?',
                answer: 'El método para el reporte de resultados puede variar según lo configure el organizador. Comúnmente, puede implicar que ambos participantes/equipos confirmen el marcador, o que uno de ellos (o un árbitro/juez designado por el organizador) lo ingrese en la plataforma. Las instrucciones específicas estarán disponibles en la página de la competición o del partido.'
            },
            {
                id: 'part-q4',
                question: '¿Qué debo hacer si surge una disputa con un oponente o sobre un resultado?',
                answer: 'En caso de cualquier disputa, te recomendamos primero intentar resolverla de manera amistosa y consultando el reglamento de la competición. Si no se llega a un acuerdo, debes comunicarte con el organizador del evento, quien es la autoridad designada para mediar y tomar decisiones. Si es necesario, prepara cualquier evidencia (fotos, vídeos, testimonios) que el organizador pueda requerir.'
            },
            {
                id: 'part-q5',
                question: '¿Dónde puedo ver mis próximos enfrentamientos y cómo va la clasificación general?',
                answer: 'Tus próximos partidos o enfrentamientos programados se mostrarán claramente en la sección de "Calendario" o "Cuadros/Llaves" de la competición en la que participas. Las tablas de clasificación para las ligas o fases de grupos se actualizan generalmente de forma automática a medida que los resultados son registrados y validados, y podrás consultarlas en la sección de "Clasificación" o "Tabla de Posiciones".'
            }
        ]
    },
    {
        id: 'soporte',
        categoryTitle: 'Soporte Técnico y Contacto',
        questions: [
            {
                id: 'soporte-q1',
                question: 'Estoy teniendo un problema técnico con la plataforma, ¿qué pasos debo seguir?',
                answer: 'Si experimentas alguna dificultad técnica, te sugerimos primero intentar acciones básicas como refrescar la página (Ctrl+R o Cmd+R) o limpiar la memoria caché de tu navegador. Revisa también si hemos publicado algún aviso sobre incidencias temporales en la plataforma. Si el problema continúa, no dudes en contactar a nuestro equipo de soporte a través de [Tu Email de Soporte, ej: soporte@rivalt.com] o mediante el formulario de contacto que puedas encontrar en el sitio.'
            },
            {
                id: 'soporte-q2',
                question: 'Tengo otras preguntas o sugerencias, ¿cómo puedo contactar con RIVALT?',
                answer: 'Para consultas generales que no estén cubiertas en estas Preguntas Frecuentes, o si tienes ideas, sugerencias para mejorar RIVALT o interés en posibles colaboraciones, por favor, escríbenos a [Tu Email de Contacto General, ej: info@rivalt.com]. ¡Valoramos tu feedback!'
            }
        ]
    }
];


const FAQItem = ({ item, isOpen, onClick }) => {
    return (
        <div className="faq-item" id={item.id}>
            <button className="faq-question" onClick={onClick} aria-expanded={isOpen} aria-controls={`answer-${item.id}`}>
                {item.question}
                <span className={`faq-icon ${isOpen ? 'open' : ''}`}>{isOpen ? '-' : '+'}</span>
            </button>
            {isOpen && (
                <div className="faq-answer" id={`answer-${item.id}`} role="region">
                    {item.answer}
                </div>
            )}
        </div>
    );
};

const Preguntas = () => {
    const [openQuestionId, setOpenQuestionId] = useState(null);
    const categoryRefs = useRef({}); // Para almacenar referencias a los elementos de categoría

    const handleItemClick = (questionId) => {
        setOpenQuestionId(openQuestionId === questionId ? null : questionId);
    };

    const handleCategoryLinkClick = (categoryId) => {
        const element = categoryRefs.current[categoryId];
        if (element) {
            // Ajustar el valor de 'block' o añadir un offset si tienes un header fijo
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

     // Efecto para hacer scroll si se accede con un hash en la URL
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            // Esperar un breve momento para asegurar que los refs estén asignados
            setTimeout(() => {
                const element = categoryRefs.current[hash];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     // Opcional: Abrir la primera pregunta de la categoría anclada
                    const categoryData = faqDataCategorized.find(cat => cat.id === hash);
                    if (categoryData && categoryData.questions.length > 0) {
                        // setOpenQuestionId(categoryData.questions[0].id); // Descomentar si se desea este comportamiento
                    }
                }
            }, 100);
        }
    }, []);


    return (
        <>
            <div className="faq-page-container">
                <h1 className="faq-main-title">Preguntas Frecuentes (FAQ)</h1>
                <p className="faq-intro">
                    Encuentra respuestas a las preguntas más comunes sobre RIVALT. Navega por las categorías o desplázate para ver todas las preguntas.
                </p>

                <nav className="faq-category-menu" aria-label="Índice de categorías de FAQ">
                    <ul>
                        {faqDataCategorized.map((category) => (
                            <li key={category.id}>
                                <a href={`#${category.id}`} onClick={(e) => {
                                    e.preventDefault(); 
                                    handleCategoryLinkClick(category.id);
                                }}>
                                    {category.categoryTitle}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="faq-list-container">
                    {faqDataCategorized.map((category) => (
                        <section
                            key={category.id}
                            id={category.id} // ID para el anclaje del enlace
                            ref={el => categoryRefs.current[category.id] = el} // Asignar ref
                            className="faq-category-section"
                            aria-labelledby={`${category.id}-title`}
                        >
                            <h2 className="faq-category-title" id={`${category.id}-title`}>{category.categoryTitle}</h2>
                            {category.questions.map((qItem) => (
                                <FAQItem
                                    key={qItem.id}
                                    item={qItem}
                                    isOpen={openQuestionId === qItem.id}
                                    onClick={() => handleItemClick(qItem.id)}
                                />
                            ))}
                        </section>
                    ))}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Preguntas;