import React, { useState } from "react"; // useEffect no se usa, se puede quitar si no hay más lógica
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore"; // Importar arrayUnion
import { app } from "../firebase";
import EquipoForm from "./EquipoForm"; // Asumimos que este componente existe
import { v4 as uuidv4 } from "uuid";

const db = getFirestore(app);
const auth = getAuth(app);

function Unirse() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [torneo, setTorneo] = useState(null);
  const [mostrarFormEquipo, setMostrarFormEquipo] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Estado para feedback de carga
  const [error, setError] = useState(""); // Estado para mensajes de error

  const handleUnirseTorneo = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Debes iniciar sesión para unirte a un torneo.");
      return;
    }
    if (!codigo.trim()) {
        setError("Por favor, introduce un código de torneo.");
        return;
    }

    setIsLoading(true);
    setError(""); // Limpiar errores previos
    setTorneo(null);
    setMostrarFormEquipo(false);

    try {
      const q = query(collection(db, "torneos"), where("codigo", "==", codigo.trim().toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Código de torneo no válido o no encontrado.");
        setIsLoading(false);
        return;
      }

      const torneoDoc = snapshot.docs[0];
      const torneoData = torneoDoc.data();
      const torneoId = torneoDoc.id; // Guardar ID

      if (torneoData.creadorId === user.uid) {
        setError("No puedes unirte a tu propio torneo como participante.");
        setIsLoading(false);
        return;
      }

       // Verificar si ya está lleno (simplificado, necesitaría lógica más robusta)
      // if (torneoData.participantes.length >= torneoData.numEquipos) {
      //    setError("Este torneo ya ha alcanzado el número máximo de participantes.");
      //    setIsLoading(false);
      //    return;
      // }


      if (torneoData.modo === "equipo") {
        const yaEsCapitan = torneoData.participantes.some(
          (equipo) => typeof equipo === 'object' && equipo.capitan === user.uid
        );
         // Podrías añadir una comprobación si es miembro de otro equipo
         // const yaEsMiembro = torneoData.participantes.some(equipo => typeof equipo === 'object' && equipo.miembros.includes(user.uid));

        if (yaEsCapitan) {
          setError("Ya eres capitán de un equipo en este torneo.");
          setIsLoading(false);
          return;
        }
        // Guardar datos del torneo para pasarlos a EquipoForm si es necesario
        setTorneo({ id: torneoId, ...torneoData });
        setMostrarFormEquipo(true); // Mostrar formulario para crear/unir equipo

      } else { // Modo individual
        if (torneoData.participantes.includes(user.uid)) {
          setError("Ya estás inscrito en este torneo.");
          setIsLoading(false);
          return;
        }
        // Unirse como individual usando arrayUnion para mayor seguridad atómica
        await updateDoc(doc(db, "torneos", torneoId), {
          participantes: arrayUnion(user.uid)
        });
        alert("¡Te has unido al torneo con éxito!");
        navigate("/home"); // O a la página del torneo: navigate(`/torneo/${torneoId}`)
      }

    } catch (err) {
      console.error("Error al buscar o unirse al torneo:", err);
      setError("Ocurrió un error al intentar unirse. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  // El submit de EquipoForm ahora debería manejar la lógica de añadir el equipo
  // Esta función es un placeholder si EquipoForm no la maneja internamente
  const handleSubmitEquipo = async (nombreEquipo, miembros) => {
     if (!torneo) return; // Asegurarse de que tenemos los datos del torneo
     setIsLoading(true);
     setError("");
     try {
        const user = auth.currentUser;
        const torneoRef = doc(db, "torneos", torneo.id);
        const nuevoEquipo = {
            id: uuidv4(), // Añadir un ID único al equipo
            capitan: user.uid,
            nombre: nombreEquipo,
            miembros: miembros, // Array de UIDs o emails, según tu diseño
            fechaRegistro: new Date()
        };

        // Usar arrayUnion para añadir el equipo de forma segura
        await updateDoc(torneoRef, {
            participantes: arrayUnion(nuevoEquipo)
        });

        alert(`Equipo "${nombreEquipo}" unido al torneo "${torneo.titulo}" con éxito.`);
        navigate("/home"); // O a la página del torneo

     } catch (error) {
        console.error("Error uniendo equipo:", error);
        setError("Error al registrar el equipo. Inténtalo de nuevo.");
        setIsLoading(false);
     }
  };

  return (
    // Contenedor para centrar en la página (reutiliza o crea estilo)
    <div className="unirse-torneo-page-container">
      {/* Contenedor principal del formulario (reutiliza o crea estilo) */}
      <div className="unirse-torneo-container">
        <h1>Unirse a un Torneo</h1>

        {/* Formulario inicial para introducir código */}
        {!mostrarFormEquipo && (
          <div className="form-step"> {/* Reutiliza clase para estructura */}
            <input
              // Aplica la clase de input definida anteriormente
              className="form-input"
              type="text"
              placeholder="Introduce el código del torneo"
              value={codigo}
              // Convertir a mayúsculas al escribir para consistencia
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={6} // Asumiendo códigos de 6 caracteres
              disabled={isLoading}
            />
            {/* Aplica las clases de botón definidas anteriormente */}
            <button
                className="form-button primary"
                onClick={handleUnirseTorneo}
                disabled={isLoading || !codigo} // Deshabilitar si carga o no hay código
            >
              {isLoading ? "Buscando..." : "Buscar y Unirse"}
            </button>
             {/* Muestra mensajes de error */}
             {error && <p className="form-error-message">{error}</p>}
          </div>
        )}


        {/* Renderiza el formulario de equipo si es necesario */}
        {mostrarFormEquipo && torneo && (
          <div className="equipo-form-section">
             <h2>Inscripción de Equipo para "{torneo.titulo}"</h2>
             <p>Introduce los datos de tu equipo.</p>
            {/*
              IMPORTANTE: El componente EquipoForm también debe ser estilizado
              usando las clases CSS (form-input, form-button, etc.)
              para mantener la consistencia visual.
            */}
            <EquipoForm
              torneoId={torneo.id} // Pasar ID si es necesario dentro del form
              onSubmit={handleSubmitEquipo} // Pasa la función de submit
              onCancel={() => { setMostrarFormEquipo(false); setError(''); setTorneo(null); }} // Permite cancelar
              isLoading={isLoading} // Pasa el estado de carga
            />
             {/* Muestra errores específicos del form de equipo si los hay */}
             {error && <p className="form-error-message">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default Unirse;