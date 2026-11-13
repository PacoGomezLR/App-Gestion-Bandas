import { confirmar, preguntarGuardarODescartar } from "./dialogo";

// Diálogos de confirmación reutilizables del formulario de eventos. Nativos
// (Alert) en la app y del navegador en web (ver dialogo.ts).

// Borrar no se deshace: solo Eliminar ejecuta la acción
export function confirmarEliminacion(nombre: string, onEliminar: () => void) {
  confirmar({
    titulo: "¿Eliminar evento?",
    mensaje: `¿Seguro que quieres eliminar «${nombre}»?`,
    textoCancelar: "Cancelar",
    textoConfirmar: "Eliminar",
    destructivo: true,
    onConfirmar: onEliminar,
  });
}

interface AvisoCambiosSinGuardar {
  onGuardar: () => void;
  onDescartar: () => void;
}

// Cancelar no hace nada: se queda en el formulario tal como estaba
export function avisarCambiosSinGuardar({ onGuardar, onDescartar }: AvisoCambiosSinGuardar) {
  preguntarGuardarODescartar({
    titulo: "Tienes cambios sin guardar",
    mensaje: "¿Quieres guardarlos antes de salir?",
    onGuardar,
    onDescartar,
  });
}
