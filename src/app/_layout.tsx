import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppAuthGate } from '@/components/AppAuthGate';
import { AuthProvider } from '@/context/AuthContext';
import { DisponibilidadProvider } from '@/context/DisponibilidadContext';
import { EventosProvider } from '@/context/EventosContext';
import { IntegrantesProvider } from '@/context/IntegrantesContext';
import { InvitacionPendienteProvider } from '@/context/InvitacionPendienteContext';
import { TecnicosProvider } from '@/context/TecnicosContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Fuera de Auth: un enlace de invitación puede llegar antes de haber sesión */}
      <InvitacionPendienteProvider>
        <AuthProvider>
          {/* Fuera del gate: es quien oculta el splash nativo, también sin sesión */}
          <AnimatedSplashOverlay />
          <AppAuthGate>
            <EventosProvider>
              <TecnicosProvider>
                <IntegrantesProvider>
                  <DisponibilidadProvider>
                    <AppTabs />
                  </DisponibilidadProvider>
                </IntegrantesProvider>
              </TecnicosProvider>
            </EventosProvider>
          </AppAuthGate>
        </AuthProvider>
      </InvitacionPendienteProvider>
    </ThemeProvider>
  );
}
