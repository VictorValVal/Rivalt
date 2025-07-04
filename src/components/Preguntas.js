import React, { useState, useRef, useEffect } from 'react';
import './estilos/Preguntas.css';
import Footer from './Footer';
import { useNavigate } from 'react-router-dom'; 
import { FaArrowLeft } from 'react-icons/fa'; 

// Datos de preguntas frecuentes categorizadas.
const faqDataCategorized = [
    {
        id: 'general',
        categoryTitle: 'Información General',
        questions: [
            {
                id: 'general-q1',
                question: '¿Qué es RIVALT?',
                answer: 'RIVALT es una plataforma online versátil diseñada para facilitar la creación, gestión y participación en torneos, ligas y competiciones, tanto de deportes tradicionales y actividades físicas como de eSports y otros eventos competitivos.'
            },
            {
                id: 'general-q2',
                question: '¿Quién puede usar RIVALT?',
                answer: 'RIVALT está pensado para cualquier persona, club deportivo, organización, grupo de amigos o entidad que desee organizar sus propias competiciones o buscar y unirse a torneos y ligas creadas por otros usuarios en diversas disciplinas.'
            },
            {
                id: 'general-q3',
                question: '¿Usar RIVALT tiene algún costo?',
                answer: 'Actualmente, la creación, gestión y participación en competiciones a través de RIVALT es gratuita. Aunque puedes mejorar tu plan a uno de pago para acceder a más ventajas y múltiples funcionalidades.'
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
                question: '¿Cómo se garantiza la seguridad de mis datos en la plataforma?',
                answer: 'La seguridad de tu información es una prioridad para nosotros. Implementamos medidas de seguridad robustas, como el uso de Firebase Authentication para inicios de sesión seguros, y seguimos las mejores prácticas del sector para proteger tus datos personales y los de tus competiciones. Para más información, te invitamos a consultar nuestra Política de Privacidad.'
            },
            {
                id: 'cuenta-q3',
                question: '¿Cómo cierro sesión en RIVALT?',
                answer: 'Para cerrar sesión, haz clic en la parte superior derecha el botón de "Cerrar sesión".'
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
                answer: 'RIVALT es compatible con una variedad de formatos populares, incluyendo sistemas de liga,  cuadros de eliminación directa y estamos trabajando para añadir más opciones. Podrás seleccionar el que mejor se adapte a tu disciplina y al número de contendientes.'
            },
            {
                id: 'org-q3',
                question: '¿Cómo administro a los participantes o equipos inscritos?',
                answer: 'Desde tu panel de control de la competición, tendrás acceso a herramientas para visualizar la lista de inscritos.'
            },
        ]
    },
    {
        id: 'participantes',
        categoryTitle: 'Para Participantes y Equipos',
        questions: [
            {
                id: 'part-q1',
                question: '¿Dónde puedo ver mis próximos enfrentamientos y cómo va la clasificación general?',
                answer: 'Tus próximos partidos o enfrentamientos programados se mostrarán claramente en la sección de "Calendario" de la competición en la que participas. Las tablas de clasificación para las ligas o fases de grupos se actualizan generalmente de forma automática a medida que los resultados son registrados y validados, y podrás consultarlas en la sección de "Clasificación".'
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
                answer: 'Si experimentas alguna dificultad técnica, te sugerimos primero intentar acciones básicas como refrescar la página (Ctrl+R o Cmd+R) o limpiar la memoria caché de tu navegador. Revisa también si hemos publicado algún aviso sobre incidencias temporales en la plataforma. Si el problema continúa, no dudes en contactar a nuestro equipo de soporte a través de rivalt.contacto@gmail.com o mediante el formulario de contacto que puedas encontrar en el sitio.'
            },
            {
                id: 'soporte-q2',
                question: 'Tengo otras preguntas o sugerencias, ¿cómo puedo contactar con RIVALT?',
                answer: 'Para consultas generales que no estén cubiertas en estas Preguntas Frecuentes, o si tienes ideas, sugerencias para mejorar RIVALT o interés en posibles colaboraciones, por favor, escríbenos a rivalt.contacto@gmail.com. ¡Valoramos tu feedback!'
            }
        ]
    }
];

// Componente individual para mostrar una pregunta y su respuesta.
const FAQItem = ({ item, isOpen, onClick }) => {
     const navigate = useNavigate();
    return (
        
        <div className="faq-item" id={item.id}>
            <button
                                onClick={() => navigate(-1)}
                                title="Volver"
                                className="guia-back-to-top-button" 
                            >
                                <FaArrowLeft />
                            </button>
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

// Componente principal para la página de Preguntas Frecuentes.
const Preguntas = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const [openQuestionId, setOpenQuestionId] = useState(null);
    const categoryRefs = useRef({});

    // Alterna la visibilidad de la respuesta de una pregunta.
    const handleItemClick = (questionId) => {
        setOpenQuestionId(openQuestionId === questionId ? null : questionId);
    };

    // Desplaza la vista a la categoría seleccionada en el menú.
    const handleCategoryLinkClick = (categoryId) => {
        const element = categoryRefs.current[categoryId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Efecto para hacer scroll a una categoría específica si se accede con un hash en la URL.
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            setTimeout(() => {
                const element = categoryRefs.current[hash];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

                {/* Menú de categorías para una navegación rápida */}
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

                {/* Lista de preguntas frecuentes por categoría */}
                <div className="faq-list-container">
                    {faqDataCategorized.map((category) => (
                        <section
                            key={category.id}
                            id={category.id}
                            ref={el => categoryRefs.current[category.id] = el}
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