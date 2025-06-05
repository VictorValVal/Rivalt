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

    setError("");
    onSubmit(nombreEquipo, miembros);
  };

  return (
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
              type="text"
              placeholder={`Email o Nick del Miembro ${index + 1}`}
              value={miembro}
              onChange={(e) => handleChangeMiembro(index, e.target.value)}
              className="form-input"
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