import { useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { ResumenNoDisponibles } from "../types/disponibilidad";
import { lineasNoDisponibles, tituloNoDisponibles } from "../utils/disponibilidad";
import { crearEstilosAvisoNoDisponibles } from "./AvisoNoDisponibles.styles";

interface AvisoNoDisponiblesProps {
  resumen: ResumenNoDisponibles;
}

// Quién no puede tocar el día seleccionado. Solo informa: no bloquea nada.
export function AvisoNoDisponibles({ resumen }: AvisoNoDisponiblesProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosAvisoNoDisponibles(tema), [tema]);
  const titulo = tituloNoDisponibles(resumen.total);
  const lineas = lineasNoDisponibles(resumen);

  return (
    <View
      accessible
      accessibilityLabel={`Atención: ${titulo}. ${lineas.join(", ")}`}
      style={estilos.contenedor}
    >
      <Text style={estilos.titulo}>⚠ {titulo}</Text>
      {/* Dos integrantes pueden llamarse igual: la clave incluye la posición */}
      {lineas.map((linea, indice) => (
        <Text key={`${indice}-${linea}`} style={estilos.integrante}>
          {linea}
        </Text>
      ))}
    </View>
  );
}
