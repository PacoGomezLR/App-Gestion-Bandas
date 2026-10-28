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
  hora: string;
  lugar: string;
  notas: string;
  estado: EstadoEvento;
  tecnicoIds: string[];
  miembroIds: string[];
}