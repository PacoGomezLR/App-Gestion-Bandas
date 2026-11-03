export function formatearFecha(fecha: string) {
  if (fecha === "") {
    return "";
  }

  const [anio, mes, dia] = fecha.split("-");

  return `${dia}-${mes}-${anio}`;
}

// YYYY-MM-DD → DD/MM/YYYY (formato del título automático del evento)
export function formatearFechaConBarras(fecha: string) {
  return formatearFecha(fecha).replace(/-/g, "/");
}

// Hoy en la zona horaria del dispositivo, en el formato interno YYYY-MM-DD
// (el mismo del calendario: no se usa toISOString, que pasaría a UTC)
export function fechaDeHoy(ahora: Date = new Date()): string {
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}
