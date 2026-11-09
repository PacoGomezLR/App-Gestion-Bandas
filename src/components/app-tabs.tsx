import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useBandaContext } from '@/context/BandaContext';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { esAdmin } = useBandaContext();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
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
