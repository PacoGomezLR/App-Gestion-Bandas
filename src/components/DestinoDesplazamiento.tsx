import { type PropsWithChildren, useCallback } from "react";
import { View } from "react-native";

import type { VistaNativa } from "@/hooks/plataformaDesplazamiento";
import { useControlDesplazamiento } from "@/hooks/useDesplazamiento";

interface DestinoDesplazamientoProps extends PropsWithChildren {
  clave: string;
  // Solo para campos de texto: cómo enfocarlos
  enfocar?: () => void;
}

// Marca un punto al que la pantalla puede llevar al usuario (ver useDesplazamiento).
// No cambia el aspecto: es una vista sin estilo alrededor del control.
// Fuera de una PantallaInterior no hace nada
export function DestinoDesplazamiento({ clave, enfocar, children }: DestinoDesplazamientoProps) {
  const control = useControlDesplazamiento();

  const registrar = useCallback(
    (vista: VistaNativa | null) => {
      control?.registrar(clave, vista === null ? null : { vista, enfocar });
    },
    [control, clave, enfocar]
  );

  return (
    <View
      ref={registrar}
      testID={`destino-${clave}`}
      collapsable={false}
      onLayout={() => control?.alColocarDestino(clave)}
    >
      {children}
    </View>
  );
}
