// components/Unirse.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid"; // <--- AÑADIDO: Para IDs de equipo únicos como en el primer código
import { app } from "../firebase";
import EquipoForm from "./EquipoForm";
import "../components/estilos/Unirse.css";
import { FaUser, FaEye } from "react-icons/fa";

const db = getFirestore(app);
const auth = getAuth(app);

function Unirse() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  
  const [fase, setFase] = useState('buscar'); // 'buscar', 'elegirModo', 'formularioEquipo'
  const [torneoEncontrado, setTorneoEncontrado] = useState(null);
  const [userStatus, setUserStatus] = useState({
    esCreador: false,
    esParticipante: false,
    esEspectador: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // Se usará menos si replicamos alerts

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
            // MODIFICADO: Comprobación como en el primer código
            esParticipante = torneo.participantes.some(p => p && typeof p === 'object' && p.capitan === user.uid);
        } else { // modo "individual"
            // MODIFICADO: Comprobación como en el primer código (asume que participantes individuales son UIDs)
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
      // Asumimos que "codigo" es el nombre correcto del campo como en el "primer código"
      const q = query(collection(db, "torneos"), where("codigo", "==", codigo.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No se encontró ningún torneo con ese código.");
        setTorneoEncontrado(null); 
      } else {
        const torneoDoc = querySnapshot.docs[0];
        const currentTorneoData = { id: torneoDoc.id, ...torneoDoc.data() };
        
        // Verificación del creador como en el primer código (adaptada)
        if (currentTorneoData.creadorId === user.uid) {
            setError("No puedes unirte a tu propio torneo como participante desde esta interfaz.");
            // Considera si quieres cambiar de fase o resetear aquí
            // Por ahora, solo muestra el error y detiene la carga.
            // Podrías querer permitirle ver el estado de su torneo.
            setTorneoEncontrado(currentTorneoData); // Mostrar datos del torneo encontrado
            await checkUserStatus(currentTorneoData, user); // Actualizar estado (será creador)
            setFase('elegirModo'); // Permitirle ver el estado
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
    // La comprobación de esParticipante y esCreador ya la hace checkUserStatus y se refleja en la UI.
    // Aquí nos enfocamos en el proceso de unirse si los botones están habilitados.

    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    try {
        const torneoRef = doc(db, "torneos", torneoEncontrado.id);
        const torneoSnap = await getDoc(torneoRef); // Obtener datos frescos
        if (!torneoSnap.exists()) {
            setError("El torneo ya no existe. No se puede unir.");
            setIsLoading(false);
            resetState();
            return;
        }
        const currentTorneoData = { id: torneoSnap.id, ...torneoSnap.data() };
        setTorneoEncontrado(currentTorneoData); // Actualizar estado local

        // Comprobación de si está lleno (como en el primer código, adaptado)
        const maxParticipantes = Number.isFinite(currentTorneoData.maxParticipantes) && currentTorneoData.maxParticipantes > 0
            ? currentTorneoData.maxParticipantes
            : Infinity;
        
        const numParticipantesActuales = Array.isArray(currentTorneoData.participantes) ? currentTorneoData.participantes.length : 0;

        if (numParticipantesActuales >= maxParticipantes) {
            setError("Este torneo ya ha alcanzado el número máximo de participantes.");
            setIsLoading(false);
            return;
        }
        
        // Comprobación de si ya está inscrito (como en el primer código)
        if (currentTorneoData.modo === "equipo") {
            const yaEsCapitan = currentTorneoData.participantes.some(p => typeof p === 'object' && p.capitan === user.uid);
            if (yaEsCapitan) {
                setError("Ya eres capitán de un equipo en este torneo.");
                setIsLoading(false);
                await checkUserStatus(currentTorneoData, user); // Actualizar estado
                return;
            }
            setFase('formularioEquipo');
        } else { // Individual mode
            if (currentTorneoData.participantes.includes(user.uid)) {
                setError("Ya estás inscrito en este torneo.");
                setIsLoading(false);
                await checkUserStatus(currentTorneoData, user); // Actualizar estado
                return;
            }

            const updates = { participantes: arrayUnion(user.uid) };
            if (userStatus.esEspectador) { 
                updates.espectadores = arrayRemove(user.uid);
            }
            await updateDoc(torneoRef, updates);
            
            // MODIFICADO: Notificación y navegación como en el primer código
            alert("¡Te has unido al torneo con éxito!");
            navigate(`/torneo/${torneoEncontrado.id}`); // O /home, pero /torneo/:id es más útil
        }
    } catch (err) {
        console.error("Error al unirse como participante:", err);
        setError("Hubo un error al intentar unirse como participante.");
    }
    setIsLoading(false);
  };

  const handleElegirModoEspectador = async () => { // Esta función se mantiene como estaba
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

      const updatedSnap = await getDoc(torneoRef);
      if (updatedSnap.exists()) {
          const updatedData = { id: updatedSnap.id, ...updatedSnap.data()};
          setTorneoEncontrado(updatedData);
          await checkUserStatus(updatedData, user);
      }

      setSuccessMessage("¡Ahora eres espectador de este torneo!"); // Mantenemos setSuccessMessage para espectador
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

      // Comprobación de si ya es capitán (como en el primer código, adaptada aquí)
      if (currentTorneoData.participantes?.some(p => p && typeof p === 'object' && p.capitan === user.uid)) {
        setError("Ya has registrado un equipo (eres capitán) para este torneo.");
        setFase('elegirModo');
        await checkUserStatus(currentTorneoData, user);
        setIsLoading(false);
        return;
      }

      // Comprobación de plazas (adaptada del segundo código, pero contando equipos como en el primero)
      const maxEquipos = Number.isFinite(currentTorneoData.maxParticipantes) && currentTorneoData.maxParticipantes > 0
        ? currentTorneoData.maxParticipantes
        : Infinity;
      const numEquiposActuales = currentTorneoData.participantes?.filter(p => p && typeof p === 'object' && p.capitan).length || 0;

      if (numEquiposActuales >= maxEquipos) {
        setError("Este torneo ya ha alcanzado el número máximo de equipos participantes.");
        setFase('elegirModo');
        await checkUserStatus(currentTorneoData, user);
        setIsLoading(false);
        return;
      }

      // MODIFICADO: Estructura del equipo como en el primer código
      const nuevoEquipoEntry = {
        id: uuidv4(), 
        nombre: nombreEquipo.trim(), // Nombre del equipo
        capitan: user.uid,           // UID del capitán
        miembros: miembros,          // Array de UIDs/nombres de miembros (asegurar formato desde EquipoForm)
        fechaRegistro: new Date()    // Fecha de registro
      };

      const updates = {
        participantes: arrayUnion(nuevoEquipoEntry)
      };

      if (currentTorneoData.espectadores?.includes(user.uid)) {
        updates.espectadores = arrayRemove(user.uid); // Mantener esta mejora
      }

      await updateDoc(torneoRef, updates);
      
      // MODIFICADO: Notificación y navegación como en el primer código
      // Necesitamos el título del torneo, que está en currentTorneoData o torneoEncontrado
      alert(`Equipo "${nombreEquipo.trim()}" unido al torneo "${currentTorneoData.titulo}" con éxito.`);
      navigate(`/torneo/${currentTorneoData.id}`); // O /home

    } catch (err) {
      console.error("Error al registrar equipo:", err);
      setError("Hubo un error al registrar el equipo. Inténtalo de nuevo.");
    }
    setIsLoading(false); // Asegurar que se llama incluso después de alert/navigate
  };

  return (
    <div className="form-container-unirse">
      <div className="form-box-unirse">
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
                // onChange={(e) => setCodigo(e.target.value)} // El primer código lo pasa a mayúsculas en el handle
                onChange={(e) => setCodigo(e.target.value.toUpperCase())} // Para consistencia visual y de datos
                placeholder="Ej: TORNEO123"
                disabled={isLoading}
                // maxLength={6} // Si los códigos tienen longitud fija
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
            ) : userStatus.esEspectador && !userStatus.esParticipante && !userStatus.esCreador ? ( // Asegurar que no es participante ni creador
              <p className="info-message">Ya eres espectador de este torneo.</p>
            ) : (
              <>
                {!userStatus.esCreador && !userStatus.esParticipante && ( // Solo mostrar opciones si no es creador ni participante
                  <>
                    <p className="form-description">¿Cómo deseas interactuar con el torneo?</p>
                    <div className="botones-modo">
                      <button
                        className="form-button mode-choice-button"
                        onClick={handleElegirModoParticipante}
                        disabled={isLoading || ((torneoEncontrado.participantes?.length || 0) >= torneoEncontrado.maxParticipantes && torneoEncontrado.maxParticipantes > 0)}
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
                    {((torneoEncontrado.participantes?.length || 0) >= torneoEncontrado.maxParticipantes && torneoEncontrado.maxParticipantes > 0) &&
                      !userStatus.esParticipante && !userStatus.esCreador && (
                      <p className="warning-message">
                        El torneo está lleno para participantes. Solo puedes unirte como espectador.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            <button className="form-button secondary" onClick={resetState} disabled={isLoading} style={{marginTop: '15px'}}>
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
              isLoading={isLoading} // Pasar isLoading
            />
          </div>
        )}
        
        {error && <p className="form-error-message" style={{marginTop: '10px'}}>{error}</p>}
        {successMessage && <p className="form-success-message" style={{marginTop: '10px'}}>{successMessage}</p>}

      </div>
    </div>
  );
}

export default Unirse;