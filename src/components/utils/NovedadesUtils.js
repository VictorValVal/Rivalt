import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { app } from "../../firebase"; // Ajusta esta ruta a tu archivo firebase.js

const db = getFirestore(app);

export const agregarNovedadConDebug = async (torneoId, mensaje, tipo, dataExtra = {}, originComponent = "Desconocido") => {
  console.log(`[${originComponent}] ==> Intentando agregar novedad:`, { torneoId, mensaje, tipo, dataExtra });
  if (!torneoId || !mensaje || !tipo) {
    console.error(`[${originComponent}] ERROR: Faltan datos para agregar novedad.`, { torneoId, mensaje, tipo });
    // Considera lanzar un error aquí o retornar un estado de fallo
    // return { success: false, error: "Datos incompletos" };
    return; // Termina la ejecución si faltan datos esenciales.
  }

  try {
    const novedadesRef = collection(db, `torneos/${torneoId}/novedades`);
    const docData = {
      mensaje,
      tipo,
      timestamp: serverTimestamp(), // Esto debe resolverse a un timestamp de servidor en Firestore.
      origenDelEvento: originComponent, // Ayuda a identificar qué componente generó la novedad
      ...dataExtra,
    };
    const docRef = await addDoc(novedadesRef, docData);
    console.log(`[${originComponent}] <== Novedad AGREGADA con ID: ${docRef.id}. Mensaje: "${mensaje}", Tipo: "${tipo}", Data Guardada:`, docData);
    // return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`[${originComponent}] Error CRÍTICO al agregar novedad (Tipo: ${tipo}, Mensaje: "${mensaje}"):`, error);
    console.error(`[${originComponent}] Datos que se intentaron guardar:`, { torneoId, mensaje, tipo, dataExtra });
    // Considera manejar el error de forma más específica, por ejemplo, reintentar o notificar al usuario.
    // return { success: false, error: error.message };
    // REVISA TUS REGLAS DE SEGURIDAD DE FIRESTORE si los errores son de permisos.
  }
};