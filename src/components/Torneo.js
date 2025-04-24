// Torneo.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebase";
import Componente1 from "./Componente1";
import Componente2 from "./Componente2";
import Calendario from "./Calendario"; // Importa el componente Calendar
import Clasificacion from "./Clasificacion";

const db = getFirestore(app);

function Torneo() {
 const [componenteActivo, setComponenteActivo] = useState(null);
 const [tituloTorneo, setTituloTorneo] = useState(""); // Estado para almacenar el título
 const { id } = useParams();

 useEffect(() => {
   const fetchTorneo = async () => {
     const torneoRef = doc(db, "torneos", id);
     const torneoSnapshot = await getDoc(torneoRef);

     if (torneoSnapshot.exists()) {
       setTituloTorneo(torneoSnapshot.data().titulo); // Establece el título del torneo
     } else {
       console.log("Torneo no encontrado");
     }
   };

   fetchTorneo();
 }, [id]);

 return (
   <div>
     <header>{tituloTorneo || "Cargando..."}</header> {/* Muestra el título del torneo */}
     <main>
       <div className="vertical">
         <div className="item" onClick={() => setComponenteActivo("componente1")}>
           Info general
         </div>
         <div className="item" onClick={() => setComponenteActivo("componente2")}>
           Participantes
         </div>
         <div className="item" onClick={() => setComponenteActivo("calendario")}> {/* Nueva opción */}
           Calendario
         </div>
         <div className="item" onClick={() => setComponenteActivo("componente3")}>
           Clasificación
         </div>
         
       </div>

       <div className="contenido">
         {componenteActivo === "componente1" && <Componente1 torneoId={id} />}
         {componenteActivo === "componente2" && <Componente2 torneoId={id} />}
         {componenteActivo === "componente3" && <Clasificacion torneoId={id} />}
         {componenteActivo === "calendario" && <Calendario />} {/* Renderiza el componente Calendar */}
       </div>
     </main>
   </div>
 );
}

export default Torneo;