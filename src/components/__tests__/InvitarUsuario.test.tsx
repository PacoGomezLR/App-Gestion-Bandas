import { fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";

import { ErrorRepositorio } from "../../services/supabase/errores";
import { crearInvitacionBanda } from "../../services/supabase/invitaciones";
import { InvitarUsuario } from "../InvitarUsuario";

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

const mockCerrar = jest.fn();

async function renderizar() {
  await render(<InvitarUsuario bandaId="b1" bandaNombre="Indiespensables" onCerrar={mockCerrar} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCrear.mockResolvedValue({ token: TOKEN, expiraEn: "2026-11-10T10:00:00+00:00", rol: "usuario" });
});

describe("InvitarUsuario", () => {
  test("empieza en la elección con Usuario por defecto", async () => {
    await renderizar();


    expect(screen.getByText("Tipo de acceso")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Usuario", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Administrador", checked: false })).toBeTruthy();
    // Se explica qué puede hacer un administrador
    expect(screen.getByText(/crear y editar eventos, gestionar la banda/)).toBeTruthy();
  });

  test("Cancelar no crea ninguna invitación", async () => {
    await renderizar();

    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockCrear).not.toHaveBeenCalled();
    expect(mockCerrar).toHaveBeenCalledTimes(1);
  });

  test("Generar invitación usa la banda actual y el tipo elegido", async () => {
    mockCrear.mockResolvedValue({ token: TOKEN, expiraEn: "2026-11-10T10:00:00+00:00", rol: "admin" });
    await renderizar();

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

  test("Cerrar vuelve atrás sin crear otra invitación", async () => {
    await renderizar();

    await fireEvent.press(screen.getByText("Generar invitación"));
    await fireEvent.press(screen.getByText("Cerrar"));

    expect(mockCerrar).toHaveBeenCalledTimes(1);
    expect(mockCrear).toHaveBeenCalledTimes(1);
  });

  test("si la base lo rechaza (no es admin) lo explica sin detalles técnicos", async () => {
    mockCrear.mockRejectedValue(new ErrorRepositorio("sin_permiso"));
    await renderizar();

    await fireEvent.press(screen.getByText("Generar invitación"));

    expect(screen.getByText("Solo un administrador de la banda puede invitar.")).toBeTruthy();
    expect(screen.queryByText("Invitación preparada")).toBeNull();
  });

  describe("compartir en web", () => {
    // Safari: cerrar la hoja de compartir sin elegir rechaza navigator.share con AbortError
    function abortado() {
      const error = new Error("Share canceled");
      error.name = "AbortError";
      return error;
    }

    async function prepararYCompartir() {
      await renderizar();
      await fireEvent.press(screen.getByText("Generar invitación"));
      await fireEvent.press(screen.getByText("Compartir invitación"));
    }

    test("cancelar no muestra error ni deja la promesa sin capturar", async () => {
      const compartir = jest.spyOn(Share, "share").mockRejectedValue(abortado());
      const sinCapturar = jest.fn();
      process.on("unhandledRejection", sinCapturar);

      await prepararYCompartir();
      await new Promise<void>((resolver) => setImmediate(() => resolver()));

      expect(compartir).toHaveBeenCalledTimes(1);
      expect(sinCapturar).not.toHaveBeenCalled();
      expect(screen.queryByText("No se ha podido compartir la invitación.")).toBeNull();
      // Sigue en la invitación preparada: se puede volver a compartir
      expect(screen.getByText("Compartir invitación")).toBeTruthy();
      process.off("unhandledRejection", sinCapturar);
      compartir.mockRestore();
    });

    test("un fallo real (navegador sin compartir) se explica y se puede reintentar", async () => {
      const compartir = jest
        .spyOn(Share, "share")
        .mockRejectedValueOnce(new Error("Share is not supported in this browser"))
        .mockResolvedValueOnce({ action: Share.sharedAction, activityType: undefined });

      await prepararYCompartir();

      expect(screen.getByText("No se ha podido compartir la invitación.")).toBeTruthy();
      // El detalle técnico no se muestra
      expect(screen.queryByText(/not supported/)).toBeNull();

      await fireEvent.press(screen.getByText("Compartir invitación"));

      expect(compartir).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("No se ha podido compartir la invitación.")).toBeNull();
      compartir.mockRestore();
    });

    test("el mensaje ya no exige tener la app instalada", async () => {
      const compartir = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction, activityType: undefined });

      await prepararYCompartir();

      const { message } = compartir.mock.calls[0][0] as { message: string };
      expect(message).toContain("Abre este enlace en el móvil:");
      expect(message).not.toMatch(/instalada/);
      compartir.mockRestore();
    });
  });
});
