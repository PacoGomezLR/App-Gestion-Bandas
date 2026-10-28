import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from "react";

import { useTecnicos } from "../hooks/useTecnicos";
import { useEventosContext } from "./EventosContext";

type UseTecnicosValue = ReturnType<typeof useTecnicos>;

type TecnicosContextValue =
  Omit<UseTecnicosValue, "eliminarTecnico"> & {
    eliminarTecnico: (id: string) => void;
    errorEliminacion: string;
  };

const TecnicosContext =
  createContext<TecnicosContextValue | null>(null);

export function TecnicosProvider({
  children,
}: PropsWithChildren) {
  const tecnicosState = useTecnicos();
  const { eventos } = useEventosContext();

  const [errorEliminacion, setErrorEliminacion] =
    useState("");

  function eliminarTecnico(id: string) {
    const tecnico = tecnicosState.tecnicos.find(
      (tecnico) => tecnico.id === id
    );

    const eventosAsignados = eventos.filter((evento) =>
      evento.tecnicoIds.includes(id)
    );

    if (eventosAsignados.length > 0) {
      const cantidad = eventosAsignados.length;

      setErrorEliminacion(
        `No se puede eliminar a ${
          tecnico?.nombre ?? "este técnico"
        } porque está asignado a ${cantidad} ${
          cantidad === 1 ? "evento" : "eventos"
        }`
      );

      return;
    }

    tecnicosState.eliminarTecnico(id);
    setErrorEliminacion("");
  }

  return (
    <TecnicosContext.Provider
      value={{
        ...tecnicosState,
        eliminarTecnico,
        errorEliminacion,
      }}
    >
      {children}
    </TecnicosContext.Provider>
  );
}

export function useTecnicosContext() {
  const context = useContext(TecnicosContext);

  if (context === null) {
    throw new Error(
      "useTecnicosContext debe usarse dentro de TecnicosProvider"
    );
  }

  return context;
}
