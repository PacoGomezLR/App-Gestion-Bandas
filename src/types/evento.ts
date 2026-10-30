export type TipoEvento =
  | "boda"
  | "fiesta_privada"
  | "concierto_abierto"
  | "ensayo"
  | "otro";

  export type EstadoEvento =
  | "pendiente"
  | "confirmado";

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
}