import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEstilosTuDisponibilidad } from "./TuDisponibilidad.styles";

interface TuDisponibilidadProps {
  // Lo guardado para el usuario actual ese día (nunca la de otra persona)
  noDisponibleGuardado: boolean;
  procesando: boolean;
  // Solo se llama al pulsar Guardar disponibilidad, y solo si la opción ha cambiado
  onGuardar: (noDisponible: boolean) => void;
  onCancelar: () => void;
}

const OPCIONES = [
  { noDisponible: false, etiqueta: "Disponible" },
  { noDisponible: true, etiqueta: "No disponible" },
] as const;

// Elegir una opción no guarda nada: es un borrador local hasta pulsar
// Guardar disponibilidad. Igual para admin y usuario, haya o no evento ese día.
// Los textos nombran la disponibilidad para no confundirse con las acciones
// del evento (Cancelar / Guardar evento).
export function TuDisponibilidad({
  noDisponibleGuardado,
  procesando,
  onGuardar,
  onCancelar,
}: TuDisponibilidadProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosTuDisponibilidad(tema), [tema]);
  const [noDisponible, setNoDisponible] = useState(noDisponibleGuardado);
  // Sin cambios no hay nada que guardar: Descartar cambios cierra
  const guardarDesactivado = procesando || noDisponible === noDisponibleGuardado;

  return (
    <View style={estilos.contenedor}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Tu disponibilidad"
        testID="opciones-disponibilidad"
        style={estilos.opciones}
      >
        {OPCIONES.map((opcion) => {
          const elegida = opcion.noDisponible === noDisponible;

          return (
            <Pressable
              key={opcion.etiqueta}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegida, disabled: procesando }}
              disabled={procesando}
              onPress={() => setNoDisponible(opcion.noDisponible)}
              style={[
                estilos.opcion,
                elegida && (opcion.noDisponible ? estilos.opcionNoDisponible : estilos.opcionDisponible),
              ]}
            >
              {/* Círculo relleno o vacío: la elección no depende solo del color */}
              <View style={[estilos.radio, elegida && estilos.radioElegido]} />
              <Text style={[estilos.textoOpcion, elegida && estilos.textoOpcionElegida]}>
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Uno debajo de otro y centrados: secundario arriba, el que guarda abajo */}
      <View testID="acciones-disponibilidad" style={estilos.acciones}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: procesando }}
          disabled={procesando}
          onPress={onCancelar}
          style={({ pressed }) => [
            estilos.boton,
            estilos.botonDescartar,
            pressed && estilos.pulsado,
            procesando && estilos.deshabilitado,
          ]}
        >
          <Text style={estilos.textoDescartar}>Descartar cambios</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: guardarDesactivado }}
          disabled={guardarDesactivado}
          onPress={() => onGuardar(noDisponible)}
          style={({ pressed }) => [
            estilos.boton,
            estilos.botonGuardar,
            pressed && estilos.pulsado,
            guardarDesactivado && estilos.deshabilitado,
          ]}
        >
          <Text style={estilos.textoGuardar}>Guardar disponibilidad</Text>
        </Pressable>
      </View>
    </View>
  );
}
