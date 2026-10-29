import { useCallback, useRef, useState } from "react";

import type { Miembro } from "../types/miembro";

interface UseMiembrosOptions {
  datosIniciales?: Miembro[];
  // Devuelve el registro tal como quedó guardado (con el id definitivo) o null si falla
  persistirMiembro?: (miembro: Miembro, esNuevo: boolean) => Promise<Miembro | null>;
  eliminarMiembroPersistido?: (id: string) => Promise<boolean>;
}

export function useMiembros(options: UseMiembrosOptions = {}) {
  const {
    datosIniciales = [],
    persistirMiembro,
    eliminarMiembroPersistido,
  } = options;

  const [miembros, setMiembros] = useState<Miembro[]>(datosIniciales);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [miembroEditandoId, setMiembroEditandoId] =
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

  const reemplazarMiembros = useCallback((nuevosMiembros: Miembro[]) => {
    setMiembros([...nuevosMiembros]);
  }, []);

  function limpiarFormulario() {
    setMiembroEditandoId(null);
    setNombre("");
    setError("");
  }

  async function guardarMiembro(): Promise<boolean> {
    if (nombre.trim() === "") {
      setError("El nombre es obligatorio");
      return false;
    }

    if (!iniciarOperacion()) {
      return false;
    }

    try {
      const editando = miembroEditandoId !== null;

      const miembroGuardado: Miembro = {
        id: miembroEditandoId ?? Date.now().toString(),
        nombre: nombre.trim(),
      };

      // Primero se persiste; el estado local solo cambia si la persistencia lo confirma
      const persistido = persistirMiembro
        ? await persistirMiembro(miembroGuardado, !editando)
        : miembroGuardado;

      if (persistido === null) {
        return false;
      }

      if (editando) {
        setMiembros((miembrosActuales) =>
          miembrosActuales.map((miembro) =>
            miembro.id === persistido.id ? persistido : miembro
          )
        );
      } else {
        setMiembros((miembrosActuales) => [...miembrosActuales, persistido]);
      }

      limpiarFormulario();

      return true;
    } finally {
      finalizarOperacion();
    }
  }

  function prepararEdicion(miembro: Miembro) {
    if (operacionEnCursoRef.current) {
      return;
    }

    setMiembroEditandoId(miembro.id);
    setNombre(miembro.nombre);
    setError("");
  }

  function cancelarEdicion() {
    if (operacionEnCursoRef.current) {
      return;
    }

    limpiarFormulario();
  }

  async function eliminarMiembro(id: string): Promise<boolean> {
    if (!iniciarOperacion()) {
      return false;
    }

    try {
      const eliminado = eliminarMiembroPersistido
        ? await eliminarMiembroPersistido(id)
        : true;

      if (!eliminado) {
        return false;
      }

      setMiembros((miembrosActuales) =>
        miembrosActuales.filter((miembro) => miembro.id !== id)
      );

      if (miembroEditandoId === id) {
        limpiarFormulario();
      }

      return true;
    } finally {
      finalizarOperacion();
    }
  }

  return {
    miembros,
    nombre,
    error,
    miembroEditandoId,
    procesando,
    setNombre,
    reemplazarMiembros,
    guardarMiembro,
    prepararEdicion,
    cancelarEdicion,
    eliminarMiembro,
  };
}
