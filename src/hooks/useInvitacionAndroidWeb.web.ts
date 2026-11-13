import { usePathname } from "expo-router";
import { useEffect, useState } from "react";

import { RUTA_INVITACION } from "../lib/invitacion-deep-link";
import { plataformaDelNavegador } from "../utils/plataformaWeb";

// true solo en un navegador Android que abre /invitacion: allí se muestra la
// página con «Abrir MI Banda» (la app nativa) en lugar de la app web.
// En iPhone, iPad y escritorio, false: el enlace carga la app web y
// InvitacionPendienteContext lee el token como en la app.
// El HTML estático se genera sin navegador: hasta montar no se conoce la
// plataforma y el primer render coincide con el HTML exportado.
export function useInvitacionAndroidWeb(): boolean {
  const ruta = usePathname();
  const [android, setAndroid] = useState(false);

  useEffect(() => setAndroid(plataformaDelNavegador() === "android"), []);

  return android && ruta.replace(/^\/+|\/+$/g, "") === RUTA_INVITACION;
}
