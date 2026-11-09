import { Linking } from "react-native";

import { abrirEnlaceGoogleMaps } from "../googleMaps";

const ENLACE = "https://maps.app.goo.gl/AbCdEf123?g_st=iw";

// jest-expo ya trae Linking simulado: cada prueba empieza sin llamadas anteriores
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("abrirEnlaceGoogleMaps", () => {
  test("abre exactamente el enlace guardado", async () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    await expect(abrirEnlaceGoogleMaps(ENLACE)).resolves.toBe(true);

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith(ENLACE);
  });

  test("si el sistema no puede abrirlo, avisa sin romper", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("Sin aplicación"));

    await expect(abrirEnlaceGoogleMaps(ENLACE)).resolves.toBe(false);
  });

  test.each(["javascript:alert(1)", "https://ejemplo.com", ""])(
    "nunca intenta abrir %p",
    async (enlace) => {
      const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

      await expect(abrirEnlaceGoogleMaps(enlace)).resolves.toBe(false);

      expect(abrir).not.toHaveBeenCalled();
    }
  );
});
