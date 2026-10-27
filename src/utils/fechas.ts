export function formatearFecha(fecha: string) {
  if (fecha === "") {
    return "";
  }

  const [anio, mes, dia] = fecha.split("-");

  return `${dia}-${mes}-${anio}`;
}
