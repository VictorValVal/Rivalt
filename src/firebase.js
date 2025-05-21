import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDdzAIMLeo-NJv3rcqW02rtoH4jw5_C4Co",
  authDomain: "rivalt-torneo.firebaseapp.com",
  projectId: "rivalt-torneo",
  storageBucket: "rivalt-torneo.appspot.com",
  messagingSenderId: "902044171145",
  appId: "1:902044171145:web:d6d68daf8572af25d07f58",
  measurementId: "G-Q9LXE07KQY"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Exporta solo las instancias, NO los métodos de auth directamente
export {
  app,
  auth,
  db,
  googleProvider
};