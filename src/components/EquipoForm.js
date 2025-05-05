import React, { useState } from "react";

function EquipoForm({ onSubmit, onCancel, capitanId }) { // Añade capitanId si lo necesitas aquí
  const [nombreEquipo, setNombreEquipo] = useState("");
  // Quitamos la gestión de miembros si Componente2 no la necesita guardar
  // const [miembros, setMiembros] = useState([""]);

  /* Lógica de miembros eliminada si no se guarda en el objeto principal del equipo
  const handleChangeMiembro = (index, value) => {
     const nuevosMiembros = [...miembros];
     nuevosMiembros[index] = value;
     setMiembros(nuevosMiembros);
  };

  const agregarMiembro = () => {
     setMiembros([...miembros, ""]);
  };
  */

  const handleSubmit = (e) => { // Añadir evento 'e'
    e.preventDefault(); // Prevenir recarga de página si es un form real
    if (!nombreEquipo.trim()) {
      alert("Debes poner un nombre de equipo.");
      return;
    }
    /* Validación de miembros eliminada si no se guarda
    if (miembros.some(m => !m.trim())) {
       alert("Todos los miembros deben tener nombre.");
       return;
    }
    */

    // --- ¡CAMBIO PRINCIPAL AQUÍ! ---
    // Crear un *único objeto* con la información del equipo
    const datosEquipo = {
      nombre: nombreEquipo, // La propiedad se llama 'nombre'
      // miembros: miembros, // Descomenta si SÍ quieres guardar los miembros en Firestore
      // capitan: capitanId // Puedes añadir el capitán aquí si quieres, aunque Componente2 ya lo hace
                           // Asegúrate de recibir 'capitanId' como prop si lo usas aquí.
    };

    // Llamar a onSubmit con ESE objeto
    onSubmit(datosEquipo);
    // --- FIN DEL CAMBIO ---
  };

  return (
    // Cambiar a <form> si quieres usar preventDefault
    <div style={{ padding: "1rem", border: "1px solid gray", marginTop: "1rem" }}>
      <h3>Formulario del equipo</h3>
      <input
        type="text"
        placeholder="Nombre del equipo"
        value={nombreEquipo}
        onChange={(e) => setNombreEquipo(e.target.value)}
        required // Añadir validación HTML básica
      />

      {/* Sección de miembros eliminada si no la necesitas guardar */}
      {/*
      <h4>Miembros</h4>
      {miembros.map((miembro, index) => (
         <input
           key={index}
           type="text"
           placeholder={`Miembro ${index + 1}`}
           value={miembro}
           onChange={(e) => handleChangeMiembro(index, e.target.value)}
           required
         />
      ))}
      <button type="button" onClick={agregarMiembro}>Añadir miembro</button>
      <br />
      */}

      {/* Usar type="submit" si cambias el div a <form> */}
      <button onClick={handleSubmit}>Enviar equipo</button>
      {/* Usar type="button" para botones que no envían el form */}
      <button type="button" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

export default EquipoForm;