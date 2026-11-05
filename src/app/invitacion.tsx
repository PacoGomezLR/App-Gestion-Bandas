import { Redirect } from "expo-router";

// Expo Router exige esta versión universal para invitacion.web.tsx. En la app no
// se llega aquí: +native-intent manda los enlaces de invitación al inicio y
// InvitacionPendienteContext lee el token. Por si acaso, se vuelve al inicio.
export default function Invitacion() {
  return <Redirect href="/" />;
}
