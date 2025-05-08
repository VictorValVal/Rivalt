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
    serverTimestamp // Importar serverTimestamp
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa"; // FaEdit para el botón de resultado

const db = getFirestore(app);
const auth = getAuth(app);

// Helper para añadir novedades (duplicado de Participantes.js, considera mover a un archivo utilitario)
const agregarNovedad = async (torneoId, mensaje, tipo, dataExtra = {}) => {
  try {
    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    await addDoc(novedadesRef, {
      mensaje,
      tipo,
      timestamp: serverTimestamp(),
      ...dataExtra,
    });
  } catch (error) {
    console.error("Error al agregar novedad desde Calendario:", error);
  }
};


const generateBracketStructure = (numParticipants) => {
    if (!numParticipants || numParticipants < 2 || !Number.isInteger(Math.log2(numParticipants))) {
        console.warn("Calendario: Invalid number of participants for single elimination bracket generation. Must be a power of 2 (>= 2).");
        return [];
    }

    const totalMatches = numParticipants - 1;
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
    const [bracketMatchIdInput, setBracketMatchIdInput] = useState('');
    const [eliminatedParticipants, setEliminatedParticipants] = useState(new Set());
    const [numParticipantesBracket, setNumParticipantesBracket] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);


    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });

        const fetchTorneoInfo = async () => {
            const torneoDocRef = doc(db, "torneos", torneoId);
            const torneoSnapshot = await firestoreGetDoc(torneoDocRef);
            if (torneoSnapshot.exists()) {
                const data = torneoSnapshot.data();
                setTorneoInfo(data);

                if (data.tipo === "torneo") {
                    const num = Number(data.numEquipos) || 0;
                    if (num > 0 && Number.isInteger(Math.log2(num))) {
                        setNumParticipantesBracket(num);
                    } else {
                        setNumParticipantesBracket(0);
                        console.warn(`Invalid or non-power-of-2 numEquipos (${num}) for single elimination bracket in Calendario.`);
                    }
                } else {
                    setNumParticipantesBracket(0);
                }

                const participantesRaw = data.participantes || [];
                const seleccionables = participantesRaw.map((p) => {
                    if (typeof p === "object" && p !== null && (p.nombre || p.capitan)) {
                        const id = p.id || p.capitan || p.nombre; // Usar p.id si existe, sino capitan, sino nombre
                        const displayNombre = p.nombre ? p.nombre : `Equipo (Cap: ${p.capitan?.substring(0, 6)}...)`;
                        return { id: String(id), displayNombre, esEquipo: true };
                    } else if (typeof p === 'string' && p) {
                        // Para individuales, buscar nombre en 'usuarios' sería ideal.
                        // Simplificación: usar el UID como nombre si no hay más info.
                        return { id: String(p), displayNombre: `Jugador (${String(p).substring(0,6)}...)`, esEquipo: false };
                    }
                    return null;
                }).filter(p => p && p.id);
                setParticipantesParaSeleccion(seleccionables);
            } else {
                console.error("No se encontró el torneo con ID:", torneoId);
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
        if (torneoInfo?.tipo === "torneo" && initialBracketStructureCalendario.length > 0) {
            const eliminated = new Set();
            // const matchesById = initialBracketStructureCalendario.reduce((acc, match) => {
            //     acc[match.id] = match;
            //     return acc;
            // }, {});

            const rawPartidosByBracketId = partidos.reduce((acc, partido) => {
                if (partido.bracketMatchId !== undefined && partido.bracketMatchId !== null && Number.isInteger(Number(partido.bracketMatchId))) {
                    acc[Number(partido.bracketMatchId)] = partido;
                }
                return acc;
            }, {});

            initialBracketStructureCalendario.forEach(match => {
                const partidoFirestore = rawPartidosByBracketId[match.id];

                if (partidoFirestore?.resultado && partidoFirestore.resultado.includes('-')) {
                    const [score1, score2] = partidoFirestore.resultado.split("-").map(Number);

                    if (!isNaN(score1) && !isNaN(score2)) {
                        let loserId = null;
                        if (score1 > score2) { // Gana local, pierde visitante
                            loserId = partidoFirestore.visitanteId;
                        } else if (score2 > score1) { // Gana visitante, pierde local
                            loserId = partidoFirestore.localId;
                        }
                        // Si hay empate, nadie es eliminado en este partido específico (la lógica de avance es más compleja)

                        if (loserId && match.nextMatchId !== null) { // Solo eliminar si no es la final
                            eliminated.add(String(loserId)); // Asegurar que se guarda como string
                        }
                    }
                }
            });
            setEliminatedParticipants(eliminated);
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
        setBracketMatchIdInput('');
    };

    const handleAgregarPartido = async (e) => {
        e.preventDefault();
        if (!fechaPartido || !horaPartido || !equipoLocalId || !equipoVisitanteId) {
            alert("Por favor, rellena la fecha, hora, local y visitante.");
            return;
        }
        setIsSubmitting(true);

        let bracketId = null;
        if (torneoInfo?.tipo === "torneo") {
            if (!bracketMatchIdInput) {
                alert("Por favor, introduce el ID del Partido en el Esquema.");
                setIsSubmitting(false);
                return;
            }
            const parsedBracketId = Number(bracketMatchIdInput);
            if (isNaN(parsedBracketId) || parsedBracketId <= 0 || !Number.isInteger(parsedBracketId)) {
                alert("El ID del Partido en el Esquema debe ser un número entero positivo.");
                setIsSubmitting(false);
                return;
            }
            const maxBracketId = numParticipantesBracket > 0 ? numParticipantesBracket - 1 : 0;
            if (parsedBracketId > maxBracketId) {
                alert(`El ID del Partido en el Esquema (${parsedBracketId}) excede el número máximo de partidos posibles (${maxBracketId}) para ${numParticipantesBracket} participantes.`);
                setIsSubmitting(false);
                return;
            }
            bracketId = parsedBracketId;
        }

        if (equipoLocalId === equipoVisitanteId) {
            alert("El participante local y visitante no pueden ser el mismo.");
            setIsSubmitting(false);
            return;
        }

        const localSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoLocalId);
        const visitanteSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoVisitanteId);

        if (!localSeleccionado || !visitanteSeleccionado) {
            alert("Error al encontrar los detalles de los participantes seleccionados.");
            setIsSubmitting(false);
            return;
        }

        if (torneoInfo?.tipo === "torneo") {
            if (eliminatedParticipants.has(localSeleccionado.id)) {
                alert(`El participante local "${localSeleccionado.displayNombre}" ya ha sido eliminado.`);
                setIsSubmitting(false);
                return;
            }
            if (eliminatedParticipants.has(visitanteSeleccionado.id)) {
                alert(`El participante visitante "${visitanteSeleccionado.displayNombre}" ya ha sido eliminado.`);
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const partidoData = {
                fecha: fechaPartido,
                hora: horaPartido,
                local: localSeleccionado.displayNombre,
                visitante: visitanteSeleccionado.displayNombre,
                localId: equipoLocalId,
                visitanteId: equipoVisitanteId,
                resultado: null, // Resultado inicial nulo
                ...(torneoInfo?.tipo === "torneo" && { bracketMatchId: bracketId }),
            };
            const docRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), partidoData);
            
            // Añadir novedad
            await agregarNovedad(
                torneoId,
                `Nuevo partido programado: ${localSeleccionado.displayNombre} vs ${visitanteSeleccionado.displayNombre} el ${fechaPartido} a las ${horaPartido}.`,
                'match_add',
                { partidoId: docRef.id, local: localSeleccionado.displayNombre, visitante: visitanteSeleccionado.displayNombre }
            );

            handleCerrarFormulario();
        } catch (error) {
            console.error("Error al añadir partido:", error);
            alert("Error al añadir el partido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEliminarPartido = async (partidoId, localNombre, visitanteNombre) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar el partido "${localNombre} vs ${visitanteNombre}"? Esto puede afectar la clasificación/esquema.`)) {
            return;
        }
        setIsSubmitting(true);
        try {
            const partidoDocRef = doc(db, `torneos/${torneoId}/calendario`, partidoId);
            await deleteDoc(partidoDocRef);
            
            // Añadir novedad
            await agregarNovedad(
                torneoId,
                `El partido ${localNombre} vs ${visitanteNombre} ha sido eliminado.`,
                'match_delete', // Podrías tener un tipo 'match_delete'
                { partidoIdEliminado: partidoId, local: localNombre, visitante: visitanteNombre }
            );
            // El estado 'partidos' se actualizará automáticamente por el listener onSnapshot
        } catch (error) {
            console.error("Error al eliminar partido:", error);
            alert("Error al eliminar el partido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleActualizarResultado = async (partido) => {
        const resultadoActual = partido.resultado ? ` (actual: ${partido.resultado})` : "";
        const nuevoResultado = prompt(`Introduce el resultado para ${partido.local} vs ${partido.visitante}${resultadoActual} (ej: 3-2, o "cancelar" para no cambiar):`);

        if (nuevoResultado === null || nuevoResultado.toLowerCase() === "cancelar") {
            return; // Usuario canceló
        }

        // Validación simple del formato (ej: "N-M")
        if (!/^\d+-\d+$/.test(nuevoResultado) && nuevoResultado !== "") { // Permitir borrar resultado con string vacío
            alert("Formato de resultado inválido. Usa N-M (ej: 3-2). Deja vacío para borrar el resultado.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            const partidoRef = doc(db, `torneos/${torneoId}/calendario`, partido.id);
            await updateDoc(partidoRef, { resultado: nuevoResultado === "" ? null : nuevoResultado });

            // Añadir novedad
            const mensajeNovedad = nuevoResultado === "" ?
                `Se ha borrado el resultado del partido: ${partido.local} vs ${partido.visitante}.` :
                `Resultado actualizado para ${partido.local} vs ${partido.visitante}: ${nuevoResultado}.`;
            await agregarNovedad(
                torneoId,
                mensajeNovedad,
                'match_result',
                { partidoId: partido.id, local: partido.local, visitante: partido.visitante, resultado: nuevoResultado }
            );
            // El estado 'partidos' se actualizará automáticamente por el listener onSnapshot
        } catch (error) {
            console.error("Error al actualizar resultado:", error);
            alert("Error al actualizar el resultado del partido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const esCreador = user?.uid === torneoInfo?.creadorId;

    return (
        <div className="calendario-container">
            <div className="calendario-header">
                {esCreador && !mostrarFormulario && torneoInfo?.tipo !== "torneo" && (
                    <button onClick={handleMostrarFormulario} className="calendario-add-button primary" disabled={isSubmitting}>
                        <FaPlus /> Añadir Partido
                    </button>
                )}
                 {esCreador && !mostrarFormulario && torneoInfo?.tipo === "torneo" && (
                    <p style={{textAlign: 'center', color: '#aaa', width: '100%'}}>
                        Los partidos de eliminatoria se gestionan desde la sección "Clasificación / Llaves".
                    </p>
                )}
            </div>

            {mostrarFormulario && esCreador && torneoInfo?.tipo !== "torneo" && ( // Solo mostrar form si no es tipo torneo
                <div className="calendario-form">
                    <h3>Añadir Nuevo Partido</h3>
                    <form onSubmit={handleAgregarPartido}>
                        {/* No mostrar input de bracketMatchIdInput si no es tipo torneo */}
                        <div className="form-group">
                            <label htmlFor="fechaPartido">Fecha:</label>
                            <input
                                type="date"
                                id="fechaPartido"
                                value={fechaPartido}
                                onChange={(e) => setFechaPartido(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="horaPartido">Hora:</label>
                            <input
                                type="time"
                                id="horaPartido"
                                value={horaPartido}
                                onChange={(e) => setHoraPartido(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="equipoLocal">
                                {torneoInfo?.modo === "individual" ? "Jugador Local" : "Equipo Local"}:
                            </label>
                            <select
                                id="equipoLocal"
                                value={equipoLocalId}
                                onChange={(e) => setEquipoLocalId(e.target.value)}
                                required
                            >
                                <option value="">Seleccionar</option>
                                {participantesParaSeleccion.map((participante) => (
                                    <option
                                        key={participante.id}
                                        value={participante.id}
                                        disabled={participante.id === equipoVisitanteId} // No se puede ser local y visitante
                                    >
                                        {participante.displayNombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="equipoVisitante">
                                {torneoInfo?.modo === "individual" ? "Jugador Visitante" : "Equipo Visitante"}:
                            </label>
                            <select
                                id="equipoVisitante"
                                value={equipoVisitanteId}
                                onChange={(e) => setEquipoVisitanteId(e.target.value)}
                                required
                            >
                                <option value="">Seleccionar</option>
                                {participantesParaSeleccion.map((participante) => (
                                    <option
                                        key={participante.id}
                                        value={participante.id}
                                        disabled={participante.id === equipoLocalId} // No se puede ser local y visitante
                                    >
                                        {participante.displayNombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="button primary" disabled={isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Guardar Partido"}
                            </button>
                            <button type="button" onClick={handleCerrarFormulario} className="button secondary" disabled={isSubmitting}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {partidos.length === 0 && torneoInfo?.tipo !== "torneo" && ( // No mostrar "No hay partidos" si es tipo torneo, ya que se ven en Llaves
                <p>No hay partidos programados.</p>
            )}
            {partidos.length === 0 && torneoInfo?.tipo === "torneo" && (
                 <p>Los partidos de este torneo se visualizan y gestionan en la sección "Clasificación / Llaves".</p>
            )}

            {partidos.length > 0 && torneoInfo?.tipo !== "torneo" && ( // Solo mostrar grid si no es tipo torneo
                 <div className="calendario-partidos-grid">
                    {partidos.map((partido) => (
                        <div key={partido.id} className="calendario-partido-card">
                           <div className="botones-accion-card">
                                {esCreador && (
                                    <>
                                        <button 
                                            onClick={() => handleActualizarResultado(partido)} 
                                            className="boton-resultado-partido" 
                                            title="Añadir/Editar resultado" 
                                            aria-label="Añadir o editar resultado"
                                            disabled={isSubmitting}
                                        >
                                            <FaEdit /> {/* Icono para editar resultado */}
                                        </button>
                                        <button 
                                            onClick={() => handleEliminarPartido(partido.id, partido.local, partido.visitante)} 
                                            className="boton-eliminar-partido" 
                                            title="Eliminar partido" 
                                            aria-label="Eliminar partido"
                                            disabled={isSubmitting}
                                        >
                                            <FaTrash />
                                        </button>
                                    </>
                                )}
                            </div>
                            {partido.bracketMatchId !== undefined && partido.bracketMatchId !== null && (
                                <div className="partido-block id-esquema">
                                    <strong>ID Esquema:</strong> <p>{partido.bracketMatchId}</p>
                                </div>
                            )}
                            <div className="partido-block fecha-hora">
                                <strong>Fecha:</strong> <p>{partido.fecha || "Por definir"}</p>
                                <strong>Hora:</strong> <p>{partido.hora || "Por definir"}</p>
                            </div>
                            <div className="partido-block equipos">
                                <span className="equipo-local">{partido.local}</span>
                                <span className="partido-vs">vs</span>
                                <span className="equipo-visitante">{partido.visitante}</span>
                            </div>
                            {partido.resultado && (
                                <div className="partido-block resultado">
                                    {partido.resultado}
                                </div>
                            )}
                             {!partido.resultado && (
                                <div className="partido-block resultado pendiente">
                                    Resultado Pendiente
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {torneoInfo?.tipo === "torneo" && eliminatedParticipants.size > 0 && (
                <div className="eliminated-list" style={{ marginTop: '20px', fontSize: '0.9em', color: '#aaa' }}>
                    <p><strong>Participantes eliminados (informativo):</strong> {Array.from(eliminatedParticipants)
                        .map(id => participantesParaSeleccion.find(p => String(p.id) === id)?.displayNombre || `ID (${id.substring(0,6)})`)
                        .join(', ') || "Ninguno aún."}</p>
                </div>
            )}
        </div>
    );
}

export default Calendario;