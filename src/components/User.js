import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

function User() {
  const { torneoId, uid } = useParams(); // Obtenemos el id del torneo y el id del usuario/equipo
  const [usuario, setUsuario] = useState(null);
  const [esEquipo, setEsEquipo] = useState(false); // Determina si es un equipo
  const [miembros, setMiembros] = useState([]); // Lista de miembros si es un equipo

  useEffect(() => {
    const obtenerDatos = async () => {
      const equipoRef = doc(db, `torneos/${torneoId}/equipos`, uid);
      const usuarioRef = doc(db, "usuarios", uid);

      // Verificar si es un equipo
      const equipoSnap = await getDoc(equipoRef);
      if (equipoSnap.exists()) {
        setEsEquipo(true);
        const equipoData = equipoSnap.data();
        setUsuario(equipoData);

        // Obtener la lista de miembros del equipo
        const miembrosRefs = equipoData.miembros || [];
        const miembrosData = await Promise.all(
          miembrosRefs.map(async (miembroId) => {
            const miembroRef = doc(db, "usuarios", miembroId);
            const miembroSnap = await getDoc(miembroRef);
            return miembroSnap.exists()
              ? miembroSnap.data()
              : { nombre: `ID: ${miembroId}`, email: "Sin correo" };
          })
        );
        setMiembros(miembrosData);
      } else {
        // Si no es un equipo, buscar como usuario individual
        const usuarioSnap = await getDoc(usuarioRef);
        if (usuarioSnap.exists()) {
          setEsEquipo(false);
          setUsuario(usuarioSnap.data());
        } else {
          console.log("Usuario o equipo no encontrado");
        }
      }
    };

    obtenerDatos();
  }, [uid, torneoId]);

  if (!usuario) {
    return <div>Cargando perfil...</div>;
  }

  return (
    <div>
      {esEquipo ? (
        <div>
          <h3>Equipo: {usuario.nombre}</h3>
          <p>Capitán: {usuario.capitan}</p>
          <h4>Miembros:</h4>
          <ul>
            {miembros.map((miembro, index) => (
              <li key={index}>
                {miembro.nombre} - {miembro.email}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <h3>Perfil de {usuario.nombre}</h3>
          <p>Email: {usuario.email}</p>
          <p>Edad: {usuario.edad || "No especificada"}</p>
        </div>
      )}
    </div>
  );
}

export default User;