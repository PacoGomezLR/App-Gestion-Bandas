import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { Evento } from "../types/evento";
import { etiquetaEvento } from "../utils/finanzas";
import { crearEstilosFinanzas } from "./Finanzas.styles";

const ETIQUETA = "Evento relacionado";
const SIN_EVENTO = "Ninguno";

interface SelectorEventoProps {
  // Los de la banda actual, ya cargados: abrir el selector no hace ninguna consulta
  eventos: Evento[];
  eventoId: string | null;
  onCambiar: (eventoId: string | null) => void;
  disabled?: boolean;
}

export function SelectorEvento({ eventos, eventoId, onCambiar, disabled = false }: SelectorEventoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const [abierto, setAbierto] = useState(false);

  const opciones = useMemo(
    () =>
      [...eventos]
        // Lo más reciente primero: lo normal es apuntar el dinero de un bolo cercano
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((evento) => ({ id: evento.id, etiqueta: etiquetaEvento(evento) })),
    [eventos]
  );

  const elegido = opciones.find(({ id }) => id === eventoId);
  const textoElegido =
    eventoId === null ? SIN_EVENTO : (elegido?.etiqueta ?? "Evento no disponible");

  function elegir(id: string | null) {
    onCambiar(id);
    setAbierto(false);
  }

  function pintarOpcion(id: string | null, etiqueta: string) {
    const marcada = id === eventoId;

    return (
      <Pressable
        key={id ?? "ninguno"}
        accessibilityRole="radio"
        accessibilityLabel={etiqueta}
        accessibilityState={{ checked: marcada }}
        onPress={() => elegir(id)}
        style={({ pressed }) => [estilos.opcionEvento, pressed && estilos.pulsado]}
      >
        <Text style={[estilos.textoOpcionEvento, marcada && estilos.textoOpcionEventoElegida]}>
          {etiqueta}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiquetaCampo}>{ETIQUETA}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ETIQUETA}: ${textoElegido}`}
        accessibilityState={{ disabled, expanded: abierto }}
        disabled={disabled}
        onPress={() => setAbierto(!abierto)}
        style={[
          estilos.campoSelector,
          abierto && estilos.campoSelectorAbierto,
          disabled && estilos.deshabilitado,
        ]}
      >
        <Text style={estilos.textoSelector}>{textoElegido}</Text>
        <Text style={estilos.flechaSelector}>{abierto ? "▴" : "▾"}</Text>
      </Pressable>

      {abierto && !disabled && (
        <View accessibilityRole="radiogroup" accessibilityLabel={ETIQUETA} style={estilos.listaEventos}>
          {pintarOpcion(null, SIN_EVENTO)}
          {opciones.map(({ id, etiqueta }) => pintarOpcion(id, etiqueta))}
        </View>
      )}
    </View>
  );
}
