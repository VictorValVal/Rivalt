import React, { useState } from "react";

function EquipoForm({ onSubmit, onCancel }) {
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [miembros, setMiembros] = useState([""]);

  const handleChangeMiembro = (index, value) => {
    const nuevosMiembros = [...miembros];
    nuevosMiembros[index] = value;
    setMiembros(nuevosMiembros);
  };

  const agregarMiembro = () => {
    setMiembros([...miembros, ""]);
  };

  const handleSubmit = () => {
    if (!nombreEquipo.trim()) {
      alert("Debes poner un nombre de equipo.");
      return;
    }
    if (miembros.some(m => !m.trim())) {
      alert("Todos los miembros deben tener nombre.");
      return;
    }
    onSubmit(nombreEquipo, miembros);
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid gray", marginTop: "1rem" }}>
      <h3>Formulario del equipo</h3>
      <input
        type="text"
        placeholder="Nombre del equipo"
        value={nombreEquipo}
        onChange={(e) => setNombreEquipo(e.target.value)}
      />
      <h4>Miembros</h4>
      {miembros.map((miembro, index) => (
        <input
          key={index}
          type="text"
          placeholder={`Miembro ${index + 1}`}
          value={miembro}
          onChange={(e) => handleChangeMiembro(index, e.target.value)}
        />
      ))}
      <button onClick={agregarMiembro}>Añadir miembro</button>
      <br />
      <button onClick={handleSubmit}>Enviar equipo</button>
      <button onClick={onCancel}>Cancelar</button>
    </div>
  );
}

export default EquipoForm;