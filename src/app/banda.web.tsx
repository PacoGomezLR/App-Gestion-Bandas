import { Redirect } from "expo-router";

// Web: la gestión de la banda solo existe en la app
export default function BandaWeb() {
  return <Redirect href="/" />;
}
