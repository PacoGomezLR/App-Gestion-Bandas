import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";

export function crearEstilosFormularioCancion() {
  return StyleSheet.create({
    // Cancelar no ocupa todo el ancho: así no se mide con Guardar
    accionSecundaria: {
      alignItems: "center",
      marginTop: Spacing.one,
    },
  });
}
