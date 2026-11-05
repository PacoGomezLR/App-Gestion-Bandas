import { Redirect } from "expo-router";

// Web: la gestión de técnicos solo existe en la app
export default function TecnicosWeb() {
  return <Redirect href="/" />;
}
