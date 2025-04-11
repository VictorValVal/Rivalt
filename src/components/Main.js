import React from "react";
import { useNavigate } from "react-router-dom";

function Main() {
  const navigate = useNavigate();

  const login = () => {
    navigate("/login");
  };

  return (
    <div className="main">
      <button onClick={login}>Iniciar sesión</button>
    </div>
  );
}

export default Main;
