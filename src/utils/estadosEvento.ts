import type { EstadoEvento } from "../types/evento";

// Record obliga a dar una etiqueta a cada estado: si se añade uno, TypeScript avisa aquí
const ETIQUETAS_ESTADO_EVENTO: Record<EstadoEvento, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
};

// Orden en que se muestran los estados en el formulario
export const ESTADOS_EVENTO: readonly EstadoEvento[] = [
  "pendiente",
  "confirmado",
];

export function etiquetaEstadoEvento(estado: EstadoEvento): string {
  return ETIQUETAS_ESTADO_EVENTO[estado];
}
