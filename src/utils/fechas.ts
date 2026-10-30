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
