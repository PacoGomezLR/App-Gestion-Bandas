import { StyleSheet } from "react-native";

import { MaxContentWidth, Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

// Barra de pestañas de la web (app-tabs.web.tsx). La nativa usa NativeTabs.
// Abajo y en el flujo de la página (no superpuesta): el contenido nunca queda
// tapado por la barra.
export function crearEstilosPestanasWeb(colores: ColoresTema) {
  return StyleSheet.create({
    tabs: {
      flex: 1,
      backgroundColor: colores.background,
    },
    contenido: {
      flex: 1,
    },
    // El contenedor de TabSlot trae flexShrink 0 y altura según el contenido:
    // sin esto, la pantalla crece hasta su contenido, sus ScrollView no tienen
    // alto limitado y (con body sin scroll) no se puede desplazar nada.
    // flex 1 (grow 1, shrink 1, basis 0) lo ajusta al hueco sobre la barra,
    // sin depender de alturas en porcentaje
    pantallas: {
      flex: 1,
    },
    // Solo declara las rutas del navegador de pestañas: no se ve
    rutas: {
      display: "none",
    },
    barra: {
      borderTopWidth: 1,
      borderTopColor: colores.border,
      backgroundColor: colores.background,
      paddingHorizontal: Spacing.two,
      paddingTop: Spacing.two,
    },
    fila: {
      flexDirection: "row",
      gap: Spacing.two,
      width: "100%",
      maxWidth: MaxContentWidth,
      alignSelf: "center",
    },
    pestana: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.two,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "transparent",
    },
    pestanaActiva: {
      backgroundColor: colores.primarySoft,
    },
    pestanaPulsada: {
      opacity: 0.7,
    },
    // Foco de teclado visible sobre el fondo oscuro
    pestanaConFoco: {
      borderColor: colores.primary,
    },
    texto: {
      fontSize: 15,
      fontWeight: "500",
      color: colores.textSecondary,
      textAlign: "center",
    },
    textoActivo: {
      fontWeight: "700",
      color: colores.text,
    },
  });
}

// iPhone: el indicador de inicio (zona segura inferior) queda debajo de las
// pestañas, nunca encima. Sin zona segura (escritorio), el margen de siempre
export function estiloZonaSeguraBarra(zonaSeguraInferior: number) {
  return { paddingBottom: Spacing.two + zonaSeguraInferior };
}
