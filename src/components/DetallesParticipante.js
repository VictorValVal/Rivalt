// components/DetallesParticipante.js
import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { app } from "../firebase";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaUsers, FaShieldAlt, FaChartLine, FaArrowLeft } from "react-icons/fa";
import "./estilos/DetallesParticipante.css";

const db = getFirestore(app);

function DetallesParticipante() {
  const { torneoId, tipo, participanteId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [estadisticasUsuario, setEstadisticasUsuario] = useState({ torneosJugados: 0 });
  const [miembrosEquipo, setMiembrosEquipo] = useState([]);
  const [nombreTorneoActual, setNombreTorneoActual] = useState("");

  const handleVolverAParticipantes = () => {
    navigate(`/torneo/${torneoId}`, { state: { activeTab: "participantes", fromDetails: true } });
  };

  const handleVolverAlTorneoGeneral = () => {
    navigate(`/torneo/${torneoId}`, { state: { activeTab: "componente1", fromDetails: true } });
  };


  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError("");
      setData(null);
      setMiembrosEquipo([]);

      if (location.state?.nombreTorneo) {
        setNombreTorneoActual(location.state.nombreTorneo);
      } else if (torneoId) {
        const torneoRef = doc(db, "torneos", torneoId);
        const torneoSnap = await getDoc(torneoRef);
        if (torneoSnap.exists()) {
          setNombreTorneoActual(torneoSnap.data().titulo);
        }
      }

      try {
        if (tipo === "usuario") {
          const usuarioRef = doc(db, "usuarios", participanteId);
          const usuarioSnap = await getDoc(usuarioRef);
          if (usuarioSnap.exists()) {
            const usuarioData = usuarioSnap.data();
            setData({ ...usuarioData, id: usuarioSnap.id, tipo: "usuario" });

            const torneosQuery = query(
              collection(db, "torneos"),
              where("participantes", "array-contains", participanteId)
            );
            const torneosSnap = await getDocs(torneosQuery);
            setEstadisticasUsuario({ torneosJugados: torneosSnap.size });

          } else {
            setError("Usuario no encontrado.");
          }
        } else if (tipo === "equipo") {
          if (location.state?.equipoData) {
            const equipo = location.state.equipoData;
            setData({ ...equipo, id: participanteId, tipo: "equipo" }); 

            if (equipo.miembros && equipo.miembros.length > 0) {
              const miembrosDataPromises = equipo.miembros.map(async (miembroIdentificador) => {
                let miembroInfo = { identificador: miembroIdentificador, nombre: miembroIdentificador, email: "" };
                if (typeof miembroIdentificador === 'string' && miembroIdentificador.length > 15) { 
                    try {
                        const userRef = doc(db, "usuarios", miembroIdentificador);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            miembroInfo.nombre = userSnap.data().nombre || miembroIdentificador;
                            miembroInfo.email = userSnap.data().email || "";
                        } else {
                             miembroInfo.nombre = `Usuario (${miembroIdentificador.substring(0,6)}...)`;
                        }
                    } catch (e) {
                        console.warn("Error buscando miembro por UID:", miembroIdentificador, e);
                        miembroInfo.nombre = `Usuario (${miembroIdentificador.substring(0,6)}...) (Error)`;
                    }
                } else if (miembroIdentificador.includes('@')) { 
                    miembroInfo.email = miembroIdentificador;
                    miembroInfo.nombre = miembroIdentificador.split('@')[0]; 
                }
                return miembroInfo;
              });
              const miembrosResueltos = await Promise.all(miembrosDataPromises);
              setMiembrosEquipo(miembrosResueltos);
            }

          } else {
            const torneoRef = doc(db, "torneos", torneoId);
            const torneoSnap = await getDoc(torneoRef);
            if (torneoSnap.exists()) {
              const torneoData = torneoSnap.data();
              const equipoEncontrado = torneoData.participantes?.find(p => typeof p === 'object' && p.capitan === participanteId);
              if (equipoEncontrado) {
                setData({ ...equipoEncontrado, id: participanteId, tipo: "equipo" });
                if (equipoEncontrado.miembros && equipoEncontrado.miembros.length > 0) {
                    const miembrosDataPromises = equipoEncontrado.miembros.map(async (miembroId) => {
                        const userRef = doc(db, "usuarios", miembroId); 
                        const userSnap = await getDoc(userRef);
                        return userSnap.exists() ? {id: userSnap.id, ...userSnap.data()} : { nombre: `ID: ${miembroId}`, email: "N/A" };
                    });
                    setMiembrosEquipo(await Promise.all(miembrosDataPromises));
                }
              } else {
                setError("Equipo no encontrado en este torneo con el capitán especificado.");
              }
            } else {
              setError("Torneo no encontrado para buscar el equipo.");
            }
          }
        } else {
          setError("Tipo de participante no válido.");
        }
      } catch (err) {
        console.error("Error al cargar datos del participante:", err);
        setError("No se pudieron cargar los detalles. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (participanteId && tipo && torneoId) {
      cargarDatos();
    } else {
      setError("Información incompleta para cargar detalles.");
      setLoading(false);
    }
  }, [participanteId, tipo, torneoId, location.state]);

  const getInicial = (nombre) => {
    if (!nombre || typeof nombre !== 'string') return "?";
    return nombre.charAt(0).toUpperCase();
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return "Fecha desconocida";
    if (timestamp.seconds) { 
      return new Date(timestamp.seconds * 1000).toLocaleDateString("es-ES", {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("es-ES", {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    return "Fecha inválida";
  };

  if (loading) {
    return <div className="detalles-participante-loading">Cargando detalles...</div>;
  }

  if (error) {
    return (
      <div className="detalles-participante-error">
        <p>{error}</p>
        <button onClick={handleVolverAlTorneoGeneral} className="dp-boton-volver">
          <FaArrowLeft /> Volver al Torneo
        </button>
      </div>
    );
  }

  if (!data) {
    return (
        <div className="detalles-participante-error">
            <p>No se encontraron datos para este participante.</p>
             <button onClick={handleVolverAParticipantes} className="dp-boton-volver">
                <FaArrowLeft /> Volver a Participantes
            </button>
        </div>
    );
  }

  return (
    <div className="detalles-participante-container">
        <div className="dp-header">
            <button onClick={handleVolverAParticipantes} className="dp-boton-volver dp-header-volver">
                <FaArrowLeft />
            </button>
            <h1 className="dp-titulo-principal">
                Detalles del {data.tipo === "usuario" ? "Jugador" : "Equipo"}
                {nombreTorneoActual && <span className="dp-subtitulo-torneo">en {nombreTorneoActual}</span>}
            </h1>
            <div style={{width: "40px"}}></div> 
        </div>

      {data.tipo === "usuario" && (
        <div className="dp-card dp-usuario-card">
          <div className="dp-avatar-container">
            <div className="dp-avatar">{getInicial(data.nombre)}</div>
          </div>
          <div className="dp-info-grupo">
            <h2 className="dp-nombre">{data.nombre || "Nombre no disponible"} {data.apellidos || ""}</h2>
          </div>
          <div className="dp-info-item">
            <FaEnvelope className="dp-info-icon" />
            <span>{data.email || "Email no disponible"}</span>
          </div>
          <div className="dp-info-item">
            <FaCalendarAlt className="dp-info-icon" />
            <span>Se unió: {formatDate(data.fechaRegistro) || "No especificado"}</span>
          </div>
          
          <div className="dp-seccion dp-estadisticas">
            <h3 className="dp-subtitulo-seccion"><FaChartLine /> Estadísticas</h3>
            <div className="dp-info-item">
              <span>Torneos Jugados: {estadisticasUsuario.torneosJugados}</span>
            </div>
          </div>
        </div>
      )}

      {data.tipo === "equipo" && (
        <div className="dp-card dp-equipo-card">
          <div className="dp-info-grupo">
            <FaShieldAlt className="dp-icono-titulo-equipo" />
            <h2 className="dp-nombre-equipo">{data.nombre || "Nombre de equipo no disponible"}</h2>
          </div>
           {data.capitanNombre && ( 
            <div className="dp-info-item">
                <FaUserCircle className="dp-info-icon" />
                <span>Capitán: {data.capitanNombre} ({data.capitanEmail || data.capitan})</span>
            </div>
          )}

          <div className="dp-seccion dp-miembros">
            <h3 className="dp-subtitulo-seccion"><FaUsers /> Integrantes del Equipo</h3>
            {miembrosEquipo.length > 0 ? (
              <ul className="dp-lista-miembros">
                {miembrosEquipo.map((miembro, index) => (
                  <li key={index} className="dp-miembro-item">
                    <FaUserCircle className="dp-miembro-icon" />
                    <span className="dp-miembro-nombre">{miembro.nombre || miembro.identificador}</span>
                    {miembro.email && <span className="dp-miembro-email">({miembro.email})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No se especificaron miembros o no se pudieron cargar.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DetallesParticipante;