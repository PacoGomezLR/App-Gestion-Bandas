import type { Confirmacion, GuardarODescartar } from "./dialogo";

// Web (Safari, también instalada en la pantalla de inicio): window.confirm, que
// bloquea hasta elegir y solo tiene Aceptar y Cancelar. Como esos textos los
// pone el navegador, el mensaje dice qué hace Aceptar cuando no es evidente.

function preguntar(texto: string): boolean {
  // Sin navegador (export estático) no hay a quién preguntar: no se hace nada
  return typeof window !== "undefined" && typeof window.confirm === "function"
    ? window.confirm(texto)
    : false;
}

function componer(...partes: string[]): string {
  return partes.filter((parte) => parte !== "").join("\n\n");
}

// Aceptar = confirmar; Cancelar o cerrar = no se hace nada
export function confirmar({
  titulo,
  mensaje,
  textoCancelar,
  textoConfirmar,
  onConfirmar,
}: Confirmacion) {
  const ayuda =
    textoCancelar === "Cancelar"
      ? `Aceptar: ${textoConfirmar}.`
      : `Aceptar: ${textoConfirmar}. Cancelar: ${textoCancelar}.`;

  if (preguntar(componer(titulo, mensaje, ayuda))) {
    onConfirmar();
  }
}

// Tres salidas con dos botones, en dos pasos:
// 1) Aceptar = Guardar.
// 2) Si no, Aceptar = Descartar; Cancelar = se queda donde estaba.
export function preguntarGuardarODescartar({
  titulo,
  mensaje,
  onGuardar,
  onDescartar,
}: GuardarODescartar) {
  if (preguntar(componer(titulo, mensaje, "Aceptar: Guardar. Cancelar: más opciones."))) {
    onGuardar();
    return;
  }

  if (
    preguntar(
      componer(
        "¿Descartar los cambios?",
        "Aceptar: Descartar y salir sin guardar. Cancelar: seguir donde estabas."
      )
    )
  ) {
    onDescartar();
  }
}
