// src/components/Calendario.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import "../components/estilos/Calendario.css";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    onSnapshot,
    deleteDoc,
    getDoc as firestoreGetDoc,
    updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa";
import { agregarNovedadConDebug } from "./utils/NovedadesUtils";

// Importaciones de librerías para fecha y hora
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Estilos para react-datepicker
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css'; // Estilos para react-time-picker
import 'react-clock/dist/Clock.css'; // Dependencia de react-time-picker para el reloj

// Importación de react-select
import Select from 'react-select';
import ReactModal from 'react-modal'; // IMPORTAR REACT-MODAL

const db = getFirestore(app);
const auth = getAuth(app);

// Configurar el elemento raíz para ReactModal (asegúrate de que tu div #root exista en index.html)
ReactModal.setAppElement("#root"); //

const generateBracketStructure = (numParticipants) => {
    if (!numParticipants || numParticipants < 2 || !Number.isInteger(Math.log2(numParticipants))) {
        console.warn("[Calendario.js] Invalid number of participants for single elimination bracket generation. Must be a power of 2 (>= 2).");
        return [];
    }
    const matches = [];
    let currentMatchId = 1;
    let matchesInRound = numParticipants / 2;
    let round = 1;

    while (matchesInRound >= 1) {
        const nextRoundMatchIdStart = currentMatchId + matchesInRound;
        for (let j = 0; j < matchesInRound; j++) {
            const matchId = currentMatchId + j;
            const nextMatchId = (matchesInRound > 1) ? nextRoundMatchIdStart + Math.floor(j / 2) : null;
            matches.push({
                id: matchId,
                name: `Partido ${matchId}`,
                nextMatchId: nextMatchId,
                tournamentRoundText: `Ronda ${round}`,
                participants: [
                    { id: null, name: "Por determinar" },
                    { id: null, name: "Por determinar" },
                ],
            });
        }
        currentMatchId += matchesInRound;
        matchesInRound /= 2;
        round++;
    }
    return matches;
};


