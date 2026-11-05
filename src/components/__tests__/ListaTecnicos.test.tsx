import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { Tecnico } from "../../types/tecnico";
import { ListaTecnicos } from "../ListaTecnicos";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

const tecnicos: Tecnico[] = [
  {
    id: "1",
    nombre: "Carlos",
  },
  {
    id: "2",
    nombre: "Miguel",
  },
];

describe("ListaTecnicos", () => {
  test("el admin abre un técnico al pulsar su fila", async () => {
    const onElegir = jest.fn();

    await render(
      <ListaTecnicos tecnicos={tecnicos} procesando={false} puedeGestionar onElegir={onElegir} />
    );

    await fireEvent.press(screen.getByRole("button", { name: "Miguel" }));

    expect(onElegir).toHaveBeenCalledTimes(1);
    expect(onElegir).toHaveBeenCalledWith(tecnicos[1]);
  });

  test.each([true, false])("nombres centrados y sin flecha (admin: %s)", async (puedeGestionar) => {
    await render(
      <ListaTecnicos
        tecnicos={tecnicos}
        procesando={false}
        puedeGestionar={puedeGestionar}
        onElegir={jest.fn()}
      />
    );

    for (const { nombre } of tecnicos) {
      const estilo = StyleSheet.flatten(screen.getByText(nombre).props.style);

      expect(estilo.textAlign).toBe("center");
      // Ocupa todo el ancho de la fila: se centra respecto a ella, no a su propio texto
      expect(estilo.flex).toBe(1);
    }

    expect(screen.queryByText("›")).toBeNull();
  });

  test("la fila entera es un único botón con el nombre del técnico", async () => {
    await render(
      <ListaTecnicos tecnicos={tecnicos} procesando={false} puedeGestionar onElegir={jest.fn()} />
    );

    const fila = screen.getByRole("button", { name: "Carlos" });

    expect(StyleSheet.flatten(fila.props.style).minHeight).toBe(56);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  test("no hay botones Editar ni Eliminar en la lista", async () => {
    await render(
      <ListaTecnicos tecnicos={tecnicos} procesando={false} puedeGestionar onElegir={jest.fn()} />
    );

    expect(screen.queryByText(/editar/i)).toBeNull();
    expect(screen.queryByText(/eliminar/i)).toBeNull();
  });

  test("las filas no se pueden abrir mientras procesa", async () => {
    const onElegir = jest.fn();

    await render(<ListaTecnicos tecnicos={tecnicos} procesando puedeGestionar onElegir={onElegir} />);

    expect(screen.getAllByRole("button", { disabled: true })).toHaveLength(2);

    await fireEvent.press(screen.getByText("Carlos"));

    expect(onElegir).not.toHaveBeenCalled();
  });

  test("sin permiso muestra los nombres, sin filas pulsables ni textos de rol", async () => {
    await render(
      <ListaTecnicos tecnicos={tecnicos} procesando={false} puedeGestionar={false} onElegir={jest.fn()} />
    );

    expect(screen.getByText("Carlos")).toBeTruthy();
    expect(screen.getByText("Miguel")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/admin|usuario|solo lectura/i)).toBeNull();
  });
});
