import React, { useState, useEffect } from "react";
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
      alert("Por favor, rellena todos los campos del formulario.");
      return;
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

    try {
      const partidoData = {
        fecha: fechaPartido,
        hora: horaPartido,
        local: localSeleccionado.displayNombre,
        visitante: visitanteSeleccionado.displayNombre,
        localId: equipoLocalId,
        visitanteId: equipoVisitanteId,
        resultado: null,
      };
      await addDoc(collection(db, `torneos/${torneoId}/calendario`), partidoData);
      handleCerrarFormulario();
    } catch (error) {
      console.error("Error al añadir partido:", error);
      alert("Error al añadir el partido.");
    }
  };

  const handleEliminarPartido = async (partidoId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este partido del calendario?")) {
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
    if (resultado) {
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
        {esCreador && !mostrarFormulario && (
          <button onClick={handleMostrarFormulario} className="calendario-add-button primary">
            <FaPlus /> Añadir Partido
          </button>
        )}
      </div>

      {mostrarFormulario && esCreador && (
        <div className="calendario-form">
          <h3>Añadir Nuevo Partido</h3>
          <form onSubmit={handleAgregarPartido}>
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
                  <option key={participante.id} value={participante.id}>
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
                  <option key={participante.id} value={participante.id} disabled={participante.id === equipoLocalId}>
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
    </div>
  );
}

export default Calendario;
