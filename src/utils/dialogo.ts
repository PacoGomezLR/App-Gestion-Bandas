import { Alert, type AlertButton } from "react-native";

// Diálogos de la app. Nativo: Alert, con el tema oscuro del sistema y sin estado
// en la pantalla. En web Alert.alert no hace nada: dialogo.web.ts usa los
// diálogos del navegador con la misma semántica.

export interface Confirmacion {
  titulo: string;
  mensaje: string;
  // Botón que no hace nada (también al cerrar el diálogo sin elegir)
  textoCancelar: string;
  // Botón que ejecuta la acción
  textoConfirmar: string;
  // Acciones que no se deshacen (eliminar, quitar, descartar)
  destructivo: boolean;
  onConfirmar: () => void;
}

export interface GuardarODescartar {
  titulo: string;
  mensaje: string;
  onGuardar: () => void;
  onDescartar: () => void;
}

// Cancelar o confirmar: solo el botón de confirmar ejecuta la acción
export function confirmar({
  titulo,
  mensaje,
  textoCancelar,
  textoConfirmar,
  destructivo,
  onConfirmar,
}: Confirmacion) {
  const boton: AlertButton = destructivo
    ? { text: textoConfirmar, style: "destructive", onPress: onConfirmar }
    : { text: textoConfirmar, onPress: onConfirmar };

  Alert.alert(titulo, mensaje, [{ text: textoCancelar, style: "cancel" }, boton]);
}

// Salir con cambios: Cancelar (se queda), Descartar (sale sin guardar) o Guardar
export function preguntarGuardarODescartar({
  titulo,
  mensaje,
  onGuardar,
  onDescartar,
}: GuardarODescartar) {
  Alert.alert(titulo, mensaje, [
    { text: "Cancelar", style: "cancel" },
    { text: "Descartar", style: "destructive", onPress: onDescartar },
    { text: "Guardar", onPress: onGuardar },
  ]);
}
