import type { Evento } from "../types/evento";

// En el inicio solo se muestran las fechas más próximas
export const LIMITE_PROXIMAS_FECHAS = 5;

// Mismo día: primero sin hora, después por hora y por título (orden estable)
function compararMismoDia(a: Evento, b: Evento): number {
  return a.hora.localeCompare(b.hora) || a.titulo.localeCompare(b.titulo, "es");
}

// Próximas: fecha >= hoy, de la más próxima a la más lejana.
// Las fechas son YYYY-MM-DD, así que se comparan como texto.
export function eventosProximos(eventos: Evento[], hoy: string): Evento[] {
  return eventos
    .filter((evento) => evento.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || compararMismoDia(a, b));
}

// Historial: fecha < hoy, de la más reciente a la más antigua. Son los mismos
// eventos de siempre: no se mueven ni se copian a ningún sitio.
export function eventosPasados(eventos: Evento[], hoy: string): Evento[] {
  return eventos
    .filter((evento) => evento.fecha < hoy)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || compararMismoDia(a, b));
}
