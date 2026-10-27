import { useState } from "react";

import { tecnicosIniciales } from "../data/tecnicosIniciales";
import type { Tecnico } from "../types/tecnico";

export function useTecnicos() {
  const [tecnicos, setTecnicos] =
    useState<Tecnico[]>(tecnicosIniciales);

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  function guardarTecnico() {
    if (nombre.trim() === "") {
      setError("El nombre es obligatorio");
      return;
    }

    const nuevoTecnico: Tecnico = {
      id: Date.now().toString(),
      nombre: nombre.trim(),
    };

    setTecnicos([...tecnicos, nuevoTecnico]);
    setNombre("");
    setError("");
  }

  return {
    tecnicos,
    nombre,
    error,
    setNombre,
    guardarTecnico,
  };
}
