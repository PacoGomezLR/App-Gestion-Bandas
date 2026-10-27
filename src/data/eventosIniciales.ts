import type { Evento } from "../types/evento";

export const eventosIniciales: Evento[] = [
  {
    id: "1",
    titulo: "Concierto en Córdoba",
    tipo: "concierto",
    fecha: "2026-09-30",
    estado: "confirmado",
  },
  {
    id: "2",
    titulo: "Ensayo general",
    tipo: "ensayo",
    fecha: "2026-10-02",
    estado: "pendiente",
  },
  {
    id: "3",
    titulo: "Reunión de la banda",
    tipo: "reunion",
    fecha: "2026-10-05",
    estado: "pendiente",
  },
];
