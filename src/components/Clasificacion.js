import React, { useEffect, useState, useMemo, useCallback } from "react";
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
import { app } from "../firebase"; // Asegúrate que la ruta es correcta
import Llaves from "./Llaves";
import Tabla from "./Tabla";
import ReactModal from "react-modal";
import "./estilos/Clasificacion.css";

const db = getFirestore(app);
ReactModal.setAppElement("#root"); // O el selector de tu elemento raíz

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

  // --- State ---
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

  // --- Effects ---
  useEffect(() => {
    // Fetch Torneo Info and Participantes
    setLoading(true);
    const torneoRef = doc(db, "torneos", torneoId);
    getDoc(torneoRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTipoTorneo(data.tipo);
          const participantesRaw = data.participantes || [];
          const participantesFormateados = participantesRaw
            .map((p) => {
              if (typeof p === 'object' && p !== null) {
                 const idVal = p.id ?? p.capitan; // Prioritize id, fallback to capitan
                 const nameVal = p.nombre ?? (idVal ? `Equipo (${String(idVal).substring(0, 6)}...)` : null);
                 if (idVal && nameVal) {
                     return { id: String(idVal), nombre: String(nameVal) };
                 }
              } else if (typeof p === 'string' && p) {
                return { id: String(p), nombre: String(p) };
              }
              return null;
            })
            .filter(p => p && p.id); // Ensure valid object with ID
          setParticipantes(participantesFormateados);

          const num = Number(data.numEquipos) || 0;
          if (data.tipo === "torneo" && num > 0 && Number.isInteger(Math.log2(num))) {
            setNumParticipantes(num);
          } else {
            setNumParticipantes(0);
            if (data.tipo === "torneo") console.error("Clasificacion: Número de participantes inválido para eliminatoria.");
          }
        } else {
          console.error("Clasificacion: Torneo no encontrado con ID:", torneoId);
          setTipoTorneo(null); setNumParticipantes(0);
        }
      })
      .catch((error) => {
        console.error("Clasificacion: Error fetching tournament:", error);
        setTipoTorneo(null); setNumParticipantes(0);
      })
      .finally(() => setLoading(false));
  }, [torneoId]);

  useEffect(() => {
    // Subscribe to Partidos changes
    if (!torneoId) return;
    const partidosRef = collection(db, `torneos/${torneoId}/calendario`);
    const unsubscribe = onSnapshot(partidosRef, (snapshot) => {
      setRawPartidos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Clasificacion: Error fetching partidos:", error);
      setRawPartidos([]);
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [torneoId]);

  // --- Memos ---
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
    return losers; // Return Set for faster lookups
  }, [rawPartidos]);

  const participantIdsInGame = useMemo(() => {
     const ids = new Set();
     rawPartidos.forEach(p => {
         if (p.localId) ids.add(String(p.localId));
         if (p.visitanteId) ids.add(String(p.visitanteId));
     });
     return ids;
  }, [rawPartidos]);

  // Available for completely new matches (not already in a game or eliminated)
  const availableParticipantsForNewMatch = useMemo(() => {
    return participantes.filter(p =>
         !eliminatedTeamIds.has(p.id) && !participantIdsInGame.has(p.id)
    );
  }, [participantes, eliminatedTeamIds, participantIdsInGame]);

  // --- Modal Control ---
  const openModal = useCallback((modalName) => setModalStates(prev => ({ ...prev, [modalName]: true })), []);
  const closeModal = useCallback((modalName) => {
    setModalStates(prev => ({ ...prev, [modalName]: false }));
    // Reset relevant states on close
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

  // --- Event Handlers ---
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSelectChange = useCallback((e, teamType) => {
    const { value } = e.target;
    const selectedParticipant = participantes.find((p) => String(p.id) === String(value));
    setFormData((prev) => ({
      ...prev,
      [`${teamType}Id`]: value,
      [`${teamType}`]: selectedParticipant ? selectedParticipant.nombre : "",
    }));
  }, [participantes]);

  const handleMatchSubmit = async (e) => {
    e.preventDefault();
    if (!formData.localId || !formData.visitanteId || !formData.fecha || !formData.hora || !selectedMatchSeed?.id) {
      alert("Datos incompletos para guardar el partido.");
      return;
    }

    // Find full team objects (needed for names)
    const localTeam = participantes.find(p => String(p.id) === String(formData.localId));
    const visitanteTeam = participantes.find(p => String(p.id) === String(formData.visitanteId));

    if (!localTeam || !visitanteTeam) {
       alert("Error: No se encontraron los detalles completos de los equipos seleccionados.");
       return;
    }

    const matchData = {
      fecha: formData.fecha,
      hora: formData.hora,
      localId: formData.localId,
      visitanteId: formData.visitanteId,
      local: localTeam.nombre, // Use fetched name
      visitante: visitanteTeam.nombre, // Use fetched name
      bracketMatchId: String(selectedMatchSeed.id),
    };

    try {
      if (formData.existingPartidoId) {
        // Update only date and time for existing matches
        const partidoRef = doc(db, `torneos/${torneoId}/calendario`, formData.existingPartidoId);
        await updateDoc(partidoRef, {
            fecha: matchData.fecha,
            hora: matchData.hora,
        });
        console.log("Partido modificado:", formData.existingPartidoId);
      } else {
        // Create new match document with null result
        await addDoc(collection(db, `torneos/${torneoId}/calendario`), {
           ...matchData,
           resultado: null,
           createdAt: serverTimestamp()
        });
        console.log("Partido creado para bracketMatchId:", selectedMatchSeed.id);
      }
      closeModal('matchForm');
    } catch (error) {
      console.error("Error saving match:", error);
      alert(`Error al ${formData.existingPartidoId ? 'modificar' : 'crear'} el partido.`);
    }
  };

  const handleResultSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResultPartido?.id || localScore === "" || visitanteScore === "") {
      alert("Datos incompletos para guardar el resultado.");
      return;
    }
    const score1 = parseInt(localScore, 10);
    const score2 = parseInt(visitanteScore, 10);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      alert("Puntajes inválidos.");
      return;
    }

    try {
      const partidoRef = doc(db, `torneos/${torneoId}/calendario`, selectedResultPartido.id);
      await updateDoc(partidoRef, { resultado: `${score1}-${score2}` });
      console.log("Resultado guardado para partido:", selectedResultPartido.id);
      closeModal('resultForm');
    } catch (error) {
      console.error("Error saving result:", error);
      alert("Error al guardar el resultado.");
    }
  };

  // Click handlers passed to Llaves component
  const handleBracketClick = useCallback((seed) => {
    const partido = rawPartidos.find(p => String(p.bracketMatchId) === String(seed.id));
    if (partido) {
      setSelectedMatchSeed(partido);
      openModal('info');
    } else {
      // Verificar que seed.teams está definido y tiene al menos dos elementos
      const localTeam = seed.teams?.[0];
      const visitanteTeam = seed.teams?.[1];
  
      setSelectedMatchSeed(seed);
      setFormData({
        ...initialFormData,
        localId: localTeam?.id || "",
        visitanteId: visitanteTeam?.id || "",
        local: localTeam?.name || "",
        visitante: visitanteTeam?.name || "",
      });
      openModal('matchForm');
    }
  }, [rawPartidos, openModal]);

  const handleModifyClick = useCallback((seed) => {
    const partido = rawPartidos.find(p => String(p.bracketMatchId) === String(seed.id) && p.id === seed.partidoId);
    if (partido) {
      setSelectedMatchSeed(seed);
      setFormData({
        fecha: partido.fecha === "Por definir" ? "" : partido.fecha || "",
        hora: partido.hora === "Por definir" ? "" : partido.hora || "",
        localId: partido.localId || "",
        visitanteId: partido.visitanteId || "",
        local: partido.local || "",
        visitante: partido.visitante || "",
        existingPartidoId: partido.id
      });
      openModal('matchForm');
    } else {
      console.warn("Modify clicked but no corresponding partido found for seed:", seed);
    }
  }, [rawPartidos, openModal]); // Dependency: rawPartidos, openModal

  const handleAddResultClick = useCallback(async (seed) => {
    let partido = rawPartidos.find(p => String(p.bracketMatchId) === String(seed.id));
    let partidoIdToUse = partido?.id;

    // Implicitly create Firestore document if it doesn't exist but teams are set
    if (!partido && seed.teams[0]?.id && seed.teams[1]?.id) {
      const localTeam = participantes.find(p => String(p.id) === String(seed.teams[0].id));
      const visitanteTeam = participantes.find(p => String(p.id) === String(seed.teams[1].id));

      if (localTeam && visitanteTeam) {
        try {
          const newPartidoData = {
            fecha: "Por definir", hora: "Por definir",
            localId: localTeam.id, visitanteId: visitanteTeam.id,
            bracketMatchId: String(seed.id), local: localTeam.nombre,
            visitante: visitanteTeam.nombre, resultado: null,
            createdAt: serverTimestamp(),
          };
          const newPartidoRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), newPartidoData);
          partidoIdToUse = newPartidoRef.id;
          partido = { id: partidoIdToUse, ...newPartidoData }; // Use newly created data
          console.log("Implicitly created partido:", partidoIdToUse);
        } catch (error) {
          console.error("Error implicitly creating partido:", error);
          alert("Error al crear automáticamente el partido."); return;
        }
      } else {
        console.error("Cannot implicitly create partido: Team details not found for IDs:", seed.teams[0]?.id, seed.teams[1]?.id);
        alert("Error: No se encontraron los detalles de los equipos que avanzaron."); return;
      }
    }

    if (partido && partidoIdToUse) {
      const finalPartidoObject = { ...partido, id: partidoIdToUse };
      setSelectedResultPartido(finalPartidoObject);
      if (finalPartidoObject.resultado && finalPartidoObject.resultado.includes('-')) {
        const [s1, s2] = finalPartidoObject.resultado.split('-');
        setLocalScore(s1); setVisitanteScore(s2);
      } else {
        setLocalScore(""); setVisitanteScore("");
      }
      openModal('resultForm');
    } else {
      console.error("Cannot open result modal, partido object missing for seed:", seed);
      alert("No se pudo preparar el partido para añadir resultado.");
    }
  }, [rawPartidos, participantes, torneoId, openModal]); // Dependencies

  // --- Render ---
  if (loading) return <div>Cargando información del torneo...</div>;

  return (
    <div className="clasificacion-container">
      {tipoTorneo === "torneo" && numParticipantes > 0 && (
        <>
          <Llaves
            numParticipantes={numParticipantes}
            rawPartidos={rawPartidos}
            onMatchClick={handleBracketClick}
            onModify={handleModifyClick}
            onAddResult={handleAddResultClick}
          />

          {/* Match Creation/Modification Modal */}
          <ReactModal isOpen={modalStates.matchForm} onRequestClose={() => closeModal('matchForm')} contentLabel="Crear o Modificar Partido">
            <h3>{formData.existingPartidoId ? "Modificar Partido" : "Crear/Definir Partido"}</h3>
            <form onSubmit={handleMatchSubmit}>
              <div className="form-group">
                <label htmlFor="fecha">Fecha:</label>
                <input id="fecha" type="date" name="fecha" value={formData.fecha} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="hora">Hora:</label>
                <input id="hora" type="time" name="hora" value={formData.hora} onChange={handleFormChange} required />
              </div>
              <div className="form-group">
                 <label htmlFor="localIdSelect">Equipo Local:</label>
                 {formData.existingPartidoId || (selectedMatchSeed?.teams[0]?.id && !formData.existingPartidoId) ? (
                      <input type="text" value={formData.local || "Equipo Avanzado"} disabled />
                  ) : (
                      <select id="localIdSelect" name="localId" value={formData.localId} onChange={(e) => handleSelectChange(e, 'local')} required>
                          <option value="">Seleccionar</option>
                          {availableParticipantsForNewMatch.map((p) => ( <option key={p.id} value={p.id}>{p.nombre}</option> ))}
                          {formData.localId && !availableParticipantsForNewMatch.find(p=>p.id===formData.localId) && <option value={formData.localId}>{formData.local || `ID: ${formData.localId}`}</option>}
                      </select>
                  )}
              </div>
              <div className="form-group">
                   <label htmlFor="visitanteIdSelect">Equipo Visitante:</label>
                   {formData.existingPartidoId || (selectedMatchSeed?.teams[1]?.id && !formData.existingPartidoId) ? (
                       <input type="text" value={formData.visitante || "Equipo Avanzado"} disabled />
                   ) : (
                       <select id="visitanteIdSelect" name="visitanteId" value={formData.visitanteId} onChange={(e) => handleSelectChange(e, 'visitante')} required>
                           <option value="">Seleccionar</option>
                           {availableParticipantsForNewMatch.map((p) => ( <option key={p.id} value={p.id} disabled={p.id === formData.localId}>{p.nombre}</option> ))}
                           {formData.visitanteId && !availableParticipantsForNewMatch.find(p=>p.id===formData.visitanteId) && <option value={formData.visitanteId}>{formData.visitante || `ID: ${formData.visitanteId}`}</option>}
                       </select>
                   )}
              </div>
              <button type="submit">{formData.existingPartidoId ? "Guardar Cambios" : "Crear/Guardar Partido"}</button>
              <button type="button" onClick={() => closeModal('matchForm')}>Cancelar</button>
            </form>
          </ReactModal>

          {/* Add Result Modal */}
          <ReactModal isOpen={modalStates.resultForm} onRequestClose={() => closeModal('resultForm')} contentLabel="Añadir Resultado">
            <h3>Añadir/Editar Resultado</h3>
            <form onSubmit={handleResultSubmit}>
              <p><strong>{selectedResultPartido?.local || "?"}</strong> vs <strong>{selectedResultPartido?.visitante || "?"}</strong></p>
              <div className="form-group">
                <label htmlFor="localScoreInput">{selectedResultPartido?.local || "Local"}:</label>
                <input id="localScoreInput" type="number" value={localScore} onChange={(e) => setLocalScore(e.target.value)} min="0" required />
              </div>
              <div className="form-group">
                <label htmlFor="visitanteScoreInput">{selectedResultPartido?.visitante || "Visitante"}:</label>
                <input id="visitanteScoreInput" type="number" value={visitanteScore} onChange={(e) => setVisitanteScore(e.target.value)} min="0" required />
              </div>
              <button type="submit">Guardar Resultado</button>
              <button type="button" onClick={() => closeModal('resultForm')}>Cancelar</button>
            </form>
          </ReactModal>

          {/* Match Info Modal */}
          <ReactModal isOpen={modalStates.info} onRequestClose={() => closeModal('info')} contentLabel="Información del Partido">
   <h3>Información del Partido</h3>
   {selectedMatchSeed && (
     <>
       <p>
         <strong>Local:</strong> {selectedMatchSeed.local || "?"}
         {/* CORRECCIÓN: Usar optional chaining y verificar includes('-') antes de split */}
         {selectedMatchSeed.resultado?.includes('-') ? ` (${selectedMatchSeed.resultado.split('-')[0]})` : ''}
       </p>
       <p>
         <strong>Visitante:</strong> {selectedMatchSeed.visitante || "?"}
          {/* CORRECCIÓN: Usar optional chaining y verificar includes('-') antes de split */}
         {selectedMatchSeed.resultado?.includes('-') ? ` (${selectedMatchSeed.resultado.split('-')[1]})` : ''}
       </p>
       {/* Mostrar el resultado completo siempre que exista */}
       {selectedMatchSeed.resultado && (
         <p><strong>Resultado:</strong> {selectedMatchSeed.resultado}</p>
       )}
       <p><strong>Fecha:</strong> {selectedMatchSeed.fecha || "?"}</p>
       <p><strong>Hora:</strong> {selectedMatchSeed.hora || "?"}</p>
       <hr/>
       <p><small>ID Partido (Firestore): {selectedMatchSeed.id}</small></p>
       <p><small>ID Casilla (Bracket): {selectedMatchSeed.bracketMatchId}</small></p>
     </>
   )}
   <button onClick={() => closeModal('info')}>Cerrar</button>
 </ReactModal>
        </>
      )}

      {tipoTorneo === "liga" && <Tabla rawPartidos={rawPartidos} participantes={participantes}/>}

      {!loading && tipoTorneo !== "torneo" && tipoTorneo !== "liga" && (
        <div>
          <h2>Clasificación</h2>
          <p>Tipo de torneo no configurado o no reconocido.</p>
        </div>
      )}
      {!loading && tipoTorneo === "torneo" && numParticipantes === 0 && (
        <div>
          <h2>Clasificación - Eliminatoria</h2>
          <p>Configure un número de participantes (potencia de 2) en los ajustes del torneo.</p>
        </div>
      )}
    </div>
  );
}

export default Clasificacion;