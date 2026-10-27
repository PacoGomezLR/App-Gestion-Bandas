import { useState } from "react";

import { tecnicosIniciales } from "../data/tecnicosIniciales";
import type { Tecnico } from "../types/tecnico";

export function useTecnicos() {
  const [tecnicos, setTecnicos] =
    useState<Tecnico[]>(tecnicosIniciales);

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [tecnicoEditandoId, setTecnicoEditandoId] =
    useState<string | null>(null);

  function guardarTecnico() {
    if (nombre.trim() === "") {
      setError("El nombre es obligatorio");
      return;
    }

    if (tecnicoEditandoId !== null) {
      const tecnicosActualizados = tecnicos.map((tecnico) =>
        tecnico.id === tecnicoEditandoId
          ? {
              ...tecnico,
              nombre: nombre.trim(),
            }
          : tecnico
      );

      setTecnicos(tecnicosActualizados);
      setTecnicoEditandoId(null);
      setNombre("");
      setError("");
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

  function prepararEdicion(tecnico: Tecnico) {
    setTecnicoEditandoId(tecnico.id);
    setNombre(tecnico.nombre);
    setError("");
  }

  function eliminarTecnico(id: string) {
    const tecnicosActualizados = tecnicos.filter(
      (tecnico) => tecnico.id !== id
    );

    setTecnicos(tecnicosActualizados);

    if (tecnicoEditandoId === id) {
      setTecnicoEditandoId(null);
      setNombre("");
      setError("");
    }
  }

  return {
    tecnicos,
    nombre,
    error,
    tecnicoEditandoId,
    setNombre,
    guardarTecnico,
    prepararEdicion,
    eliminarTecnico,
  };
}
