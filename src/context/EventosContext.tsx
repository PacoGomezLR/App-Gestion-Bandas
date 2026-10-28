import {
  createContext,
  type PropsWithChildren,
  useContext,
} from "react";

import { useEventos } from "../hooks/useEventos";

type EventosContextValue = ReturnType<typeof useEventos>;

const EventosContext =
  createContext<EventosContextValue | null>(null);

export function EventosProvider({
  children,
}: PropsWithChildren) {
  const eventos = useEventos();

  return (
    <EventosContext.Provider value={eventos}>
      {children}
    </EventosContext.Provider>
  );
}

export function useEventosContext() {
  const context = useContext(EventosContext);

  if (context === null) {
    throw new Error(
      "useEventosContext debe usarse dentro de EventosProvider"
    );
  }

  return context;
}
