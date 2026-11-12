import { createContext, type RefObject, useContext, useMemo, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { BottomTabInset } from "@/constants/theme";
import { calcularDesplazamiento } from "../utils/desplazamiento";
import {
  altoVentana,
  type DesplazableNativo,
  desplazarA,
  medirEnVentana,
  type VistaNativa,
} from "./plataformaDesplazamiento";

// Llevar la pantalla al siguiente paso: cuando el usuario hace algo y la app
// espera otra acción, ese control queda a la vista, más o menos centrado, y si es
// un campo de texto, con el foco.
//
//   pantalla.llevarA("crear-evento")      ← tras la acción del usuario
//   <DestinoDesplazamiento clave="crear-evento">…</DestinoDesplazamiento>
//
// El destino puede no existir todavía (se va a pintar con el cambio de estado):
// se centra cuando aparece (onLayout), sin esperas arbitrarias. Solo se mueve
// algo cuando se pide; nunca al escribir ni al repintar.

interface Destino {
  vista: VistaNativa | null;
  // Solo para campos de texto: abre el teclado y mueve el foco accesible
  enfocar?: () => void;
}

interface Pendiente {
  clave: string;
  enfocar: boolean;
}

export interface OpcionesLlevarA {
  // Enfocar el campo si el destino es un campo de texto
  enfocar?: boolean;
}

export interface ControlDesplazamiento {
  // Para PantallaInterior
  scrollRef: RefObject<DesplazableNativo | null>;
  zonaRef: RefObject<VistaNativa | null>;
  alDesplazar: (evento: NativeSyntheticEvent<NativeScrollEvent>) => void;
  alMostrarTeclado: (alto: number) => void;
  alOcultarTeclado: () => void;
  // Para DestinoDesplazamiento
  registrar: (clave: string, destino: Destino | null) => void;
  alColocarDestino: (clave: string) => void;
  // Para las pantallas
  llevarA: (clave: string, opciones?: OpcionesLlevarA) => void;
}

export function useDesplazamiento(): ControlDesplazamiento {
  const scrollRef = useRef<DesplazableNativo | null>(null);
  const zonaRef = useRef<VistaNativa | null>(null);
  const desplazamiento = useRef(0);
  const teclado = useRef(0);
  const destinos = useRef(new Map<string, Destino>());
  const pendiente = useRef<Pendiente | null>(null);
  // Campo recién enfocado: cuando salga el teclado se comprueba que no lo tape
  const esperandoTeclado = useRef<string | null>(null);

  return useMemo<ControlDesplazamiento>(() => {
    async function centrar(vista: VistaNativa) {
      const scroll = scrollRef.current;
      const zona = zonaRef.current;

      if (scroll === null || zona === null) {
        return;
      }

      const [medidaZona, medidaObjetivo] = await Promise.all([medirEnVentana(zona), medirEnVentana(vista)]);

      if (medidaZona === null || medidaObjetivo === null) {
        return;
      }

      const destino = calcularDesplazamiento({
        desplazamientoActual: desplazamiento.current,
        zona: medidaZona,
        objetivo: medidaObjetivo,
        altoVentana: altoVentana(),
        altoTeclado: teclado.current,
        margenInferior: BottomTabInset,
      });

      // null: ya se ve bien, no se mueve nada
      if (destino !== null) {
        desplazarA(scroll, destino);
      }
    }

    function ejecutar(clave: string) {
      const peticion = pendiente.current;
      const destino = destinos.current.get(clave);

      if (peticion === null || peticion.clave !== clave || !destino?.vista) {
        return;
      }

      // Una petición, un desplazamiento
      pendiente.current = null;

      if (peticion.enfocar && destino.enfocar) {
        destino.enfocar();
        esperandoTeclado.current = clave;
      }

      void centrar(destino.vista);
    }

    return {
      scrollRef,
      zonaRef,
      alDesplazar(evento) {
        desplazamiento.current = evento.nativeEvent.contentOffset.y;
      },
      alMostrarTeclado(alto) {
        teclado.current = alto;

        // El teclado ha reducido lo visible: si tapa el campo recién enfocado, se
        // recoloca una vez (si no lo tapa, no se mueve nada)
        const clave = esperandoTeclado.current;
        esperandoTeclado.current = null;
        const vista = clave === null ? null : (destinos.current.get(clave)?.vista ?? null);

        if (vista !== null) {
          void centrar(vista);
        }
      },
      alOcultarTeclado() {
        teclado.current = 0;
        esperandoTeclado.current = null;
      },
      registrar(clave, destino) {
        if (destino === null) {
          destinos.current.delete(clave);
        } else {
          destinos.current.set(clave, destino);
        }
      },
      alColocarDestino(clave) {
        // Recién pintado: si alguien esperaba llegar aquí, ahora ya se puede medir
        if (pendiente.current?.clave === clave) {
          ejecutar(clave);
        }
      },
      llevarA(clave, opciones = {}) {
        pendiente.current = { clave, enfocar: opciones.enfocar ?? false };

        // Ya pintado (por ejemplo, otro día con el panel abierto): tras este
        // fotograma. Si no, lo hará su onLayout al aparecer
        if (destinos.current.get(clave)?.vista) {
          requestAnimationFrame(() => ejecutar(clave));
        }
      },
    };
  }, []);
}

export const DesplazamientoContext = createContext<ControlDesplazamiento | null>(null);

export function useControlDesplazamiento(): ControlDesplazamiento | null {
  return useContext(DesplazamientoContext);
}
