import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebase"; // Asegúrate de que este archivo exporte tu configuración de Firebase

function Componente1({ torneoId }) {
  const [torneoCode, setTorneoCode] = useState(""); // Código del torneo
  const db = getFirestore(app); // Inicializa Firestore

  useEffect(() => {
    const fetchTorneoCode = async () => {
      try {
        if (!torneoId) {
          console.error("No se proporcionó un ID de torneo.");
          return;
        }

        const torneoRef = doc(db, "torneos", torneoId); // Obtén el documento del torneo por su ID
        const torneoSnap = await getDoc(torneoRef);

        if (torneoSnap.exists()) {
          const data = torneoSnap.data();
          setTorneoCode(data.codigo); // Asigna el código del torneo desde la base de datos
        } else {
          console.error("No se encontró el documento del torneo.");
        }
      } catch (error) {
        console.error("Error al obtener el código del torneo:", error);
      }
    };

    fetchTorneoCode();
  }, [torneoId, db]);

  const handleCopy = () => {
    if (torneoCode) {
      navigator.clipboard.writeText(torneoCode);
      alert("Código copiado al portapapeles: " + torneoCode);
    } else {
      alert("El código del torneo no está disponible.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h3>Código del Torneo</h3>
      <div
      >
        {torneoCode || "Cargando..."}
      </div>
      <br />
      <button
        onClick={handleCopy}
      >
        Copiar Código
      </button>
    </div>
  );
}

export default Componente1;