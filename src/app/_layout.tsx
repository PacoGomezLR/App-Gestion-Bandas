import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppAuthGate } from '@/components/AppAuthGate';
import { AuthProvider } from '@/context/AuthContext';
import { EventosProvider } from '@/context/EventosContext';
import { MiembrosProvider } from '@/context/MiembrosContext';
import { TecnicosProvider } from '@/context/TecnicosContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        {/* Fuera del gate: es quien oculta el splash nativo, también sin sesión */}
        <AnimatedSplashOverlay />
        <AppAuthGate>
          <EventosProvider>
            <TecnicosProvider>
              <MiembrosProvider>
                <AppTabs />
              </MiembrosProvider>
            </TecnicosProvider>
          </EventosProvider>
        </AppAuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
