import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

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
//   Es la única plataforma que la ve (invitacion.web.tsx).
// - Resto: sin botón; mibanda:// daría un error en Safari o en el escritorio.
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
      <ScrollView style={estilos.pagina} contentContainerStyle={estilos.contenido}>
        <View style={estilos.columna}>
          <Text accessibilityRole="header" style={estilos.marca}>
            MI Banda
          </Text>
        </View>
      </ScrollView>
    );
  }

  const enlaceApp = crearEnlaceAppInvitacion(token);

  // ScrollView: en web solo hacen scroll los ScrollView (ver +html.tsx)
  return (
    <ScrollView style={estilos.pagina} contentContainerStyle={estilos.contenido}>
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

            {plataforma !== "android" && (
              <>
                {/* Hoy no se llega aquí: fuera de Android el enlace abre la app web */}
                <Text style={estilos.texto}>
                  Te han invitado a unirte a una banda en MI Banda.
                </Text>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
