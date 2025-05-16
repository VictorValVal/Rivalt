import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"; // Added useRef
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
import { FaEye, FaDownload } from "react-icons/fa"; // Import icons
// IMPORTANT: You'll need to install html2canvas: npm install html2canvas
 import html2canvas from 'html2canvas'; // Uncomment after installing

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
    console.log("Novedad agregada:", mensaje);
  } catch (error) {
    console.error("Error al agregar novedad desde Clasificacion.js:", error);
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

  // --- NEW: State for View Mode and ref for content to download ---
  const [isViewMode, setIsViewMode] = useState(false);
  const contentRef = useRef(null); // Ref to capture the table or bracket

  useEffect(() => {
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
                 const idVal = p.id ?? p.capitan; 
                 const nameVal = p.nombre ?? (idVal ? `Equipo (${String(idVal).substring(0, 6)}...)` : null);
                 if (idVal && nameVal) {
                     return { id: String(idVal), nombre: String(nameVal) };
                 }
              } else if (typeof p === 'string' && p) {
                const participanteData = participantes.find(part => part.id === String(p));
                return { id: String(p), nombre: participanteData?.nombre || `Jugador (${String(p).substring(0,6)}...)` };
              }
              return null;
            })
            .filter(p => p && p.id); 
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
  }, [torneoId]); // Added 'participantes' to dependency array

  useEffect(() => {
    if (!torneoId) return;
    const partidosRef = collection(db, `torneos/${torneoId}/calendario`);
    const unsubscribe = onSnapshot(partidosRef, (snapshot) => {
      setRawPartidos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Clasificacion: Error fetching partidos:", error);
      setRawPartidos([]);
    });
    return () => unsubscribe(); 
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

  const participantIdsInGame = useMemo(() => {
     const ids = new Set();
     rawPartidos.forEach(p => {
         if (p.localId) ids.add(String(p.localId));
         if (p.visitanteId) ids.add(String(p.visitanteId));
     });
     return ids;
  }, [rawPartidos]);

  const availableParticipantsForNewMatch = useMemo(() => {
    return participantes.filter(p =>
         !eliminatedTeamIds.has(p.id) && !participantIdsInGame.has(p.id)
    );
  }, [participantes, eliminatedTeamIds, participantIdsInGame]);

  const openModal = useCallback((modalName) => setModalStates(prev => ({ ...prev, [modalName]: true })), []);
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
      local: localTeam.nombre,
      visitante: visitanteTeam.nombre,
      bracketMatchId: String(selectedMatchSeed.id),
    };

    try {
      let partidoIdCreado;
      if (formData.existingPartidoId) {
        const partidoRef = doc(db, `torneos/${torneoId}/calendario`, formData.existingPartidoId);
        await updateDoc(partidoRef, {
            fecha: matchData.fecha,
            hora: matchData.hora,
        });
        partidoIdCreado = formData.existingPartidoId;
        console.log("Partido modificado:", formData.existingPartidoId);
        await agregarNovedad(
          torneoId,
          `El partido ${matchData.local} vs ${matchData.visitante} (Llave: ${matchData.bracketMatchId}) ha sido actualizado a ${matchData.fecha} ${matchData.hora}.`,
          'match_schedule_update',
          { 
            partidoId: partidoIdCreado, 
            local: matchData.local, 
            visitante: matchData.visitante, 
            fecha: matchData.fecha, 
            hora: matchData.hora,
            bracketMatchId: matchData.bracketMatchId
          }
        );
      } else {
        const newDocRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), {
           ...matchData,
           resultado: null,
           createdAt: serverTimestamp()
        });
        partidoIdCreado = newDocRef.id;
        console.log("Partido creado para bracketMatchId:", selectedMatchSeed.id, "con ID de Firestore:", partidoIdCreado);
        
        await agregarNovedad(
          torneoId,
          `Nuevo partido programado desde llaves: ${matchData.local} vs ${matchData.visitante} para el ${matchData.fecha} a las ${matchData.hora} (Llave: ${matchData.bracketMatchId}).`,
          'match_add',
          { 
            partidoId: partidoIdCreado, 
            local: matchData.local, 
            visitante: matchData.visitante, 
            fecha: matchData.fecha, 
            hora: matchData.hora,
            bracketMatchId: matchData.bracketMatchId
          }
        );
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

    const resultadoFinal = `${score1}-${score2}`;

    try {
      const partidoRef = doc(db, `torneos/${torneoId}/calendario`, selectedResultPartido.id);
      await updateDoc(partidoRef, { resultado: resultadoFinal });
      console.log("Resultado guardado para partido:", selectedResultPartido.id);

      await agregarNovedad(
        torneoId,
        `Resultado actualizado para ${selectedResultPartido.local} vs ${selectedResultPartido.visitante}: ${resultadoFinal}. (Llave: ${selectedResultPartido.bracketMatchId || 'N/A'})`,
        'match_result',
        { 
          partidoId: selectedResultPartido.id, 
          local: selectedResultPartido.local, 
          visitante: selectedResultPartido.visitante, 
          resultado: resultadoFinal,
          bracketMatchId: selectedResultPartido.bracketMatchId
        }
      );
      closeModal('resultForm');
    } catch (error) {
      console.error("Error saving result:", error);
      alert("Error al guardar el resultado.");
    }
  };

  const handleBracketClick = useCallback((seed) => {
    const partido = rawPartidos.find(p => String(p.bracketMatchId) === String(seed.id));
    if (partido) {
      setSelectedMatchSeed(partido); 
      openModal('info');
    } else {
      const localTeam = seed.teams?.[0];
      const visitanteTeam = seed.teams?.[1];
  
      setSelectedMatchSeed(seed); 
      setFormData({
        ...initialFormData,
        localId: localTeam?.id || "", 
        visitanteId: visitanteTeam?.id || "", 
        local: localTeam?.name || "Por determinar", 
        visitante: visitanteTeam?.name || "Por determinar", 
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
      const localTeamDetails = participantes.find(p => p.id === String(seed.teams[0]?.id));
      const visitanteTeamDetails = participantes.find(p => p.id === String(seed.teams[1]?.id));

      setSelectedMatchSeed(seed);
      setFormData({
          ...initialFormData,
          localId: seed.teams[0]?.id || "",
          visitanteId: seed.teams[1]?.id || "",
          local: localTeamDetails?.nombre || seed.teams[0]?.name || "Por determinar",
          visitante: visitanteTeamDetails?.nombre || seed.teams[1]?.name || "Por determinar",
          existingPartidoId: null 
      });
      openModal('matchForm');
    }
  }, [rawPartidos, openModal, participantes]);

  const handleAddResultClick = useCallback(async (seed) => {
    let partido = rawPartidos.find(p => String(p.bracketMatchId) === String(seed.id));
    let partidoIdToUse = partido?.id;

    if (!partido && seed.teams[0]?.id && seed.teams[1]?.id) {
      const localTeamDetails = participantes.find(p => String(p.id) === String(seed.teams[0].id));
      const visitanteTeamDetails = participantes.find(p => String(p.id) === String(seed.teams[1].id));

      if (localTeamDetails && visitanteTeamDetails) {
        try {
          const newPartidoData = {
            fecha: "Por definir", hora: "Por definir",
            localId: localTeamDetails.id, visitanteId: visitanteTeamDetails.id,
            bracketMatchId: String(seed.id), local: localTeamDetails.nombre,
            visitante: visitanteTeamDetails.nombre, resultado: null,
            createdAt: serverTimestamp(),
          };
          const newPartidoRef = await addDoc(collection(db, `torneos/${torneoId}/calendario`), newPartidoData);
          partidoIdToUse = newPartidoRef.id;
          partido = { id: partidoIdToUse, ...newPartidoData };
          console.log("Implicitly created partido for result entry:", partidoIdToUse);
          await agregarNovedad(
            torneoId,
            `Partido (Llave: ${newPartidoData.bracketMatchId}) entre ${newPartidoData.local} y ${newPartidoData.visitante} definido y listo para resultado.`,
            'match_add', 
            { 
              partidoId: partidoIdToUse, 
              local: newPartidoData.local, 
              visitante: newPartidoData.visitante,
              bracketMatchId: newPartidoData.bracketMatchId
            }
          );
        } catch (error) {
          console.error("Error implicitly creating partido for result:", error);
          alert("Error al preparar automáticamente el partido para el resultado."); return;
        }
      } else {
        console.error("Cannot implicitly create partido for result: Team details not found for IDs:", seed.teams[0]?.id, seed.teams[1]?.id);
        alert("Error: No se encontraron los detalles de los equipos que avanzaron para preparar el partido."); return;
      }
    }

    if (partido && partidoIdToUse) {
      const finalPartidoObject = { 
          ...partido, 
          id: partidoIdToUse, 
          bracketMatchId: partido.bracketMatchId || String(seed.id) 
      };
      setSelectedResultPartido(finalPartidoObject);
      if (finalPartidoObject.resultado && finalPartidoObject.resultado.includes('-')) {
        const [s1, s2] = finalPartidoObject.resultado.split('-');
        setLocalScore(s1); setVisitanteScore(s2);
      } else {
        setLocalScore(""); setVisitanteScore("");
      }
      openModal('resultForm');
    } else {
      console.error("Cannot open result modal, partido object missing or incomplete for seed:", seed);
      alert("No se pudo preparar el partido para añadir resultado. Asegúrate de que los equipos estén definidos.");
    }
  }, [rawPartidos, participantes, torneoId, openModal]);

  // --- NEW: View Mode and Download Functions ---
  const toggleViewMode = () => {
    setIsViewMode(!isViewMode);
  };

  const handleDownloadImage = async () => {
   
     const elementToCapture = contentRef.current;
     if (elementToCapture && typeof html2canvas === 'function') { // Check if html2canvas is loaded
     try {
         const canvas = await html2canvas(elementToCapture, {
           backgroundColor: tipoTorneo === "torneo" ? '#121212' : '#1e1e1e', // Match your background
          scale: 2, // Increase scale for better resolution
           useCORS: true, // If you have external images/fonts
         });
         const image = canvas.toDataURL("image/png");
         const link = document.createElement("a");
         link.href = image;
         link.download = tipoTorneo === "torneo" ? "llaves_torneo.png" : "tabla_clasificacion.png";
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
       } catch (error) {
         console.error("Error al generar la imagen:", error);
         alert("Hubo un error al generar la imagen para descargar.");
       }
     } else if (!elementToCapture) {
       alert("No hay contenido para descargar.");
     } else {

     }
  };


  if (loading) return <div>Cargando información del torneo...</div>;

  // --- NEW: Conditional rendering for View Mode ---
  if (isViewMode) {
    return (
      <div className="clasificacion-view-mode">
        <div ref={contentRef} className="clasificacion-view-mode-content">
          {tipoTorneo === "torneo" && numParticipantes > 0 && (
            <Llaves
              numParticipantes={numParticipantes}
              rawPartidos={rawPartidos}
              onMatchClick={() => {}} // No interactive in view mode
              onModify={() => {}}
              onAddResult={() => {}}
            />
          )}
          {tipoTorneo === "liga" && (
            <Tabla rawPartidos={rawPartidos} participantes={participantes} />
          )}
        </div>
        <div className="clasificacion-view-mode-controls">
          <button onClick={toggleViewMode} className="view-mode-button" title="Salir de pantalla completa">
            <FaEye />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="clasificacion-container">
      <div ref={contentRef}> {/* Add ref here for download */}
        {tipoTorneo === "torneo" && numParticipantes > 0 && (
          <Llaves
            numParticipantes={numParticipantes}
            rawPartidos={rawPartidos}
            onMatchClick={handleBracketClick}
            onModify={handleModifyClick}
            onAddResult={handleAddResultClick}
          />
        )}

        {tipoTorneo === "liga" && <Tabla rawPartidos={rawPartidos} participantes={participantes}/>}
      </div>
      
      {/* --- NEW: Action Buttons Container --- */}
      {(tipoTorneo === "torneo" && numParticipantes > 0) || tipoTorneo === "liga" ? (
        <div className="clasificacion-actions-container">
          <button onClick={toggleViewMode} className="view-mode-button" title="Ver en pantalla completa">
            <FaEye />
          </button>
          <button onClick={handleDownloadImage} className="download-button" title="Descargar imagen">
            <FaDownload />
          </button>
        </div>
      ) : null}


      {/* Modals (unchanged) */}
      <ReactModal isOpen={modalStates.matchForm} onRequestClose={() => closeModal('matchForm')} contentLabel="Crear o Modificar Partido">
        {/* ... form content ... */}
      </ReactModal>

      <ReactModal isOpen={modalStates.resultForm} onRequestClose={() => closeModal('resultForm')} contentLabel="Añadir Resultado">
        {/* ... form content ... */}
      </ReactModal>

      <ReactModal isOpen={modalStates.info} onRequestClose={() => closeModal('info')} contentLabel="Información del Partido" className="ReactModal__Content info-modal">
         <h3>Información del Partido</h3>
            {selectedMatchSeed && ( 
              <>
                <p>
                  <strong>Local:</strong> {selectedMatchSeed.local || "?"}
                  {selectedMatchSeed.resultado?.includes('-') ? ` (${selectedMatchSeed.resultado.split('-')[0]})` : ''}
                </p>
                <p>
                  <strong>Visitante:</strong> {selectedMatchSeed.visitante || "?"}
                  {selectedMatchSeed.resultado?.includes('-') ? ` (${selectedMatchSeed.resultado.split('-')[1]})` : ''}
                </p>
                {selectedMatchSeed.resultado && (
                  <p><strong>Resultado:</strong> {selectedMatchSeed.resultado}</p>
                )}
                <p><strong>Fecha:</strong> {selectedMatchSeed.fecha || "Por definir"}</p>
                <p><strong>Hora:</strong> {selectedMatchSeed.hora || "Por definir"}</p>
                <hr/>
                <p><small>ID Partido (Firestore): {selectedMatchSeed.id}</small></p>
                <p><small>ID Casilla (Bracket): {selectedMatchSeed.bracketMatchId}</small></p>
              </>
            )}
            <div className="modal-actions">
                <button onClick={() => closeModal('info')} className="form-button secondary">Cerrar</button>
            </div>
      </ReactModal>


      {!loading && tipoTorneo !== "torneo" && tipoTorneo !== "liga" && (
        <div>
          <h2>Clasificación</h2>
          <p>Tipo de torneo no configurado o no reconocido.</p>
        </div>
      )}
      {!loading && tipoTorneo === "torneo" && numParticipantes === 0 && (
        <div>
          <h2>Clasificación - Eliminatoria</h2>
          <p>Configure un número de participantes (potencia de 2) en los ajustes del torneo para generar las llaves.</p>
        </div>
      )}
    </div>
  );
}

export default Clasificacion;