import { useIsFocused } from "expo-router";

import { PantallaRepertorio } from "../components/PantallaRepertorio";

// Pestaña principal: el repertorio y las canciones nuevas de la banda
export default function RepertorioScreen() {
  return <PantallaRepertorio enFoco={useIsFocused()} />;
}
