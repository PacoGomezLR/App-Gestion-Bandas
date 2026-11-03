import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Button, Text } from "react-native";

import type { IndisponibilidadUsuario } from "../../types/disponibilidad";
import { useBandaContext } from "../BandaContext";
import { DisponibilidadProvider, useDisponibilidadContext } from "../DisponibilidadContext";

const mockListar = jest.fn<Promise<IndisponibilidadUsuario[]>, []>();
const mockMarcar = jest.fn<Promise<IndisponibilidadUsuario>, [string]>();
const mockDesmarcar = jest.fn<Promise<void>, [string]>();
const mockRepositorioPedido = jest.fn<void, [string, string]>();

jest.mock("../../services/supabase/disponibilidad", () => ({
  crearRepositorioDisponibilidadSupabase: (bandaId: string, usuarioId: string) => {
    mockRepositorioPedido(bandaId, usuarioId);

    return {
      listar: () => mockListar(),
      marcarNoDisponible: (fecha: string) => mockMarcar(fecha),
      desmarcar: (id: string) => mockDesmarcar(id),
    };
  },
}));

// Solo se simula el hook: el BandaContext real cargaría el cliente Supabase
jest.mock("../BandaContext", () => ({
  useBandaContext: jest.fn(),
}));

const mockUseBandaContext = jest.mocked(useBandaContext);

function simularBanda(bandaId: string | null, esAdmin: boolean, usuarioId = "yo") {
  mockUseBandaContext.mockReturnValue({
    bandas: [],
    bandaActual:
      bandaId === null ? null : { id: bandaId, nombre: `Banda ${bandaId}`, creadaPor: "u0", creadaEn: "2026-01-01" },
    pertenenciaActual:
      bandaId === null
        ? null
        : { bandaId, usuarioId, rol: esAdmin ? "admin" : "usuario", creadaEn: "2026-01-01" },
    cargando: false,
    errorCarga: "",
    error: "",
    esAdmin,
    crearBanda: jest.fn(),
    seleccionarBanda: jest.fn(),
    recargarBandas: jest.fn(),
  });
}

function indisponibilidad(id: string, usuarioId: string, fecha: string, bandaId = "b1"): IndisponibilidadUsuario {
  return { id, bandaId, usuarioId, fecha };
}

function Consumidor() {
  const { indisponibilidades, cargando, errorPersistencia, marcarNoDisponible, marcarDisponible } =
    useDisponibilidadContext();

  return (
    <>
      <Text>{cargando ? "Cargando" : "Listo"}</Text>
      <Text testID="lista">
        {indisponibilidades.map(({ usuarioId, fecha }) => `${usuarioId}@${fecha}`).join(",")}
      </Text>
      {errorPersistencia !== "" && <Text>{errorPersistencia}</Text>}
      <Button title="Marcar 14" onPress={() => void marcarNoDisponible("2026-11-14")} />
      <Button title="Desmarcar 14" onPress={() => void marcarDisponible("2026-11-14")} />
      <Button title="Desmarcar 20" onPress={() => void marcarDisponible("2026-11-20")} />
    </>
  );
}

async function renderizar() {
  const resultado = await render(
    <DisponibilidadProvider>
      <Consumidor />
    </DisponibilidadProvider>
  );

  await screen.findByText("Listo");

  return resultado;
}

function lista() {
  return screen.getByTestId("lista").props.children;
}

