import type { TipoEvento } from "../types/evento";

// Record obliga a dar una etiqueta a cada tipo: si se añade uno, TypeScript avisa aquí
const ETIQUETAS_TIPO_EVENTO: Record<TipoEvento, string> = {
  boda: "Boda",
  fiesta_privada: "Fiesta privada",
  concierto_abierto: "Concierto abierto",
  ensayo: "Ensayo",
  otro: "Otro",
};

// Orden en que se muestran los tipos en el formulario
export const TIPOS_EVENTO: readonly TipoEvento[] = [
  "boda",
  "fiesta_privada",
  "concierto_abierto",
  "ensayo",
  "otro",
];

export function etiquetaTipoEvento(tipo: TipoEvento): string {
  return ETIQUETAS_TIPO_EVENTO[tipo];
}
