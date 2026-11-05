import { useLocalSearchParams } from "expo-router";

import { PaginaInvitacionWeb } from "@/components/PaginaInvitacionWeb";

// Web: página de respaldo del enlace https de invitación (cuando no abre la app)
export default function InvitacionWeb() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();

  return <PaginaInvitacionWeb token={token} />;
}
