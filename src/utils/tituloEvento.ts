import type { TipoEvento } from "../types/evento";
import { formatearFechaConBarras } from "./fechas";
import { etiquetaTipoEvento } from "./tiposEvento";

// El título no se escribe: siempre es "Tipo Lugar DD/MM/YYYY" (sin lugar, "Tipo DD/MM/YYYY")
export function generarTituloEvento(
  tipo: TipoEvento,
  lugar: string,
  fecha: string
): string {
  return [etiquetaTipoEvento(tipo), lugar.trim(), formatearFechaConBarras(fecha.trim())]
    .filter((parte) => parte !== "")
    .join(" ");
}
