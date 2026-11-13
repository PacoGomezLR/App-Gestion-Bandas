import { Redirect } from "expo-router";

// Destino del enlace de confirmación del correo en web
// (https://dominio/auth/callback#access_token=...). AuthContext ya lee la URL
// inicial al montarse: esta ruta solo se monta después, detrás de AppAuthGate,
// y al sustituirla por el inicio los tokens desaparecen de la barra de
// direcciones. En la app no se llega aquí: +native-intent manda el enlace al
// inicio antes de buscar ninguna ruta.
export default function CallbackAuth() {
  return <Redirect href="/" />;
}
