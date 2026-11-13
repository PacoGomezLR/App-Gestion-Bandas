import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { type ComponentRef, type Ref, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBandaContext } from "@/context/BandaContext";
import { useTheme } from "@/hooks/use-theme";
import { crearEstilosPestanasWeb, estiloZonaSeguraBarra } from "./app-tabs.styles";

// Web: las mismas pestañas que la app (Calendario | Repertorio | Banda, esta
// solo para el admin), en una barra inferior.
//
// expo-router/ui solo conoce las rutas declaradas con un TabTrigger dentro de
// TabList. La lista oculta declara todas: las tres pestañas y las dos rutas
// auxiliares (/invitacion y /auth/callback), que no son pestañas pero tienen
// que poder montarse para volver al inicio. La barra visible usa TabTrigger
// fuera de la lista, solo con las pestañas.
// /banda se declara siempre: con un usuario normal banda.tsx vuelve al inicio.
export default function AppTabs() {
  const { esAdmin } = useBandaContext();
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPestanasWeb(tema), [tema]);
  // Con viewport-fit=cover (+html.tsx) es env(safe-area-inset-bottom). Solo la
  // barra la aplica: las pantallas de las pestañas no añaden margen inferior
  const zonaSegura = useSafeAreaInsets();

  return (
    <Tabs style={estilos.tabs}>
      <View style={estilos.contenido}>
        <TabSlot />
      </View>

      <View
        accessibilityRole="tablist"
        accessibilityLabel="Navegación principal"
        style={[estilos.barra, estiloZonaSeguraBarra(zonaSegura.bottom)]}
      >
        <View style={estilos.fila}>
          <TabTrigger name="index" asChild>
            <BotonPestana>Calendario</BotonPestana>
          </TabTrigger>
          <TabTrigger name="repertorio" asChild>
            <BotonPestana>Repertorio</BotonPestana>
          </TabTrigger>
          {esAdmin && (
            <TabTrigger name="banda" asChild>
              <BotonPestana>Banda</BotonPestana>
            </TabTrigger>
          )}
        </View>
      </View>

      <TabList style={estilos.rutas}>
        <TabTrigger name="index" href="/" />
        <TabTrigger name="repertorio" href="/repertorio" />
        <TabTrigger name="banda" href="/banda" />
        <TabTrigger name="invitacion" href="/invitacion" />
        <TabTrigger name="callback" href="/auth/callback" />
      </TabList>
    </Tabs>
  );
}

type BotonPestanaProps = TabTriggerSlotProps & { children: string };

function BotonPestana({ children, isFocused = false, ref, onFocus, onBlur, ...props }: BotonPestanaProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPestanasWeb(tema), [tema]);
  // Foco de teclado (Tab): se marca con un borde de acento
  const [conFoco, setConFoco] = useState(false);

  return (
    <Pressable
      {...props}
      // expo-router tipa este ref como RefAttributes<View>, que en RN 0.88 ya no
      // coincide con Pressable
      ref={ref as Ref<ComponentRef<typeof Pressable>>}
      accessibilityRole="tab"
      accessibilityLabel={children}
      accessibilityState={{ selected: isFocused }}
      onFocus={(evento) => {
        setConFoco(true);
        onFocus?.(evento);
      }}
      onBlur={(evento) => {
        setConFoco(false);
        onBlur?.(evento);
      }}
      style={({ pressed }) => [
        estilos.pestana,
        isFocused && estilos.pestanaActiva,
        conFoco && estilos.pestanaConFoco,
        pressed && estilos.pestanaPulsada,
      ]}
    >
      <Text numberOfLines={1} style={[estilos.texto, isFocused && estilos.textoActivo]}>
        {children}
      </Text>
    </Pressable>
  );
}