describe("DisponibilidadContext", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    simularBanda("b1", false);
  });

  test("carga las indisponibilidades de toda la banda actual", async () => {
    mockListar.mockResolvedValueOnce([
      indisponibilidad("i1", "yo", "2026-11-14"),
      indisponibilidad("i2", "otro", "2026-11-20"),
    ]);

    await renderizar();

    expect(mockRepositorioPedido).toHaveBeenCalledWith("b1", "yo");
    expect(lista()).toBe("yo@2026-11-14,otro@2026-11-20");
  });

  test.each([
    ["admin", true],
    ["usuario", false],
  ])("un %s marca y desmarca su propio día", async (_, esAdmin) => {
    simularBanda("b1", esAdmin);
    mockListar.mockResolvedValueOnce([]);
    mockMarcar.mockResolvedValueOnce(indisponibilidad("nueva", "yo", "2026-11-14"));
    mockDesmarcar.mockResolvedValueOnce();

    await renderizar();

    await fireEvent.press(screen.getByText("Marcar 14"));
    expect(mockMarcar).toHaveBeenCalledWith("2026-11-14");
    expect(lista()).toBe("yo@2026-11-14");

    await fireEvent.press(screen.getByText("Desmarcar 14"));
    expect(mockDesmarcar).toHaveBeenCalledWith("nueva");
    expect(lista()).toBe("");
  });

  test("no crea un duplicado si el día ya estaba marcado", async () => {
    mockListar.mockResolvedValueOnce([indisponibilidad("i1", "yo", "2026-11-14")]);

    await renderizar();
    await fireEvent.press(screen.getByText("Marcar 14"));

    expect(mockMarcar).not.toHaveBeenCalled();
    expect(lista()).toBe("yo@2026-11-14");
  });

  test("un admin no puede desmarcar el día de otro integrante", async () => {
    simularBanda("b1", true);
    mockListar.mockResolvedValueOnce([indisponibilidad("ajena", "otro", "2026-11-20")]);

    await renderizar();
    await fireEvent.press(screen.getByText("Desmarcar 20"));

    // Ni siquiera llega al repositorio: solo se buscan las indisponibilidades propias
    expect(mockDesmarcar).not.toHaveBeenCalled();
    expect(lista()).toBe("otro@2026-11-20");
  });

  test("si Supabase falla al marcar no cambia la lista y muestra el error", async () => {
    mockListar.mockResolvedValueOnce([]);
    mockMarcar.mockRejectedValueOnce(new Error("sin red"));

    await renderizar();
    await fireEvent.press(screen.getByText("Marcar 14"));

    expect(lista()).toBe("");
    expect(screen.getByText("No se ha podido marcar el día")).toBeTruthy();
  });

  test("si Supabase falla al cargar muestra el error", async () => {
    mockListar.mockRejectedValueOnce(new Error("sin red"));

    await renderizar();

    expect(screen.getByText("No se ha podido cargar la disponibilidad")).toBeTruthy();
  });

  test("sin banda actual no consulta nada", async () => {
    simularBanda(null, false);

    await renderizar();

    expect(mockRepositorioPedido).not.toHaveBeenCalled();
    expect(mockListar).not.toHaveBeenCalled();
    expect(lista()).toBe("");
  });

  test("al cambiar de banda recarga y no mezcla una respuesta tardía de la anterior", async () => {
    let responderBandaA: (lista: IndisponibilidadUsuario[]) => void = () => {};
    mockListar
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          responderBandaA = resolve;
        })
      )
      .mockResolvedValueOnce([indisponibilidad("b2-1", "yo", "2026-12-01", "b2")]);

    const arbol = () => (
      <DisponibilidadProvider>
        <Consumidor />
      </DisponibilidadProvider>
    );
    const { rerender } = await render(arbol());

    simularBanda("b2", false);
    await rerender(arbol());
    await screen.findByText("Listo");

    // La banda A responde tarde: su día no debe aparecer en la banda B
    await act(async () => {
      responderBandaA([indisponibilidad("a-1", "yo", "2026-11-14", "b1")]);
    });

    expect(mockRepositorioPedido).toHaveBeenLastCalledWith("b2", "yo");
    expect(lista()).toBe("yo@2026-12-01");
  });

  test("falla si se usa fuera del provider", async () => {
    // React registra el error lanzado durante el render; se silencia para no ensuciar la salida
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(render(<Consumidor />)).rejects.toThrow(
      "useDisponibilidadContext debe usarse dentro de DisponibilidadProvider"
    );

    consoleError.mockRestore();
  });
});
