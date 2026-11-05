import { fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";

import { ErrorRepositorio } from "../../services/supabase/errores";
import { crearInvitacionBanda } from "../../services/supabase/invitaciones";
import type { IntegranteBanda } from "../../types/banda";
import { GestionarBanda } from "../GestionarBanda";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

jest.mock("expo-linking", () => ({
  createURL: (ruta: string, opciones?: { queryParams?: Record<string, string> }) =>
    `mibanda://${ruta}?token=${opciones?.queryParams?.token ?? ""}`,
}));

jest.mock("../../services/supabase/invitaciones", () => ({
  crearInvitacionBanda: jest.fn(),
}));

const mockCrear = jest.mocked(crearInvitacionBanda);

// Valor de prueba con el formato del token (no es ningún token real)
const TOKEN = "0123456789abcdef".repeat(4);

const INTEGRANTES: IntegranteBanda[] = [
  { usuarioId: "u1", nombreVisible: "Paco Gómez" },
  { usuarioId: "u2", nombreVisible: "Kike Fuentes" },
  { usuarioId: "u3", nombreVisible: null },
];

async function renderizar() {
  await render(<GestionarBanda bandaId="b1" bandaNombre="Indiespensables" integrantes={INTEGRANTES} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCrear.mockResolvedValue({ token: TOKEN, expiraEn: "2026-11-10T10:00:00+00:00", rol: "usuario" });
});

describe("GestionarBanda", () => {
  test("lista los usuarios con su nombre visible, sin roles ni correos", async () => {
    await renderizar();

    expect(screen.getByText("Usuarios")).toBeTruthy();
    expect(screen.getByText("Paco Gómez")).toBeTruthy();
    expect(screen.getByText("Kike Fuentes")).toBeTruthy();
    expect(screen.getByText("Integrante sin nombre")).toBeTruthy();
    expect(screen.queryByText(/@|admin|administrador/i)).toBeNull();
  });

  test("Invitar usuario abre la elección con Usuario por defecto", async () => {
    await renderizar();

    await fireEvent.press(screen.getByText("+ Invitar usuario"));

    expect(screen.getByText("Tipo de acceso")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Usuario", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Administrador", checked: false })).toBeTruthy();
    // Se explica qué puede hacer un administrador
    expect(screen.getByText(/crear y editar eventos, gestionar la banda/)).toBeTruthy();
  });

  test("Cancelar no crea ninguna invitación", async () => {
    await renderizar();

    await fireEvent.press(screen.getByText("+ Invitar usuario"));
    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockCrear).not.toHaveBeenCalled();
    expect(screen.getByText("+ Invitar usuario")).toBeTruthy();
  });

  test("Generar invitación usa la banda actual y el tipo elegido", async () => {
    mockCrear.mockResolvedValue({ token: TOKEN, expiraEn: "2026-11-10T10:00:00+00:00", rol: "admin" });
    await renderizar();

    await fireEvent.press(screen.getByText("+ Invitar usuario"));
    await fireEvent.press(screen.getByRole("radio", { name: "Administrador" }));
    await fireEvent.press(screen.getByText("Generar invitación"));

    expect(mockCrear).toHaveBeenCalledWith("b1", "admin");
    expect(screen.getByText("Invitación preparada")).toBeTruthy();
    expect(screen.getByText("Tipo de acceso: Administrador")).toBeTruthy();
    expect(screen.getByText(/Caduca el 10\/11\/2026/)).toBeTruthy();
  });

  test("Compartir envía el enlace al sistema; el token no aparece en pantalla", async () => {
    const compartir = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await renderizar();

    await fireEvent.press(screen.getByText("+ Invitar usuario"));
    await fireEvent.press(screen.getByText("Generar invitación"));

    expect(screen.queryByText(new RegExp(TOKEN))).toBeNull();
    expect(screen.queryByText(/token_hash/)).toBeNull();

    await fireEvent.press(screen.getByText("Compartir invitación"));

    expect(compartir).toHaveBeenCalledTimes(1);
    const { message } = compartir.mock.calls[0][0] as { message: string };
    expect(message).toContain("Indiespensables");
    expect(message).toContain(`mibanda://invitacion?token=${TOKEN}`);
    expect(message).not.toContain("auth/callback");
    compartir.mockRestore();
  });

  test("con origen https configurado se comparte el enlace https pulsable", async () => {
    // Dominio .test (RFC 6761): reservado, nunca existe
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = "https://mibanda.test";
    const compartir = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

    try {
      await renderizar();
      await fireEvent.press(screen.getByText("+ Invitar usuario"));
      await fireEvent.press(screen.getByText("Generar invitación"));
      await fireEvent.press(screen.getByText("Compartir invitación"));

      const { message } = compartir.mock.calls[0][0] as { message: string };
      expect(message).toContain(`https://mibanda.test/invitacion?token=${TOKEN}`);
      expect(message).not.toContain("mibanda://");
    } finally {
      delete process.env.EXPO_PUBLIC_INVITE_BASE_URL;
      compartir.mockRestore();
    }
  });

  test("con la configuración del enlace rota no crea la invitación ni comparte mibanda://", async () => {
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = "http://mibanda.test";
    const compartir = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

    try {
      await renderizar();
      await fireEvent.press(screen.getByText("+ Invitar usuario"));
      await fireEvent.press(screen.getByText("Generar invitación"));

      expect(screen.getByText("No se ha podido preparar el enlace de invitación.")).toBeTruthy();
      // Ni se gasta una invitación en la base ni se comparte nada
      expect(mockCrear).not.toHaveBeenCalled();
      expect(compartir).not.toHaveBeenCalled();
      expect(screen.queryByText("Invitación preparada")).toBeNull();
      expect(screen.queryByText(/mibanda\.test|http/)).toBeNull();
    } finally {
      delete process.env.EXPO_PUBLIC_INVITE_BASE_URL;
      compartir.mockRestore();
    }
  });

  test("Cerrar descarta la invitación preparada", async () => {
    await renderizar();

    await fireEvent.press(screen.getByText("+ Invitar usuario"));
    await fireEvent.press(screen.getByText("Generar invitación"));
    await fireEvent.press(screen.getByText("Cerrar"));

    expect(screen.queryByText("Invitación preparada")).toBeNull();
    expect(screen.getByText("+ Invitar usuario")).toBeTruthy();
  });

  test("si la base lo rechaza (no es admin) lo explica sin detalles técnicos", async () => {
    mockCrear.mockRejectedValue(new ErrorRepositorio("sin_permiso"));
    await renderizar();

    await fireEvent.press(screen.getByText("+ Invitar usuario"));
    await fireEvent.press(screen.getByText("Generar invitación"));

    expect(screen.getByText("Solo un administrador de la banda puede invitar.")).toBeTruthy();
    expect(screen.queryByText("Invitación preparada")).toBeNull();
  });
});
