import { limpiarUrlAuth as limpiarEnApp } from "../limpiarUrlAuth";
import { limpiarUrlAuth as limpiarEnWeb } from "../limpiarUrlAuth.web";

// En Jest no hay navegador: se simulan location e history el tiempo justo
interface VentanaSimulada {
  location?: { pathname: string; search: string; hash: string };
  history?: { state: unknown; replaceState: jest.Mock };
}

const ventana = window as unknown as VentanaSimulada;
const original = { location: ventana.location, history: ventana.history };

function simular(pathname: string, search: string, hash: string) {
  const replaceState = jest.fn();
  Object.defineProperty(ventana, "location", { value: { pathname, search, hash }, configurable: true });
  Object.defineProperty(ventana, "history", { value: { state: { clave: 1 }, replaceState }, configurable: true });
  return replaceState;
}

afterEach(() => {
  Object.defineProperty(ventana, "location", { value: original.location, configurable: true });
  Object.defineProperty(ventana, "history", { value: original.history, configurable: true });
});

describe("limpiarUrlAuth (web)", () => {
  test("quita los tokens del fragmento y deja la ruta", () => {
    const replaceState = simular("/auth/callback", "", "#access_token=a&refresh_token=b&type=recovery");

    limpiarEnWeb();

    expect(replaceState).toHaveBeenCalledWith({ clave: 1 }, "", "/auth/callback");
  });

  test("también el ?code= de la query", () => {
    const replaceState = simular("/auth/callback", "?code=abc", "");

    limpiarEnWeb();

    expect(replaceState).toHaveBeenCalledWith({ clave: 1 }, "", "/auth/callback");
  });

  test("sin nada que limpiar no toca el historial", () => {
    const replaceState = simular("/", "", "");

    limpiarEnWeb();

    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe("limpiarUrlAuth (app)", () => {
  test("no hace nada", () => {
    expect(limpiarEnApp()).toBeUndefined();
  });
});
