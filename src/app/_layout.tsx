import { Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppAuthGate } from '@/components/AppAuthGate';
import { AuthProvider } from '@/context/AuthContext';
import { DisponibilidadProvider } from '@/context/DisponibilidadContext';
import { EventosProvider } from '@/context/EventosContext';
import { IntegrantesProvider } from '@/context/IntegrantesContext';
import { InvitacionPendienteProvider } from '@/context/InvitacionPendienteContext';
import { LogoBandaProvider } from '@/context/LogoBandaContext';
import { RepertorioProvider } from '@/context/RepertorioContext';
import { TemaNavegacion } from '@/constants/temaNavegacion';
import { TecnicosProvider } from '@/context/TecnicosContext';
import { useInvitacionAndroidWeb } from '@/hooks/useInvitacionAndroidWeb';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  // Solo en un navegador Android con /invitacion: la página para abrir la app
  // nativa, sin sesión ni datos. En la app y en el resto de la web, siempre false
  const paginaAbrirApp = useInvitacionAndroidWeb();

  if (paginaAbrirApp) {
    return (
      <ThemeProvider value={TemaNavegacion}>
        <Slot />
      </ThemeProvider>
    );
  }

  return (
    // Un solo tema, oscuro: no depende del esquema del sistema
    <ThemeProvider value={TemaNavegacion}>
      {/* Iconos claros sobre el fondo oscuro */}
      <StatusBar style="light" />
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
                    <RepertorioProvider>
                      <LogoBandaProvider>
                        <AppTabs />
                      </LogoBandaProvider>
                    </RepertorioProvider>
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
