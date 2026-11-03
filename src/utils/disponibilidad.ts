import type { IndisponibilidadUsuario, ResumenNoDisponibles } from "../types/disponibilidad";
import type { EstadoEvento, Evento } from "../types/evento";

// Solo cuando todavía no hay nombre visible
export const NOMBRE_USUARIO_ACTUAL = "Tú";
export const NOMBRE_INTEGRANTE_SIN_NOMBRE = "Integrante";

export function indisponibilidadesDeFecha(
  lista: IndisponibilidadUsuario[],
  fecha: string
): IndisponibilidadUsuario[] {
  return lista.filter((indisponibilidad) => indisponibilidad.fecha === fecha);
}

export function indisponibilidadPropia(
  lista: IndisponibilidadUsuario[],
  usuarioId: string | null,
  fecha: string
): IndisponibilidadUsuario | null {
  return (
    lista.find(
      (indisponibilidad) =>
        indisponibilidad.usuarioId === usuarioId && indisponibilidad.fecha === fecha
    ) ?? null
  );
}

// Cuántos integrantes no están disponibles cada día (para marcar el calendario)
export function contarNoDisponiblesPorFecha(
  lista: IndisponibilidadUsuario[]
): Record<string, number> {
  return lista.reduce<Record<string, number>>((conteo, { fecha }) => {
    conteo[fecha] = (conteo[fecha] ?? 0) + 1;
    return conteo;
  }, {});
}

// Todos ven la misma lista: el nombre visible de cada integrante, ordenado.
// Si alguien aún no tiene nombre: "Tú" para el usuario actual y, para el
// resto, solo se cuentan (sin inventar identidades).
export function resumirNoDisponibles(
  lista: IndisponibilidadUsuario[],
  fecha: string,
  usuarioActualId: string | null,
  nombresPorUsuario: Record<string, string>
): ResumenNoDisponibles {
  const delDia = indisponibilidadesDeFecha(lista, fecha);
  const nombres: string[] = [];
  let propiaSinNombre = false;
  let sinNombre = 0;

  for (const { usuarioId } of delDia) {
    const nombre = nombresPorUsuario[usuarioId];

    if (nombre !== undefined) {
      nombres.push(nombre);
    } else if (usuarioId === usuarioActualId) {
      propiaSinNombre = true;
    } else {
      sinNombre += 1;
    }
  }

  nombres.sort((a, b) => a.localeCompare(b, "es"));

  return {
    total: delDia.length,
    nombres: propiaSinNombre ? [...nombres, NOMBRE_USUARIO_ACTUAL] : nombres,
    sinNombre,
  };
}

export function tituloNoDisponibles(total: number): string {
  return total === 1 ? "1 no disponible" : `${total} no disponibles`;
}

// Líneas para mostrar: primero los nombres y después quien aún no tiene nombre
export function lineasNoDisponibles({ nombres, sinNombre }: ResumenNoDisponibles): string[] {
  if (sinNombre === 0) {
    return nombres;
  }

  return [
    ...nombres,
    sinNombre === 1 ? NOMBRE_INTEGRANTE_SIN_NOMBRE : `${sinNombre} integrantes sin nombre`,
  ];
}

interface DatosAvisoConfirmacion {
  estado: EstadoEvento;
  fecha: string;
  // Evento tal como está guardado, si se está editando
  eventoOriginal: Evento | null;
  noDisponibles: number;
}

// Avisar solo al guardar como confirmado un día con integrantes no disponibles.
// No se repite si el evento ya estaba confirmado exactamente en ese día.
export function requiereAvisoConfirmacion({
  estado,
  fecha,
  eventoOriginal,
  noDisponibles,
}: DatosAvisoConfirmacion): boolean {
  if (estado !== "confirmado" || noDisponibles === 0) {
    return false;
  }

  const yaConfirmadoEseDia =
    eventoOriginal !== null &&
    eventoOriginal.estado === "confirmado" &&
    eventoOriginal.fecha === fecha;

  return !yaConfirmadoEseDia;
}
