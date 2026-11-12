import { NativeTabs } from 'expo-router/native-tabs';

import { useBandaContext } from '@/context/BandaContext';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();
  const { esAdmin } = useBandaContext();

  return (
    <NativeTabs
      // Elegida: icono de acento, texto claro y píldora suave detrás (no solo color).
      // Sin elegir: gris secundario, legible sobre el fondo
      backgroundColor={colors.background}
      indicatorColor={colors.primarySoft}
      iconColor={{ default: colors.textSecondary, selected: colors.primaryPressed }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.text },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Calendario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* Iconos del sistema: no hay imagen propia para el repertorio */}
      <NativeTabs.Trigger name="repertorio">
        <NativeTabs.Trigger.Label>Repertorio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="music.note.list" md="queue_music" />
      </NativeTabs.Trigger>

      {/* Solo para el admin. hidden la quita de la barra sin dejar hueco y
          bloquea la ruta: no se puede navegar a ella de ninguna forma */}
      <NativeTabs.Trigger name="banda" hidden={!esAdmin}>
        <NativeTabs.Trigger.Label>Banda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
