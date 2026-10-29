import { useCallback, useRef, useState } from "react";

import { tecnicosIniciales } from "../data/tecnicosIniciales";
import type { Tecnico } from "../types/tecnico";

interface UseTecnicosOptions {
  datosIniciales?: Tecnico[];
  // Devuelve el registro tal como quedó guardado (con el id definitivo) o null si falla
  persistirTecnico?: (tecnico: Tecnico, esNuevo: boolean) => Promise<Tecnico | null>;
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
  const [procesando, setProcesando] = useState(false);
  // La ref bloquea de inmediato; el estado solo sirve para que la interfaz se actualice
  const operacionEnCursoRef = useRef(false);

  function iniciarOperacion(): boolean {
    if (operacionEnCursoRef.current) {
      return false;
    }

    operacionEnCursoRef.current = true;
    setProcesando(true);

    return true;
  }

  function finalizarOperacion() {
    operacionEnCursoRef.current = false;
    setProcesando(false);
  }

  const reemplazarTecnicos = useCallback((nuevosTecnicos: Tecnico[]) => {
    setTecnicos([...nuevosTecnicos]);
  }, []);

  async function guardarTecnico(): Promise<boolean> {
    if (nombre.trim() === "") {
      setError("El nombre es obligatorio");
      return false;
    }

    if (!iniciarOperacion()) {
      return false;
    }

    try {
      const editando = tecnicoEditandoId !== null;

      const tecnicoGuardado: Tecnico = {
        id: tecnicoEditandoId ?? Date.now().toString(),
        nombre: nombre.trim(),
      };

      // Primero se persiste; el estado local solo cambia si la persistencia lo confirma
      const persistido = persistirTecnico
        ? await persistirTecnico(tecnicoGuardado, !editando)
        : tecnicoGuardado;

      if (persistido === null) {
        return false;
      }

      if (editando) {
        setTecnicos((tecnicosActuales) =>
          tecnicosActuales.map((tecnico) =>
            tecnico.id === persistido.id ? persistido : tecnico
          )
        );
        setTecnicoEditandoId(null);
      } else {
        setTecnicos((tecnicosActuales) => [...tecnicosActuales, persistido]);
      }

      setNombre("");
      setError("");

      return true;
    } finally {
      finalizarOperacion();
    }
  }

  function prepararEdicion(tecnico: Tecnico) {
    if (operacionEnCursoRef.current) {
      return;
    }

    setTecnicoEditandoId(tecnico.id);
    setNombre(tecnico.nombre);
    setError("");
  }

  function cancelarEdicion() {
    if (operacionEnCursoRef.current) {
      return;
    }

    setTecnicoEditandoId(null);
    setNombre("");
    setError("");
  }

  async function eliminarTecnico(id: string): Promise<boolean> {
    if (!iniciarOperacion()) {
      return false;
    }

    try {
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
    } finally {
      finalizarOperacion();
    }
  }

  return {
    tecnicos,
    nombre,
    error,
    tecnicoEditandoId,
    procesando,
    setNombre,
    reemplazarTecnicos,
    guardarTecnico,
    prepararEdicion,
    cancelarEdicion,
    eliminarTecnico,
  };
}
