export type TipoEvento =
  | "concierto"
  | "ensayo"
  | "reunion"
  | "otro";

  export type EstadoEvento =
  | "pendiente"
  | "confirmado"
  | "cancelado";

  export interface Evento {
  readonly id: string;
  titulo: string;
  tipo: TipoEvento;
  fecha: string;
  estado: EstadoEvento;
}