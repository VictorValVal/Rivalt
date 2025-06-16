import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
    serverTimestamp, // Importa la función para obtener la marca de tiempo del servidor de Firestore
    getFirestore,    // Importa la función para obtener la instancia de Firestore
    doc,             // Importa la función para referenciar un documento específico
    getDoc,          // Importa la función para obtener un documento
    collection,      // Importa la función para referenciar una colección
    onSnapshot,      // Importa la función para escuchar cambios en tiempo real en una colección o documento
    addDoc,          // Importa la función para añadir un nuevo documento a una colección
    updateDoc,       // Importa la función para actualizar un documento existente
} from "firebase/firestore";
import { app } from "../firebase"; // Importa la configuración de Firebase
import Llaves from "./Llaves";     // Importa el componente Llaves para mostrar el bracket
import Tabla from "./Tabla";       // Importa el componente Tabla para mostrar la clasificación de liga
import ReactModal from "react-modal"; // Importa ReactModal para la gestión de ventanas modales
import "./estilos/Clasificacion.css"; // Importa los estilos CSS para este componente
import { FaEye, FaDownload } from "react-icons/fa"; // Importa iconos de Font Awesome
import html2canvas from 'html2canvas'; // Importa html2canvas para capturar elementos HTML como imágenes

// Inicialización de Firestore y configuración de ReactModal
const db = getFirestore(app);
ReactModal.setAppElement("#root"); // Configura el elemento raíz para la accesibilidad de ReactModal

/**
 * Función auxiliar para agregar novedades a la subcolección 'novedades' de un torneo.
 * @param {string} torneoId - El ID del torneo al que se agregará la novedad.
 * @param {string} mensaje - El mensaje de la novedad.
 * @param {string} tipo - El tipo de novedad (ej., 'match_add', 'match_result').
 * @param {object} dataExtra - Datos adicionales a guardar en el documento de la novedad.
 */
const agregarNovedad = async (torneoId, mensaje, tipo, dataExtra = {}) => {
    try {
        const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
        await addDoc(novedadesRef, {
            mensaje,
            tipo,
            timestamp: serverTimestamp(), // Marca de tiempo del servidor para la creación
            ...dataExtra,
        });
    } catch (error) {
        console.error("[Clasificacion.js] Error al agregar novedad:", error);
    }
};

// Objeto para los datos iniciales del formulario de un partido (usado en los modales)
const initialFormData = {
    fecha: "",
    hora: "",
    localId: "",
    visitanteId: "",
    local: "",
    visitante: "",
    existingPartidoId: null, // ID del partido si se está modificando uno existente
};

/**
 * Componente principal de Clasificación que muestra la tabla de liga o el bracket de eliminatoria.
 * @param {string} torneoIdProp - ID del torneo pasado como prop (si se usa en un contexto parent).
 * @param {boolean} isCreatorProp - Indica si el usuario actual es el creador del torneo.
 */
