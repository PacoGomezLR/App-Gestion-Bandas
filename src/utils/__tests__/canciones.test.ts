import type { Cancion } from "../../types/cancion";
import { cancionesDe, etiquetaApartado, ordenarCanciones, validarNombreCancion } from "../canciones";

function cancion(id: string, nombre: string, estado: Cancion["estado"] = "repertorio"): Cancion {
  return { id, nombre, estado };
}

describe("validarNombreCancion", () => {
  test("recorta y conserva el texto tal cual, con sus mayúsculas", () => {
    expect(validarNombreCancion("  Años 80 - Los Piratas  ")).toEqual({
      valido: true,
      nombre: "Años 80 - Los Piratas",
    });
    expect(validarNombreCancion("LN Granada - Supersubmarina")).toEqual({
      valido: true,
      nombre: "LN Granada - Supersubmarina",
    });
  });

  test("una sola palabra también vale", () => {
    expect(validarNombreCancion("Años 80")).toMatchObject({ valido: true, nombre: "Años 80" });
  });

  test("vacío o solo espacios no vale", () => {
    expect(validarNombreCancion("   ")).toEqual({
      valido: false,
      error: "Escribe el nombre de la canción",
    });
  });

  test("respeta la longitud de la base", () => {
    expect(validarNombreCancion("a".repeat(160))).toMatchObject({ valido: true });
    expect(validarNombreCancion("a".repeat(161))).toEqual({
      valido: false,
      error: "El nombre admite como máximo 160 caracteres",
    });
  });
});

describe("ordenarCanciones", () => {
  test("alfabético en español, sin distinguir mayúsculas ni tildes", () => {
    const ordenadas = ordenarCanciones([
      cancion("1", "mira cómo vuelo - Miss Caffeina"),
      cancion("2", "Años 80 - Los Piratas"),
      cancion("3", "Granada - Supersubmarina"),
      cancion("4", "Ángel - Amaral"),
    ]);

    expect(ordenadas.map(({ nombre }) => nombre)).toEqual([
      "Ángel - Amaral",
      "Años 80 - Los Piratas",
      "Granada - Supersubmarina",
      "mira cómo vuelo - Miss Caffeina",
    ]);
  });

  test("los números en su orden natural", () => {
    const ordenadas = ordenarCanciones([cancion("1", "Años 80"), cancion("2", "Años 9")]);

    expect(ordenadas.map(({ nombre }) => nombre)).toEqual(["Años 9", "Años 80"]);
  });

  test("con el mismo nombre, el orden es estable por id", () => {
    const a = ordenarCanciones([cancion("b", "Años 80"), cancion("a", "Años 80")]);
    const b = ordenarCanciones([cancion("a", "Años 80"), cancion("b", "Años 80")]);

    expect(a.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(b.map(({ id }) => id)).toEqual(["a", "b"]);
  });

  test("no modifica la lista recibida", () => {
    const original = [cancion("1", "Zeta"), cancion("2", "Alfa")];

    ordenarCanciones(original);

    expect(original.map(({ id }) => id)).toEqual(["1", "2"]);
  });
});

describe("cancionesDe", () => {
  test("separa la misma colección por apartado, ya ordenada", () => {
    const todas = [
      cancion("1", "Zeta", "nueva"),
      cancion("2", "Beta", "repertorio"),
      cancion("3", "Alfa", "nueva"),
      cancion("4", "Alfa", "repertorio"),
    ];

    expect(cancionesDe(todas, "repertorio").map(({ id }) => id)).toEqual(["4", "2"]);
    expect(cancionesDe(todas, "nueva").map(({ id }) => id)).toEqual(["3", "1"]);
  });
});

test("etiquetas de los apartados", () => {
  expect(etiquetaApartado("repertorio")).toBe("Repertorio");
  expect(etiquetaApartado("nueva")).toBe("Canciones nuevas");
});
