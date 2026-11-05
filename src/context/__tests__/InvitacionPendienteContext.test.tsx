import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Button, Text } from "react-native";

import { InvitacionPendienteProvider, useInvitacionPendiente } from "../InvitacionPendienteContext";

type ListenerUrl = (evento: { url: string }) => void;

let mockListenerUrl: ListenerUrl | null = null;
const mockGetInitialURL = jest.fn(async (): Promise<string | null> => null);
const mockRemove = jest.fn();

jest.mock("expo-linking", () => ({
  getInitialURL: () => mockGetInitialURL(),
  addEventListener: (_tipo: "url", listener: ListenerUrl) => {
    mockListenerUrl = listener;
    return { remove: mockRemove };
  },
}));

// Valores de prueba con el formato del token (no son tokens reales)
const TOKEN = "0123456789abcdef".repeat(4);
const OTRO = "fedcba9876543210".repeat(4);

function Consumidor() {
  const { tokenPendiente, descartarInvitacion } = useInvitacionPendiente();

  return (
    <>
      <Text testID="pendiente">{tokenPendiente === null ? "ninguna" : tokenPendiente}</Text>
      <Button title="Descartar" onPress={descartarInvitacion} />
    </>
  );
}

async function renderizar() {
  const resultado = await render(
    <InvitacionPendienteProvider>
      <Consumidor />
    </InvitacionPendienteProvider>
  );

  return resultado;
}

function pendiente() {
  return screen.getByTestId("pendiente").props.children;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListenerUrl = null;
  mockGetInitialURL.mockResolvedValue(null);
});

describe("InvitacionPendienteContext", () => {
  test("con la app cerrada recuerda la invitación de la URL inicial", async () => {
    mockGetInitialURL.mockResolvedValue(`mibanda://invitacion?token=${TOKEN}`);

    await renderizar();

    expect(await screen.findByText(TOKEN)).toBeTruthy();
  });

  test("recuerda también la invitación de un enlace https del origen configurado", async () => {
    // Dominio .test (RFC 6761): reservado, nunca existe
    process.env.EXPO_PUBLIC_INVITE_BASE_URL = "https://mibanda.test";
    mockGetInitialURL.mockResolvedValue(`https://mibanda.test/invitacion?token=${TOKEN}`);

    try {
      await renderizar();

      expect(await screen.findByText(TOKEN)).toBeTruthy();
    } finally {
      delete process.env.EXPO_PUBLIC_INVITE_BASE_URL;
    }
  });

  test("con la app abierta recuerda la invitación del enlace recibido", async () => {
    await renderizar();
    expect(pendiente()).toBe("ninguna");

    await act(async () => {
      mockListenerUrl?.({ url: `mibanda://invitacion?token=${OTRO}` });
    });

    expect(pendiente()).toBe(OTRO);
  });

  test("el enlace de confirmación del correo no la borra ni la sustituye", async () => {
    mockGetInitialURL.mockResolvedValue(`mibanda://invitacion?token=${TOKEN}`);
    await renderizar();
    await screen.findByText(TOKEN);

    await act(async () => {
      mockListenerUrl?.({ url: "mibanda://auth/callback?code=abc" });
    });

    expect(pendiente()).toBe(TOKEN);
  });

  test("ignora enlaces con un token mal formado", async () => {
    await renderizar();

    await act(async () => {
      mockListenerUrl?.({ url: "mibanda://invitacion?token=corto" });
    });

    expect(pendiente()).toBe("ninguna");
  });

  test("descartar la quita de la memoria", async () => {
    mockGetInitialURL.mockResolvedValue(`mibanda://invitacion?token=${TOKEN}`);
    await renderizar();
    await screen.findByText(TOKEN);

    await fireEvent.press(screen.getByText("Descartar"));

    expect(pendiente()).toBe("ninguna");
  });

  test("nunca la guarda en disco ni la registra: solo memoria", () => {
    // Revisión del código del contexto (ruta relativa a la raíz del proyecto)
    const fs = jest.requireActual<{ readFileSync: (ruta: string, codificacion: "utf8") => string }>("fs");
    const codigo = fs.readFileSync("src/context/InvitacionPendienteContext.tsx", "utf8");

    expect(codigo).not.toMatch(/localStorage|AsyncStorage|SecureStore|setItem|sqlite|console\./i);
  });

  test("limpia el listener al desmontar", async () => {
    const { unmount } = await renderizar();

    await unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
