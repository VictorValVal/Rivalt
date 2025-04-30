import React, { useEffect, useState, useMemo } from "react"; // Import useMemo
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, onSnapshot, addDoc, updateDoc } from "firebase/firestore";
import { app } from "../firebase";
import Llaves from "./Llaves";
import Tabla from "./Tabla";
import ReactModal from "react-modal";

const db = getFirestore(app);

ReactModal.setAppElement("#root"); // Asegúrate de que el elemento raíz esté configurado correctamente

function Clasificacion() {
  const { id: torneoId } = useParams();
  const [tipoTorneo, setTipoTorneo] = useState(null);
  const [numParticipantes, setNumParticipantes] = useState(0);
  const [rawPartidos, setRawPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedMatchSeed, setSelectedMatchSeed] = useState(null); // Store the seed clicked for match creation/info
  const [selectedResultPartido, setSelectedResultPartido] = useState(null); // Store the raw partido for adding result
  const [localScore, setLocalScore] = useState("");
  const [visitanteScore, setVisitanteScore] = useState("");
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    localId: "",
    visitanteId: "",
    local: "", // To store name if pre-filled
    visitante: "", // To store name if pre-filled
  });

  const [participantes, setParticipantes] = useState([]); // All participants

  useEffect(() => {
    setLoading(true);
    const torneoRef = doc(db, "torneos", torneoId);
    getDoc(torneoRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTipoTorneo(data.tipo);

          const participantesRaw = data.participantes || [];
          // Ensure participant IDs are treated consistently (e.g., as strings)
          const participantesFormateados = participantesRaw
            .map((p) => {
              if (typeof p === "object" && (p.nombre || p.capitan)) {
                return {
                  id: String(p.id || p.capitan), // Ensure ID is a string
                  nombre: p.nombre || `Equipo (Cap: ${String(p.capitan || '').substring(0, 6)}...)`,
                };
              } else if (typeof p === "string") {
                return { id: String(p), nombre: String(p) }; // Ensure ID and name are strings
              }
              return null;
            })
            .filter(Boolean);

          setParticipantes(participantesFormateados);

          const num = Number(data.numEquipos) || 0;
          if (data.tipo === "torneo" && num > 0 && Number.isInteger(Math.log2(num))) {
            setNumParticipantes(num);
          } else {
            setNumParticipantes(0); // Invalid number for elimination
            if (data.tipo === "torneo") {
              console.error("Número de participantes para torneo de eliminación debe ser potencia de 2.");
            }
          }
        } else {
          console.error("No tournament found with ID:", torneoId);
          setTipoTorneo(null);
          setNumParticipantes(0);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching tournament:", error);
        setTipoTorneo(null);
        setNumParticipantes(0);
        setLoading(false);
      });
  }, [torneoId]);

  useEffect(() => {
    if (!torneoId) return;

    const partidosRef = collection(db, `torneos/${torneoId}/calendario`);
    const unsubscribe = onSnapshot(
      partidosRef,
      (snapshot) => {
        const fetchedPartidos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRawPartidos(fetchedPartidos);
      },
      (error) => {
        console.error("Error fetching partidos:", error);
        setRawPartidos([]);
      }
    );

    return () => unsubscribe();
  }, [torneoId]);

  // Calculate eliminated team IDs
  const eliminatedTeamIds = useMemo(() => {
    const losers = new Set();
    rawPartidos.forEach(partido => {
      if (partido.resultado && partido.resultado.includes('-')) {
        const [score1, score2] = partido.resultado.split('-').map(Number);
        // Assuming no ties or ties lead to one declared winner
        if (score1 < score2 && partido.localId) {
          losers.add(String(partido.localId)); // Ensure ID is string
        } else if (score2 < score1 && partido.visitanteId) {
          losers.add(String(partido.visitanteId)); // Ensure ID is string
        }
      }
    });
    //console.log("Eliminated IDs:", Array.from(losers)); // Debugging
    return Array.from(losers);
  }, [rawPartidos]);
  // Equipos ya seleccionados en partidos existentes
