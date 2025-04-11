import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

function User() {
  const { torneoId, uid } = useParams();  // Obtenemos el id del torneo y el id del usuario
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const userRef = doc(db, "usuarios", uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUsuario(userSnap.data());
      } else {
        console.log("Usuario no encontrado");
      }
    };

    obtenerUsuario();
  }, [uid]);

  if (!usuario) {
    return <div>Cargando perfil...</div>;
  }

  return (
    <div>
      <h3>Perfil de {usuario.nombre}</h3>
      <p>Email: {usuario.email}</p>
      <p>Edad: {usuario.edad}</p>
      {/* Agrega más detalles según lo que quieras mostrar */}
    </div>
  );
}

export default User;
