import { Redirect, useLocalSearchParams } from "expo-router";

import { PaginaInvitacionWeb } from "@/components/PaginaInvitacionWeb";
import { plataformaDelNavegador } from "../utils/plataformaWeb";

// Web. Esta ruta solo se monta ya en el navegador, nunca en el HTML estático:
// - Android: _layout muestra solo esta ruta (useInvitacionAndroidWeb) y aquí va
//   la página con «Abrir MI Banda» para la app nativa.
// - iPhone, iPad y escritorio: el token ya lo ha leído InvitacionPendienteContext
//   de la URL inicial y AppAuthGate muestra la invitación antes que cualquier
//   ruta. Al llegar aquí ya está resuelta: se vuelve al inicio, como en la app.
export default function InvitacionWeb() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();

  if (plataformaDelNavegador() === "android") {
    return <PaginaInvitacionWeb token={token} />;
  }

  return <Redirect href="/" />;
}
