import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import type { IntegranteBanda } from "../../types/banda";
import { useBandaContext } from "../BandaContext";
import { IntegrantesProvider, useIntegrantesContext } from "../IntegrantesContext";

const mockListar = jest.fn<Promise<IntegranteBanda[]>, []>();
const mockRepositorioPedido = jest.fn<void, [string]>();

jest.mock("../../services/supabase/integrantes", () => ({
  crearRepositorioIntegrantesSupabase: (bandaId: string) => {
    mockRepositorioPedido(bandaId);

    return {
      listar: () => mockListar(),
    };
  },
}));

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

function Consumidor() {
  const { nombresPorUsuario, cargando, errorPersistencia } = useIntegrantesContext();

  return (
    <>
      <Text>{cargando ? "Cargando" : "Listo"}</Text>
      <Text testID="nombres">{JSON.stringify(nombresPorUsuario)}</Text>
      {errorPersistencia !== "" && <Text>{errorPersistencia}</Text>}
    </>
  );
}

const arbol = () => (
  <IntegrantesProvider>
    <Consumidor />
  </IntegrantesProvider>
);

async function renderizar() {
  const resultado = await render(arbol());
  await screen.findByText("Listo");
  return resultado;
}

function nombres() {
  return JSON.parse(screen.getByTestId("nombres").props.children);
}

describe("IntegrantesContext", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    simularBanda("b1", false);
  });

  test("carga una vez los nombres de la banda y resuelve usuarioId → nombre", async () => {
    mockListar.mockResolvedValueOnce([
      { usuarioId: "yo", nombreVisible: "Paco Gómez" },
      { usuarioId: "otro", nombreVisible: "Kike Fuentes" },
      { usuarioId: "nuevo", nombreVisible: null },
    ]);

    await renderizar();

    expect(mockRepositorioPedido).toHaveBeenCalledWith("b1");
    expect(mockListar).toHaveBeenCalledTimes(1);
    // Quien no tiene nombre no aparece: se resuelve con el texto de reserva
    expect(nombres()).toEqual({ yo: "Paco Gómez", otro: "Kike Fuentes" });
  });

  test("si Supabase falla muestra el error y no inventa nombres", async () => {
    mockListar.mockRejectedValueOnce(new Error("sin red"));

    await renderizar();

    expect(screen.getByText("No se han podido cargar los nombres de la banda")).toBeTruthy();
    expect(nombres()).toEqual({});
  });

  test("sin banda actual no consulta nada", async () => {
    simularBanda(null, false);

    await renderizar();

    expect(mockRepositorioPedido).not.toHaveBeenCalled();
    expect(nombres()).toEqual({});
  });

  test("al cambiar de banda recarga los nombres y no mezcla una respuesta tardía", async () => {
    let responderBandaA: (lista: IntegranteBanda[]) => void = () => {};
    mockListar
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          responderBandaA = resolve;
        })
      )
      .mockResolvedValueOnce([{ usuarioId: "rafa", nombreVisible: "Rafa Pérez" }]);

    const { rerender } = await render(arbol());

    simularBanda("b2", false);
    await rerender(arbol());
    await screen.findByText("Listo");

    await act(async () => {
      responderBandaA([{ usuarioId: "kike", nombreVisible: "Kike Fuentes" }]);
    });

    expect(mockRepositorioPedido).toHaveBeenLastCalledWith("b2");
    expect(nombres()).toEqual({ rafa: "Rafa Pérez" });
  });

  test("falla si se usa fuera del provider", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(render(<Consumidor />)).rejects.toThrow(
      "useIntegrantesContext debe usarse dentro de IntegrantesProvider"
    );

    consoleError.mockRestore();
  });
});
