import React, { useState, useEffect } from 'react';
import { FaSun, FaMoon } from "react-icons/fa";

// Asumo que este import es correcto según tu estructura de carpetas
// (BotonOscuro.js está en 'components' y BotonOscuro.css en 'components/estilos/')
import './estilos/BotonOscuro.css'; 

const BotonOscuro = () => {
    const [darkMode, setDarkMode] = useState(() => {
        const savedMode = localStorage.getItem('darkMode');
        // Inicializa darkMode a true si savedMode es 'true', de lo contrario a false.
        // Esto también maneja el caso donde savedMode es null (la primera vez que se carga).
        return savedMode === 'true'; 
    });

    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode'); // Asegúrate de quitar la otra clase
            localStorage.setItem('darkMode', 'true');
            console.log('Modo oscuro activado, clases del body:', document.body.className);
        } else {
            document.body.classList.add('light-mode');   // <--- AÑADE ESTA LÍNEA
            document.body.classList.remove('dark-mode'); // Quita la clase del modo oscuro
            localStorage.setItem('darkMode', 'false');
            console.log('Modo claro activado, clases del body:', document.body.className);
        }
        // Este efecto se ejecuta cuando el componente se monta y cada vez que 'darkMode' cambia.
    }, [darkMode]);

    const toggleDarkMode = () => {
        setDarkMode(prevMode => !prevMode); // Cambia el estado al valor opuesto.
    };

    return (
        <button
            style={{ marginRight: '16px' }} // Puedes mover esto a BotonOscuro.css si prefieres
            onClick={toggleDarkMode}
            className="dark-mode-toggle" // Esta clase debe tener estilos en App.css o BotonOscuro.css
        >
            {darkMode ? <FaMoon /> : <FaSun />}
        </button>
    );
};

export default BotonOscuro;