function Calendario() {
    const { id: torneoId } = useParams();
    const [partidos, setPartidos] = useState([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [fechaPartido, setFechaPartido] = useState(null); // Changed to Date object for DatePicker
    const [horaPartido, setHoraPartido] = useState("00:00"); // String HH:mm for TimePicker
    const [equipoLocalId, setEquipoLocalId] = useState("");
    const [equipoVisitanteId, setEquipoVisitanteId] = useState("");
    const [torneoInfo, setTorneoInfo] = useState(null);
    const [user, setUser] = useState(null);
    const [participantesParaSeleccion, setParticipantesParaSeleccion] = useState([]);
    const [eliminatedParticipants, setEliminatedParticipants] = useState(new Set());
    const [numParticipantesBracket, setNumParticipantesBracket] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // NUEVOS ESTADOS PARA EL MODAL DE RESULTADO
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [selectedPartidoForScore, setSelectedPartidoForScore] = useState(null);
    const [localScore, setLocalScore] = useState("");
    const [visitanteScore, setVisitanteScore] = useState("");


    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            console.log("[Calendario.js] Auth state changed, currentUser:", currentUser ? currentUser.uid : "null");
            setUser(currentUser);
        });

        const fetchTorneoInfo = async () => {
            console.log(`[Calendario.js] Iniciando fetchTorneoInfo para torneoId: ${torneoId}`);
            const torneoDocRef = doc(db, "torneos", torneoId);
            const torneoSnapshot = await firestoreGetDoc(torneoDocRef);
            if (torneoSnapshot.exists()) {
                const data = torneoSnapshot.data();
                console.log("[Calendario.js] Torneo encontrado:", data);
                setTorneoInfo(data);

                if (data.tipo === "torneo") {
                    const num = Number(data.numEquipos) || 0;
                    if (num > 0 && Number.isInteger(Math.log2(num))) {
                        setNumParticipantesBracket(num);
                    } else {
                        setNumParticipantesBracket(0);
                        console.warn(`[Calendario.js] Número de equipos inválido o no es potencia de 2 (${num}) para eliminatoria.`);
                    }
                } else {
                    setNumParticipantesBracket(0);
                }

                const participantesRaw = data.participantes || [];
                const seleccionablesPromises = participantesRaw.map(async (p) => {
                    if (typeof p === "object" && p !== null) {
                        const id = p.id || p.capitan;
                        const displayNombre = p.nombre || `Equipo (Cap: ${p.capitan?.substring(0, 6)}...)`;
                        return { id: String(id), displayNombre, esEquipo: true };
                    } else if (typeof p === 'string' && p) {
                        // Fetch user data for individual participants
                        try {
                            const userDocRef = doc(db, "usuarios", p);
                            const userDocSnap = await firestoreGetDoc(userDocRef);
                            if (userDocSnap.exists()) {
                                const userData = userDocSnap.data();
                                const nombreReal = userData.nombre || userData.email || `Jugador (${String(p).substring(0, 6)}...)`;
                                return { id: String(p), displayNombre: nombreReal, esEquipo: false };
                            }
                        } catch (e) {
                            console.warn(`[Calendario.js] Error fetching user data for ${p}:`, e);
                        }
                        return { id: String(p), displayNombre: `Jugador (${String(p).substring(0, 6)}...)`, esEquipo: false };
                    }
                    return null;
                });

                const seleccionables = (await Promise.all(seleccionablesPromises)).filter(p => p && p.id);
                setParticipantesParaSeleccion(seleccionables);
                console.log("[Calendario.js] Participantes para selección:", seleccionables);

            } else {
                console.error("[Calendario.js] No se encontró el torneo con ID:", torneoId);
                setTorneoInfo(null);
                setParticipantesParaSeleccion([]);
            }
        };

        fetchTorneoInfo();

        const partidosCollection = collection(db, `torneos/${torneoId}/calendario`);
        const unsubscribePartidos = onSnapshot(partidosCollection, (snapshot) => {
            const nuevosPartidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            nuevosPartidos.sort((a, b) => {
                const dateA = new Date(`${a.fecha}T${a.hora || "00:00:00"}`);
                const dateB = new Date(`${b.fecha}T${b.hora || "00:00:00"}`);
                return dateA - dateB;
            });
            setPartidos(nuevosPartidos);
            console.log("[Calendario.js] Partidos actualizados:", nuevosPartidos);
        }, (error) => {
             console.error("[Calendario.js] Error escuchando partidos:", error);
             setPartidos([]);
        });

        return () => {
            unsubscribeAuth();
            unsubscribePartidos();
        };
    }, [torneoId]);


    const initialBracketStructureCalendario = useMemo(() => {
        if (torneoInfo?.tipo === "torneo" && numParticipantesBracket > 0) {
            return generateBracketStructure(numParticipantesBracket);
        }
        return [];
    }, [numParticipantesBracket, torneoInfo?.tipo]);


    useEffect(() => {
        if (torneoInfo?.tipo === "torneo" && initialBracketStructureCalendario.length > 0 && partidos.length > 0) {
            const eliminated = new Set();
            const rawPartidosByBracketId = partidos.reduce((acc, partido) => {
                if (partido.bracketMatchId !== undefined && partido.bracketMatchId !== null && Number.isInteger(Number(partido.bracketMatchId))) {
                    acc[Number(partido.bracketMatchId)] = partido;
                }
                return acc;
            }, {});

            initialBracketStructureCalendario.forEach(matchDeLlave => {
                const partidoFirestore = rawPartidosByBracketId[matchDeLlave.id];

                if (partidoFirestore?.resultado && partidoFirestore.resultado.includes('-')) {
                    const [score1, score2] = partidoFirestore.resultado.split("-").map(Number);

                    if (!isNaN(score1) && !isNaN(score2)) {
                        let loserId = null;
                        if (score1 > score2) loserId = partidoFirestore.visitanteId;
                        else if (score2 > score1) loserId = partidoFirestore.localId;

                        if (loserId && matchDeLlave.nextMatchId !== null) {
                            eliminated.add(String(loserId));
                        }
                    }
                }
            });
            setEliminatedParticipants(eliminated);
            console.log("[Calendario.js] Participantes eliminados (modo torneo):", Array.from(eliminated));
        } else {
            setEliminatedParticipants(new Set());
        }
    }, [partidos, torneoInfo?.tipo, numParticipantesBracket, initialBracketStructureCalendario]);


    const handleMostrarFormulario = () => {
        setMostrarFormulario(true);
    };

    const handleCerrarFormulario = () => {
        setMostrarFormulario(false);
        setFechaPartido(null); // Reset to null
        setHoraPartido("00:00"); // Reset time
        setEquipoLocalId("");
        setEquipoVisitanteId("");
    };

    const handleAgregarPartido = async (e) => {
        e.preventDefault();
        // Validar que fechaPartido es un Date object válido
        if (!fechaPartido || !horaPartido || !equipoLocalId || !equipoVisitanteId || !(fechaPartido instanceof Date && !isNaN(fechaPartido))) {
            alert("Por favor, rellena la fecha, hora, local y visitante correctamente.");
            return;
        }
        if (equipoLocalId === equipoVisitanteId) {
            alert("El participante local y visitante no pueden ser el mismo.");
            return;
        }
        setIsSubmitting(true);

        // Format the date to ISO-MM-DD for saving to Firestore
        const fechaFormateada = fechaPartido.toISOString().split('T')[0];

        console.log("[Calendario.js] Intentando agregar partido (modo liga):", { fecha: fechaFormateada, hora: horaPartido, equipoLocalId, equipoVisitanteId });

        const localSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoLocalId);
        const visitanteSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoVisitanteId);

        if (!localSeleccionado || !visitanteSeleccionado) {
            alert("Error al encontrar los detalles de los participantes seleccionados.");
            setIsSubmitting(false);
            return;
        }

        try {
            const partidoData = {
                fecha: fechaFormateada, // Save the formatted date
                hora: horaPartido,
                local: localSeleccionado.displayNombre,
                visitante: visitanteSeleccionado.displayNombre,
                localId: equipoLocalId,
                visitanteId: equipoVisitanteId,
                resultado: null,
            };
            const docRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), partidoData);
            console.log("[Calendario.js] Partido de liga agregado con ID:", docRef.id);

            await agregarNovedadConDebug(
                torneoId,
                `Nuevo partido (Liga) programado: ${localSeleccionado.displayNombre} vs ${visitanteSeleccionado.displayNombre} el ${fechaFormateada} a las ${horaPartido}.`,
                'match_add',
                { partidoId: docRef.id, local: localSeleccionado.displayNombre, visitante: visitanteSeleccionado.displayNombre, fecha: fechaFormateada, hora: horaPartido },
                "Calendario.js (AgregarPartido Liga)"
            );

            handleCerrarFormulario();
        } catch (error) {
            console.error("[Calendario.js] Error al añadir partido de liga:", error);
            alert("Error al añadir el partido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEliminarPartido = async (partidoId, localNombre, visitanteNombre) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar el partido "${localNombre} vs ${visitanteNombre}"? Esto puede afectar la clasificación y las llaves si es un partido de torneo.`)) {
            return;
        }
        setIsSubmitting(true);
        console.log(`[Calendario.js] Intentando eliminar partido: ${partidoId}`);
        try {
            const partidoDocRef = doc(db, `torneos/${torneoId}/calendario`, partidoId);
            await deleteDoc(partidoDocRef);
            console.log(`[Calendario.js] Partido ${partidoId} eliminado.`);

            await agregarNovedadConDebug(
                torneoId,
                `El partido ${localNombre} vs ${visitanteNombre} ha sido eliminado.`,
                'match_delete',
                { partidoIdEliminado: partidoId, local: localNombre, visitante: visitanteNombre },
                "Calendario.js (EliminarPartido)"
            );
        } catch (error) {
            console.error("[Calendario.js] Error al eliminar partido:", error);
            alert("Error al eliminar el partido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // MODIFICADO: Ahora abre un modal
    const handleActualizarResultado = (partido) => {
        if (!esCreador) {
            alert("Solo el creador del torneo puede añadir resultados.");
            return;
        }
        setSelectedPartidoForScore(partido);
        // Inicializar scores con el resultado existente si lo hay
        if (partido.resultado && partido.resultado.includes('-')) {
            const [s1, s2] = partido.resultado.split('-').map(Number);
            setLocalScore(isNaN(s1) ? "" : s1);
            setVisitanteScore(isNaN(s2) ? "" : s2);
        } else {
            setLocalScore("");
            setVisitanteScore("");
        }
        setIsResultModalOpen(true);
    };

    // NUEVO: Función para cerrar el modal de resultado
    const closeResultModal = () => {
        setIsResultModalOpen(false);
        setSelectedPartidoForScore(null);
        setLocalScore("");
        setVisitanteScore("");
    };

    // NUEVO: Función para manejar el envío del formulario de resultado (desde el modal)
    const handleResultSubmit = async (e) => {
        e.preventDefault();
        if (!esCreador) {
            alert("Solo el creador del torneo puede guardar resultados.");
            closeResultModal();
            return;
        }
        if (!selectedPartidoForScore?.id || localScore === "" || visitanteScore === "") {
            alert("Datos incompletos para guardar el resultado. Introduce ambos puntajes.");
            return;
        }
        const score1 = parseInt(localScore, 10);
        const score2 = parseInt(visitanteScore, 10);

        if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
            alert("Puntajes inválidos. Deben ser números no negativos.");
            return;
        }
        // Esto es para torneos de eliminación directa. Puedes quitarlo si solo aplica a ligas y no quieres esta validación.
        if (torneoInfo?.tipo === 'torneo' && score1 === score2) {
            alert("En torneos de eliminatoria, los empates no suelen ser válidos para avanzar. Determina un ganador.");
            return;
        }

        setIsSubmitting(true);
        const resultadoFinal = `${score1}-${score2}`;
        console.log(`[Calendario.js] Intentando actualizar resultado para partido ${selectedPartidoForScore.id} a: ${resultadoFinal}`);

        try {
            const partidoRef = doc(db, `torneos/${torneoId}/calendario`, selectedPartidoForScore.id);
            await updateDoc(partidoRef, { resultado: resultadoFinal });
            console.log(`[Calendario.js] Resultado actualizado para partido ${selectedPartidoForScore.id}.`);

            const mensajeNovedad = `Resultado actualizado para ${selectedPartidoForScore.local} vs ${selectedPartidoForScore.visitante}: ${resultadoFinal}.`;
            const bracketMatchIdInfo = selectedPartidoForScore.bracketMatchId ? ` (Llave: ${selectedPartidoForScore.bracketMatchId})` : "";

            await agregarNovedadConDebug(
                torneoId,
                `${mensajeNovedad}${bracketMatchIdInfo}`,
                'match_result',
                {
                    partidoId: selectedPartidoForScore.id,
                    local: selectedPartidoForScore.local,
                    visitante: selectedPartidoForScore.visitante,
                    resultado: resultadoFinal,
                    bracketMatchId: selectedPartidoForScore.bracketMatchId
                },
                "Calendario.js (handleResultSubmit)"
            );
            closeResultModal();
        } catch (error) {
            console.error("[Calendario.js] Error al actualizar resultado:", error);
            alert("Error al actualizar el resultado del partido.");
        } finally {
            setIsSubmitting(false);
        }
    };


    const esCreador = user?.uid && torneoInfo?.creadorId && user.uid === torneoInfo.creadorId;

    // Transform participants for react-select
    const selectOptions = participantesParaSeleccion.map(p => ({
        value: p.id,
        label: p.displayNombre
    }));

    return (
        <div className="calendario-container">
            <div className="calendario-header">
                {esCreador && !mostrarFormulario && torneoInfo?.tipo !== "torneo" && (
                    <button onClick={handleMostrarFormulario} className="calendario-add-button primary" disabled={isSubmitting}>
                        <FaPlus /> Añadir Partido (Liga)
                    </button>
                )}
                 {/* MODIFIED MESSAGE: Informs users that bracket matches are visible but managed elsewhere */}
                 {torneoInfo?.tipo === "torneo" && (
                    <p style={{textAlign: 'center', color: '#aaa', width: '100%', padding: '1rem 0', fontStyle: 'italic'}}>
                        Los partidos de eliminatoria (llaves) se gestionan desde la sección "Clasificación / Llaves", pero se listan aquí para una vista completa.
                    </p>
                )}
            </div>

            {/* Form to add matches is still only for "liga" type tournaments */}
            {mostrarFormulario && esCreador && torneoInfo?.tipo !== "torneo" && (
                <div className="calendario-form">
                    <h3>Añadir Nuevo Partido (Liga)</h3>
                    <form onSubmit={handleAgregarPartido}>
                        <div className="form-group">
                            <label htmlFor="fechaPartido">Fecha:</label>
                            {/* Componente DatePicker */}
                            <DatePicker
                                selected={fechaPartido}
                                onChange={(date) => setFechaPartido(date)}
                                dateFormat="yyyy-MM-dd"
                                className="react-datepicker-custom-input" // Clase para estilizar
                                placeholderText="Selecciona una fecha"
                                required
                                minDate={new Date()} // No permitir fechas pasadas
                                peekNextMonth
                                showMonthDropdown
                                showYearDropdown
                                dropdownMode="select"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="horaPartido">Hora:</label>
                            {/* Componente TimePicker */}
                            <TimePicker
                                onChange={setHoraPartido}
                                value={horaPartido}
                                disableClock={true} // Deshabilita el reloj grande, manteniendo el desplegable
                                format="HH:mm"
                                clearIcon={null} // Ocultar el icono de "limpiar"
                                className="react-timepicker-custom-input" // Clase para estilizar
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="equipoLocal">{torneoInfo?.modo === "individual" ? "Jugador Local" : "Equipo Local"}:</label>
                            <Select
                                id="equipoLocal"
                                value={selectOptions.find(option => option.value === equipoLocalId)}
                                onChange={(selectedOption) => setEquipoLocalId(selectedOption ? selectedOption.value : '')}
                                options={selectOptions.filter(option => option.value !== equipoVisitanteId)}
                                placeholder="Seleccionar"
                                classNamePrefix="react-select"
                                isClearable={true}
                                required // react-select doesn't directly support HTML required, needs custom validation if strict
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="equipoVisitante">{torneoInfo?.modo === "individual" ? "Jugador Visitante" : "Equipo Visitante"}:</label>
                            <Select
                                id="equipoVisitante"
                                value={selectOptions.find(option => option.value === equipoVisitanteId)}
                                onChange={(selectedOption) => setEquipoVisitanteId(selectedOption ? selectedOption.value : '')}
                                options={selectOptions.filter(option => option.value !== equipoLocalId)}
                                placeholder="Seleccionar"
                                classNamePrefix="react-select"
                                isClearable={true}
                                required // react-select doesn't directly support HTML required, needs custom validation if strict
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar Partido"}</button>
                            <button type="button" onClick={handleCerrarFormulario} className="button secondary" disabled={isSubmitting}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {partidos.length === 0 && (
                <p>No hay partidos programados para este torneo.</p>
            )}

            {partidos.length > 0 && (
                 <div className="calendario-partidos-grid">
                    {partidos.map((partido) => (
                        <div key={partido.id} className="calendario-partido-card">
                           <div className="botones-accion-card">
                                {esCreador && (
                                    <>
                                        <button onClick={() => handleActualizarResultado(partido)} className="boton-resultado-partido" title="Añadir/Editar resultado" aria-label="Añadir o editar resultado" disabled={isSubmitting}>
                                            <FaEdit />
                                        </button>
                                        <button onClick={() => handleEliminarPartido(partido.id, partido.local, partido.visitante)} className="boton-eliminar-partido" title="Eliminar partido" aria-label="Eliminar partido" disabled={isSubmitting}>
                                            <FaTrash />
                                        </button>
                                    </>
                                )}
                            </div>
                            {partido.bracketMatchId && (
                                <div className="partido-block bracket-info">
                                    <strong>Llave N°:</strong> <p>{partido.bracketMatchId}</p>
                                </div>
                            )}
                            <div className="partido-block fecha-hora">
                                <strong>Fecha:</strong> <p>{partido.fecha || "Por definir"}</p>
                                <strong>Hora:</strong> <p>{partido.hora || "Por definir"}</p>
                            </div>
                            <div className="partido-block equipos">
                                <span className="equipo-local">{partido.local || "Por determinar"}</span>
                                <span className="partido-vs">vs</span>
                                <span className="equipo-visitante">{partido.visitante || "Por determinar"}</span>
                            </div>
                            {partido.resultado ? (
                                <div className="partido-block resultado">
                                    {partido.resultado}
                                </div>
                            ) : (
                                <div className="partido-block resultado pendiente">
                                    Resultado Pendiente
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {torneoInfo?.tipo === "torneo" && eliminatedParticipants.size > 0 && (
                <div className="eliminated-list">
                    <strong>Participantes Eliminados (en Rondas Anteriores):</strong>
                    <p>{Array.from(eliminatedParticipants).map(id => participantesParaSeleccion.find(p => p.id === id)?.displayNombre || id).join(", ")}</p>
                </div>
            )}

            {/* MODAL PARA AÑADIR/EDITAR RESULTADO */}
            <ReactModal
                isOpen={isResultModalOpen}
                onRequestClose={closeResultModal}
                contentLabel="Añadir/Modificar Resultado del Partido"
                className="ReactModal__Content" // Usar la misma clase de estilo que en Clasificacion
                overlayClassName="ReactModal__Overlay" // Usar la misma clase de estilo para el overlay
            >
                <h3>Resultado: {selectedPartidoForScore?.local || "?"} vs {selectedPartidoForScore?.visitante || "?"}</h3>
                <p style={{ textAlign: 'center', fontSize: '0.9em', color: '#aaa' }}>
                    {selectedPartidoForScore?.bracketMatchId ? `Llave: ${selectedPartidoForScore.bracketMatchId}` : 'Partido de Liga'}
                </p>
                <form onSubmit={handleResultSubmit}>
                    <div className="form-group">
                        <label htmlFor="localScore">{selectedPartidoForScore?.local || "Local"}:</label>
                        <input
                            type="number"
                            id="localScore"
                            name="localScore"
                            value={localScore}
                            onChange={(e) => setLocalScore(e.target.value)}
                            min="0"
                            required
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="visitanteScore">{selectedPartidoForScore?.visitante || "Visitante"}:</label>
                        <input
                            type="number"
                            id="visitanteScore"
                            name="visitanteScore"
                            value={visitanteScore}
                            onChange={(e) => setVisitanteScore(e.target.value)}
                            min="0"
                            required
                            className="form-input"
                        />
                    </div>
                    {torneoInfo?.tipo === 'torneo' && localScore !== "" && visitanteScore !== "" && localScore === visitanteScore && (
                        <p style={{ color: '#FF6D14', fontSize: '0.9em', textAlign: 'center' }}>Los empates no son válidos en eliminatorias.</p>
                    )}
                    <div className="modal-actions">
                        <button type="submit" className="form-button primary" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar Resultado"}
                        </button>
                        <button type="button" onClick={closeResultModal} className="form-button secondary" disabled={isSubmitting}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </ReactModal>
        </div>
    );
}

export default Calendario;