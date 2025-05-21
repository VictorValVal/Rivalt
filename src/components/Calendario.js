// src/components/Calendario.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import "../components/estilos/Calendario.css"; // Ensure this CSS is the consolidated version below
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    onSnapshot,
    deleteDoc,
    getDoc as firestoreGetDoc, // Renombrado para evitar conflicto
    updateDoc,
    // serverTimestamp // No se usa directamente aquí si agregarNovedadConDebug lo maneja
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa";
import { agregarNovedadConDebug } from "./utils/NovedadesUtils";


const db = getFirestore(app);
const auth = getAuth(app);

// generateBracketStructure (si la usas aquí, mantenla o impórtala)
// Parece que se usa para la lógica de `eliminatedParticipants`
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
    const [fechaPartido, setFechaPartido] = useState("");
    const [horaPartido, setHoraPartido] = useState("");
    const [equipoLocalId, setEquipoLocalId] = useState("");
    const [equipoVisitanteId, setEquipoVisitanteId] = useState("");
    const [torneoInfo, setTorneoInfo] = useState(null);
    const [user, setUser] = useState(null);
    const [participantesParaSeleccion, setParticipantesParaSeleccion] = useState([]);
    const [eliminatedParticipants, setEliminatedParticipants] = useState(new Set());
    const [numParticipantesBracket, setNumParticipantesBracket] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);


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
                const seleccionables = participantesRaw.map((p) => {
                    if (typeof p === "object" && p !== null) {
                        const id = p.id || p.capitan;
                        const displayNombre = p.nombre || `Equipo (Cap: ${p.capitan?.substring(0, 6)}...)`;
                        return { id: String(id), displayNombre, esEquipo: true };
                    } else if (typeof p === 'string' && p) {
                        return { id: String(p), displayNombre: `Jugador (${String(p).substring(0,6)}...)`, esEquipo: false };
                    }
                    return null;
                }).filter(p => p && p.id);
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
        setFechaPartido("");
        setHoraPartido("");
        setEquipoLocalId("");
        setEquipoVisitanteId("");
    };

    const handleAgregarPartido = async (e) => {
        e.preventDefault();
        if (!fechaPartido || !horaPartido || !equipoLocalId || !equipoVisitanteId) {
            alert("Por favor, rellena la fecha, hora, local y visitante.");
            return;
        }
        if (equipoLocalId === equipoVisitanteId) {
            alert("El participante local y visitante no pueden ser el mismo.");
            return;
        }
        setIsSubmitting(true);
        console.log("[Calendario.js] Intentando agregar partido (modo liga):", { fechaPartido, horaPartido, equipoLocalId, equipoVisitanteId });

        const localSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoLocalId);
        const visitanteSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoVisitanteId);

        if (!localSeleccionado || !visitanteSeleccionado) {
            alert("Error al encontrar los detalles de los participantes seleccionados.");
            setIsSubmitting(false);
            return;
        }

        try {
            const partidoData = {
                fecha: fechaPartido,
                hora: horaPartido,
                local: localSeleccionado.displayNombre,
                visitante: visitanteSeleccionado.displayNombre,
                localId: equipoLocalId,
                visitanteId: equipoVisitanteId,
                resultado: null,
                // No se añade bracketMatchId para partidos de liga creados desde el calendario
            };
            const docRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), partidoData);
            console.log("[Calendario.js] Partido de liga agregado con ID:", docRef.id);

            await agregarNovedadConDebug(
                torneoId,
                `Nuevo partido (Liga) programado: ${localSeleccionado.displayNombre} vs ${visitanteSeleccionado.displayNombre} el ${fechaPartido} a las ${horaPartido}.`,
                'match_add',
                { partidoId: docRef.id, local: localSeleccionado.displayNombre, visitante: visitanteSeleccionado.displayNombre, fecha: fechaPartido, hora: horaPartido },
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

    const handleActualizarResultado = async (partido) => {
        const resultadoActual = partido.resultado ? ` (actual: ${partido.resultado})` : "";
        const nuevoResultado = prompt(`Introduce el resultado para ${partido.local} vs ${partido.visitante}${resultadoActual} (ej: 3-2, o "cancelar" para no cambiar, o vacío para borrar):`);

        if (nuevoResultado === null || nuevoResultado.toLowerCase() === "cancelar") {
            return;
        }

        if (!/^\d+-\d+$/.test(nuevoResultado) && nuevoResultado !== "") {
            alert("Formato de resultado inválido. Usa N-M (ej: 3-2). Deja vacío para borrar el resultado.");
            return;
        }
        setIsSubmitting(true);
        const resultadoAGuardar = nuevoResultado === "" ? null : nuevoResultado;
        console.log(`[Calendario.js] Intentando actualizar resultado para partido ${partido.id} a: ${resultadoAGuardar}`);

        try {
            const partidoRef = doc(db, `torneos/${torneoId}/calendario`, partido.id);
            await updateDoc(partidoRef, { resultado: resultadoAGuardar });
            console.log(`[Calendario.js] Resultado actualizado para partido ${partido.id}.`);

            const mensajeNovedad = resultadoAGuardar === null ?
                `Se ha borrado el resultado del partido: ${partido.local} vs ${partido.visitante}.` :
                `Resultado actualizado para ${partido.local} vs ${partido.visitante}: ${resultadoAGuardar}.`;
            const bracketMatchIdInfo = partido.bracketMatchId ? ` (Llave: ${partido.bracketMatchId})` : "";


            await agregarNovedadConDebug(
                torneoId,
                `${mensajeNovedad}${bracketMatchIdInfo}`,
                'match_result',
                { partidoId: partido.id, local: partido.local, visitante: partido.visitante, resultado: resultadoAGuardar, bracketMatchId: partido.bracketMatchId },
                "Calendario.js (ActualizarResultado)"
            );
        } catch (error) {
            console.error("[Calendario.js] Error al actualizar resultado:", error);
            alert("Error al actualizar el resultado.");
        // src/components/Calendario.js
// ... (imports and code from the previous response) ...

            console.error("[Calendario.js] Error al actualizar resultado:", error);
            alert("Error al actualizar el resultado del partido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const esCreador = user?.uid && torneoInfo?.creadorId && user.uid === torneoInfo.creadorId;

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
                            <input type="date" id="fechaPartido" value={fechaPartido} onChange={(e) => setFechaPartido(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="horaPartido">Hora:</label>
                            <input type="time" id="horaPartido" value={horaPartido} onChange={(e) => setHoraPartido(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="equipoLocal">{torneoInfo?.modo === "individual" ? "Jugador Local" : "Equipo Local"}:</label>
                            <select id="equipoLocal" value={equipoLocalId} onChange={(e) => setEquipoLocalId(e.target.value)} required>
                                <option value="">Seleccionar</option>
                                {participantesParaSeleccion.map((p) => (
                                    <option key={p.id} value={p.id} disabled={p.id === equipoVisitanteId}>{p.displayNombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="equipoVisitante">{torneoInfo?.modo === "individual" ? "Jugador Visitante" : "Equipo Visitante"}:</label>
                            <select id="equipoVisitante" value={equipoVisitanteId} onChange={(e) => setEquipoVisitanteId(e.target.value)} required>
                                <option value="">Seleccionar</option>
                                {participantesParaSeleccion.map((p) => (
                                    <option key={p.id} value={p.id} disabled={p.id === equipoLocalId}>{p.displayNombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="button primary" disabled={isSubmitting}>{isSubmitting ? "Guardando..." : "Guardar Partido"}</button>
                            <button type="button" onClick={handleCerrarFormulario} className="button secondary" disabled={isSubmitting}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {partidos.length === 0 && ( // Simplified condition to show if no matches regardless of type
                <p>No hay partidos programados para este torneo.</p>
            )}

            {/* MODIFIED CONDITION: Now shows partidos grid if partidos.length > 0, regardless of torneoInfo.tipo */}
            {partidos.length > 0 && (
                 <div className="calendario-partidos-grid">
                    {partidos.map((partido) => (
                        <div key={partido.id} className="calendario-partido-card">
                           <div className="botones-accion-card">
                                {esCreador && ( // Action buttons are still for the creator
                                    <>
                                        <button onClick={() => handleActualizarResultado(partido)} className="boton-resultado-partido" title="Añadir/Editar resultado" aria-label="Añadir o editar resultado" disabled={isSubmitting}>
                                            <FaEdit />
                                        </button>
                                        {/* Only allow deleting non-bracket matches from calendar view, or be very careful */}
                                        {/* For now, let's assume deleting from calendar is okay, but it will affect brackets if it's a bracket match */}
                                        <button onClick={() => handleEliminarPartido(partido.id, partido.local, partido.visitante)} className="boton-eliminar-partido" title="Eliminar partido" aria-label="Eliminar partido" disabled={isSubmitting}>
                                            <FaTrash />
                                        </button>
                                    </>
                                )}
                            </div>
                            {/* Optional: Display bracket match ID if it exists */}
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
            {/* The eliminated list might still be relevant for "torneo" type, kept as is */}
            {torneoInfo?.tipo === "torneo" && eliminatedParticipants.size > 0 && (
                <div className="eliminated-list">
                    <strong>Participantes Eliminados (en Rondas Anteriores):</strong>
                    <p>{Array.from(eliminatedParticipants).map(id => participantesParaSeleccion.find(p => p.id === id)?.displayNombre || id).join(", ")}</p>
                </div>
            )}
        </div>
    );
}

export default Calendario;
        