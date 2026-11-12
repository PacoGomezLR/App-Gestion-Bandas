import { StyleSheet } from "react-native";

import { BottomTabInset, Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

type ColoresTema = ReturnType<typeof useTheme>;

const RADIO_TARJETA = 16;
// Misma altura para todas las filas de lista, se puedan pulsar o no
const ALTURA_FILA = 56;

// Piezas comunes de las pantallas interiores (Calendario y Banda)
export function crearEstilosPantallaInterior(colores: ColoresTema) {
  return StyleSheet.create({
    pagina: {
      flex: 1,
      backgroundColor: colores.background,
    },
    // El ScrollView ocupa toda la página: se mide la página para saber qué se ve
    desplazable: {
      flex: 1,
    },
    contenido: {
      paddingHorizontal: Spacing.three,
      // Deja libre la zona de las pestañas inferiores
      paddingBottom: BottomTabInset + Spacing.five,
      gap: Spacing.four,
    },
    cargando: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.three,
      backgroundColor: colores.background,
    },
    textoCargando: {
      color: colores.textSecondary,
    },
    cabecera: {
      gap: Spacing.one,
    },
    titulo: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "700",
      color: colores.text,
    },
    subtitulo: {
      fontSize: 16,
      lineHeight: 22,
      color: colores.textSecondary,
    },
    seccion: {
      gap: Spacing.three,
    },
    cabeceraSeccion: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.two,
    },
    tituloSeccion: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "700",
      color: colores.text,
    },
    // Acción secundaria con zona táctil de 44 px
    // Secundario: superficie oscura con borde visible y texto claro
    botonTexto: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.border,
      backgroundColor: colores.backgroundElement,
    },
    textoBotonTexto: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.text,
    },
    pulsado: {
      opacity: 0.6,
    },
    deshabilitado: {
      opacity: 0.5,
    },
    // Sin relleno ni borde: visible pero sin el peso de un botón
    botonDestructivo: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
    },
    textoDestructivo: {
      fontSize: 15,
      fontWeight: "600",
      color: colores.error,
    },
    tarjeta: {
      padding: Spacing.three,
      borderRadius: RADIO_TARJETA,
      borderWidth: 1,
      borderColor: colores.border,
      backgroundColor: colores.backgroundElement,
      gap: Spacing.three,
    },
    tituloTarjeta: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "700",
      color: colores.text,
    },
    grupoFilas: {
      borderRadius: RADIO_TARJETA,
      borderWidth: 1,
      borderColor: colores.border,
      overflow: "hidden",
      backgroundColor: colores.backgroundElement,
    },
    // Línea dibujada como borde: siempre de un píxel físico, igual en todas las filas
    separadorFila: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colores.border,
    },
    fila: {
      minHeight: ALTURA_FILA,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: colores.backgroundElement,
    },
    // Solo lectura: un texto que ocupa todo el ancho, centrado en vertical
    filaLectura: {
      minHeight: ALTURA_FILA,
      justifyContent: "center",
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: colores.backgroundElement,
    },
    textoFila: {
      fontSize: 16,
      lineHeight: 22,
      color: colores.text,
    },
    tituloFila: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: colores.text,
    },
    tituloFilaSecundario: {
      fontStyle: "italic",
      color: colores.textSecondary,
    },
    tituloFilaCentrado: {
      textAlign: "center",
    },
    valorFila: {
      fontSize: 16,
      lineHeight: 22,
      color: colores.textSecondary,
    },
    flechaFila: {
      fontSize: 22,
      lineHeight: 24,
      color: colores.textSecondary,
    },
    vacio: {
      paddingVertical: Spacing.five,
      paddingHorizontal: Spacing.four,
      borderRadius: RADIO_TARJETA,
      borderWidth: 1,
      borderColor: colores.border,
      alignItems: "center",
      gap: Spacing.one,
      backgroundColor: colores.backgroundElement,
    },
    textoVacio: {
      fontSize: 17,
      fontWeight: "600",
      textAlign: "center",
      color: colores.text,
    },
    detalleVacio: {
      fontSize: 15,
      lineHeight: 21,
      textAlign: "center",
      color: colores.textSecondary,
    },
  });
}
