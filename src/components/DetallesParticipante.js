import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { app } from "../firebase";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaUsers, FaShieldAlt, FaChartLine, FaArrowLeft } from "react-icons/fa";
import "./estilos/DetallesParticipante.css";

const db = getFirestore(app);

function DetallesParticipante() {
  // Obtiene los parámetros de la URL (torneoId, tipo de participante, ID del participante)
  const { torneoId, tipo, participanteId } = useParams();
  const location = useLocation(); // Hook para acceder al objeto de ubicación
  const navigate = useNavigate(); // Hook para la navegación programática

  // Estados para la información del participante, el modo del torneo, carga, errores y estadísticas
  const [data, setData] = useState(null); // Datos del participante o equipo
  const [torneoMode, setTorneoMode] = useState(null); // Modo del torneo (individual o equipo)
  const [loading, setLoading] = useState(true); // Estado de carga
  const [error, setError] = useState(""); // Mensajes de error
  const [estadisticasUsuario, setEstadisticasUsuario] = useState({ torneosJugados: 0 }); // Estadísticas para usuarios individuales
  const [miembrosEquipo, setMiembrosEquipo] = useState([]); // Miembros del equipo si es un equipo
  const [nombreTorneoActual, setNombreTorneoActual] = useState(""); // Nombre del torneo actual

  // Manejador para volver a la lista de participantes del torneo
  const handleVolverAParticipantes = () => {
    navigate(`/torneo/${torneoId}`, { state: { activeTab: "participantes", fromDetails: true } });
  };

  // Efecto para cargar los datos del participante o equipo al cargar el componente o cambiar los IDs
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError("");
      setData(null);
      setMiembrosEquipo([]);

      let currentTorneoMode = null;
      // Obtiene el modo del torneo actual
      if (torneoId) {
        const torneoRef = doc(db, "torneos", torneoId);
        const torneoSnap = await getDoc(torneoRef);
        if (torneoSnap.exists()) {
          setNombreTorneoActual(torneoSnap.data().titulo);
          currentTorneoMode = torneoSnap.data().modo;
          setTorneoMode(currentTorneoMode);
        }
      }

      try {
        if (tipo === "usuario") { // Si el tipo es "usuario"
          const usuarioRef = doc(db, "usuarios", participanteId);
          const usuarioSnap = await getDoc(usuarioRef);
          if (usuarioSnap.exists()) {
            const usuarioData = usuarioSnap.data();
            setData({ ...usuarioData, id: usuarioSnap.id, tipo: "usuario" });

            // Obtiene los torneos en los que ha participado el usuario
            const torneosQuery = query(
              collection(db, "torneos"),
              where("participantes", "array-contains", participanteId)
            );
            const torneosSnap = await getDocs(torneosQuery);
            setEstadisticasUsuario({ torneosJugados: torneosSnap.size });

          } else {
            setError("Usuario no encontrado.");
          }
        } else if (tipo === "equipo") { // Si el tipo es "equipo"
          if (location.state?.equipoData) { // Prioriza los datos pasados por el estado de la navegación
            const equipo = location.state.equipoData;
            setData({ ...equipo, id: participanteId, tipo: "equipo" });

            // Carga los detalles de los miembros del equipo
            if (equipo.miembros && equipo.miembros.length > 0) {
              const miembrosDataPromises = equipo.miembros.map(async (miembroIdentificador) => {
                let miembroInfo = { identificador: miembroIdentificador, nombre: miembroIdentificador, email: "" };
                // Intenta buscar el miembro por UID si parece un UID de Firebase
                if (typeof miembroIdentificador === 'string' && miembroIdentificador.length > 15) {
                    try {
                        const userRef = doc(db, "usuarios", miembroIdentificador);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            miembroInfo.nombre = userSnap.data().nombre || miembroIdentificador;
                            miembroInfo.email = userSnap.data().email || "";
                        } else {
                             miembroInfo.nombre = miembroIdentificador; // Si no se encuentra, usa el ID
                        }
                    } catch (e) {
                        console.warn("Error buscando miembro por UID:", miembroIdentificador, e);
                        miembroInfo.nombre = `Usuario (${miembroIdentificador.substring(0,6)}...) (Error)`;
                    }
                } else if (miembroIdentificador.includes('@')) { // Si parece un email
                    miembroInfo.email = miembroIdentificador;
                    miembroInfo.nombre = miembroIdentificador.split('@')[0];
                }
                return miembroInfo;
              });
              const miembrosResueltos = await Promise.all(miembrosDataPromises);
              setMiembrosEquipo(miembrosResueltos);
            }

          } else { // Si no hay datos en el estado, busca el equipo en el torneo
            const torneoRef = doc(db, "torneos", torneoId);
            const torneoSnap = await getDoc(torneoRef);
            if (torneoSnap.exists()) {
              const torneoData = torneoSnap.data();
              // Busca el equipo por el ID del capitán (que es el participanteId en este caso)
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
        setLoading(false); // Finaliza el estado de carga
      }
    };

    // Llama a cargarDatos solo si los parámetros necesarios están presentes
    if (participanteId && tipo && torneoId) {
      cargarDatos();
    } else {
      setError("Información incompleta para cargar detalles.");
      setLoading(false);
    }
  }, [participanteId, tipo, torneoId, location.state]);

  // Función auxiliar para obtener la inicial del nombre o email para el avatar por defecto
  const getInicial = (nombre, email) => {
    if (!nombre || typeof nombre !== 'string') {
        if (email && typeof email === 'string') return email.charAt(0).toUpperCase();
        return "?";
    }
    return nombre.charAt(0).toUpperCase();
  };

  // Función para formatear un timestamp a una fecha legible
  const formatDate = (timestamp) => {
    if (!timestamp) return "Fecha desconocida";
    if (timestamp.seconds) { // Si es un objeto Timestamp de Firebase
      return new Date(timestamp.seconds * 1000).toLocaleDateString("es-ES", {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    const date = new Date(timestamp); // Si es un objeto Date normal
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("es-ES", {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    return "Fecha inválida";
  };

  // Muestra un mensaje de carga mientras los datos se están obteniendo
  if (loading) {
    return <div className="detalles-participante-loading">Cargando detalles...</div>;
  }

  // Muestra un mensaje de error si hubo problemas al cargar y permite volver
  if (error) {
    return (
      <div className="detalles-participante-error">
        <p>{error}</p>
        <button onClick={handleVolverAParticipantes} className="dp-boton-volver">
          <FaArrowLeft /> Volver a Participantes
        </button>
      </div>
    );
  }

  // Muestra un mensaje si no se encontraron datos para el participante
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
        {/* Cabecera con botón de volver y título */}
        <div className="dp-header">
            <button onClick={handleVolverAParticipantes} className="dp-boton-volver dp-header-volver">
                <FaArrowLeft />
            </button>
            <h1 className="dp-titulo-principal">
                Detalles del {data.tipo === "usuario" ? "Jugador" : "Equipo"}
                {nombreTorneoActual && <span className="dp-subtitulo-torneo">en {nombreTorneoActual}</span>}
            </h1>
            <div style={{width: "40px"}}></div> {/* Espaciador para centrar el título */}
        </div>

      {/* Tarjeta de detalles para un usuario individual */}
      {data.tipo === "usuario" && (
        <div className="dp-card dp-usuario-card">
          {torneoMode === "individual" && ( // Muestra el avatar solo si el torneo es individual
            <div className="dp-avatar-container">
              {data.photoURL ? (
                <img src={data.photoURL} alt={`Avatar de ${data.nombre || 'participante'}`} className="dp-avatar dp-avatar-img" />
              ) : (
                <div className="dp-avatar dp-avatar-default">
                  {getInicial(data.nombre, data.email)}
                </div>
              )}
            </div>
          )}
          <div className="dp-info-grupo">
            <h2 className="dp-nombre">{data.nombre || "Nombre no disponible"} {data.apellidos || ""}</h2>
          </div>
          {/* Información de contacto y registro */}
          <div className="dp-info-item">
            <FaEnvelope className="dp-info-icon" />
            <span>{data.email || "Email no disponible"}</span>
          </div>
          <div className="dp-info-item">
            <FaCalendarAlt className="dp-info-icon" />
            <span>Se unió: {formatDate(data.fechaRegistro) || "No especificado"}</span>
          </div>

          {/* Sección de estadísticas (para usuarios) */}
          <div className="dp-seccion dp-estadisticas">
            <h3 className="dp-subtitulo-seccion"><FaChartLine /> Estadísticas</h3>
            <div className="dp-info-item">
              <span>Torneos Jugados: {estadisticasUsuario.torneosJugados}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta de detalles para un equipo */}
      {data.tipo === "equipo" && (
        <div className="dp-card dp-equipo-card">
          <div className="dp-info-grupo">
            <FaShieldAlt className="dp-icono-titulo-equipo" /> {/* Icono de escudo para equipos */}
            <h2 className="dp-nombre-equipo">{data.nombre || "Nombre de equipo no disponible"}</h2>
          </div>
           {/* Muestra el capitán del equipo si está disponible */}
           {data.capitanNombre && (
            <div className="dp-info-item">
                <FaUserCircle className="dp-info-icon" />
                <span>Capitán: {data.capitanNombre} ({data.capitanEmail || data.capitan})</span>
            </div>
          )}

          {/* Sección de integrantes del equipo */}
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