const selectedTeamIds = useMemo(() => {
  const selectedIds = new Set();
  rawPartidos.forEach((partido) => {
    if (partido.localId) selectedIds.add(partido.localId);
    if (partido.visitanteId) selectedIds.add(partido.visitanteId);
  });
  return Array.from(selectedIds);
}, [rawPartidos]);

  // Filter participants to get available ones for selection
  const availableParticipants = useMemo(() => {
    return participantes.filter(
      (p) => !eliminatedTeamIds.includes(p.id) && !selectedTeamIds.includes(p.id)
    );
  }, [participantes, eliminatedTeamIds, selectedTeamIds]);


  const handleCreateMatch = async (e) => {
    e.preventDefault();

    // Check if both slots are filled (either pre-filled or manually selected)
    if (!formData.localId || !formData.visitanteId) {
      alert("Por favor complete ambos equipos");
      return;
    }
    if (!formData.fecha || !formData.hora) {
      alert("Por favor complete fecha y hora");
      return;
    }

    try {
      // Find team names using the IDs from formData (which might be pre-filled)
      const localTeam = participantes.find(p => p.id === formData.localId);
      const visitanteTeam = participantes.find(p => p.id === formData.visitanteId);

      if (!localTeam || !visitanteTeam) {
        alert("Error: Equipos no encontrados.");
        return;
      }

      await addDoc(collection(db, `torneos/${torneoId}/calendario`), {
        fecha: formData.fecha,
        hora: formData.hora,
        localId: formData.localId,
        visitanteId: formData.visitanteId,
        bracketMatchId: selectedMatchSeed.id.toString(), // Use the seed ID clicked
        local: localTeam.nombre, // Use found names
        visitante: visitanteTeam.nombre, // Use found names
        resultado: null, // Initially no result
      });

      setShowMatchForm(false);
      // Reset form data after successful creation
      setFormData({ fecha: "", hora: "", localId: "", visitanteId: "", local: "", visitante: "" });
      setSelectedMatchSeed(null); // Clear selected seed
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Error al crear el partido");
    }
  };

  const handleAddResult = async (e) => {
    e.preventDefault();
  
    if (!selectedResultPartido || localScore === "" || visitanteScore === "") {
      alert("Por favor complete ambos puntajes");
      return;
    }
  
    const score1 = parseInt(localScore, 10);
    const score2 = parseInt(visitanteScore, 10);
  
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      alert("Por favor ingrese puntajes numéricos válidos (>= 0).");
      return;
    }
  
    try {
      const partidoRef = doc(db, `torneos/${torneoId}/calendario`, selectedResultPartido.id);
      await updateDoc(partidoRef, {
        resultado: `${score1}-${score2}`, // Guardar como "score1-score2"
      });
  
      // Actualizar el estado local para reflejar el cambio
      setRawPartidos((prevPartidos) =>
        prevPartidos.map((p) =>
          p.id === selectedResultPartido.id
            ? { ...p, resultado: `${score1}-${score2}` }
            : p
        )
      );
  
      setShowResultForm(false);
      setLocalScore("");
      setVisitanteScore("");
      setSelectedResultPartido(null); // Limpiar el partido seleccionado
    } catch (error) {
      console.error("Error al actualizar resultado:", error);
      alert("Error al guardar el resultado");
    }
  };

  // Handle click on a seed/match slot in the bracket
  const handleBracketMatchClick = (seed) => {
    const partido = rawPartidos.find(p => p.bracketMatchId === seed.id.toString());

    if (partido) {
      // If a partido exists for this seed, show info modal
      setSelectedMatchSeed(partido); // Store the raw partido for info
      setShowInfoModal(true);
    } else {
      // If no partido exists, show create match form
      setSelectedMatchSeed(seed); // Store the seed object for form context

      // Initialize form data, pre-filling teams if they've advanced
      setFormData({
        fecha: "",
        hora: "",
        localId: seed.teams[0]?.id || "",
        visitanteId: seed.teams[1]?.id || "",
        local: seed.teams[0]?.name || "", // Store name for display if pre-filled
        visitante: seed.teams[1]?.name || "", // Store name for display if pre-filled
      });
      setShowMatchForm(true);
    }
  };

  // Handle click on Modify button in the bracket
  const handleModifyMatch = (seed) => {
    const partido = rawPartidos.find(p => p.bracketMatchId === seed.id.toString());
    if (partido) {
      setSelectedMatchSeed(seed); // Store seed for context
      // Initialize form data with existing partido data
      setFormData({
        fecha: partido.fecha || "",
        hora: partido.hora || "",
        localId: partido.localId || "",
        visitanteId: partido.visitanteId || "",
        local: partido.local || "",
        visitante: partido.visitante || "",
      });
      setShowMatchForm(true); // Open the modal
    }
  };

  // Handle click on Add Result button in the bracket
  const handleAddResultClick = (seed) => {
    const partido = rawPartidos.find(p => p.bracketMatchId === seed.id.toString());
    if (partido) {
      setSelectedResultPartido(partido); // Store the raw partido for result form
      // Pre-fill score if it exists
      if (partido.resultado && partido.resultado.includes('-')) {
        const [score1, score2] = partido.resultado.split('-');
        setLocalScore(score1);
        setVisitanteScore(score2);
      } else {
        setLocalScore("");
        setVisitanteScore("");
      }
      setShowResultForm(true);
    }
  };
  

  if (loading) {
    return <div>Cargando información del torneo...</div>;
  }

  return (
    <div className="clasificacion-container">
      {tipoTorneo === "torneo" && (
        <>
          <Llaves
            numParticipantes={numParticipantes}
            rawPartidos={rawPartidos}
            onMatchClick={handleBracketMatchClick} // Use the new handler
            onModify={handleModifyMatch} // Use the new handler
            onAddResult={handleAddResultClick} // Use the new handler
          />

          {/* Modal para añadir/modificar partido */}
          {/* This modal now handles both creation and intended modification */}
          <ReactModal isOpen={showMatchForm} onRequestClose={() => {
            setShowMatchForm(false);
            setFormData({ fecha: "", hora: "", localId: "", visitanteId: "", local: "", visitante: "" }); // Reset form
            setSelectedMatchSeed(null); // Clear selected seed
          }}>
            <h3>{selectedMatchSeed?.partidoId ? "Modificar Partido" : "Crear Partido"}</h3> {/* Dynamic Title */}
            {/* TODO: Implement update logic */}
            <form onSubmit={handleCreateMatch}> {/* This form currently only supports creation */}
              <div className="form-group">
                <label>Fecha:</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hora:</label>
                <input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Equipo Local:</label>
                {formData.localId && selectedMatchSeed?.teams[0]?.id ? (
                  <input type="text" value={formData.local || "Equipo Avanzado"} disabled />
                ) : (
                  <select
                    value={formData.localId}
                    onChange={(e) => {
                      const selectedParticipant = participantes.find((p) => p.id === e.target.value);
                      setFormData({
                        ...formData,
                        localId: e.target.value,
                        local: selectedParticipant ? selectedParticipant.nombre : "",
                      });
                    }}
                    required={!formData.localId}
                  >
                    <option value="">Seleccionar</option>
                    {availableParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Equipo Visitante:</label>
                {formData.visitanteId && selectedMatchSeed?.teams[1]?.id ? (
                  <input type="text" value={formData.visitante || "Equipo Avanzado"} disabled />
                ) : (
                  <select
                    value={formData.visitanteId}
                    onChange={(e) => {
                      const selectedParticipant = participantes.find((p) => p.id === e.target.value);
                      setFormData({
                        ...formData,
                        visitanteId: e.target.value,
                        visitante: selectedParticipant ? selectedParticipant.nombre : "",
                      });
                    }}
                    required={!formData.visitanteId}
                  >
                    <option value="">Seleccionar</option>
                    {availableParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {/* Show submit button only if at least one slot needs manual selection OR if it's a modification */}
              {(formData.localId && formData.visitanteId) && (
                <button type="submit">{selectedMatchSeed?.partidoId ? "Guardar Cambios" : "Crear Partido"}</button>
              )}

            </form>
          </ReactModal>

          {/* Modal para añadir resultado */}
          <ReactModal isOpen={showResultForm} onRequestClose={() => {
            setShowResultForm(false);
            setLocalScore("");
            setVisitanteScore("");
            setSelectedResultPartido(null); // Clear selected partido
          }}>
            <h3>Añadir Resultado</h3>
            <form onSubmit={handleAddResult}>
              <div className="form-group">
                <label>{selectedResultPartido?.local || "Local"}:</label>
                <input
                  type="number"
                  value={localScore}
                  onChange={(e) => setLocalScore(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>{selectedResultPartido?.visitante || "Visitante"}:</label>
                <input
                  type="number"
                  value={visitanteScore}
                  onChange={(e) => setVisitanteScore(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <button type="submit">Guardar Resultado</button>
            </form>
          </ReactModal>

          {/* Modal para mostrar información del partido */}
          <ReactModal isOpen={showInfoModal} onRequestClose={() => {
            setShowInfoModal(false);
            setSelectedMatchSeed(null); // Clear selected seed (which is a partido object here)
          }}>
            <h3>Información del Partido</h3>
            {selectedMatchSeed && ( // Use selectedMatchSeed (the raw partido object)
              <>
                <p>
                  <strong>Local:</strong> {selectedMatchSeed.local || "Por determinar"}
                  {selectedMatchSeed.resultado && ` (${selectedMatchSeed.resultado.split('-')[0]})`}
                </p>
                <p>
                  <strong>Visitante:</strong> {selectedMatchSeed.visitante || "Por determinar"}
                  {selectedMatchSeed.resultado && ` (${selectedMatchSeed.resultado.split('-')[1]})`}
                </p>
                {selectedMatchSeed.resultado && selectedMatchSeed.resultado.includes('-') && (
                  <p><strong>Resultado:</strong> {selectedMatchSeed.resultado}</p>
                )}

                <p>
                  <strong>Fecha:</strong> {selectedMatchSeed.fecha || "Por determinar"}
                </p>
                <p>
                  <strong>Hora:</strong> {selectedMatchSeed.hora || "Por determinar"}
                </p>
              </>
            )}
          </ReactModal>
        </>
      )}

      {tipoTorneo === "liga" && <Tabla rawPartidos={rawPartidos} />}

      {!tipoTorneo && (
        <div>
          <h2>Clasificación</h2>
          <p>Este torneo no es de tipo eliminación directa ni de liga. Visita el Calendario para ver los partidos.</p>
        </div>
      )}
    </div>
  );
}

export default Clasificacion;