import React, { useEffect, useState } from "react";
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
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedResultMatch, setSelectedResultMatch] = useState(null);
  const [localScore, setLocalScore] = useState("");
  const [visitanteScore, setVisitanteScore] = useState("");
  const [formData, setFormData] = useState({
    fecha: "",
    hora: "",
    localId: "",
    visitanteId: "",
  });

  const [participantes, setParticipantes] = useState([]);

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
              if (typeof p === "object" && (p.nombre || p.capitan)) {
                return {
                  id: p.id || p.capitan,
                  nombre: p.nombre || `Equipo (Cap: ${p.capitan?.substring(0, 6)}...)`,
                };
              } else if (typeof p === "string") {
                return { id: p, nombre: p };
              }
              return null;
            })
            .filter(Boolean);

          setParticipantes(participantesFormateados);

          const num = Number(data.numEquipos) || 0;
          if (data.tipo === "torneo" && num > 0 && Number.isInteger(Math.log2(num))) {
            setNumParticipantes(num);
          } else {
            setNumParticipantes(0);
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

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!formData.fecha || !formData.hora || !formData.localId || !formData.visitanteId) {
      alert("Por favor complete todos los campos");
      return;
    }

    try {
      const local = participantes.find((p) => p.id === formData.localId);
      const visitante = participantes.find((p) => p.id === formData.visitanteId);

      await addDoc(collection(db, `torneos/${torneoId}/calendario`), {
        ...formData,
        bracketMatchId: selectedMatch.id.toString(),
        local: local.nombre,
        visitante: visitante.nombre,
        resultado: null,
      });

      setShowMatchForm(false);
      setFormData({ fecha: "", hora: "", localId: "", visitanteId: "" });
    } catch (error) {
      console.error("Error creating match:", error);
      alert("Error al crear el partido");
    }
  };

  const handleAddResult = async (e) => {
    e.preventDefault();
    if (!selectedResultMatch || localScore === "" || visitanteScore === "") {
      alert("Por favor complete ambos puntajes");
      return;
    }

    try {
      const partidoRef = doc(db, `torneos/${torneoId}/calendario`, selectedResultMatch.id);
      await updateDoc(partidoRef, {
        resultado: `${localScore}-${visitanteScore}`,
      });

      setShowResultForm(false);
      setLocalScore("");
      setVisitanteScore("");
    } catch (error) {
      console.error("Error al actualizar resultado:", error);
      alert("Error al guardar el resultado");
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
            onMatchClick={(seed) => {
              const partido = rawPartidos.find((p) => p.bracketMatchId === seed.id.toString());
              if (partido) {
                setSelectedMatch(partido);
                setShowInfoModal(true);
              } else {
                setSelectedMatch(seed);
                setFormData({
                  fecha: "",
                  hora: "",
                  localId: "",
                  visitanteId: "",
                });
                setShowMatchForm(true);
              }
            }}
            onModify={(seed) => {
              const partido = rawPartidos.find((p) => p.bracketMatchId === seed.id.toString());
              if (partido) {
                setSelectedMatch(seed);
                setFormData({
                  fecha: partido.fecha,
                  hora: partido.hora,
                  localId: partido.localId,
                  visitanteId: partido.visitanteId,
                });
                setShowMatchForm(true);
              }
            }}
            onAddResult={(seed) => {
              const partido = rawPartidos.find((p) => p.bracketMatchId === seed.id.toString());
              if (partido) {
                setSelectedResultMatch(partido);
                setLocalScore(partido.resultado?.split("-")[0] || "");
                setVisitanteScore(partido.resultado?.split("-")[1] || "");
                setShowResultForm(true);
              }
            }}
          />

          {/* Modal para añadir partido */}
          <ReactModal isOpen={showMatchForm} onRequestClose={() => setShowMatchForm(false)}>
            <h3>Crear Partido</h3>
            <form onSubmit={handleCreateMatch}>
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
                <select
                  value={formData.localId}
                  onChange={(e) => setFormData({ ...formData, localId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar</option>
                  {participantes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Equipo Visitante:</label>
                <select
                  value={formData.visitanteId}
                  onChange={(e) => setFormData({ ...formData, visitanteId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar</option>
                  {participantes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit">Guardar</button>
            </form>
          </ReactModal>

          {/* Modal para añadir resultado */}
          <ReactModal isOpen={showResultForm} onRequestClose={() => setShowResultForm(false)}>
            <h3>Añadir Resultado</h3>
            <form onSubmit={handleAddResult}>
              <div className="form-group">
                <label>{selectedResultMatch?.local}:</label>
                <input
                  type="number"
                  value={localScore}
                  onChange={(e) => setLocalScore(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label>{selectedResultMatch?.visitante}:</label>
                <input
                  type="number"
                  value={visitanteScore}
                  onChange={(e) => setVisitanteScore(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <button type="submit">Guardar</button>
            </form>
          </ReactModal>

          {/* Modal para mostrar información del partido */}
          <ReactModal isOpen={showInfoModal} onRequestClose={() => setShowInfoModal(false)}>
            <h3>Información del Partido</h3>
            <p>
              <strong>Local:</strong> {selectedMatch?.local || "Por determinar"}
            </p>
            <p>
              <strong>Visitante:</strong> {selectedMatch?.visitante || "Por determinar"}
            </p>
            <p>
              <strong>Fecha:</strong> {selectedMatch?.fecha || "Por determinar"}
            </p>
            <p>
              <strong>Hora:</strong> {selectedMatch?.hora || "Por determinar"}
            </p>
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