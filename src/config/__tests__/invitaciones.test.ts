import { obtenerOrigenInvitaciones } from "../invitaciones";

// Dominios .test (RFC 6761): reservados, nunca existen. No son configuración real.

describe("obtenerOrigenInvitaciones", () => {
  test("sin valor la variable está ausente (desarrollo: se usa mibanda://)", () => {
    expect(obtenerOrigenInvitaciones(undefined)).toEqual({ tipo: "ausente" });
    expect(obtenerOrigenInvitaciones("")).toEqual({ tipo: "ausente" });
    expect(obtenerOrigenInvitaciones("   ")).toEqual({ tipo: "ausente" });
  });

  test("acepta un origen https y lo normaliza sin barra final", () => {
    expect(obtenerOrigenInvitaciones("https://mibanda.test")).toEqual({
      tipo: "valido",
      origen: "https://mibanda.test",
    });
    expect(obtenerOrigenInvitaciones(" https://MiBanda.TEST/ ")).toEqual({
      tipo: "valido",
      origen: "https://mibanda.test",
    });
    // El formato que dará Expo Hosting
    expect(obtenerOrigenInvitaciones("https://mi-banda.expo.test")).toEqual({
      tipo: "valido",
      origen: "https://mi-banda.expo.test",
    });
  });

  test.each([
    "http://mibanda.test",
    "javascript:alert(1)",
    "file:///sdcard/invitacion",
    "intent://invitacion#Intent;scheme=mibanda;end",
    "mibanda://invitacion",
    "ftp://mibanda.test",
    "https:mibanda.test",
    "https://",
    "https://localhost",
    "https://192.168.1.10",
    "https://mibanda.test:8443",
    "https://usuario:clave@mibanda.test",
    "https://mibanda.test/invitacion",
    "https://mibanda.test//",
    "https://mibanda.test/?token=0123",
    "https://mibanda.test/#token",
    "no es una url",
  ])("definida pero no válida: %s es un error de configuración", (valor) => {
    expect(obtenerOrigenInvitaciones(valor)).toEqual({ tipo: "invalido" });
  });
});
