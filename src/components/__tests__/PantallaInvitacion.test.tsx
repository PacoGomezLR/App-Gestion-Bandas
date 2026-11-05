import { fireEvent, render, screen } from "@testing-library/react-native";

import { useBandaContext } from "../../context/BandaContext";
import { aceptarInvitacionBanda, consultarInvitacionBanda } from "../../services/supabase/invitaciones";
import type { AceptacionInvitacion, ConsultaInvitacion } from "../../types/invitacion";
import { PantallaInvitacion } from "../PantallaInvitacion";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

// Valor de prueba con el formato del token (no es ningún token real)
const mockToken = "0123456789abcdef".repeat(4);
const TOKEN = mockToken;
const mockDescartar = jest.fn();

jest.mock("../../context/InvitacionPendienteContext", () => ({
  useInvitacionPendiente: () => ({ tokenPendiente: mockToken, descartarInvitacion: mockDescartar }),
}));

jest.mock("../../context/BandaContext", () => ({ useBandaContext: jest.fn() }));

jest.mock("../../services/supabase/invitaciones", () => ({
  consultarInvitacionBanda: jest.fn(),
  aceptarInvitacionBanda: jest.fn(),
}));

const mockConsultar = jest.mocked(consultarInvitacionBanda);
const mockAceptar = jest.mocked(aceptarInvitacionBanda);
const mockUseBandaContext = jest.mocked(useBandaContext);
const mockRecargarBandas = jest.fn(async (_bandaPreferidaId?: string) => {});

function simular(consulta: ConsultaInvitacion, aceptacion?: AceptacionInvitacion) {
  mockConsultar.mockResolvedValue(consulta);
  if (aceptacion !== undefined) {
    mockAceptar.mockResolvedValue(aceptacion);
  }

  mockUseBandaContext.mockReturnValue({
    bandas: [],
    bandaActual: null,
    pertenenciaActual: null,
    cargando: false,
    errorCarga: "",
    error: "",
    esAdmin: false,
    crearBanda: jest.fn(),
    seleccionarBanda: jest.fn(),
    recargarBandas: mockRecargarBandas,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PantallaInvitacion", () => {
  test("una invitación válida muestra la banda y no une a nadie sin confirmar", async () => {
    simular({ estado: "valida", bandaNombre: "Indiespensables" });

    await render(<PantallaInvitacion />);

    expect(await screen.findByText("Indiespensables")).toBeTruthy();
    expect(screen.getByText("Te han invitado a unirte a:")).toBeTruthy();
    expect(mockConsultar).toHaveBeenCalledWith(TOKEN);
    expect(mockAceptar).not.toHaveBeenCalled();
    // Ni el token ni el tipo de acceso se eligen o se muestran
    expect(screen.queryByText(TOKEN)).toBeNull();
    expect(screen.queryByText(/administrador|usuario|admin/i)).toBeNull();
  });

  test("Unirme acepta solo con el token y, al entrar, recarga y abre la banda nueva", async () => {
    simular(
      { estado: "valida", bandaNombre: "Indiespensables" },
      { resultado: "aceptada", bandaId: "b9", bandaNombre: "Indiespensables" }
    );

    await render(<PantallaInvitacion />);
    await fireEvent.press(await screen.findByText("Unirme a la banda"));

    // Sin rol: el que vale es el de la invitación
    expect(mockAceptar).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByText("Ya formas parte de")).toBeTruthy();

    await fireEvent.press(screen.getByText("Entrar en la banda"));

    expect(mockRecargarBandas).toHaveBeenCalledWith("b9");
    expect(mockDescartar).toHaveBeenCalledTimes(1);
  });

  test("Rechazar solo cierra: no acepta ni consume la invitación", async () => {
    simular({ estado: "valida", bandaNombre: "Indiespensables" });

    await render(<PantallaInvitacion />);
    await fireEvent.press(await screen.findByText("Rechazar"));

    expect(mockAceptar).not.toHaveBeenCalled();
    expect(mockDescartar).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["no_valida", "Esta invitación ya no es válida."],
    ["caducada", "Esta invitación ha caducado. Pide una nueva a quien te invitó."],
    ["usada", "Esta invitación ya se ha usado."],
    ["ya_miembro", "Ya perteneces a esta banda."],
  ] as const)("estado %s: mensaje claro, sin errores técnicos ni botón de unirse", async (estado, mensaje) => {
    simular({ estado, bandaNombre: estado === "ya_miembro" ? "Indiespensables" : null });

    await render(<PantallaInvitacion />);

    expect(await screen.findByText(mensaje)).toBeTruthy();
    expect(screen.queryByText("Unirme a la banda")).toBeNull();

    await fireEvent.press(screen.getByText("Continuar"));
    expect(mockDescartar).toHaveBeenCalledTimes(1);
    expect(mockAceptar).not.toHaveBeenCalled();
  });

  test("si al aceptar ya se había usado (otra persona fue más rápida), lo explica", async () => {
    simular(
      { estado: "valida", bandaNombre: "Indiespensables" },
      { resultado: "usada", bandaId: null, bandaNombre: null }
    );

    await render(<PantallaInvitacion />);
    await fireEvent.press(await screen.findByText("Unirme a la banda"));

    expect(screen.getByText("Esta invitación ya se ha usado.")).toBeTruthy();
    expect(mockRecargarBandas).not.toHaveBeenCalled();
  });

  test("un fallo de red muestra un mensaje humano", async () => {
    mockConsultar.mockRejectedValue(new Error("fallo técnico 42P01"));
    simular({ estado: "valida", bandaNombre: null });
    mockConsultar.mockRejectedValue(new Error("fallo técnico 42P01"));

    await render(<PantallaInvitacion />);

    expect(await screen.findByText("No se ha podido comprobar la invitación.")).toBeTruthy();
    expect(screen.queryByText(/42P01/)).toBeNull();
  });
});
