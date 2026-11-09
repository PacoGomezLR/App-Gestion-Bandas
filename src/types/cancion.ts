// Los dos apartados de Repertorio: son el estado de la canción, no dos listas
export type EstadoCancion = "repertorio" | "nueva";

export interface Cancion {
  readonly id: string;
  // Una sola línea, tal cual se escribió (sin espacios alrededor)
  nombre: string;
  estado: EstadoCancion;
}