function Clasificacion({ torneoIdProp, isCreatorProp }) {
    const params = useParams(); // Obtiene parámetros de la URL
    // Prioriza el ID del torneo de las props, si no está, usa el de los parámetros de la URL.
    const torneoId = torneoIdProp || params.id; 

    // Estados para la información general del torneo
    const [torneoInfo, setTorneoInfo] = useState(null);
    const [tipoTorneo, setTipoTorneo] = useState(null); // 'liga' o 'torneo' (eliminatoria)
    const [numParticipantes, setNumParticipantes] = useState(0); // Número de participantes (para el bracket)
    const [participantes, setParticipantes] = useState([]); // Lista de participantes formateados para selectores
    const [rawPartidos, setRawPartidos] = useState([]); // Todos los partidos del calendario sin procesar
    const [loading, setLoading] = useState(true); // Estado de carga del componente

    // Estados para el control de la visibilidad de los modales
    const [modalStates, setModalStates] = useState({
        matchForm: false, // Modal para definir/modificar un partido
        resultForm: false, // Modal para añadir/modificar el resultado de un partido
        info: false, // Modal para mostrar información de un partido
    });

    // Estados para los datos de los formularios de partido y resultado
    const [formData, setFormData] = useState(initialFormData); // Datos del formulario de partido
    const [selectedMatchSeed, setSelectedMatchSeed] = useState(null); // Semilla de bracket seleccionada
    const [selectedResultPartido, setSelectedResultPartido] = useState(null); // Partido seleccionado para el modal de resultado
    const [localScore, setLocalScore] = useState(""); // Puntuación del equipo local
    const [visitanteScore, setVisitanteScore] = useState(""); // Puntuación del equipo visitante

    // Estado para controlar el modo de vista de pantalla completa
    const [isViewMode, setIsViewMode] = useState(false);
    const contentRef = useRef(null); // Referencia para el elemento HTML a capturar para descarga

    // Estado que indica si el usuario actual es el creador del torneo
    const [isCreator, setIsCreator] = useState(isCreatorProp);

    // Sincroniza el estado `isCreator` con la prop `isCreatorProp` si esta cambia.
    useEffect(() => {
        setIsCreator(isCreatorProp);
    }, [isCreatorProp]);

    /**
     * Efecto para obtener los nombres reales de los participantes/equipos
     * y formatearlos para su uso en selectores y displays.
     * Se ejecuta cuando `torneoInfo` cambia.
     */
    useEffect(() => {
        async function fetchNombresParticipantes() {
            if (!torneoInfo || !Array.isArray(torneoInfo.participantes)) return;

            const participantesRaw = torneoInfo.participantes;
            const participantesFormateados = await Promise.all(participantesRaw.map(async p => {
                if (typeof p === 'object' && p !== null) { // Si es un objeto (representa un equipo)
                    const idVal = p.id || p.capitan; // Usa el ID del equipo o el ID del capitán
                    const nameVal = p.nombre || (idVal ? `Equipo (${String(idVal).substring(0, 6)}...)` : 'Equipo Desc.');
                    if (idVal) {
                        return { id: String(idVal), nombre: String(nameVal) };
                    }
                } else if (typeof p === 'string' && p) { // Si es un string (representa un participante individual por UID)
                    try {
                        const userDoc = await getDoc(doc(db, "usuarios", p));
                        if (userDoc.exists()) {
                            // Obtiene el nombre real o email del usuario
                            const nombreReal = userDoc.data().nombre || userDoc.data().email || `Jugador (${String(p).substring(0, 6)}...)`;
                            return { id: String(p), nombre: nombreReal };
                        }
                    } catch (e) {
                       console.warn(`[Clasificacion.js] No se pudo obtener el nombre de usuario para el ID ${p}:`, e)
                    }
                    return { id: String(p), nombre: `Jugador (${String(p).substring(0, 6)}...)` };
                }
                return null;
            }));
            setParticipantes(participantesFormateados.filter(p => p && p.id && p.nombre));
        }
        fetchNombresParticipantes();
    }, [torneoInfo]);

    /**
     * Efecto para escuchar los cambios en la información del torneo en tiempo real.
     * Se suscribe al documento del torneo y actualiza los estados relevantes.
     */
    useEffect(() => {
        if (!torneoId) {
            setLoading(false);
            console.error("[Clasificacion.js] ID de torneo no definido.");
            return;
        }
        setLoading(true);
        const torneoRef = doc(db, "torneos", torneoId);

        // Suscripción en tiempo real a los datos del torneo
        const unsubscribeTorneo = onSnapshot(torneoRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTorneoInfo(data); // Guarda la información completa del torneo
                setTipoTorneo(data.tipo); // Establece el tipo de torneo ('liga' o 'torneo')

                // Formatea la lista de participantes directamente aquí también para mayor reactividad
                const participantesRaw = data.participantes || [];
                const participantesFormateados = participantesRaw.map(p => {
                    if (typeof p === 'object' && p !== null) {
                        const idVal = p.id || p.capitan;
                        const nameVal = p.nombre || (idVal ? `Equipo (${String(idVal).substring(0, 6)}...)` : 'Equipo Desc.');
                        if (idVal) {
                            return { id: String(idVal), nombre: String(nameVal) };
                        }
                    } else if (typeof p === 'string' && p) {
                        return { id: String(p), nombre: `Jugador (${String(p).substring(0, 6)}...)` };
                    }
                    return null;
                }).filter(p => p && p.id && p.nombre);

                setParticipantes(participantesFormateados);

                // Determina el número de participantes para la generación del bracket (solo para torneos de eliminación)
                const num = Number(data.numEquipos) || 0;
                if (data.tipo === "torneo") { // Si es un torneo de eliminación (bracket)
                    // El número de participantes debe ser una potencia de 2
                    if (num > 0 && Number.isInteger(Math.log2(num))) { 
                        setNumParticipantes(num);
                    } else {
                        setNumParticipantes(0);
                        console.warn("[Clasificacion.js] Número de participantes para 'torneo' no es potencia de 2 o es 0.");
                    }
                } else { // Si es de tipo liga, no se usa bracket
                    setNumParticipantes(0);
                }
            } else {
                // Si el torneo no se encuentra, se resetean los estados
                console.error("[Clasificacion.js] Torneo no encontrado con ID:", torneoId);
                setTorneoInfo(null); setTipoTorneo(null); setParticipantes([]); setNumParticipantes(0);
            }
            setLoading(false); // Desactiva el estado de carga
        }, (error) => {
            console.error("[Clasificacion.js] Error al obtener snapshot del torneo:", error);
            setLoading(false);
        });
        return () => unsubscribeTorneo(); // Función de limpieza al desmontar el componente
    }, [torneoId]);

    /**
     * Efecto para escuchar los cambios en los partidos del calendario del torneo en tiempo real.
     * Actualiza la lista de `rawPartidos`.
     */
    useEffect(() => {
        if (!torneoId) return;
        const partidosRef = collection(db, `torneos/${torneoId}/calendario`);
        // Suscripción en tiempo real a los partidos
        const unsubscribePartidos = onSnapshot(partidosRef, (snapshot) => {
            const fetchedPartidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            // Ordena los partidos por fecha y hora para una visualización consistente
            fetchedPartidos.sort((a, b) => {
                const dateA = new Date(`${a.fecha}T${a.hora || "00:00:00"}`);
                const dateB = new Date(`${b.fecha}T${b.hora || "00:00:00"}`);
                return dateA - dateB;
            });
            setRawPartidos(fetchedPartidos); // Guarda los partidos sin procesar
        }, (error) => {
            console.error("[Clasificacion.js] Error al obtener snapshot de partidos:", error);
            setRawPartidos([]);
        });
        return () => unsubscribePartidos(); // Función de limpieza
    }, [torneoId]);

    /**
     * Memoiza los IDs de los equipos/participantes que han sido eliminados en un torneo de eliminación directa.
     * Se usa para filtrar los participantes disponibles en la selección de equipos de las primeras rondas.
     */
    const eliminatedTeamIds = useMemo(() => {
        const losers = new Set();
        rawPartidos.forEach(p => {
            if (p.resultado && p.resultado.includes('-')) {
                const [s1, s2] = p.resultado.split('-').map(Number);
                if (!isNaN(s1) && !isNaN(s2)) {
                    if (s1 < s2 && p.localId) losers.add(String(p.localId)); // El local pierde
                    else if (s2 < s1 && p.visitanteId) losers.add(String(p.visitanteId)); // El visitante pierde
                }
            }
        });
        return losers;
    }, [rawPartidos]);

    /**
     * Memoiza la lista de participantes disponibles para los selectores de equipos en los modales.
     * Filtra los equipos/participantes que ya han sido eliminados del bracket.
     */
    const availableParticipantsForDropdown = useMemo(() => {
        const unavailableTeamIds = new Set(eliminatedTeamIds); // Equipos ya eliminados

        // Lógica específica para la Ronda 1 del bracket si el usuario es creador
        // Esto evita que los equipos ya asignados a otros partidos de Ronda 1 o eliminados aparezcan dos veces.
        const currentMatchIsRound1 = selectedMatchSeed?.tournamentRoundText === "Ronda 1";

        if (currentMatchIsRound1 && isCreator) {
            const currentEditingBracketMatchId = selectedMatchSeed?.id ? String(selectedMatchSeed.id) : null;

            rawPartidos.forEach(partido => {
                const partidoBracketIdStr = String(partido.bracketMatchId);
                let isPartidoPorRonda1 = false;
                let isPartidoPorLaterRound = false;

                if (numParticipantes > 0 && Number.isInteger(Math.log2(numParticipantes))) {
                    const firstRoundMatchCount = numParticipantes / 2;
                    const pBracketIdNumeric = parseInt(partidoBracketIdStr, 10);

                    if (!isNaN(pBracketIdNumeric)) {
                        if (pBracketIdNumeric >= 1 && pBracketIdNumeric <= firstRoundMatchCount) {
                            isPartidoPorRonda1 = true; // El partido es de la primera ronda
                        } else if (pBracketIdNumeric > firstRoundMatchCount) {
                            isPartidoPorLaterRound = true; // El partido es de una ronda posterior a la primera
                        }
                    }
                }

                // Si el partido es de una ronda posterior a la 1, sus equipos ya no están disponibles para la selección
                if (isPartidoPorLaterRound) {
                    if (partido.localId) unavailableTeamIds.add(String(partido.localId));
                    if (partido.visitanteId) unavailableTeamIds.add(String(partido.visitanteId));
                }

                // Si el partido es de la Ronda 1
                if (isPartidoPorRonda1) {
                    // Si el partido ya tiene resultado, el ganador es el único que pasa, el perdedor es "eliminado"
                    if (partido.resultado && partido.resultado.includes('-')) {
                        const [s1, s2] = partido.resultado.split('-').map(Number);
                        if (!isNaN(s1) && !isNaN(s2)) {
                            if (s1 > s2 && partido.localId) {
                                unavailableTeamIds.add(String(partido.visitanteId)); // Si el local gana, el visitante es eliminado
                            } else if (s2 > s1 && partido.visitanteId) {
                                unavailableTeamIds.add(String(partido.localId)); // Si el visitante gana, el local es eliminado
                            }
                        }
                    }

                    // Si no es el partido que se está editando actualmente, sus equipos ya no están disponibles
                    // (ya están asignados a otro partido de primera ronda)
                    if (partidoBracketIdStr !== currentEditingBracketMatchId) {
                        if (partido.localId) unavailableTeamIds.add(String(partido.localId));
                        if (partido.visitanteId) unavailableTeamIds.add(String(partido.visitanteId));
                    }
                }
            });
        }
        // Filtra los participantes originales para devolver solo los que están disponibles
        return participantes.filter(p => p && p.id && !unavailableTeamIds.has(String(p.id)));
    }, [participantes, eliminatedTeamIds, rawPartidos, selectedMatchSeed, numParticipantes, isCreator]);

    /**
     * Función `useCallback` para abrir un modal específico.
     * @param {string} modalName - El nombre del modal a abrir (ej., 'matchForm').
     */
    const openModal = useCallback((modalName) => {
        setModalStates(prev => ({ ...prev, [modalName]: true }));
    }, []);

    /**
     * Función `useCallback` para cerrar un modal específico y resetear estados relacionados.
     * @param {string} modalName - El nombre del modal a cerrar.
     */
    const closeModal = useCallback((modalName) => {
        setModalStates(prev => ({ ...prev, [modalName]: false }));
        // Resetea los estados del formulario/selección al cerrar los modales
        if (modalName === 'matchForm') {
            setFormData(initialFormData);
            setSelectedMatchSeed(null);
        } else if (modalName === 'resultForm') {
            setLocalScore("");
            setVisitanteScore("");
            setSelectedResultPartido(null);
        } else if (modalName === 'info') {
            setSelectedMatchSeed(null);
        }
    }, []);

    /**
     * Función `useCallback` para manejar los cambios en los inputs genéricos del formulario.
     * @param {object} e - El evento de cambio.
     */
    const handleFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }, []);

    /**
     * Función `useCallback` para manejar los cambios en los selectores de equipo/participante.
     * @param {object} e - El evento de cambio (del elemento select).
     * @param {string} teamType - 'local' o 'visitante'.
     */
    const handleSelectChange = useCallback((e, teamType) => {
        const { value } = e.target;
        // Busca el participante seleccionado por su ID
        const selectedParticipant = participantes.find((p) => String(p.id) === String(value));
        setFormData((prev) => ({
            ...prev,
            [`${teamType}Id`]: value, // Guarda el ID
            [`${teamType}`]: selectedParticipant ? selectedParticipant.nombre : "", // Guarda el nombre
        }));
    }, [participantes]);

    /**
     * Manejador para el envío del formulario de un partido (definir o modificar).
     * Realiza validaciones y actualiza/crea el partido en Firestore.
     */
    const handleMatchSubmit = async (e) => {
        e.preventDefault();
        // Validaciones de permisos y campos obligatorios
        if (!isCreator) {
            alert("Solo el creador del torneo puede guardar partidos.");
            closeModal('matchForm');
            return;
        }
        if (!selectedMatchSeed?.id) {
            alert("Error: No se ha seleccionado una casilla de llave (bracketMatchId perdido).");
            return;
        }
        if (!formData.fecha || !formData.hora) {
            alert("La fecha y la hora son obligatorias.");
            return;
        }

        // Validación de fecha: no puede ser un año irreal (ej. 0022) o anterior a hoy.
        const today = new Date();
        today.setHours(0,0,0,0); // Establece la hora a 00:00:00 para comparar solo la fecha.
        const selectedDate = new Date(formData.fecha);

        // Comprueba si la fecha es inválida o si el año es irrealmente bajo/alto
        if (isNaN(selectedDate.getTime()) || selectedDate.getFullYear() < 1000 || selectedDate.getFullYear() > 9999) {
            alert("Por favor, introduce una fecha válida (año entre 1000 y 9999).");
            return;
        }
        // Comprueba si la fecha seleccionada es anterior al día de hoy.
        if (selectedDate < today) {
            alert("La fecha no puede ser anterior a hoy.");
            return;
        }

        const isRound1 = selectedMatchSeed?.tournamentRoundText === "Ronda 1";
        const teamsNotSetInFormForNewMatch = !formData.localId || !formData.visitanteId;
        // Determina si se permite la selección de equipos en el formulario (solo para partidos nuevos de Ronda 1)
        const allowTeamSelectionForRound1 = isRound1 && !formData.existingPartidoId && teamsNotSetInFormForNewMatch;

        if (allowTeamSelectionForRound1 && (!formData.localId || !formData.visitanteId)) {
            alert("Por favor, selecciona ambos equipos para este partido de Ronda 1.");
            return;
        }
        // Valida que el equipo local y visitante no sean el mismo.
        if (formData.localId && formData.visitanteId && formData.localId === formData.visitanteId) {
            alert("El equipo local y visitante no pueden ser el mismo.");
            return;
        }

        // Asigna los nombres y IDs de los equipos/participantes
        let localTeamName = formData.local;
        let visitanteTeamName = formData.visitante;
        let localTeamId = formData.localId;
        let visitanteTeamId = formData.visitanteId; // Corregido: Esto estaba mal, debería ser formData.visitanteId

        // Asegura que los nombres de los equipos se actualicen si se seleccionan por ID y el nombre estaba vacío
        if (formData.localId && !formData.local) {
            const tempLocal = participantes.find(p => String(p.id) === String(formData.localId));
            if (tempLocal) localTeamName = tempLocal.nombre;
        }
        if (formData.visitanteId && !formData.visitante) {
            const tempVisitante = participantes.find(p => String(p.id) === String(formData.visitanteId));
            if (tempVisitante) visitanteTeamName = tempVisitante.nombre;
        }

        // Objeto con los datos del partido a guardar/actualizar en Firestore
        const matchData = {
            fecha: formData.fecha,
            hora: formData.hora,
            localId: localTeamId || null,
            visitanteId: visitanteTeamId || null,
            local: localTeamName || "Por determinar",
            visitante: visitanteTeamName || "Por determinar",
            bracketMatchId: String(selectedMatchSeed.id), // ID de la casilla del bracket
        };

        let actionType = ""; // Tipo de acción: 'crear' o 'modificar'
        let partidoIdParaNovedad = formData.existingPartidoId; // ID del partido para la novedad

        try {
            if (formData.existingPartidoId) { // Si el formulario indica que se está modificando un partido existente
                actionType = "modificar";
                const partidoRef = doc(db, `torneos/${torneoId}/calendario`, formData.existingPartidoId);
                await updateDoc(partidoRef, matchData);
            } else { // Si es un partido nuevo
                actionType = "crear";
                // Busca si ya existe un partido en Firestore asociado a esta casilla del bracket (para evitar duplicados)
                const existingMatchForBracket = rawPartidos.find(p => String(p.bracketMatchId) === String(selectedMatchSeed.id));
                if (existingMatchForBracket) { // Si ya existe, lo actualiza en lugar de crear uno nuevo
                    partidoIdParaNovedad = existingMatchForBracket.id;
                    const partidoRef = doc(db, `torneos/${torneoId}/calendario`, existingMatchForBracket.id);
                    await updateDoc(partidoRef, matchData);
                } else { // Si no existe, crea un nuevo documento de partido
                    const newDocRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), {
                        ...matchData,
                        resultado: null, // Inicializa el resultado como nulo
                        createdAt: serverTimestamp() // Marca de tiempo de creación
                    });
                    partidoIdParaNovedad = newDocRef.id;
                }
            }
            // Agrega una novedad al torneo informando sobre la creación o actualización del partido
            await agregarNovedad(
                torneoId,
                `Partido (Llave: ${matchData.bracketMatchId}) entre ${matchData.local} y ${matchData.visitante} ${actionType === 'crear' ? 'programado para' : 'actualizado a'} ${matchData.fecha} ${matchData.hora}.`,
                actionType === 'crear' ? 'match_add' : 'match_schedule_update',
                {
                    partidoId: partidoIdParaNovedad,
                    local: matchData.local,
                    visitante: matchData.visitante,
                    fecha: matchData.fecha,
                    hora: matchData.hora,
                    bracketMatchId: matchData.bracketMatchId
                }
            );
            closeModal('matchForm'); // Cierra el modal del formulario de partido
        } catch (error) {
            console.error(`[Clasificacion.js] Error al ${actionType} el partido:`, error);
            alert(`Error al ${actionType} el partido.`);
        }
    };

    /**
     * Manejador para el envío del formulario de resultado de un partido.
     * Realiza validaciones y actualiza el resultado en Firestore.
     */
    const handleResultSubmit = async (e) => {
        e.preventDefault();
        // Validaciones de permisos y campos obligatorios
        if (!isCreator) {
            alert("Solo el creador del torneo puede guardar resultados.");
            closeModal('resultForm');
            return;
        }
        if (!selectedResultPartido?.id || localScore === "" || visitanteScore === "") {
            alert("Datos incompletos para guardar el resultado. Introduce ambos puntajes.");
            return;
        }
        const score1 = parseInt(localScore, 10);
        const score2 = parseInt(visitanteScore, 10);

        // Validaciones de puntuación
        if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
            alert("Puntajes inválidos. Deben ser números no negativos.");
            return;
        }
        // Validación específica para torneos de eliminación: no se permiten empates
        if (score1 === score2 && tipoTorneo === 'torneo') {
            alert("En torneos de eliminatoria, los empates no suelen ser válidos para avanzar. Determina un ganador.");
            return;
        }
        const resultadoFinal = `${score1}-${score2}`;
        try {
            const partidoRef = doc(db, `torneos/${torneoId}/calendario`, selectedResultPartido.id);
            await updateDoc(partidoRef, { resultado: resultadoFinal }); // Actualiza el resultado del partido
            // Agrega una novedad informando sobre el resultado
            await agregarNovedad(torneoId, `Resultado actualizado para ${selectedResultPartido.local} vs ${selectedResultPartido.visitante}: ${resultadoFinal}. (Llave: ${selectedResultPartido.bracketMatchId || 'N/A'})`, 'match_result', { partidoId: selectedResultPartido.id, local: selectedResultPartido.local, visitante: selectedResultPartido.visitante, resultado: resultadoFinal, bracketMatchId: selectedResultPartido.bracketMatchId });
            closeModal('resultForm'); // Cierra el modal de resultado
        } catch (error) {
            console.error("[Clasificacion.js] Error al guardar resultado:", error);
            alert("Error al guardar el resultado.");
        }
    };

    /**
     * Manejador para el clic en una casilla del bracket (Llave).
     * Abre el modal de información o el formulario para definir/modificar el partido, dependiendo del rol del usuario.
     */
    const handleBracketClick = useCallback((seedFromLlaves) => {
        // Busca si ya existe un partido en Firestore asociado a esta casilla del bracket
        const firestorePartido = rawPartidos.find(p => String(p.bracketMatchId) === String(seedFromLlaves.id));

        if (isCreator) { // Si el usuario es el creador del torneo
            if (firestorePartido) { // Si el partido ya existe en Firestore, muestra su información
                const combinedInfo = { ...seedFromLlaves, ...firestorePartido, id: firestorePartido.id, bracketMatchId: firestorePartido.bracketMatchId || String(seedFromLlaves.id), };
                setSelectedMatchSeed(combinedInfo);
                openModal('info'); // Abre el modal de información del partido
            } else { // Si el partido no existe, permite crear uno nuevo en esa casilla
                const localTeamInSeed = seedFromLlaves.teams?.[0];
                const visitanteTeamInSeed = seedFromLlaves.teams?.[1];
                setSelectedMatchSeed(seedFromLlaves);
                setFormData({
                    ...initialFormData,
                    localId: localTeamInSeed?.id || "",
                    visitanteId: visitanteTeamInSeed?.id || "",
                    local: localTeamInSeed?.name || "Por determinar",
                    visitante: visitanteTeamInSeed?.name || "Por determinar",
                    existingPartidoId: null
                });
                openModal('matchForm'); // Abre el modal para definir el partido
            }
        } else { // Si el usuario NO es el creador, solo puede ver la información
            const baseInfo = {
                ...seedFromLlaves,
                local: seedFromLlaves.teams?.[0]?.name || "Por determinar",
                visitante: seedFromLlaves.teams?.[1]?.name || "Por determinar",
                fecha: "Por definir",
                hora: "Por definir",
                bracketMatchId: String(seedFromLlaves.id),
            };
            // Combina la información de la semilla con los datos del partido de Firestore si existe
            if (firestorePartido) {
                const combinedInfo = { ...baseInfo, ...firestorePartido, id: firestorePartido.id };
                setSelectedMatchSeed(combinedInfo);
            } else {
                setSelectedMatchSeed(baseInfo);
            }
            openModal('info'); // Abre el modal de información
        }
    }, [rawPartidos, openModal, isCreator, participantes]);

    /**
     * Manejador para el clic en el botón de modificar partido dentro de un SeedItem.
     * Solo disponible para el creador. Abre el modal de formulario pre-llenado.
     */
    const handleModifyClick = useCallback((seedFromLlaves) => {
        if (!isCreator) {
            alert("Solo el creador del torneo puede modificar partidos.");
            return;
        }
        // Busca el partido en Firestore usando el ID del partido y el ID del bracket match
        const partidoEnFirestore = rawPartidos.find(p => p.id === seedFromLlaves.partidoId && String(p.bracketMatchId) === String(seedFromLlaves.id));
        if (partidoEnFirestore) {
            setSelectedMatchSeed(seedFromLlaves);
            // Carga los datos existentes en el formulario
            setFormData({ fecha: partidoEnFirestore.fecha === "Por definir" ? "" : partidoEnFirestore.fecha || "", hora: partidoEnFirestore.hora === "Por definir" ? "" : partidoEnFirestore.hora || "", localId: partidoEnFirestore.localId || seedFromLlaves.teams?.[0]?.id || "", visitanteId: partidoEnFirestore.visitanteId || seedFromLlaves.teams?.[1]?.id || "", local: partidoEnFirestore.local || seedFromLlaves.teams?.[0]?.name || "Por determinar", visitante: partidoEnFirestore.visitante || seedFromLlaves.teams?.[1]?.name || "Por determinar", existingPartidoId: partidoEnFirestore.id });
            openModal('matchForm'); // Abre el modal de modificación
        } else {
            // Si no se encuentra un partido definitivo en Firestore, se advierte y se abre el formulario como si fuera uno nuevo
            console.warn("[Clasificacion.js] Se hizo clic en modificar, pero no se encontró un partido definitivo en Firestore. Abriendo formulario para nueva entrada. Semilla:", seedFromLlaves);
            const localTeamInSeed = seedFromLlaves.teams?.[0];
            const visitanteTeamInSeed = seedFromLlaves.teams?.[1];
            setSelectedMatchSeed(seedFromLlaves);
            setFormData({ ...initialFormData, localId: localTeamInSeed?.id || "", visitanteId: visitanteTeamInSeed?.id || "", local: localTeamInSeed?.name || "Por determinar", visitante: visitanteTeamInSeed?.name || "Por determinar", existingPartidoId: null });
            openModal('matchForm');
        }
    }, [rawPartidos, openModal, isCreator, participantes]);

    /**
     * Manejador para el clic en el botón de añadir resultado dentro de un SeedItem.
     * Solo disponible para el creador. Crea el partido en Firestore si no existe y abre el modal de resultados.
     */
    const handleAddResultClick = useCallback(async (seedFromLlaves) => {
        if (!isCreator) {
            alert("Solo el creador del torneo puede añadir resultados.");
            return;
        }
        // Busca el partido en Firestore asociado a la casilla del bracket
        let partidoParaResultado = rawPartidos.find(p => String(p.bracketMatchId) === String(seedFromLlaves.id));
        let firestoreDocIdToUse = partidoParaResultado?.id;

        // Si no existe un partido en Firestore pero los equipos en la semilla están definidos, lo crea implícitamente
        if (!partidoParaResultado && seedFromLlaves.teams?.[0]?.id && seedFromLlaves.teams?.[1]?.id) {
            const localTeamName = seedFromLlaves.teams[0].name;
            const visitanteTeamName = seedFromLlaves.teams[1].name;
            if (localTeamName && visitanteTeamName && localTeamName !== "Por determinar" && visitanteTeamName !== "Por determinar") {
                try {
                const newPartidoData = { fecha: "Por definir", hora: "Por definir", localId: String(seedFromLlaves.teams[0].id), visitanteId: String(seedFromLlaves.teams[1].id), local: localTeamName, visitante: visitanteTeamName, bracketMatchId: String(seedFromLlaves.id), resultado: null, createdAt: serverTimestamp(), };
                const newPartidoRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), newPartidoData);
                firestoreDocIdToUse = newPartidoRef.id;
                partidoParaResultado = { id: firestoreDocIdToUse, ...newPartidoData };
                // Agrega novedad para el partido creado automáticamente
                await agregarNovedad(torneoId, `Partido (Llave: ${newPartidoData.bracketMatchId}) entre ${newPartidoData.local} y ${newPartidoData.visitante} definido automáticamente y listo para resultado.`, 'match_auto_add', { partidoId: firestoreDocIdToUse, local: newPartidoData.local, visitante: newPartidoData.visitante, bracketMatchId: newPartidoData.bracketMatchId });
                } catch (error) { console.error("[Clasificacion.js] Error al crear implícitamente el partido para el resultado:", error); alert("Error al preparar automáticamente el partido para el resultado."); return; }
            } else { alert("Error: Los equipos para este partido de la llave aún no están completamente definidos ('Por determinar')."); return; }
        } else if (!partidoParaResultado) { alert("Define los participantes y el horario de este partido en la llave antes de añadir un resultado."); return; }

        if (partidoParaResultado && firestoreDocIdToUse) {
            // Prepara el objeto partido para el modal de resultados
            const finalPartidoObjectForModal = { ...seedFromLlaves, ...partidoParaResultado, id: firestoreDocIdToUse, bracketMatchId: partidoParaResultado.bracketMatchId || String(seedFromLlaves.id) };
            setSelectedResultPartido(finalPartidoObjectForModal);
            // Carga los scores existentes si los hay
            if (finalPartidoObjectForModal.resultado && finalPartidoObjectForModal.resultado.includes('-')) { const [s1, s2] = finalPartidoObjectForModal.resultado.split('-'); setLocalScore(s1); setVisitanteScore(s2); } else { setLocalScore(""); setVisitanteScore(""); }
            openModal('resultForm'); // Abre el modal de resultados
        } else { alert("No se pudo preparar el partido para añadir resultado."); }
    }, [rawPartidos, torneoId, openModal, agregarNovedad, isCreator]);

    /**
     * Alterna el modo de vista de pantalla completa.
     */
    const toggleViewMode = () => setIsViewMode(!isViewMode);

    /**
     * Manejador para descargar la clasificación/llaves como imagen PNG.
     * Utiliza la librería html2canvas.
     */
    const handleDownloadImage = async () => {
        const elementToCapture = contentRef.current; // Elemento HTML a capturar
        if (elementToCapture && typeof html2canvas === 'function') { // Verifica que el elemento y la función html2canvas estén disponibles
        try {
            // Define el color de fondo del canvas según el tipo de torneo o modo de vista
            const canvasBackgroundColor = tipoTorneo === "torneo" ? '#0c0c0c' : (isViewMode ? '#0c0c0c' : '#121212');
            const canvas = await html2canvas(elementToCapture, { backgroundColor: canvasBackgroundColor, scale: 2, useCORS: true, });
            const image = canvas.toDataURL("image/png", 1.0); // Convierte el canvas a imagen PNG
            const link = document.createElement("a"); // Crea un enlace de descarga
            link.href = image;
            // Define el nombre del archivo según el tipo de torneo
            link.download = tipoTorneo === "torneo" ? "llaves_torneo.png" : "tabla_clasificacion.png"; 
            document.body.appendChild(link); // Añade el enlace al DOM
            link.click(); // Simula el clic en el enlace para iniciar la descarga
            document.body.removeChild(link); // Elimina el enlace del DOM
        } catch (error) { 
            console.error("[Clasificacion.js] Error al generar la imagen:", error); 
            alert("Hubo un error al generar la imagen."); 
        }
        } else if (!elementToCapture) { 
            alert("No hay contenido para descargar."); 
        }
        else if (typeof html2canvas !== 'function') { 
            alert("Librería html2canvas no cargada."); 
        }
    };

    // Muestra un mensaje de carga si los datos aún están cargando
    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#e0e0e0', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>Cargando información del torneo...</div>;

    // Renderiza la vista en pantalla completa si el `isViewMode` está activo
    if (isViewMode) {
        // Define el color de fondo para el modo de vista.
        const viewModeBackground = tipoTorneo === "torneo" ? '#0c0c0c' : '#0c0c0c'; 
        return (
            <div className="clasificacion-view-mode" style={{ backgroundColor: viewModeBackground, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden'}}>
                <div ref={contentRef} className="clasificacion-view-mode-content" style={{ transform: 'scale(0.9)', transformOrigin: 'top center', width: '100%', height: '100%', padding: '20px', boxSizing: 'border-box'}}>
                    {/* Renderiza el componente Llaves si es un torneo de eliminación y hay participantes */}
                    {tipoTorneo === "torneo" && numParticipantes > 0 && ( 
                        <Llaves
                            numParticipantes={numParticipantes}
                            rawPartidos={rawPartidos}
                            onMatchClick={() => {}} // Desactiva la interacción en modo vista
                            onModify={() => {}} // Desactiva la modificación en modo vista
                            onAddResult={() => {}} // Desactiva la adición de resultados en modo vista
                            isCreator={false} // Siempre false en modo vista
                            isViewMode={true} // Indica que está en modo vista
                        />
                    )}
                    {/* Renderiza la Tabla de clasificación si es un torneo de liga */}
                    {tipoTorneo === "liga" && ( 
                        <div className="tabla-wrapper-for-view-mode">
                            <Tabla rawPartidos={rawPartidos} participantes={participantes} isViewMode={true} />
                        </div>
                    )}
                </div>
                {/* Controles del modo vista (botón de salir y de descargar) */}
                <div className="clasificacion-view-mode-controls">
                    <button onClick={toggleViewMode} className="view-mode-button" title="Salir de pantalla completa"><FaEye style={{ transform: 'scaleX(-1)' }} /></button>
                    <button onClick={handleDownloadImage} className="download-button" title="Descargar imagen"><FaDownload /></button>
                </div>
            </div>
        );
    }

    // Lógica para determinar si se permite la selección de equipos en la Ronda 1 del formulario (para nuevos partidos)
    const isRound1 = selectedMatchSeed?.tournamentRoundText === "Ronda 1";
    const teamsNotSetInForm = !formData.localId || !formData.visitanteId;
    const allowTeamSelectionForRound1 = isCreator && isRound1 && !formData.existingPartidoId && teamsNotSetInForm;

    // Renderizado principal del componente Clasificación
    return (
        <div className="clasificacion-container">
            <div ref={contentRef}>
                {/* Renderiza el componente Llaves si es un torneo de eliminación y hay participantes */}
                {tipoTorneo === "torneo" && numParticipantes > 0 && ( 
                    <Llaves
                        numParticipantes={numParticipantes}
                        rawPartidos={rawPartidos}
                        onMatchClick={handleBracketClick}
                        onModify={isCreator ? handleModifyClick : () => { if(!isCreator) alert("Solo el creador puede modificar.");}} // Habilitado solo para el creador
                        onAddResult={isCreator ? handleAddResultClick : () => { if(!isCreator) alert("Solo el creador puede añadir resultados.");}} // Habilitado solo para el creador
                        isCreator={isCreator}
                    />
                )}
                {/* Renderiza la Tabla de clasificación si es un torneo de liga */}
                {tipoTorneo === "liga" && ( 
                    <Tabla rawPartidos={rawPartidos} participantes={participantes} />
                )}
            </div>

            {/* Contenedor de botones de acción (ver en pantalla completa y descargar imagen) */}
            {((tipoTorneo === "torneo" && numParticipantes > 0) || tipoTorneo === "liga") && !loading && (
                <div className="clasificacion-actions-container">
                    <button onClick={toggleViewMode} className="view-mode-button" title="Ver en pantalla completa"><FaEye /></button>
                    <button onClick={handleDownloadImage} className="download-button" title="Descargar imagen"><FaDownload /></button>
                </div>
            )}

            {/* Modal para definir/modificar un partido de llave */}
            <ReactModal
                isOpen={modalStates.matchForm}
                onRequestClose={() => closeModal('matchForm')}
                contentLabel="Definir o Modificar Partido de Llave"
            >
                <h3>{formData.existingPartidoId ? "Modificar Partido" : "Definir Partido"} (Llave: {selectedMatchSeed?.id || 'N/A'})</h3>
                <form onSubmit={handleMatchSubmit}>
                    {/* Sección para seleccionar equipos (solo si es Ronda 1 y se está creando un nuevo partido) */}
                    {allowTeamSelectionForRound1 ? ( 
                        <>
                            <div className="form-group">
                                <label htmlFor="localIdSelect">Local:</label>
                                <select id="localIdSelect" name="localId" value={formData.localId} onChange={(e) => handleSelectChange(e, 'local')} required className="form-input" >
                                    <option value="">Seleccionar Equipo/Jugador</option>
                                    {availableParticipantsForDropdown.map(p => (
                                        <option key={`local-${p.id}`} value={p.id} disabled={p.id === formData.visitanteId}>
                                            {p.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="visitanteIdSelect">Visitante:</label>
                                <select id="visitanteIdSelect" name="visitanteId" value={formData.visitanteId} onChange={(e) => handleSelectChange(e, 'visitante')} required className="form-input" >
                                    <option value="">Seleccionar Equipo/Jugador</option>
                                    {availableParticipantsForDropdown.map(p => (
                                        <option key={`visitante-${p.id}`} value={p.id} disabled={p.id === formData.localId}>
                                            {p.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : ( // Si no se permite la selección (equipos ya determinados por avance en el bracket o partido existente)
                        <>
                            <div className="form-group">
                                <label>Local:</label>
                                <input type="text" value={formData.local || "Por determinar"} disabled className="form-input"/>
                            </div>
                            <div className="form-group">
                                <label>Visitante:</label>
                                <input type="text" value={formData.visitante || "Por determinar"} disabled className="form-input"/>
                            </div>
                        </>
                    )}

                    {/* Mensajes informativos/de advertencia para el creador */}
                    {isCreator && !allowTeamSelectionForRound1 && !formData.existingPartidoId && (formData.local === "Por determinar" || formData.visitante === "Por determinar") && (
                        <p style={{fontSize: '0.9em', color: '#ffc107', marginBottom: '1rem', textAlign: 'center'}}>
                            Los equipos se asignarán automáticamente cuando avancen en las llaves.
                            Este formulario define fecha y hora.
                        </p>
                    )}
                    {allowTeamSelectionForRound1 && (
                        <p style={{fontSize: '0.9em', color: '#abdda4', marginBottom: '1rem', textAlign: 'center'}}>
                            Por favor, selecciona los equipos para este partido de Ronda 1.
                        </p>
                    )}
                    {/* Campo de selección de fecha (input type="date" nativo) */}
                    <div className="form-group">
                        <label htmlFor="fecha">Fecha:</label>
                        <input type="date" id="fecha" name="fecha" value={formData.fecha} onChange={handleFormChange} required className="form-input"/>
                    </div>
                    {/* Campo de selección de hora */}
                    <div className="form-group">
                        <label htmlFor="hora">Hora:</label>
                        <input type="time" id="hora" name="hora" value={formData.hora} onChange={handleFormChange} required className="form-input"/>
                    </div>
                    {/* Acciones del modal: guardar o cancelar */}
                    <div className="modal-actions">
                        <button type="submit" className="form-button primary">{formData.existingPartidoId ? "Actualizar Partido" : "Guardar Partido"}</button>
                        <button type="button" onClick={() => closeModal('matchForm')} className="form-button secondary">Cancelar</button>
                    </div>
                </form>
            </ReactModal>

            {/* Modal para añadir/modificar el resultado del partido */}
            <ReactModal
                isOpen={modalStates.resultForm}
                onRequestClose={() => closeModal('resultForm')}
                contentLabel="Añadir/Modificar Resultado del Partido"
            >
                <h3>Resultado: {selectedResultPartido?.local || "?"} vs {selectedResultPartido?.visitante || "?"}</h3>
                <p style={{textAlign: 'center', fontSize:'0.9em', color: '#aaa'}}>Llave: {selectedResultPartido?.bracketMatchId || selectedResultPartido?.id}</p>
                <form onSubmit={handleResultSubmit}>
                    <div className="form-group">
                        <label htmlFor="localScore">{selectedResultPartido?.local || "Local"}:</label>
                        <input type="number" id="localScore" name="localScore" value={localScore} onChange={(e) => setLocalScore(e.target.value)} min="0" required  className="form-input"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="visitanteScore">{selectedResultPartido?.visitante || "Visitante"}:</label>
                        <input type="number" id="visitanteScore" name="visitanteScore" value={visitanteScore} onChange={(e) => setVisitanteScore(e.target.value)} min="0" required className="form-input"/>
                    </div>
                    {/* Advertencia para empates en eliminatorias */}
                    {tipoTorneo === 'torneo' && localScore !== "" && visitanteScore !== "" && localScore === visitanteScore && (
                        <p style={{color: '#FF6D14', fontSize: '0.9em', textAlign: 'center'}}>Los empates no son válidos en eliminatorias.</p>
                    )}
                    <div className="modal-actions">
                        <button type="submit" className="form-button primary">Guardar Resultado</button>
                        <button type="button" onClick={() => closeModal('resultForm')} className="form-button secondary">Cancelar</button>
                    </div>
                </form>
            </ReactModal>

            {/* Modal de información del partido (solo vista, no editable) */}
            <ReactModal
                isOpen={modalStates.info}
                onRequestClose={() => closeModal('info')}
                contentLabel="Información del Partido"
                className="ReactModal__Content info-modal"
            >
                <h3>Información del Partido</h3>
                {selectedMatchSeed && (
                    <>
                        <p><strong>Local:</strong> {selectedMatchSeed.local || "Por determinar"} {selectedMatchSeed.resultado?.includes('-') ? ` (${selectedMatchSeed.resultado.split('-')[0]})` : ''} </p>
                        <p><strong>Visitante:</strong> {selectedMatchSeed.visitante || "Por determinar"} {selectedMatchSeed.resultado?.includes('-') ? ` (${selectedMatchSeed.resultado.split('-')[1]})` : ''} </p>
                        {selectedMatchSeed.resultado && (<p><strong>Resultado:</strong> {selectedMatchSeed.resultado}</p>)}
                        <p><strong>Fecha:</strong> {selectedMatchSeed.fecha || "Por definir"}</p>
                        <p><strong>Hora:</strong> {selectedMatchSeed.hora || "Por definir"}</p>
                        <hr/>
                        <p><small>ID Casilla (Llave): {selectedMatchSeed.bracketMatchId || (typeof selectedMatchSeed.id === 'number' || selectedMatchSeed.id?.toString().startsWith('Partido') ? selectedMatchSeed.id : 'N/A')} </small></p>
                        {selectedMatchSeed.id && !(typeof selectedMatchSeed.id === 'number' || selectedMatchSeed.id?.toString().startsWith('Partido') || selectedMatchSeed.id === selectedMatchSeed.bracketMatchId) &&
                            <p><small>ID Partido (BD): {selectedMatchSeed.id}</small></p>
                        }
                        {!selectedMatchSeed.id && selectedMatchSeed.partidoId &&
                            <p><small>ID Partido (BD): {selectedMatchSeed.partidoId}</small></p>
                        }
                        {isCreator && (!selectedMatchSeed.fecha || selectedMatchSeed.fecha === "Por definir") && (!rawPartidos.some(p => String(p.bracketMatchId) === String(selectedMatchSeed.bracketMatchId || selectedMatchSeed.id))) && (
                            <p style={{color: '#FFC107', fontSize: '0.9em', textAlign: 'center'}}>
                                Este partido de la llave aún no tiene fecha/hora asignada. <br/>
                                Cierra esta ventana y haz clic en la casilla de la llave para programarlo.
                            </p>
                        )}
                    </>
                )}
                <div className="modal-actions">
                    <button type="button" onClick={() => closeModal('info')} className="form-button secondary">Cerrar</button>
                </div>
            </ReactModal>

            {/* Mensajes para cuando el tipo de torneo no está reconocido o faltan participantes para el bracket */}
            {!loading && tipoTorneo !== "torneo" && tipoTorneo !== "liga" && ( <div style={{ padding: '20px', textAlign: 'center', color: '#e0e0e0' }}> <h2>Clasificación</h2> <p>Tipo de torneo no configurado o no reconocido.</p> </div> )}
            {!loading && tipoTorneo === "torneo" && numParticipantes === 0 && ( <div style={{ padding: '20px', textAlign: 'center', color: '#e0e0e0' }}> <h2>Clasificación - Eliminatoria</h2> <p>Para generar las llaves, el torneo debe tener un número de participantes que sea una potencia de 2. Configure el número de equipos en los ajustes.</p> </div> )}
        </div>
    );
}

export default Clasificacion;