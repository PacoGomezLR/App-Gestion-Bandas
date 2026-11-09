export type TipoEvento =
  | "boda"
  | "fiesta_privada"
  | "concierto_abierto"
  | "ensayo"
  | "otro";

  export type EstadoEvento =
  | "pendiente"
  | "confirmado";

  // Dato privado de admin, fuera de Evento: id del evento → céntimos. Sin entrada
  // no hay caché registrado; 0 es un caché real
  export type CachesPorEvento = Record<string, number>;

  // Lo que se guarda al enviar un evento: undefined = no se ha tocado, así un
  // caché que no se ha podido cargar nunca se sobrescribe; null = quitarlo
  export type CambioCache = number | null | undefined;

  // Por qué no se ha podido eliminar un evento concreto
  export interface ErrorEliminacionEvento {
  eventoId: string;
  mensaje: string;
}

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