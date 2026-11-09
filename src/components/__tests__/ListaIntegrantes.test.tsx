import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { IntegranteBanda } from "../../types/banda";
import { ListaIntegrantes } from "../ListaIntegrantes";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

const INTEGRANTES: IntegranteBanda[] = [
  { usuarioId: "u1", nombreVisible: "Paco" },
  { usuarioId: "u2", nombreVisible: "Paco Gómez" },
  { usuarioId: "u3", nombreVisible: "Sergio" },
];

function filaDe(nombre: string) {
  return screen.getByText(nombre).parent;
}

describe("ListaIntegrantes", () => {
  test("filas compactas, todas con la misma altura", async () => {
    await render(<ListaIntegrantes integrantes={INTEGRANTES} />);

    const alturas = INTEGRANTES.map(
      ({ nombreVisible }) => StyleSheet.flatten(filaDe(nombreVisible ?? "")?.props.style).minHeight
    );

    expect(alturas).toEqual([56, 56, 56]);
  });

  test("texto a la izquierda, a todo lo ancho y centrado en vertical", async () => {
    await render(<ListaIntegrantes integrantes={INTEGRANTES} />);

    const texto = StyleSheet.flatten(screen.getByText("Paco Gómez").props.style);
    const fila = StyleSheet.flatten(filaDe("Paco Gómez")?.props.style);

    expect(texto.textAlign).toBeUndefined();
    // Columna: el texto se estira a lo ancho y la fila lo centra en vertical
    expect(fila.flexDirection).toBeUndefined();
    expect(fila.justifyContent).toBe("center");
    expect(fila.paddingVertical).toBeGreaterThan(0);
  });

  test("solo lectura: sin flecha ni botones", async () => {
    await render(<ListaIntegrantes integrantes={INTEGRANTES} />);

    expect(screen.queryByText("›")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("una línea entre cada dos filas, ninguna encima de la primera", async () => {
    await render(<ListaIntegrantes integrantes={INTEGRANTES} />);

    const separadores = INTEGRANTES.map(
      ({ nombreVisible }) =>
        StyleSheet.flatten(filaDe(nombreVisible ?? "")?.parent?.props.style)?.borderTopWidth
    );

    expect(separadores).toEqual([undefined, StyleSheet.hairlineWidth, StyleSheet.hairlineWidth]);
  });

  test("sin nombre se lee como texto apagado, en la misma fila", async () => {
    await render(<ListaIntegrantes integrantes={[{ usuarioId: "u9", nombreVisible: null }]} />);

    const texto = StyleSheet.flatten(screen.getByText("Integrante sin nombre").props.style);

    expect(texto.fontStyle).toBe("italic");
    expect(StyleSheet.flatten(filaDe("Integrante sin nombre")?.props.style).minHeight).toBe(56);
  });
});
