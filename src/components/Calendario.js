// src/components/Calendario.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
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
import { FaPlus, FaTrash } from "react-icons/fa";

const db = getFirestore(app);
const auth = getAuth(app);

const generateBracketStructure = (numParticipants) => {
  if (!numParticipants || numParticipants < 2 || !Number.isInteger(Math.log2(numParticipants))) {
    console.error("Invalid number of participants for single elimination bracket generation. Must be a power of 2 (>= 2).");
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

        const participantes = data.participantes || [];
        const seleccionables = participantes.map((p) => {
          if (typeof p === "object" && (p.nombre || p.capitan)) {
            const id = p.capitan || p.nombre;
            const displayNombre = p.nombre ? p.nombre : `Equipo (Cap: ${p.capitan?.substring(0, 6)}...)`;
            return { id, displayNombre, esEquipo: true };
          } else if (typeof p === "string") {
            return { id: p, displayNombre: p, esEquipo: false };
          }
          return null;
        }).filter(Boolean);
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
            const matchesById = initialBracketStructureCalendario.reduce((acc, match) => {
                 acc[match.id] = match;
                 return acc;
            }, {});

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
                         if (score1 > score2) {
                             loserId = partidoFirestore.visitanteId;
                         } else if (score2 > score1) {
                             loserId = partidoFirestore.localId;
                         }

                         if (loserId && match.nextMatchId !== null) {
                            eliminated.add(loserId);
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

    let bracketId = null;
    if (torneoInfo?.tipo === "torneo") {
        if (!bracketMatchIdInput) {
            alert("Por favor, introduce el ID del Partido en el Esquema.");
            return;
        }
        const parsedBracketId = Number(bracketMatchIdInput);
        if (isNaN(parsedBracketId) || parsedBracketId <= 0 || !Number.isInteger(parsedBracketId)) {
            alert("El ID del Partido en el Esquema debe ser un número entero positivo.");
            return;
        }
        const maxBracketId = numParticipantesBracket > 0 ? numParticipantesBracket - 1 : 0;
        if (parsedBracketId > maxBracketId) {
            alert(`El ID del Partido en el Esquema (${parsedBracketId}) excede el número máximo de partidos posibles (${maxBracketId}) para ${numParticipantesBracket} participantes.`);
            return;
        }
         bracketId = parsedBracketId;
    }

    if (equipoLocalId === equipoVisitanteId) {
      alert("El participante local y visitante no pueden ser el mismo.");
      return;
    }

    const localSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoLocalId);
    const visitanteSeleccionado = participantesParaSeleccion.find((p) => p.id === equipoVisitanteId);

    if (!localSeleccionado || !visitanteSeleccionado) {
      alert("Error al encontrar los detalles de los participantes seleccionados.");
      return;
    }

    if (torneoInfo?.tipo === "torneo") {
        if (eliminatedParticipants.has(localSeleccionado.id)) {
            alert(`El participante local "${localSeleccionado.displayNombre}" ya ha sido eliminado.`);
            return;
        }
         if (eliminatedParticipants.has(visitanteSeleccionado.id)) {
            alert(`El participante visitante "${visitanteSeleccionado.displayNombre}" ya ha sido eliminado.`);
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
        resultado: null,
        ...(torneoInfo?.tipo === "torneo" && { bracketMatchId: bracketId }),
      };
      await addDoc(collection(db, `torneos/${torneoId}/calendario`), partidoData);
      handleCerrarFormulario();
    } catch (error) {
      console.error("Error al añadir partido:", error);
      alert("Error al añadir el partido.");
    }
  };

  const handleEliminarPartido = async (partidoId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este partido del calendario? Esto puede afectar la clasificación/esquema si el partido ya tenía un resultado.")) {
      return;
    }
    try {
      const partidoDocRef = doc(db, `torneos/${torneoId}/calendario`, partidoId);
      await deleteDoc(partidoDocRef);
    } catch (error) {
      console.error("Error al eliminar partido:", error);
      alert("Error al eliminar el partido.");
    }
  };

  const handleActualizarResultado = async (partidoId) => {
    const resultado = prompt("Introduce el resultado (ej: 3-2):");
    if (resultado !== null) {
      try {
        const partidoRef = doc(db, `torneos/${torneoId}/calendario`, partidoId);
        await updateDoc(partidoRef, { resultado });
      } catch (error) {
        console.error("Error al actualizar resultado:", error);
        alert("Error al actualizar el resultado del partido.");
      }
    }
  };

  const esCreador = user?.uid === torneoInfo?.creadorId;

  return (
    <div className="calendario-container">
      <h2>Calendario de Partidos</h2>
      <div className="calendario-header">
       {esCreador && !mostrarFormulario && torneoInfo?.tipo !== "torneo" && (
  <button onClick={handleMostrarFormulario} className="calendario-add-button primary">
    <FaPlus /> Añadir Partido
  </button>
)}
      </div>

      {mostrarFormulario && esCreador && (
        <div className="calendario-form">
          <h3>Añadir Nuevo Partido</h3>
          <form onSubmit={handleAgregarPartido}>
             {torneoInfo?.tipo === "torneo" && (
                 <div className="form-group">
                     <label htmlFor="bracketMatchId">ID del Partido en el Esquema:</label>
                     <input
                         type="number"
                         id="bracketMatchId"
                         value={bracketMatchIdInput}
                         onChange={(e) => setBracketMatchIdInput(e.target.value)}
                         required={torneoInfo?.tipo === "torneo"}
                         min="1"
                         placeholder="Ej: 1"
                     />
                     <small>Consulta el esquema en la sección Clasificación para ver los IDs.</small>
                 </div>
             )}

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
                {torneoInfo?.tipo === "individual" ? "Jugador Local" : "Equipo Local"}:
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
                        disabled={
                            participante.id === equipoVisitanteId ||
                            (torneoInfo?.tipo === "torneo" && eliminatedParticipants.has(participante.id))
                        }
                    >
                    {participante.displayNombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="equipoVisitante">
                {torneoInfo?.tipo === "individual" ? "Jugador Visitante" : "Equipo Visitante"}:
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
                        disabled={
                            participante.id === equipoLocalId ||
                            (torneoInfo?.tipo === "torneo" && eliminatedParticipants.has(participante.id))
                        }
                    >
                    {participante.displayNombre}
                  </option>
                ))}
              </select>
             </div>
            <div className="form-actions">
              <button type="submit" className="button primary">
                Guardar Partido
              </button>
              <button type="button" onClick={handleCerrarFormulario} className="button secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {partidos.length === 0 ? (
        <p>No hay partidos programados.</p>
      ) : (
        <div className="calendario-partidos-grid">
          {partidos.map((partido) => (
            <div key={partido.id} className="calendario-partido-card">
              {esCreador && (
                <>
                  <button
                    onClick={() => handleEliminarPartido(partido.id)}
                    className="boton-eliminar-partido"
                    title="Eliminar partido"
                    aria-label="Eliminar partido"
                  >
                    <FaTrash />
                  </button>
                  <button
                    onClick={() => handleActualizarResultado(partido.id)}
                    className="boton-resultado-partido"
                    title="Añadir/Editar resultado"
                  >
                    Añadir Resultado
                  </button>
                </>
              )}
             {partido.bracketMatchId !== undefined && partido.bracketMatchId !== null && (
                 <p><strong>ID Esquema:</strong> {partido.bracketMatchId}</p>
             )}
              <p><strong>Fecha:</strong> {partido.fecha}</p>
              <p><strong>Hora:</strong> {partido.hora}</p>
              <p className="partido-vs">
                <span className="equipo-local">{partido.local}</span>
                <span> vs </span>
                <span className="equipo-visitante">{partido.visitante}</span>
              </p>
              {partido.resultado && <p><strong>Resultado:</strong> {partido.resultado}</p>}
            </div>
          ))}
        </div>
      )}
      {torneoInfo?.tipo === "torneo" && eliminatedParticipants.size > 0 && (
          <div className="eliminated-list" style={{ marginTop: '20px', fontSize: '0.9em', color: '#555' }}>
              <p>Participantes eliminados: {Array.from(eliminatedParticipants)
                  .map(id => participantesParaSeleccion.find(p => p.id === id)?.displayNombre || id)
                  .join(', ')}</p>
          </div>
      )}
    </div>
  );
}

export default Calendario;