// src/components/Clasificacion.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  serverTimestamp,
  getFirestore,
  doc,
  getDoc, 
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { app } from "../firebase";
import Llaves from "./Llaves";
import Tabla from "./Tabla";
import ReactModal from "react-modal";
import "./estilos/Clasificacion.css";
import { FaEye, FaDownload } from "react-icons/fa";
import html2canvas from 'html2canvas';

const db = getFirestore(app);
ReactModal.setAppElement("#root");

const agregarNovedad = async (torneoId, mensaje, tipo, dataExtra = {}) => {
  try {
    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    await addDoc(novedadesRef, {
      mensaje,
      tipo,
      timestamp: serverTimestamp(),
      ...dataExtra,
    });
    console.log("[Clasificacion.js] Novedad agregada:", mensaje);
  } catch (error) {
    console.error("[Clasificacion.js] Error al agregar novedad:", error);
  }
};

const initialFormData = {
  fecha: "",
  hora: "",
  localId: "",
  visitanteId: "",
  local: "",
  visitante: "",
  existingPartidoId: null,
};

function Clasificacion() {
  const { id: torneoId } = useParams();

  const [torneoInfo, setTorneoInfo] = useState(null);
  const [tipoTorneo, setTipoTorneo] = useState(null);
  const [numParticipantes, setNumParticipantes] = useState(0);
  const [participantes, setParticipantes] = useState([]);
  const [rawPartidos, setRawPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalStates, setModalStates] = useState({
    matchForm: false,
    resultForm: false,
    info: false,
  });
  const [formData, setFormData] = useState(initialFormData);
  const [selectedMatchSeed, setSelectedMatchSeed] = useState(null);
  const [selectedResultPartido, setSelectedResultPartido] = useState(null);
  const [localScore, setLocalScore] = useState("");
  const [visitanteScore, setVisitanteScore] = useState("");

  const [isViewMode, setIsViewMode] = useState(false);
  const contentRef = useRef(null);
  useEffect(() => {
  async function fetchNombresParticipantes() {
    if (!torneoInfo || !Array.isArray(torneoInfo.participantes)) return;

    const participantesRaw = torneoInfo.participantes;
    const participantesFormateados = await Promise.all(participantesRaw.map(async p => {
      if (typeof p === 'object' && p !== null) {
        const idVal = p.id || p.capitan;
        const nameVal = p.nombre || (idVal ? `Equipo (${String(idVal).substring(0, 6)}...)` : 'Equipo Desc.');
        if (idVal) {
          return { id: String(idVal), nombre: String(nameVal) };
        }
      } else if (typeof p === 'string' && p) {
        // Buscar el nombre real en Firestore
        try {
          const userDoc = await getDoc(doc(db, "usuarios", p));
          if (userDoc.exists()) {
            const nombreReal = userDoc.data().nombre || userDoc.data().email || `Jugador (${String(p).substring(0, 6)}...)`;
            return { id: String(p), nombre: nombreReal };
          }
        } catch (e) {
          // Si falla, usa el fallback
        }
        return { id: String(p), nombre: `Jugador (${String(p).substring(0, 6)}...)` };
      }
      return null;
    }));

    setParticipantes(participantesFormateados.filter(p => p && p.id && p.nombre));
  }

  fetchNombresParticipantes();
}, [torneoInfo]);

  useEffect(() => {
    setLoading(true);
    const torneoRef = doc(db, "torneos", torneoId);

    const unsubscribeTorneo = onSnapshot(torneoRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setTorneoInfo(data);
            setTipoTorneo(data.tipo);

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

            const num = Number(data.numEquipos) || 0;
            if (data.tipo === "torneo") {
                if (num > 0 && Number.isInteger(Math.log2(num))) {
                    setNumParticipantes(num);
                } else {
                    setNumParticipantes(0);
                }
            } else {
                setNumParticipantes(0);
            }
        } else {
            console.error("[Clasificacion.js] Torneo no encontrado con ID:", torneoId);
            setTorneoInfo(null); setTipoTorneo(null); setParticipantes([]); setNumParticipantes(0);
        }
        setLoading(false);
    }, (error) => {
        console.error("[Clasificacion.js] Error fetching tournament snapshot:", error);
        setLoading(false);
    });
    return () => unsubscribeTorneo();
  }, [torneoId]);

  useEffect(() => {
    if (!torneoId) return;
    const partidosRef = collection(db, `torneos/${torneoId}/calendario`);
    const unsubscribePartidos = onSnapshot(partidosRef, (snapshot) => {
      const fetchedPartidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRawPartidos(fetchedPartidos);
    }, (error) => {
      console.error("[Clasificacion.js] Error fetching partidos snapshot:", error);
      setRawPartidos([]);
    });
    return () => unsubscribePartidos();
  }, [torneoId]);

  const eliminatedTeamIds = useMemo(() => {
    const losers = new Set();
    rawPartidos.forEach(p => {
      if (p.resultado && p.resultado.includes('-')) {
        const [s1, s2] = p.resultado.split('-').map(Number);
        if (!isNaN(s1) && !isNaN(s2)) {
          if (s1 < s2 && p.localId) losers.add(String(p.localId));
          else if (s2 < s1 && p.visitanteId) losers.add(String(p.visitanteId));
        }
      }
    });
    return losers;
  }, [rawPartidos]);

  // availableParticipantsForNewMatch is used by the dropdowns for Round 1
  const availableParticipantsForDropdown = useMemo(() => {
    // For Round 1 seeding, we generally want all participants,
    // unless some are explicitly marked as 'inactive' or similar (not handled here)
    // `eliminatedTeamIds` might be relevant if re-seeding a round after some matches.
    return participantes.filter(p => !eliminatedTeamIds.has(p.id));
  }, [participantes, eliminatedTeamIds]);


  const openModal = useCallback((modalName) => {
    setModalStates(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName) => {
    setModalStates(prev => ({ ...prev, [modalName]: false }));
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

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSelectChange = useCallback((e, teamType) => {
    const { value } = e.target; // value is the participant's ID
    const selectedParticipant = participantes.find((p) => String(p.id) === String(value));
    setFormData((prev) => ({
      ...prev,
      [`${teamType}Id`]: value, // Set the ID
      [`${teamType}`]: selectedParticipant ? selectedParticipant.nombre : "", // Set the name
    }));
  }, [participantes]); // Depends on the main 'participantes' list


  const handleMatchSubmit = async (e) => {
  e.preventDefault();

  if (!selectedMatchSeed?.id) {
    alert("Error: No se ha seleccionado una casilla de llave (bracketMatchId perdido).");
    return;
  }
  if (!formData.fecha || !formData.hora) {
    alert("La fecha y la hora son obligatorias.");
    return;
  }

  const isRound1 = selectedMatchSeed?.tournamentRoundText === "Ronda 1";
  const teamsNotSetInFormForNewMatch = !formData.localId || !formData.visitanteId;
  const allowTeamSelectionForRound1 = isRound1 && !formData.existingPartidoId && teamsNotSetInFormForNewMatch;

  if (allowTeamSelectionForRound1 && (!formData.localId || !formData.visitanteId)) {
    alert("Por favor, selecciona ambos equipos para este partido de Ronda 1.");
    return;
  }
  if (formData.localId && formData.visitanteId && formData.localId === formData.visitanteId) {
    alert("El equipo local y visitante no pueden ser el mismo.");
    return;
  }

  let localTeamName = formData.local;
  let visitanteTeamName = formData.visitante;
  let localTeamId = formData.localId;
  let visitanteTeamId = formData.visitanteId;

  if (formData.localId && !formData.local) {
    const tempLocal = participantes.find(p => String(p.id) === String(formData.localId));
    if (tempLocal) localTeamName = tempLocal.nombre;
  }
  if (formData.visitanteId && !formData.visitante) {
    const tempVisitante = participantes.find(p => String(p.id) === String(formData.visitanteId));
    if (tempVisitante) visitanteTeamName = tempVisitante.nombre;
  }

  const matchData = {
    fecha: formData.fecha,
    hora: formData.hora,
    localId: localTeamId || null,
    visitanteId: visitanteTeamId || null,
    local: localTeamName || "Por determinar",
    visitante: visitanteTeamName || "Por determinar",
    bracketMatchId: String(selectedMatchSeed.id),
  };

  let actionType = ""; // <-- Mueve la declaración aquí
  let partidoIdParaNovedad = formData.existingPartidoId;

  try {
    if (formData.existingPartidoId) {
      actionType = "modificar";
      const partidoRef = doc(db, `torneos/${torneoId}/calendario`, formData.existingPartidoId);
      await updateDoc(partidoRef, matchData);
    } else {
      actionType = "crear";
      const existingMatchForBracket = rawPartidos.find(p => String(p.bracketMatchId) === String(selectedMatchSeed.id));
      if (existingMatchForBracket) {
        partidoIdParaNovedad = existingMatchForBracket.id;
        const partidoRef = doc(db, `torneos/${torneoId}/calendario`, existingMatchForBracket.id);
        await updateDoc(partidoRef, matchData);
      } else {
        const newDocRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), {
          ...matchData,
          resultado: null,
          createdAt: serverTimestamp()
        });
        partidoIdParaNovedad = newDocRef.id;
      }
    }
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
    closeModal('matchForm');
  } catch (error) {
    console.error(`[Clasificacion.js] Error al ${actionType} el partido:`, error);
    alert(`Error al ${actionType} el partido.`);
  }
};

  // handleResultSubmit, handleBracketClick, handleModifyClick, handleAddResultClick,
  // toggleViewMode, handleDownloadImage remain largely the same as your last correct version.
  // Ensure their logging and data handling are robust as in the previous iteration.
  // For brevity, I'll skip re-pasting them if they were correct in the prior step,
  // but ensure they use the corrected 'participantes' state where needed for name lookups if any.

    const handleResultSubmit = async (e) => {
        e.preventDefault();
        if (!selectedResultPartido?.id || localScore === "" || visitanteScore === "") {
        alert("Datos incompletos para guardar el resultado. Introduce ambos puntajes.");
        return;
        }
        const score1 = parseInt(localScore, 10);
        const score2 = parseInt(visitanteScore, 10);

        if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
        alert("Puntajes inválidos. Deben ser números no negativos.");
        return;
        }
        if (score1 === score2 && tipoTorneo === 'torneo') {
            alert("En torneos de eliminatoria, los empates no suelen ser válidos para avanzar. Determina un ganador.");
            return;
        }
        const resultadoFinal = `${score1}-${score2}`;
        try {
        const partidoRef = doc(db, `torneos/${torneoId}/calendario`, selectedResultPartido.id);
        await updateDoc(partidoRef, { resultado: resultadoFinal });
        await agregarNovedad(torneoId, `Resultado actualizado para ${selectedResultPartido.local} vs ${selectedResultPartido.visitante}: ${resultadoFinal}. (Llave: ${selectedResultPartido.bracketMatchId || 'N/A'})`, 'match_result', { partidoId: selectedResultPartido.id, local: selectedResultPartido.local, visitante: selectedResultPartido.visitante, resultado: resultadoFinal, bracketMatchId: selectedResultPartido.bracketMatchId });
        closeModal('resultForm');
        } catch (error) {
        console.error("[Clasificacion.js] Error saving result:", error);
        alert("Error al guardar el resultado.");
        }
    };

    const handleBracketClick = useCallback((seedFromLlaves) => {
        const firestorePartido = rawPartidos.find(p => String(p.bracketMatchId) === String(seedFromLlaves.id));
        if (firestorePartido) {
        const combinedInfo = { ...seedFromLlaves, ...firestorePartido, id: firestorePartido.id, bracketMatchId: firestorePartido.bracketMatchId || String(seedFromLlaves.id), };
        setSelectedMatchSeed(combinedInfo);
        openModal('info');
        } else {
        const localTeamInSeed = seedFromLlaves.teams?.[0];
        const visitanteTeamInSeed = seedFromLlaves.teams?.[1];
        setSelectedMatchSeed(seedFromLlaves);
        setFormData({ ...initialFormData, localId: localTeamInSeed?.id || "", visitanteId: visitanteTeamInSeed?.id || "", local: localTeamInSeed?.name || "Por determinar", visitante: visitanteTeamInSeed?.name || "Por determinar", existingPartidoId: null });
        openModal('matchForm');
        }
    }, [rawPartidos, openModal]);

    const handleModifyClick = useCallback((seedFromLlaves) => {
        const partidoEnFirestore = rawPartidos.find(p => p.id === seedFromLlaves.partidoId && String(p.bracketMatchId) === String(seedFromLlaves.id));
        if (partidoEnFirestore) {
        setSelectedMatchSeed(seedFromLlaves);
        setFormData({ fecha: partidoEnFirestore.fecha === "Por definir" ? "" : partidoEnFirestore.fecha || "", hora: partidoEnFirestore.hora === "Por definir" ? "" : partidoEnFirestore.hora || "", localId: partidoEnFirestore.localId || seedFromLlaves.teams?.[0]?.id || "", visitanteId: partidoEnFirestore.visitanteId || seedFromLlaves.teams?.[1]?.id || "", local: partidoEnFirestore.local || seedFromLlaves.teams?.[0]?.name || "Por determinar", visitante: partidoEnFirestore.visitante || seedFromLlaves.teams?.[1]?.name || "Por determinar", existingPartidoId: partidoEnFirestore.id });
        openModal('matchForm');
        } else {
        console.warn("[Clasificacion.js] Modify clicked, but no definitive partido found. Seed:", seedFromLlaves);
        const localTeamInSeed = seedFromLlaves.teams?.[0];
        const visitanteTeamInSeed = seedFromLlaves.teams?.[1];
        setSelectedMatchSeed(seedFromLlaves);
        setFormData({ ...initialFormData, localId: localTeamInSeed?.id || "", visitanteId: visitanteTeamInSeed?.id || "", local: localTeamInSeed?.name || "Por determinar", visitante: visitanteTeamInSeed?.name || "Por determinar", existingPartidoId: null });
        openModal('matchForm');
        }
    }, [rawPartidos, openModal]);

    const handleAddResultClick = useCallback(async (seedFromLlaves) => {
        let partidoParaResultado = rawPartidos.find(p => String(p.bracketMatchId) === String(seedFromLlaves.id));
        let firestoreDocIdToUse = partidoParaResultado?.id;

        if (!partidoParaResultado && seedFromLlaves.teams?.[0]?.id && seedFromLlaves.teams?.[1]?.id) {
        const localTeamName = seedFromLlaves.teams[0].name;
        const visitanteTeamName = seedFromLlaves.teams[1].name;
        if (localTeamName && visitanteTeamName && localTeamName !== "Por determinar" && visitanteTeamName !== "Por determinar") {
            try {
            const newPartidoData = { fecha: "Por definir", hora: "Por definir", localId: String(seedFromLlaves.teams[0].id), visitanteId: String(seedFromLlaves.teams[1].id), local: localTeamName, visitante: visitanteTeamName, bracketMatchId: String(seedFromLlaves.id), resultado: null, createdAt: serverTimestamp(), };
            const newPartidoRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), newPartidoData);
            firestoreDocIdToUse = newPartidoRef.id;
            partidoParaResultado = { id: firestoreDocIdToUse, ...newPartidoData };
            await agregarNovedad(torneoId, `Partido (Llave: ${newPartidoData.bracketMatchId}) entre ${newPartidoData.local} y ${newPartidoData.visitante} definido automáticamente y listo para resultado.`, 'match_auto_add', { partidoId: firestoreDocIdToUse, local: newPartidoData.local, visitante: newPartidoData.visitante, bracketMatchId: newPartidoData.bracketMatchId });
            } catch (error) { console.error("[Clasificacion.js] Error implicitly creating partido for result:", error); alert("Error al preparar automáticamente el partido para el resultado."); return; }
        } else { alert("Error: Los equipos para este partido de la llave aún no están completamente definidos ('Por determinar')."); return; }
        } else if (!partidoParaResultado) { alert("Define los participantes y el horario de este partido en la llave antes de añadir un resultado."); return; }

        if (partidoParaResultado && firestoreDocIdToUse) {
        const finalPartidoObjectForModal = { ...seedFromLlaves, ...partidoParaResultado, id: firestoreDocIdToUse, bracketMatchId: partidoParaResultado.bracketMatchId || String(seedFromLlaves.id) };
        setSelectedResultPartido(finalPartidoObjectForModal);
        if (finalPartidoObjectForModal.resultado && finalPartidoObjectForModal.resultado.includes('-')) { const [s1, s2] = finalPartidoObjectForModal.resultado.split('-'); setLocalScore(s1); setVisitanteScore(s2); } else { setLocalScore(""); setVisitanteScore(""); }
        openModal('resultForm');
        } else { alert("No se pudo preparar el partido para añadir resultado."); }
    }, [rawPartidos, torneoId, openModal, agregarNovedad]);

    const toggleViewMode = () => setIsViewMode(!isViewMode);

    const handleDownloadImage = async () => {
        const elementToCapture = contentRef.current;
        if (elementToCapture && typeof html2canvas === 'function') {
        try {
            const canvasBackgroundColor = tipoTorneo === "torneo" ? '#0c0c0c' : (isViewMode ? '#0c0c0c' : '#121212');
            const canvas = await html2canvas(elementToCapture, { backgroundColor: canvasBackgroundColor, scale: 2, useCORS: true, });
            const image = canvas.toDataURL("image/png", 1.0);
            const link = document.createElement("a");
            link.href = image;
            link.download = tipoTorneo === "torneo" ? "llaves_torneo.png" : "tabla_clasificacion.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) { console.error("[Clasificacion.js] Error al generar la imagen:", error); alert("Hubo un error al generar la imagen."); }
        } else if (!elementToCapture) { alert("No hay contenido para descargar."); }
        else if (typeof html2canvas !== 'function') { alert("Librería html2canvas no cargada."); }
    };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#e0e0e0', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>Cargando información del torneo...</div>;

  if (isViewMode) {
    // ... View Mode JSX (remains the same)
    const viewModeBackground = tipoTorneo === "torneo" ? '#0c0c0c' : '#0c0c0c';
    return (
      <div className="clasificacion-view-mode" style={{ 
  backgroundColor: viewModeBackground,
  position: 'fixed', 
  top: 0, 
  left: 0, 
  right: 0, 
  bottom: 0,
  overflow: 'hidden'
}}>
  <div ref={contentRef} className="clasificacion-view-mode-content" style={{
    transform: 'scale(0.9)', // Ajusta este valor según necesidad
    transformOrigin: 'top center',
    width: '100%',
    height: '100%',
    padding: '20px',
    boxSizing: 'border-box'
  }}>
          {tipoTorneo === "torneo" && numParticipantes > 0 && (
            <Llaves
              numParticipantes={numParticipantes}
              rawPartidos={rawPartidos}
              onMatchClick={() => {}}
              onModify={() => {}}
              onAddResult={() => {}}
              isViewMode={true}
            />
          )}
          {tipoTorneo === "liga" && (
             <div className="tabla-wrapper-for-view-mode">
                <Tabla rawPartidos={rawPartidos} participantes={participantes} isViewMode={true} />
             </div>
          )}
        </div>
        <div className="clasificacion-view-mode-controls">
          <button onClick={toggleViewMode} className="view-mode-button" title="Salir de pantalla completa">
            <FaEye style={{ transform: 'scaleX(-1)' }} />
          </button>
          <button onClick={handleDownloadImage} className="download-button" title="Descargar imagen">
            <FaDownload />
          </button>
        </div>
      </div>
    );
  }

  // Determine conditions for the matchForm modal content
  const isRound1 = selectedMatchSeed?.tournamentRoundText === "Ronda 1";
  // Teams are considered "not set" if their IDs are missing from current formData
  // (formData is populated from seed.teams when matchForm opens for a new match,
  // or from Firestore partido when modifying).
  const teamsNotSetInForm = !formData.localId || !formData.visitanteId;
  // Allow team selection if it's Round 1, it's for a new Firestore entry, AND teams aren't already fully set in the form
  const allowTeamSelectionForRound1 = isRound1 && !formData.existingPartidoId && teamsNotSetInForm;


  return (
    <div className="clasificacion-container">
      <div ref={contentRef}>
        {tipoTorneo === "torneo" && numParticipantes > 0 && (
          <Llaves
            numParticipantes={numParticipantes}
            rawPartidos={rawPartidos}
            onMatchClick={handleBracketClick}
            onModify={handleModifyClick}
            onAddResult={handleAddResultClick}
          />
        )}
        {tipoTorneo === "liga" && (
            <Tabla rawPartidos={rawPartidos} participantes={participantes} />
        )}
      </div>

      {((tipoTorneo === "torneo" && numParticipantes > 0) || tipoTorneo === "liga") && !loading && (
        <div className="clasificacion-actions-container">
          <button onClick={toggleViewMode} className="view-mode-button" title="Ver en pantalla completa">
            <FaEye />
          </button>
          <button onClick={handleDownloadImage} className="download-button" title="Descargar imagen">
            <FaDownload />
          </button>
        </div>
      )}

      <ReactModal
        isOpen={modalStates.matchForm}
        onRequestClose={() => closeModal('matchForm')}
        contentLabel="Definir o Modificar Partido de Llave"
      >
        <h3>{formData.existingPartidoId ? "Modificar Partido" : "Definir Partido"} (Llave: {selectedMatchSeed?.id || 'N/A'})</h3>
        <form onSubmit={handleMatchSubmit}>
            {allowTeamSelectionForRound1 ? (
                <>
                    <div className="form-group">
                        <label htmlFor="localIdSelect">Local:</label>
                        <select
                            id="localIdSelect"
                            name="localId"
                            value={formData.localId}
                            onChange={(e) => handleSelectChange(e, 'local')}
                            required
                            className="form-input"
                        >
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
                        <select
                            id="visitanteIdSelect"
                            name="visitanteId"
                            value={formData.visitanteId}
                            onChange={(e) => handleSelectChange(e, 'visitante')}
                            required
                            className="form-input"
                        >
                            <option value="">Seleccionar Equipo/Jugador</option>
                            {availableParticipantsForDropdown.map(p => (
                                <option key={`visitante-${p.id}`} value={p.id} disabled={p.id === formData.localId}>
                                    {p.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                </>
            ) : (
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

            {/* Conditional Message */}
            {!allowTeamSelectionForRound1 && !formData.existingPartidoId && (formData.local === "Por determinar" || formData.visitante === "Por determinar") && (
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

             <div className="form-group">
                <label htmlFor="fecha">Fecha:</label>
                <input type="date" id="fecha" name="fecha" value={formData.fecha} onChange={handleFormChange} required className="form-input"/>
            </div>
            <div className="form-group">
                <label htmlFor="hora">Hora:</label>
                <input type="time" id="hora" name="hora" value={formData.hora} onChange={handleFormChange} required className="form-input"/>
            </div>
            <div className="modal-actions">
                <button type="submit" className="form-button primary">{formData.existingPartidoId ? "Actualizar Partido" : "Guardar Partido"}</button>
                <button type="button" onClick={() => closeModal('matchForm')} className="form-button secondary">Cancelar</button>
            </div>
        </form>
      </ReactModal>

      {/* resultForm Modal (remains the same) */}
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
            {tipoTorneo === 'torneo' && localScore !== "" && visitanteScore !== "" && localScore === visitanteScore && (
                <p style={{color: '#FF6D14', fontSize: '0.9em', textAlign: 'center'}}>Los empates no son válidos en eliminatorias.</p>
            )}
            <div className="modal-actions">
                <button type="submit" className="form-button primary">Guardar Resultado</button>
                <button type="button" onClick={() => closeModal('resultForm')} className="form-button secondary">Cancelar</button>
            </div>
        </form>
      </ReactModal>

      {/* info Modal (remains the same) */}
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
                {selectedMatchSeed.id && !(typeof selectedMatchSeed.id === 'number' || selectedMatchSeed.id?.toString().startsWith('Partido')) &&
                    <p><small>ID Partido (BD): {selectedMatchSeed.id}</small></p>
                }
                {!selectedMatchSeed.id && selectedMatchSeed.partidoId &&
                    <p><small>ID Partido (BD): {selectedMatchSeed.partidoId}</small></p>
                }
                {(!selectedMatchSeed.fecha || selectedMatchSeed.fecha === "Por definir") && (!rawPartidos.some(p => String(p.bracketMatchId) === String(selectedMatchSeed.bracketMatchId || selectedMatchSeed.id))) && (
                    <p style={{color: '#FFC107', fontSize: '0.9em'}}>Este partido de la llave aún no tiene fecha/hora asignada. Haz clic en la llave para definirlo.</p>
                )}
              </>
            )}
            <div className="modal-actions">
                <button type="button" onClick={() => closeModal('info')} className="form-button secondary">Cerrar</button>
            </div>
      </ReactModal>


      {!loading && tipoTorneo !== "torneo" && tipoTorneo !== "liga" && ( <div style={{ padding: '20px', textAlign: 'center', color: '#e0e0e0' }}> <h2>Clasificación</h2> <p>Tipo de torneo no configurado o no reconocido.</p> </div> )}
      {!loading && tipoTorneo === "torneo" && numParticipantes === 0 && ( <div style={{ padding: '20px', textAlign: 'center', color: '#e0e0e0' }}> <h2>Clasificación - Eliminatoria</h2> <p>Para generar las llaves, el torneo debe tener un número de participantes que sea una potencia de 2. Configure el número de equipos en los ajustes.</p> </div> )}
    </div>
  );
}

export default Clasificacion;