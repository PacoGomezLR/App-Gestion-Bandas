import { LONGITUD_MINIMA_CONTRASENA, validarNuevaContrasena } from "../contrasena";

describe("validarNuevaContrasena", () => {
  test("vacía o sin repetir", () => {
    expect(validarNuevaContrasena("", "")).toBe("Escribe la nueva contraseña dos veces");
    expect(validarNuevaContrasena("secreta", "")).toBe("Escribe la nueva contraseña dos veces");
  });

  test("más corta que el mínimo de Supabase (6)", () => {
    expect(LONGITUD_MINIMA_CONTRASENA).toBe(6);
    expect(validarNuevaContrasena("12345", "12345")).toBe("La contraseña debe tener al menos 6 caracteres");
  });

  test("distintas", () => {
    expect(validarNuevaContrasena("secreta1", "secreta2")).toBe("Las contraseñas no coinciden");
  });

  test("válida", () => {
    expect(validarNuevaContrasena("123456", "123456")).toBeNull();
  });
});
