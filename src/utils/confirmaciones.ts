import { Alert } from "react-native";

// Diálogos de confirmación reutilizables. Nativos (Alert): se ven con el tema
// oscuro del sistema y no necesitan estado en la pantalla.

// Borrar no se deshace: solo Eliminar ejecuta la acción
export function confirmarEliminacion(nombre: string, onEliminar: () => void) {
  Alert.alert("¿Eliminar evento?", `¿Seguro que quieres eliminar «${nombre}»?`, [
    { text: "Cancelar", style: "cancel" },
    { text: "Eliminar", style: "destructive", onPress: onEliminar },
  ]);
}

interface AvisoCambiosSinGuardar {
  onGuardar: () => void;
  onDescartar: () => void;
}

// Cancelar no hace nada: se queda en el formulario tal como estaba
export function avisarCambiosSinGuardar({ onGuardar, onDescartar }: AvisoCambiosSinGuardar) {
  Alert.alert("Tienes cambios sin guardar", "¿Quieres guardarlos antes de salir?", [
    { text: "Cancelar", style: "cancel" },
    { text: "Descartar", style: "destructive", onPress: onDescartar },
    { text: "Guardar", onPress: onGuardar },
  ]);
}
