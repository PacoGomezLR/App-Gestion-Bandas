import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { crearEnlaceAppInvitacion } from "../lib/invitacion-deep-link";
import { plataformaDelNavegador, type PlataformaWeb } from "../utils/plataformaWeb";
import { crearEstilosPaginaInvitacionWeb } from "./PaginaInvitacionWeb.styles";

interface PaginaInvitacionWebProps {
  // El valor tal cual llega en ?token= (puede faltar o venir repetido)
  token: unknown;
}

// Página web de respaldo para https://dominio/invitacion?token=...: se ve cuando
// el enlace no abre la app. Solo comprueba el formato del token; la invitación
// la valida la app contra Supabase. El token nunca se muestra, se registra ni se
// guarda, y la app solo se intenta abrir si la persona pulsa el botón.
// - Android: botón «Abrir MI Banda» con mibanda:// (hasta tener App Links).
// - iPhone / iPad: sin botón. Sin la app, mibanda:// da un error de Safari; con
//   Universal Links activos el enlace https ya abrirá la app sin pasar por aquí.
// - Escritorio: sin botón; la app es para el móvil.
export function PaginaInvitacionWeb({ token }: PaginaInvitacionWebProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosPaginaInvitacionWeb(tema), [tema]);
  // El HTML estático se genera sin query ni navegador: hasta montar no se
  // conocen el token ni la plataforma, y así el primer render coincide con el
  // HTML exportado
  const [plataforma, setPlataforma] = useState<PlataformaWeb | null>(null);

  useEffect(() => setPlataforma(plataformaDelNavegador()), []);

  if (plataforma === null) {
    return (
      <View style={estilos.pagina}>
        <View style={estilos.columna}>
          <Text accessibilityRole="header" style={estilos.marca}>
            MI Banda
          </Text>
        </View>
      </View>
    );
  }

  const enlaceApp = crearEnlaceAppInvitacion(token);

  return (
    <View style={estilos.pagina}>
      <View style={estilos.columna}>
        <Text accessibilityRole="header" style={estilos.marca}>
          MI Banda
        </Text>

        {enlaceApp === null && (
          <Text accessibilityRole="alert" style={estilos.error}>
            Esta invitación no es válida. Pide un enlace nuevo a quien te invitó.
          </Text>
        )}

        {enlaceApp !== null && (
          <>
            <Text accessibilityRole="header" style={estilos.titulo}>
              Invitación a una banda
            </Text>

            {plataforma === "android" && (
              <>
                <Text style={estilos.texto}>
                  Te han invitado a unirte a una banda en MI Banda. Si tienes la app instalada en
                  este móvil, ábrela para ver la invitación y decidir si te unes.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => void Linking.openURL(enlaceApp)}
                  style={({ pressed }) => [estilos.boton, pressed && estilos.botonPulsado]}
                >
                  <Text style={estilos.textoBoton}>Abrir MI Banda</Text>
                </Pressable>

                <View style={estilos.nota}>
                  <Text style={estilos.tituloNota}>¿No tienes la app?</Text>
                  <Text style={estilos.textoNota}>
                    MI Banda todavía se distribuye solo entre los integrantes de cada banda. Pide a
                    quien te invitó que te la facilite y vuelve a abrir este enlace.
                  </Text>
                </View>
              </>
            )}

            {plataforma === "ios" && (
              <>
                <Text style={estilos.texto}>
                  Te han invitado a unirte a una banda en MI Banda, pero la app no se ha abierto en
                  este iPhone o iPad.
                </Text>

                <View style={estilos.nota}>
                  <Text style={estilos.tituloNota}>MI Banda no está instalada en este dispositivo</Text>
                  <Text style={estilos.textoNota}>
                    MI Banda todavía no está disponible para iPhone ni iPad. Cuando lo esté, este
                    mismo enlace abrirá la app directamente. Mientras tanto, ábrelo en un móvil
                    Android con MI Banda instalada.
                  </Text>
                </View>
              </>
            )}

            {plataforma === "otra" && (
              <>
                <Text style={estilos.texto}>
                  Te han invitado a unirte a una banda en MI Banda. MI Banda es una app para el
                  móvil: abre este enlace desde el teléfono donde la tengas instalada.
                </Text>

                <View style={estilos.nota}>
                  <Text style={estilos.tituloNota}>¿No tienes la app?</Text>
                  <Text style={estilos.textoNota}>
                    MI Banda todavía se distribuye solo entre los integrantes de cada banda. Pide a
                    quien te invitó que te la facilite.
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}
