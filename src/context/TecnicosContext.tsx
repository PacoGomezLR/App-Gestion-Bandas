import {
  createContext,
  type PropsWithChildren,
  useContext,
} from "react";

import { useTecnicos } from "../hooks/useTecnicos";

type TecnicosContextValue = ReturnType<typeof useTecnicos>;

const TecnicosContext =
  createContext<TecnicosContextValue | null>(null);

export function TecnicosProvider({
  children,
}: PropsWithChildren) {
  const tecnicos = useTecnicos();

  return (
    <TecnicosContext.Provider value={tecnicos}>
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
