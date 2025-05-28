// components/Unirse.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { app } from "../firebase";
import EquipoForm from "./EquipoForm";
import "../components/estilos/Unirse.css"; // Main CSS for this component
import { FaUser, FaEye, FaArrowLeft } from "react-icons/fa";
import { agregarNovedadConDebug } from "./utils/NovedadesUtils";

const db = getFirestore(app);
const auth = getAuth(app);

// Helper function to get user name for novelty
const getUserNameForNovelty = async (userId) => {
  const currentUser = getAuth(app).currentUser;
  if (currentUser && currentUser.uid === userId) {
    if (currentUser.displayName) return currentUser.displayName;
    if (currentUser.email) return currentUser.email;
  }
  try {
    const userDocRef = doc(db, "usuarios", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data().nombre || userDocSnap.data().email || `Usuario (${userId.substring(0, 6)}...)`;
    }
  } catch (e) {
    console.error("Error fetching user name for novelty:", e);
  }
  return `Usuario (${userId.substring(0, 6)}...)`;
};


function Unirse() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");

  const [fase, setFase] = useState('buscar');
  const [torneoEncontrado, setTorneoEncontrado] = useState(null);
  const [userStatus, setUserStatus] = useState({
    esCreador: false,
    esParticipante: false,
    esEspectador: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        resetState();
      } else {
        if (torneoEncontrado) {
          checkUserStatus(torneoEncontrado, user);
        }
      }
    });
    return () => unsubscribe();
  }, [torneoEncontrado]);

  const resetState = () => {
    setCodigo("");
    setFase('buscar');
    setTorneoEncontrado(null);
    setUserStatus({ esCreador: false, esParticipante: false, esEspectador: false });
    setIsLoading(false);
    setError("");
    setSuccessMessage("");
  };

  const checkUserStatus = async (torneo, user) => {
    if (!torneo || !user) {
      setUserStatus({ esCreador: false, esParticipante: false, esEspectador: false });
      return;
    }
    const esCreador = torneo.creadorId === user.uid;
    let esParticipante = false;

    if (torneo.participantes && Array.isArray(torneo.participantes)) {
      if (torneo.modo === "equipo") {
        esParticipante = torneo.participantes.some(p => p && typeof p === 'object' && p.capitan === user.uid);
      } else { 
        esParticipante = torneo.participantes.includes(user.uid);
      }
    }

    const esEspectador = torneo.espectadores?.includes(user.uid) || false;

    setUserStatus({
      esCreador,
      esParticipante,
      esEspectador: esCreador ? false : (esParticipante ? false : esEspectador)
    });
  };

  const handleBuscarTorneo = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Debes iniciar sesión para buscar un torneo.");
      return;
    }
    if (!codigo.trim()) {
      setError("Por favor, introduce un código de torneo.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    setTorneoEncontrado(null);

    try {
      const q = query(collection(db, "torneos"), where("codigo", "==", codigo.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No se encontró ningún torneo con ese código.");
        setTorneoEncontrado(null);
      } else {
        const torneoDoc = querySnapshot.docs[0];
        const currentTorneoData = { id: torneoDoc.id, ...torneoDoc.data() };

        if (currentTorneoData.creadorId === user.uid) {
          setError("No puedes unirte a tu propio torneo como participante desde esta interfaz.");
          setTorneoEncontrado(currentTorneoData);
          await checkUserStatus(currentTorneoData, user);
          setFase('elegirModo');
          setIsLoading(false);
          return;
        }

        setTorneoEncontrado(currentTorneoData);
        await checkUserStatus(currentTorneoData, user);
        setFase('elegirModo');
        setSuccessMessage(`Torneo encontrado: ${currentTorneoData.titulo}`);
      }
    } catch (err) {
      console.error("Error al buscar torneo:", err);
      setError("Error al buscar el torneo. Inténtalo de nuevo.");
      setTorneoEncontrado(null);
    }
    setIsLoading(false);
  };

  const handleElegirModoParticipante = async () => {
    const user = auth.currentUser;
    if (!user || !torneoEncontrado) {
      setError("Error: Usuario no autenticado o torneo no encontrado.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const torneoRef = doc(db, "torneos", torneoEncontrado.id);
      const torneoSnap = await getDoc(torneoRef);
      if (!torneoSnap.exists()) {
        setError("El torneo ya no existe. No se puede unir.");
        setIsLoading(false);
        resetState();
        return;
      }
      const currentTorneoData = { id: torneoSnap.id, ...torneoSnap.data() };
      setTorneoEncontrado(currentTorneoData);

      const maxParticipantes = currentTorneoData.numEquipos || Infinity;
      const numParticipantesActuales = Array.isArray(currentTorneoData.participantes) ? currentTorneoData.participantes.length : 0;

      if (numParticipantesActuales >= maxParticipantes) {
        setError("Este torneo ya ha alcanzado el número máximo de participantes.");
        setIsLoading(false);
        return;
      }

      if (currentTorneoData.modo === "equipo") {
        const yaEsCapitan = currentTorneoData.participantes.some(p => typeof p === 'object' && p.capitan === user.uid);
        if (yaEsCapitan) {
          setError("Ya eres capitán de un equipo en este torneo.");
          setIsLoading(false);
          await checkUserStatus(currentTorneoData, user);
          return;
        }
        setFase('formularioEquipo');
      } else { // Modo Individual
  if (currentTorneoData.participantes.includes(user.uid)) {
    setError("Ya estás inscrito en este torneo.");
    setIsLoading(false);
    await checkUserStatus(currentTorneoData, user);
    return;
  }

  const updates = { participantes: arrayUnion(user.uid) };
  if (userStatus.esEspectador) {
    updates.espectadores = arrayRemove(user.uid);
  }
  await updateDoc(torneoRef, updates);

  // --> Aquí se genera la novedad <--
  const userName = await getUserNameForNovelty(user.uid);
  await agregarNovedadConDebug(
    torneoEncontrado.id,
    `${userName} se ha unido al torneo como participante.`,
    'user_join', // Tipo de novedad
    { userId: user.uid, userName: userName },
    "Unirse.js (ElegirModoParticipante - Individual)" // Componente de origen
  ); //

  alert("¡Te has unido al torneo con éxito!");
  navigate(`/torneo/${torneoEncontrado.id}`);
}
    } catch (err) {
      console.error("Error al unirse como participante:", err);
      setError("Hubo un error al intentar unirse como participante.");
    }
    setIsLoading(false);
  };

  const handleElegirModoEspectador = async () => {
    const user = auth.currentUser;
    if (!user || !torneoEncontrado) {
      setError("Error: Usuario no autenticado o torneo no encontrado.");
      return;
    }
    if (userStatus.esParticipante || userStatus.esCreador) {
      setError("Ya estás involucrado como participante o creador, no puedes unirte adicionalmente como espectador.");
      return;
    }
    if (userStatus.esEspectador) {
      setError("Ya eres espectador de este torneo.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const torneoRef = doc(db, "torneos", torneoEncontrado.id);
      await updateDoc(torneoRef, {
        espectadores: arrayUnion(user.uid)
      });

      const userName = await getUserNameForNovelty(user.uid);
      await agregarNovedadConDebug(
        torneoEncontrado.id,
        `${userName} ahora es espectador del torneo.`,
        'spectator_join',
        { userId: user.uid, userName: userName },
        "Unirse.js (ElegirModoEspectador)"
      );

      const updatedSnap = await getDoc(torneoRef);
      if (updatedSnap.exists()) {
        const updatedData = { id: updatedSnap.id, ...updatedSnap.data() };
        setTorneoEncontrado(updatedData);
        await checkUserStatus(updatedData, user);
      }

      setSuccessMessage("¡Ahora eres espectador de este torneo!");
    } catch (err) {
      console.error("Error al unirse como espectador:", err);
      setError("Hubo un error al intentar unirse como espectador.");
    }
    setIsLoading(false);
  };

  const handleSubmitEquipo = async (nombreEquipo, miembros) => {
    const user = auth.currentUser;
    if (!user || !torneoEncontrado) {
      setError("Error: Usuario no autenticado o torneo no encontrado para registrar equipo.");
      setIsLoading(false);
      return;
    }
    if (!user.uid) {
      setError("Error: UID de usuario no disponible. Intenta iniciar sesión de nuevo.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const torneoRef = doc(db, "torneos", torneoEncontrado.id);

      const currentTorneoSnap = await getDoc(torneoRef);
      if (!currentTorneoSnap.exists()) {
        setError("El torneo ya no existe.");
        setIsLoading(false);
        resetState();
        return;
      }
      let currentTorneoData = { id: currentTorneoSnap.id, ...currentTorneoSnap.data() };
      setTorneoEncontrado(currentTorneoData);

      if (currentTorneoData.participantes?.some(p => p && typeof p === 'object' && p.capitan === user.uid)) {
        setError("Ya has registrado un equipo (eres capitán) para este torneo.");
        setFase('elegirModo');
        await checkUserStatus(currentTorneoData, user);
        setIsLoading(false);
        return;
      }

      const maxEquipos = currentTorneoData.numEquipos || Infinity;
      const numEquiposActuales = currentTorneoData.participantes?.filter(p => p && typeof p === 'object' && p.capitan).length || 0;

      if (numEquiposActuales >= maxEquipos) {
        setError("Este torneo ya ha alcanzado el número máximo de equipos participantes.");
        setFase('elegirModo');
        await checkUserStatus(currentTorneoData, user);
        setIsLoading(false);
        return;
      }

      const capitanNombre = await getUserNameForNovelty(user.uid);

      const nuevoEquipoEntry = {
        id: uuidv4(),
        nombre: nombreEquipo.trim(),
        capitan: user.uid,
        miembros: miembros,
        fechaRegistro: new Date()
      };

      const updates = {
        participantes: arrayUnion(nuevoEquipoEntry)
      };

      if (currentTorneoData.espectadores?.includes(user.uid)) {
        updates.espectadores = arrayRemove(user.uid);
      }

      await updateDoc(torneoRef, updates);

      await agregarNovedadConDebug(
        torneoEncontrado.id,
        `El equipo "${nombreEquipo.trim()}" (Capitán: ${capitanNombre}) se ha unido al torneo.`,
        'team_join',
        { equipoNombre: nombreEquipo.trim(), capitanId: user.uid, capitanNombre: capitanNombre },
        "Unirse.js (SubmitEquipo - Team)"
      );
      
      if (miembros && Array.isArray(miembros)) {
        for (const miembroIdentificador of miembros) {
          if (miembroIdentificador === user.uid && currentTorneoData.modo === "equipo") continue;
          
          const miembroNombre = await getUserNameForNovelty(miembroIdentificador);
          await agregarNovedadConDebug(
            torneoEncontrado.id,
            `${miembroNombre} se ha unido al torneo como parte del equipo "${nombreEquipo.trim()}".`,
            'user_join',
            { 
              userId: miembroIdentificador, 
              userName: miembroNombre, 
              equipoNombre: nombreEquipo.trim(),
              capitanId: user.uid
            },
            "Unirse.js (SubmitEquipo - Member)"
          );
        }
      }

      alert(`Equipo "${nombreEquipo.trim()}" unido al torneo "${currentTorneoData.titulo}" con éxito.`);
      navigate(`/torneo/${currentTorneoData.id}`);

    } catch (err) {
      console.error("Error al registrar equipo:", err);
      setError("Hubo un error al registrar el equipo. Inténtalo de nuevo.");
    }
    setIsLoading(false);
  };

  return (
    <div className="form-container-unirse">
      {/* Animated Shapes */}
      <div className="animated-shape shape1-unirse"></div>
      <div className="animated-shape shape2-unirse"></div>

      <div className="unirse-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 3 }}>
        <button
          onClick={() => navigate(-1)}
          title="Volver"
          className="torneo-header-home-button" // Assuming this class provides appropriate styling for a back button
          style={{ marginRight: '1rem', color: '#E0E0E0' }} // Ensure visibility against new background
        >
          <FaArrowLeft />
        </button>
       {/* Removed title from here to avoid redundancy with form title */}
      </div>
      <div className="form-box-unirse"> {/* This box will now be above the shapes */}
        {fase === 'buscar' && (
          <>
            <h2 className="form-title">Buscar Torneo por Código</h2>
            <p className="form-description">Introduce el código del torneo al que deseas unirte o ver.</p>
            <div className="form-field">
              <label htmlFor="codigo-torneo" className="form-label">Código del Torneo:</label>
              <input
                type="text"
                id="codigo-torneo"
                className="form-input"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: TORNEO123"
                disabled={isLoading}
              />
            </div>
            <button
              className="form-button primary"
              onClick={handleBuscarTorneo}
              disabled={isLoading || !codigo.trim()}
            >
              {isLoading ? "Buscando..." : "Buscar Torneo"}
            </button>
          </>
        )}

        {fase === 'elegirModo' && torneoEncontrado && (
          <div className="elegir-modo-section">
            <h2 className="form-title">Torneo Encontrado: {torneoEncontrado.titulo}</h2>
            {userStatus.esCreador ? (
              <p className="info-message">Eres el creador de este torneo.</p>
            ) : userStatus.esParticipante ? (
              <p className="info-message">Ya estás participando en este torneo.</p>
            ) : userStatus.esEspectador && !userStatus.esParticipante && !userStatus.esCreador ? (
              <p className="info-message">Ya eres espectador de este torneo.</p>
            ) : (
              <>
                {!userStatus.esCreador && !userStatus.esParticipante && (
                  <>
                    <p className="form-description">¿Cómo deseas interactuar con el torneo?</p>
                    <div className="botones-modo">
                      <button
                        className="form-button mode-choice-button"
                        onClick={handleElegirModoParticipante}
                        disabled={isLoading || ((torneoEncontrado.participantes?.length || 0) >= torneoEncontrado.numEquipos && torneoEncontrado.numEquipos > 0)}
                      >
                        <FaUser size={35} />
                        <span className="button-text-label">Participante</span>
                      </button>
                      <button
                        className="form-button mode-choice-button"
                        onClick={handleElegirModoEspectador}
                        disabled={isLoading}
                      >
                        <FaEye size={35} />
                        <span className="button-text-label">Espectador</span>
                      </button>
                    </div>
                    {((torneoEncontrado.participantes?.length || 0) >= torneoEncontrado.numEquipos && torneoEncontrado.numEquipos > 0) &&
                      !userStatus.esParticipante && !userStatus.esCreador && (
                        <p className="warning-message">
                          El torneo está lleno para participantes. Solo puedes unirte como espectador.
                        </p>
                      )}
                  </>
                )}
              </>
            )}
            <button className="form-button secondary" onClick={resetState} disabled={isLoading} style={{ marginTop: '15px' }}>
              Buscar otro torneo
            </button>
          </div>
        )}

        {fase === 'formularioEquipo' && torneoEncontrado && (
          <div className="equipo-form-section">
            <h2 className="form-title">Inscripción de Equipo para "{torneoEncontrado.titulo}"</h2>
            <p className="form-description">Introduce los datos de tu equipo.</p>
            <EquipoForm
              maxMiembros={torneoEncontrado.maxJugadoresPorEquipo} 
              onSubmit={handleSubmitEquipo}
              onCancel={() => { setFase('elegirModo'); setError(''); setSuccessMessage(''); }}
              isLoading={isLoading}
            />
          </div>
        )}

        {error && <p className="form-error-message" style={{ marginTop: '10px' }}>{error}</p>}
        {successMessage && <p className="form-success-message" style={{ marginTop: '10px' }}>{successMessage}</p>}

      </div>
    </div>
  );
}

export default Unirse;