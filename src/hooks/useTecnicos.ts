import { useCallback, useState } from "react";

import { tecnicosIniciales } from "../data/tecnicosIniciales";
import type { Tecnico } from "../types/tecnico";

interface UseTecnicosOptions {
  datosIniciales?: Tecnico[];
  persistirTecnico?: (tecnico: Tecnico) => Promise<boolean>;
  eliminarTecnicoPersistido?: (id: string) => Promise<boolean>;
}

export function useTecnicos(options: UseTecnicosOptions = {}) {
  const {
    datosIniciales = tecnicosIniciales,
    persistirTecnico,
    eliminarTecnicoPersistido,
  } = options;

  const [tecnicos, setTecnicos] =
    useState<Tecnico[]>(datosIniciales);

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [tecnicoEditandoId, setTecnicoEditandoId] =
    useState<string | null>(null);

  const reemplazarTecnicos = useCallback((nuevosTecnicos: Tecnico[]) => {
    setTecnicos([...nuevosTecnicos]);
  }, []);

  async function guardarTecnico(): Promise<boolean> {
    if (nombre.trim() === "") {
      setError("El nombre es obligatorio");
      return false;
    }

    const editando = tecnicoEditandoId !== null;

    const tecnicoGuardado: Tecnico = {
      id: tecnicoEditandoId ?? Date.now().toString(),
      nombre: nombre.trim(),
    };

    // Primero se persiste; el estado local solo cambia si la persistencia lo confirma
    const persistido = persistirTecnico
      ? await persistirTecnico(tecnicoGuardado)
      : true;

    if (!persistido) {
      return false;
    }

    if (editando) {
      setTecnicos((tecnicosActuales) =>
        tecnicosActuales.map((tecnico) =>
          tecnico.id === tecnicoGuardado.id ? tecnicoGuardado : tecnico
        )
      );
      setTecnicoEditandoId(null);
    } else {
      setTecnicos((tecnicosActuales) => [...tecnicosActuales, tecnicoGuardado]);
    }

    setNombre("");
    setError("");

    return true;
  }

  function prepararEdicion(tecnico: Tecnico) {
    setTecnicoEditandoId(tecnico.id);
    setNombre(tecnico.nombre);
    setError("");
  }

  function cancelarEdicion() {
    setTecnicoEditandoId(null);
    setNombre("");
    setError("");
  }

  async function eliminarTecnico(id: string): Promise<boolean> {
    const eliminado = eliminarTecnicoPersistido
      ? await eliminarTecnicoPersistido(id)
      : true;

    if (!eliminado) {
      return false;
    }

    setTecnicos((tecnicosActuales) =>
      tecnicosActuales.filter((tecnico) => tecnico.id !== id)
    );

    if (tecnicoEditandoId === id) {
      setTecnicoEditandoId(null);
      setNombre("");
      setError("");
    }

    return true;
  }

  return {
    tecnicos,
    nombre,
    error,
    tecnicoEditandoId,
    setNombre,
    reemplazarTecnicos,
    guardarTecnico,
    prepararEdicion,
    cancelarEdicion,
    eliminarTecnico,
  };
}
