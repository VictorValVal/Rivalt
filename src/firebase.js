import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDdzAIMLeo-NJv3rcqW02rtoH4jw5_C4Co",
  authDomain: "rivalt-torneo.firebaseapp.com",
  projectId: "rivalt-torneo",
  storageBucket: "rivalt-torneo.firebasestorage.app",
  messagingSenderId: "902044171145",
  appId: "1:902044171145:web:d6d68daf8572af25d07f58",
  measurementId: "G-Q9LXE07KQY"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta app y auth
const auth = getAuth(app);
export { app, auth };
