import type { ComponentRef, RefObject } from "react";
import { Dimensions, type ScrollView, type TextInput, type View } from "react-native";

import type { MedidaEnVentana } from "../utils/desplazamiento";

// Instancias nativas (en RN 0.88, View y TextInput son componentes, no clases)
export type VistaNativa = ComponentRef<typeof View>;
export type CampoNativo = ComponentRef<typeof TextInput>;
export type DesplazableNativo = ComponentRef<typeof ScrollView>;

// Lo único que toca la plataforma al llevar la pantalla a un elemento: medir,
// desplazar y enfocar. Aparte, para que los tests comprueben la intención
// (qué se mide, a dónde se desplaza, qué campo se enfoca) sin coordenadas reales

export function medirEnVentana(vista: VistaNativa): Promise<MedidaEnVentana | null> {
  return new Promise((resolver) => {
    vista.measureInWindow((_x, y, _ancho, alto) => {
      resolver(Number.isFinite(y) && alto >= 0 ? { arriba: y, alto } : null);
    });
  });
}

export function altoVentana(): number {
  return Dimensions.get("window").height;
}

export function desplazarA(scroll: DesplazableNativo, y: number) {
  scroll.scrollTo({ y, animated: true });
}

// Enfocar un campo abre el teclado y el lector de pantalla lo anuncia: el foco
// visual y el accesible van al mismo sitio
export function enfocarCampo(campo: RefObject<CampoNativo | null>) {
  campo.current?.focus();
}
