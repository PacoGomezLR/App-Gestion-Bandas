// Hora de un evento: "" (sin hora) o HH:MM de 00:00 a 23:59, sin segundos.
// Mismo criterio que useEventos. Compartido por SelectorHora (nativo y web).
const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function esHoraValida(hora: string): boolean {
  return FORMATO_HORA.test(hora);
}

// El selector necesita un Date; la fecha concreta no importa, solo la hora local
export function convertirHoraADate(hora: string): Date {
  const coincidencia = FORMATO_HORA.exec(hora);

  if (coincidencia) {
    return new Date(2000, 0, 1, Number(coincidencia[1]), Number(coincidencia[2]), 0, 0);
  }

  // Sin hora guardada se abre con la hora actual, sin segundos
  const ahora = new Date();
  ahora.setSeconds(0, 0);
  return ahora;
}

// Hora local, nunca toISOString(): evita desfases por zona horaria
export function convertirDateAHora(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");

  return `${horas}:${minutos}`;
}
