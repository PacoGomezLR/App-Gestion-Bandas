import type { Evento } from "../types/evento";
import { etiquetaMes } from "./fechas";

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

export interface GrupoMesEventos {
  // YYYY-MM: estable, no depende del idioma
  clave: string;
  // «Febrero 2026»
  titulo: string;
  eventos: Evento[];
}

// Agrupa por mes y año una lista YA ordenada (próximas, todas o historial),
// sin reordenar nada: los grupos salen en el orden en que aparece cada mes y,
// dentro de cada uno, los eventos conservan su orden. Solo hay grupos para los
// meses con eventos. La fecha es civil (YYYY-MM-DD): el mes se lee del texto,
// sin Date ni UTC, así que no puede cambiar de día ni de mes.
export function agruparEventosPorMes(eventos: Evento[]): GrupoMesEventos[] {
  const grupos = new Map<string, Evento[]>();

  for (const evento of eventos) {
    const clave = evento.fecha.slice(0, 7);
    const grupo = grupos.get(clave);

    if (grupo === undefined) {
      grupos.set(clave, [evento]);
    } else {
      grupo.push(evento);
    }
  }

  return [...grupos].map(([clave, eventosMes]) => ({
    clave,
    titulo: etiquetaMes(clave),
    eventos: eventosMes,
  }));
}
