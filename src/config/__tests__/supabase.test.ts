import { obtenerConfiguracionSupabase } from "../supabase";

describe("obtenerConfiguracionSupabase", () => {
  test("sin URL o sin clave lanza un error comprensible", () => {
    for (const [url, clave] of [
      [undefined, undefined],
      ["https://proyecto.supabase.co", undefined],
      [undefined, "sb_publishable_prueba"],
      ["  ", "sb_publishable_prueba"],
    ]) {
      expect(() => obtenerConfiguracionSupabase(url, clave)).toThrow(
        "Supabase no está configurado"
      );
    }
  });

  test("devuelve la URL y la clave publishable sin espacios", () => {
    expect(
      obtenerConfiguracionSupabase(" https://proyecto.supabase.co ", " sb_publishable_prueba ")
    ).toEqual({
      url: "https://proyecto.supabase.co",
      publishableKey: "sb_publishable_prueba",
    });
  });
});
