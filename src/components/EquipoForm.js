import React, { useState } from "react";
import { FaUsers, FaUserPlus, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import "./estilos/EquipoForm.css";

function EquipoForm({ onSubmit, onCancel, maxMiembros }) {
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [miembros, setMiembros] = useState([""]);
  const [error, setError] = useState("");

  const handleChangeNombreEquipo = (e) => {
    setNombreEquipo(e.target.value);
    if (error && e.target.value.trim()) {
      setError("");
    }
  };

  const handleChangeMiembro = (index, value) => {
    const nuevosMiembros = [...miembros];
    nuevosMiembros[index] = value;
    setMiembros(nuevosMiembros);
    if (error && value.trim()) {
        setError("");
    }
  };

  const agregarMiembro = () => {
    if (maxMiembros && miembros.length >= maxMiembros) {
        setError(`No puedes añadir más de ${maxMiembros} miembros.`);
        return;
    }
    setMiembros([...miembros, ""]);
    setError("");
  };

  const eliminarMiembro = (index) => {
    if (miembros.length <= 1) {
        setError("El equipo debe tener al menos un miembro.");
        return;
    }
    const nuevosMiembros = miembros.filter((_, i) => i !== index);
    setMiembros(nuevosMiembros);
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    if (!nombreEquipo.trim()) {
      setError("El nombre del equipo no puede estar vacío.");
      return;
    }

    // Validate each member's input
    for (let i = 0; i < miembros.length; i++) {
        if (!miembros[i].trim()) {
            setError(`El email o nick del miembro ${i + 1} no puede estar vacío.`);
            return;
        }
    }

    onSubmit({ nombreEquipo, miembros });
  };

  return (
    <form className="equipo-form" onSubmit={handleSubmit}>
      <h2 className="form-title">
        <FaUsers /> Crear Nuevo Equipo
      </h2>
      {error && <p className="error-message">{error}</p>}
      <div className="form-group">
        <label htmlFor="nombreEquipo" className="form-label">
          Nombre del Equipo:
        </label>
        <input
          type="text"
          id="nombreEquipo"
          value={nombreEquipo}
          onChange={handleChangeNombreEquipo}
          className="form-input"
          placeholder="Ej: Los Invencibles"
          maxLength={50} // Added character limit
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Miembros:</label>
        {miembros.map((miembro, index) => (
          <div key={index} className="miembro-input-group">
            <input
              type="text"
              placeholder={`Email o Nick del Miembro ${index + 1}`}
              value={miembro}
              onChange={(e) => handleChangeMiembro(index, e.target.value)}
              className="form-input"
              maxLength={100} // Added character limit
              required
            />
            {miembros.length > 1 && (
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
          className="form-button secondary"
        >
          <FaTimes /> Cancelar
        </button>
        <button
          type="submit"
          className="form-button primary"
        >
          <FaSave /> Guardar Equipo
        </button>
      </div>
    </form>
  );
}

export default EquipoForm;