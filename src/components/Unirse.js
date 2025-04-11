import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { app } from "../firebase";
import EquipoForm from "./EquipoForm";

const db = getFirestore(app);
const auth = getAuth(app);

function Unirse() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [torneo, setTorneo] = useState(null);
  const [mostrarFormEquipo, setMostrarFormEquipo] = useState(false);

  const handleUnirseTorneo = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "torneos"), where("codigo", "==", codigo));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert("Torneo no encontrado.");
      return;
    }

    const torneoDoc = snapshot.docs[0];
    const torneoData = torneoDoc.data();

    if (torneoData.creadorId === user.uid) {
      alert("No puedes unirte a tu propio torneo.");
      return;
    }

    if (torneoData.modo === "equipo") {
      const yaEsParticipante = torneoData.participantes.some(
        equipo => equipo.capitan === user.uid
      );
      if (yaEsParticipante) {
        alert("Ya estás en este torneo como capitán de un equipo.");
        return;
      }
      setTorneo({ id: torneoDoc.id, ...torneoData });
      setMostrarFormEquipo(true);
    } else {
      await unirseComoIndividual(torneoDoc.ref, torneoData, user.uid);
    }
  };

  const unirseComoIndividual = async (torneoRef, torneoData, uid) => {
    if (torneoData.participantes.includes(uid)) {
      alert("Ya estás en este torneo.");
      return;
    }

    await updateDoc(torneoRef, {
      participantes: [...torneoData.participantes, uid]
    });
    navigate("/home");
  };

  const handleSubmitEquipo = async (nombreEquipo, miembros) => {
    try {
      const torneoRef = doc(db, "torneos", torneo.id);
      const nuevoEquipo = {
        capitan: auth.currentUser.uid,
        nombre: nombreEquipo,
        miembros,
        fechaRegistro: new Date()
      };

      await updateDoc(torneoRef, {
        participantes: [...torneo.participantes, nuevoEquipo]
      });

      navigate("/home");
    } catch (error) {
      console.error("Error uniendo equipo:", error);
    }
  };

  return (
    <div>
      <h1>Unirse a un Torneo</h1>
      <input
        type="text"
        placeholder="Código del torneo"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />
      <button onClick={handleUnirseTorneo}>Unirse</button>

      {mostrarFormEquipo && (
        <EquipoForm
          onSubmit={handleSubmitEquipo}
          onCancel={() => setMostrarFormEquipo(false)}
        />
      )}
    </div>
  );
}

export default Unirse;