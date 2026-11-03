import { renderHook } from "@testing-library/react-native";
import { BackHandler, Platform } from "react-native";

import { useAtrasAndroid } from "../useAtrasAndroid";

describe("useAtrasAndroid", () => {
  let registrar: jest.SpyInstance;

  beforeEach(() => {
    registrar = jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation(() => ({ remove: jest.fn() }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each(["ios", "web"] as const)("en %s no registra nada", async (sistema) => {
    jest.replaceProperty(Platform, "OS", sistema);

    await renderHook(() => useAtrasAndroid(() => {}));

    expect(registrar).not.toHaveBeenCalled();
  });

  test("en Android sin acción no intercepta", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    await renderHook(() => useAtrasAndroid(null));

    expect(registrar).not.toHaveBeenCalled();
  });

  test("en Android ejecuta la acción más reciente y consume el Atrás", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const primera = jest.fn();
    const segunda = jest.fn();

    const { rerender } = await renderHook(
      ({ accion }: { accion: () => void }) => useAtrasAndroid(accion),
      { initialProps: { accion: primera } }
    );
    await rerender({ accion: segunda });

    // Una sola suscripción aunque cambie la acción
    expect(registrar).toHaveBeenCalledTimes(1);
    const manejador = registrar.mock.calls[0][1] as () => boolean;

    expect(manejador()).toBe(true);
    expect(segunda).toHaveBeenCalledTimes(1);
    expect(primera).not.toHaveBeenCalled();
  });

  test("deja de interceptar al quitar la acción", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const remove = jest.fn();
    registrar.mockImplementation(() => ({ remove }));

    const { rerender } = await renderHook(
      ({ accion }: { accion: (() => void) | null }) => useAtrasAndroid(accion),
      { initialProps: { accion: jest.fn() as (() => void) | null } }
    );
    await rerender({ accion: null });

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
