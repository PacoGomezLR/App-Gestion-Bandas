import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, type ScrollViewInstance, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { etiquetaMes } from "../utils/fechas";
import {
  ANCHO_ANIO,
  crearEstilosSelectorMesAnio,
  crearMargenInferiorPanel,
  SEPARACION_ANIOS,
} from "./SelectorMesAnio.styles";

// Años a cada lado del elegido. La ventana se recentra al elegir uno, así que
// no hay límite y nunca se pintan más de estos
const ANIOS_A_CADA_LADO = 10;

const MESES = Array.from({ length: 12 }, (_, indice) => String(indice + 1).padStart(2, "0"));

interface SelectorMesAnioProps {
  // YYYY-MM
  mes: string;
  mesHoy: string;
  onElegir: (mes: string) => void;
  onCerrar: () => void;
}

interface OpcionProps {
  texto: string;
  nombre: string;
  elegida: boolean;
  estiloOpcion: "opcionAnio" | "opcionMes";
  onPress: () => void;
}

// Elegida: borde, fondo y ✓, para que no dependa solo del color
function Opcion({ texto, nombre, elegida, estiloOpcion, onPress }: OpcionProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosSelectorMesAnio(tema), [tema]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={nombre}
      accessibilityState={{ checked: elegida }}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.opcion,
        estilos[estiloOpcion],
        elegida && estilos.opcionElegida,
        pressed && estilos.pulsado,
      ]}
    >
      <Text style={[estilos.texto, elegida && estilos.textoElegido]}>{texto}</Text>
      {elegida && <Text style={estilos.textoElegido}>✓</Text>}
    </Pressable>
  );
}

// Panel inferior para saltar de mes y año sin pasar por los meses intermedios.
// Atrás de Android lo cierra por onRequestClose
export function SelectorMesAnio({ mes, mesHoy, onElegir, onCerrar }: SelectorMesAnioProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosSelectorMesAnio(tema), [tema]);
  const zonaSegura = useSafeAreaInsets();
  const [anio, setAnio] = useState(Number(mes.slice(0, 4)));
  const listaAnios = useRef<ScrollViewInstance>(null);
  const [anchoLista, setAnchoLista] = useState(0);

  const anios = Array.from(
    { length: ANIOS_A_CADA_LADO * 2 + 1 },
    (_, indice) => anio - ANIOS_A_CADA_LADO + indice
  );

  // El año elegido siempre queda en el centro de la lista
  useEffect(() => {
    const inicioElegido = ANIOS_A_CADA_LADO * (ANCHO_ANIO + SEPARACION_ANIOS);

    listaAnios.current?.scrollTo({
      x: Math.max(0, inicioElegido - (anchoLista - ANCHO_ANIO) / 2),
      animated: false,
    });
  }, [anio, anchoLista]);

  return (
    <Modal
      testID="selector-mes-anio"
      transparent
      visible
      // Hasta el borde de la pantalla en todos los móviles: el hueco de la barra
      // de navegación lo deja siempre el panel, con la zona segura
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={estilos.contenedor}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector de mes y año"
          onPress={onCerrar}
          style={estilos.fondo}
        />

        <View
          testID="panel-mes-anio"
          accessibilityViewIsModal
          style={[estilos.panel, crearMargenInferiorPanel(zonaSegura.bottom)]}
        >
          <Text accessibilityRole="header" style={estilos.titulo}>
            Elegir mes y año
          </Text>

          <View style={estilos.grupo}>
            <Text style={estilos.etiqueta}>Año</Text>
            <ScrollView
              ref={listaAnios}
              horizontal
              accessibilityRole="radiogroup"
              accessibilityLabel="Año"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.anios}
              onLayout={({ nativeEvent }) => setAnchoLista(nativeEvent.layout.width)}
            >
              {anios.map((opcion) => (
                <Opcion
                  key={opcion}
                  texto={String(opcion)}
                  nombre={String(opcion)}
                  elegida={opcion === anio}
                  estiloOpcion="opcionAnio"
                  onPress={() => setAnio(opcion)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={estilos.grupo}>
            <Text style={estilos.etiqueta}>Mes</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Mes" style={estilos.meses}>
              {MESES.map((numero) => {
                const opcion = `${anio}-${numero}`;
                const nombre = etiquetaMes(opcion);

                return (
                  <Opcion
                    key={numero}
                    texto={nombre.slice(0, 3)}
                    nombre={nombre}
                    elegida={opcion === mes}
                    estiloOpcion="opcionMes"
                    onPress={() => onElegir(opcion)}
                  />
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => onElegir(mesHoy)}
            style={({ pressed }) => [estilos.botonHoy, pressed && estilos.pulsado]}
          >
            <Text style={estilos.textoBotonHoy}>Ir a hoy</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
