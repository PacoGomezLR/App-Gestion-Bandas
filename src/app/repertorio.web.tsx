import { Redirect } from "expo-router";

// Web: el repertorio solo existe en la app
export default function RepertorioWeb() {
  return <Redirect href="/" />;
}
