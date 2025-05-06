import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebase";
import Informacion from "./Información";
import Participantes from "./Participantes";
import Calendario from "./Calendario";
import Clasificacion from "./Clasificacion";
import "./estilos/Torneo.css";
import { FaInfoCircle, FaUsers, FaCalendarAlt, FaChartBar, FaQuestionCircle } from "react-icons/fa";

const db = getFirestore(app);

function Torneo() {
  const [componenteActivo, setComponenteActivo] = useState(null);
  const [tituloTorneo, setTituloTorneo] = useState("");
  const { id } = useParams();

  useEffect(() => {
    const fetchTorneo = async () => {
      if (!id) {
        console.error("No tournament ID provided.");
        setTituloTorneo("Torneo no encontrado");
        return;
      }
      try {
        const torneoRef = doc(db, "torneos", id);
        const torneoSnapshot = await getDoc(torneoRef);

        if (torneoSnapshot.exists()) {
          setTituloTorneo(torneoSnapshot.data().titulo);
          setComponenteActivo("componente1");
        } else {
          console.log("Torneo no encontrado");
          setTituloTorneo("Torneo no encontrado");
        }
      } catch (error) {
          console.error("Error fetching tournament title:", error);
          setTituloTorneo("Error al cargar");
      }
    };

    fetchTorneo();
  }, [id]);

  const renderComponente = () => {
    switch (componenteActivo) {
      case "componente1":
        return <Informacion torneoId={id} />;
      case "participantes":
        return <Participantes torneoId={id} />;
      case "calendario":
        return <Calendario torneoId={id} />;
      case "clasificacion":
        return <Clasificacion torneoId={id} />;
      default:
        return (
          <div className="contenido-placeholder">
             <FaQuestionCircle size={60} style={{ marginBottom: '1.5rem', color: '#444' }} />
             <h2>Selecciona una sección</h2>
             <p>Usa la barra lateral izquierda para navegar por la información del torneo.</p>
          </div>
        );
    }
  };

  return (
    <div className="torneo-page-container">
      <header className="torneo-header">{tituloTorneo || "Cargando..."}</header>
      <main className="torneo-main">
        <nav className="vertical-sidebar">
          <button
            className={`sidebar-item ${componenteActivo === 'componente1' ? 'active' : ''}`}
            onClick={() => setComponenteActivo("componente1")}
            data-tooltip="Información"
            aria-label="Información"
          >
            <FaInfoCircle size={24} />
          </button>
          <button
            className={`sidebar-item ${componenteActivo === 'participantes' ? 'active' : ''}`}
            onClick={() => setComponenteActivo("participantes")}
            data-tooltip="Participantes"
            aria-label="Participantes"
          >
            <FaUsers size={24} />
          </button>
          <button
            className={`sidebar-item ${componenteActivo === 'calendario' ? 'active' : ''}`}
            onClick={() => setComponenteActivo("calendario")}
            data-tooltip="Calendario"
            aria-label="Calendario"
          >
            <FaCalendarAlt size={24} />
          </button>
          <button
            className={`sidebar-item ${componenteActivo === 'clasificacion' ? 'active' : ''}`}
            onClick={() => setComponenteActivo("clasificacion")}
            data-tooltip="Clasificación"
            aria-label="Clasificación"
          >
            <FaChartBar size={24} />
          </button>
        </nav>

        <div className="torneo-contenido">
            <div className="contenido-bloque">
                 {renderComponente()}
            </div>
        </div>
      </main>
    </div>
  );
}

export default Torneo;