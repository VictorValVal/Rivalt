import React, { useState } from "react";
import { FaUsers, FaUserPlus, FaTrash, FaSave, FaTimes } from 'react-icons/fa'; // Iconos
import "./estilos/EquipoForm.css"; // Crearemos este archivo CSS

function EquipoForm({ onSubmit, onCancel, maxMiembros }) { // Añadimos maxMiembros opcional
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [miembros, setMiembros] = useState([""]); // Empezar con un miembro (el capitán)
  const [error, setError] = useState(""); // Para mensajes de error

  const handleChangeNombreEquipo = (e) => {
    setNombreEquipo(e.target.value);
    if (error && e.target.value.trim()) {
      setError(""); // Limpiar error si el usuario empieza a escribir
    }
  };

  const handleChangeMiembro = (index, value) => {
    const nuevosMiembros = [...miembros];
    nuevosMiembros[index] = value;
    setMiembros(nuevosMiembros);
    if (error && value.trim()) {
        setError(""); // Limpiar error
    }
  };

  const agregarMiembro = () => {
    if (maxMiembros && miembros.length >= maxMiembros) {
        setError(`No puedes añadir más de ${maxMiembros} miembros.`);
        return;
    }
    setMiembros([...miembros, ""]);
    setError(""); // Limpiar error si se pudo añadir
  };

  const eliminarMiembro = (index) => {
    if (miembros.length <= 1) { // No permitir eliminar al último miembro (capitán)
        setError("El equipo debe tener al menos un miembro.");
        return;
    }
    const nuevosMiembros = miembros.filter((_, i) => i !== index);
    setMiembros(nuevosMiembros);
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevenir el comportamiento por defecto del form
    if (!nombreEquipo.trim()) {
      setError("El nombre del equipo no puede estar vacío.");
      return;
    }
    if (miembros.some(m => !m.trim())) {
      setError("Todos los campos de miembro deben tener un nombre o correo.");
      return;
    }
    if (miembros.length === 0) {
        setError("El equipo debe tener al menos un miembro.");
        return;
    }
    // Validar emails si es necesario (ejemplo simple)
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (miembros.some(m => !emailRegex.test(m.trim()))) {
    //   setError("Asegúrate de que todos los miembros sean correos válidos.");
    //   return;
    // }

    setError(""); // Limpiar errores si todo está bien
    onSubmit(nombreEquipo, miembros);
  };

  return (
    // Usamos <form> para semántica y manejo de submit
    <form onSubmit={handleSubmit} className="equipo-form-container">
      <div className="form-header">
        <FaUsers className="header-icon" />
        <h2>Crear Nuevo Equipo</h2>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="form-group">
        <label htmlFor="nombreEquipo">Nombre del Equipo</label>
        <input
          id="nombreEquipo"
          type="text"
          placeholder="Ej: Los Invencibles"
          value={nombreEquipo}
          onChange={handleChangeNombreEquipo}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>Miembros del Equipo (emails o nicks)</label>
        {miembros.map((miembro, index) => (
          <div key={index} className="miembro-input-group">
            <input
              type="text" // Cambiar a type="email" si siempre serán correos
              placeholder={`Email o Nick del Miembro ${index + 1}`}
              value={miembro}
              onChange={(e) => handleChangeMiembro(index, e.target.value)}
              className="form-input"
            />
            {miembros.length > 1 && ( // Mostrar botón de eliminar si hay más de un miembro
              <button
                type="button"
                onClick={() => eliminarMiembro(index)}
                className="remove-miembro-button"
                title="Eliminar miembro"
              >
                <FaTrash />
              </button>
            )}
          </div>
        ))}
        {(!maxMiembros || miembros.length < maxMiembros) && (
             <button
                type="button"
                onClick={agregarMiembro}
                className="add-miembro-button"
            >
                <FaUserPlus /> Añadir Miembro
            </button>
        )}
         {maxMiembros && <p className="miembros-limit-info">Máximo {maxMiembros} miembros.</p>}
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="form-button secondary" // Estilo de botón secundario
        >
          <FaTimes /> Cancelar
        </button>
        <button
          type="submit"
          className="form-button primary" // Estilo de botón primario
        >
          <FaSave /> Guardar Equipo
        </button>
      </div>
    </form>
  );
}

export default EquipoForm;