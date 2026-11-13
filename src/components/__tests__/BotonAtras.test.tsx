import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { useAuthContext } from "../../context/AuthContext";
import { BotonAtras } from "../BotonAtras";
import { BotonCerrarSesion } from "../BotonCerrarSesion";

// constants/theme importa global.css, que Jest no puede interpretar
jest.mock("../../global.css", () => ({}));

jest.mock("../../context/AuthContext", () => ({ useAuthContext: jest.fn() }));

// Router simulado: se ve qué navegación pide el botón
let mockPuedeVolver = true;
const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => mockPuedeVolver),
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  dismissTo: jest.fn(),
};
// Getter: la factoría se ejecuta antes de que exista mockRouter
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useRouter: () => mockRouter,
  useCanGoBack: () => mockPuedeVolver,
}));

const fs = jest.requireActual<{ readFileSync: (ruta: string, codificacion: "utf8") => string }>("fs");

function simularAuth(cerrarSesion: () => Promise<void> = jest.fn(async () => undefined)) {
  jest.mocked(useAuthContext).mockReturnValue({
    session: null,
    usuario: null,
    perfil: { id: "paco", email: "paco@email.com", nombreVisible: "Paco Gómez" },
    cargando: false,
    error: "",
    iniciarSesion: jest.fn(),
    correoSinVerificar: null,
    reenviarVerificacion: jest.fn(),
    recuperandoContrasena: false,
    solicitarRecuperacion: jest.fn(),
    actualizarContrasena: jest.fn(),
    finalizarRecuperacion: jest.fn(),
    crearCuenta: jest.fn(),
    completarNombreVisible: jest.fn(),
    cerrarSesion,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPuedeVolver = true;
});

describe("BotonAtras", () => {
  test("con historial aparece «‹ Atrás» como botón accesible", async () => {
    await render(<BotonAtras />);

    expect(screen.getByRole("button", { name: "Atrás" })).toBeTruthy();
    expect(screen.getByText("‹ Atrás")).toBeTruthy();
    expect(screen.queryByText(/Volver/)).toBeNull();
  });

  test("sin historial no aparece", async () => {
    mockPuedeVolver = false;

    await render(<BotonAtras />);

    expect(screen.queryByRole("button", { name: "Atrás" })).toBeNull();
    expect(screen.queryByText("‹ Atrás")).toBeNull();
  });

  test("pulsarlo llama una vez a router.back y a ninguna otra navegación", async () => {
    await render(<BotonAtras />);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Atrás" }));
    });

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  test("área táctil de 44 y foco visible", async () => {
    await render(<BotonAtras />);
    const boton = screen.getByRole("button", { name: "Atrás" });
    const estilo = StyleSheet.flatten(boton.props.style) as { minHeight?: number; borderColor?: string };

    expect(estilo.minHeight).toBeGreaterThanOrEqual(44);
    expect(estilo.borderColor).toBe("transparent");

    await act(async () => {
      fireEvent(boton, "focus");
    });

    expect(StyleSheet.flatten(screen.getByRole("button", { name: "Atrás" }).props.style).borderColor).not.toBe(
      "transparent"
    );
  });

  test("sin rutas fijas ni historial del navegador a mano", () => {
    const codigo = fs.readFileSync("src/components/BotonAtras.tsx", "utf8").replace(/\/\/.*$/gm, "");

    expect(codigo).toContain("router.back()");
    expect(codigo).toContain("useCanGoBack()");
    expect(codigo).not.toMatch(/replace\(|push\(|navigate\(|href=|["']\/[a-z]*["']|window\.history/);
  });
});

describe("Cerrar sesión con «‹ Atrás» a la izquierda", () => {
  test("los dos en la misma fila: Atrás a la izquierda y Cerrar sesión a la derecha", async () => {
    simularAuth();

    await render(<BotonCerrarSesion izquierda={<BotonAtras />} />);

    const atras = screen.getByRole("button", { name: "Atrás" });
    const cerrar = screen.getByRole("button", { name: "Cerrar sesión" });
    const fila = atras.parent?.parent;

    expect(fila).toBeTruthy();
    expect(StyleSheet.flatten(fila?.props.style)).toMatchObject({
      flexDirection: "row",
      justifyContent: "space-between",
    });
    expect(StyleSheet.flatten(cerrar.parent?.props.style)).toMatchObject({ alignItems: "flex-end" });
  });

  test("Cerrar sesión sigue funcionando y no navega", async () => {
    const cerrarSesion = jest.fn(async () => undefined);
    simularAuth(cerrarSesion);

    await render(<BotonCerrarSesion izquierda={<BotonAtras />} />);
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    });

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  test("sin historial, Cerrar sesión se queda a la derecha y sin hueco visible", async () => {
    mockPuedeVolver = false;
    simularAuth();

    await render(<BotonCerrarSesion izquierda={<BotonAtras />} />);

    expect(screen.queryByText("‹ Atrás")).toBeNull();
    expect(StyleSheet.flatten(screen.getByRole("button", { name: "Cerrar sesión" }).parent?.props.style)).toMatchObject(
      { alignItems: "flex-end" }
    );
  });

  test("sin acción a la izquierda se pinta como siempre (sin fila)", async () => {
    simularAuth();

    await render(<BotonCerrarSesion />);

    const cerrar = screen.getByRole("button", { name: "Cerrar sesión" });

    // El contenedor de siempre: la columna alineada a la derecha, sin fila intermedia
    expect(StyleSheet.flatten(cerrar.parent?.props.style)).toMatchObject({ alignItems: "flex-end", paddingTop: 8 });
    expect(screen.queryByText("‹ Atrás")).toBeNull();
  });
});

describe("dónde se usa", () => {
  test("solo en la vista principal de Repertorio y de Banda", () => {
    const usos = [
      "src/app/index.tsx",
      "src/app/banda.tsx",
      "src/components/PantallaRepertorio.tsx",
      "src/components/PantallaFinanzas.tsx",
      "src/components/PantallaTecnicos.tsx",
      "src/components/PantallaLogoBanda.tsx",
    ].map((ruta) => [ruta, (fs.readFileSync(ruta, "utf8").match(/<BotonAtras \/>/g) ?? []).length]);

    expect(usos).toEqual([
      ["src/app/index.tsx", 0],
      ["src/app/banda.tsx", 1],
      ["src/components/PantallaRepertorio.tsx", 1],
      ["src/components/PantallaFinanzas.tsx", 0],
      ["src/components/PantallaTecnicos.tsx", 0],
      ["src/components/PantallaLogoBanda.tsx", 0],
    ]);
  });

  test("Android: las pestañas nativas no cambian su comportamiento de Atrás", () => {
    const tabs = fs.readFileSync("src/components/app-tabs.tsx", "utf8");

    // backBehavior por defecto: el Atrás físico y router.back llevan al mismo sitio
    expect(tabs).not.toMatch(/backBehavior/);
  });
});
