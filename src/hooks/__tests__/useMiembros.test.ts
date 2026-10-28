import { act, renderHook } from "@testing-library/react-native";
import type { Miembro } from "../../types/miembro";
import { useMiembros } from "../useMiembros";

const miembrosDePrueba: Miembro[] = [
  { id: "1", nombre: "Ana" },
  { id: "2", nombre: "Bruno" },
];

function crearPromesaControlada() {
  let resolver!: (valor: boolean) => void;

  const promesa = new Promise<boolean>((resolve) => {
    resolver = resolve;
  });

  return { promesa, resolver };
}

describe("useMiembros", () => {
  test("empieza vacío", async () => {
    const { result } = await renderHook(() => useMiembros());

    expect(result.current.miembros).toEqual([]);
    expect(result.current.nombre).toBe("");
    expect(result.current.miembroEditandoId).toBeNull();
    expect(result.current.procesando).toBe(false);
  });

  test("crea un miembro", async () => {
    const { result } = await renderHook(() => useMiembros());

    await act(() => {
      result.current.setNombre("  Ana  ");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarMiembro();
    });

    expect(guardado).toBe(true);
    expect(result.current.miembros).toHaveLength(1);
    expect(result.current.miembros[0].nombre).toBe("Ana");
    expect(result.current.nombre).toBe("");
    expect(result.current.error).toBe("");
  });

  test("valida que el nombre es obligatorio", async () => {
    const persistirMiembro = jest.fn(async (_miembro: Miembro) => true);
    const { result } = await renderHook(() =>
      useMiembros({ persistirMiembro })
    );

    await act(() => {
      result.current.setNombre("   ");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarMiembro();
    });

    expect(guardado).toBe(false);
    expect(result.current.error).toBe("El nombre es obligatorio");
    expect(result.current.miembros).toEqual([]);
    expect(persistirMiembro).not.toHaveBeenCalled();
  });

  test("edita un miembro conservando su id", async () => {
    const { result } = await renderHook(() =>
      useMiembros({ datosIniciales: miembrosDePrueba })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.miembros[0]);
    });

    expect(result.current.miembroEditandoId).toBe("1");
    expect(result.current.nombre).toBe("Ana");

    await act(() => {
      result.current.setNombre("Ana López");
    });

    await act(async () => {
      await result.current.guardarMiembro();
    });

    expect(result.current.miembros).toEqual([
      { id: "1", nombre: "Ana López" },
      { id: "2", nombre: "Bruno" },
    ]);
    expect(result.current.miembroEditandoId).toBeNull();
    expect(result.current.nombre).toBe("");
  });

  test("elimina un miembro y sale de edición si era el que se editaba", async () => {
    const { result } = await renderHook(() =>
      useMiembros({ datosIniciales: miembrosDePrueba })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.miembros[0]);
    });

    let eliminado: boolean | undefined;

    await act(async () => {
      eliminado = await result.current.eliminarMiembro("1");
    });

    expect(eliminado).toBe(true);
    expect(result.current.miembros).toEqual([{ id: "2", nombre: "Bruno" }]);
    expect(result.current.miembroEditandoId).toBeNull();
    expect(result.current.nombre).toBe("");
  });

  test("cancelar la edición no modifica los datos", async () => {
    const { result } = await renderHook(() =>
      useMiembros({ datosIniciales: miembrosDePrueba })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.miembros[0]);
    });

    await act(() => {
      result.current.setNombre("Ana modificada");
    });

    await act(() => {
      result.current.cancelarEdicion();
    });

    expect(result.current.miembros).toEqual(miembrosDePrueba);
    expect(result.current.miembroEditandoId).toBeNull();
    expect(result.current.nombre).toBe("");
    expect(result.current.error).toBe("");
  });

  test("reemplazarMiembros sustituye la lista sin tocar el formulario", async () => {
    const { result } = await renderHook(() => useMiembros());

    await act(() => {
      result.current.setNombre("Borrador");
    });

    await act(() => {
      result.current.reemplazarMiembros(miembrosDePrueba);
    });

    expect(result.current.miembros).toEqual(miembrosDePrueba);
    expect(result.current.miembros).not.toBe(miembrosDePrueba);
    expect(result.current.nombre).toBe("Borrador");
  });

  test("persiste exactamente el miembro que se guarda", async () => {
    const persistirMiembro = jest.fn(async (_miembro: Miembro) => true);
    const { result } = await renderHook(() =>
      useMiembros({ persistirMiembro })
    );

    await act(() => {
      result.current.setNombre("Carla");
    });

    await act(async () => {
      await result.current.guardarMiembro();
    });

    expect(persistirMiembro).toHaveBeenCalledTimes(1);
    expect(persistirMiembro.mock.calls[0][0]).toBe(result.current.miembros[0]);
    expect(result.current.miembros[0].nombre).toBe("Carla");
  });

  test("no guarda localmente si falla la persistencia", async () => {
    const { result } = await renderHook(() =>
      useMiembros({
        datosIniciales: miembrosDePrueba,
        persistirMiembro: async () => false,
      })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.miembros[1]);
    });

    await act(() => {
      result.current.setNombre("Bruno Díaz");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarMiembro();
    });

    expect(guardado).toBe(false);
    expect(result.current.miembros).toEqual(miembrosDePrueba);
    expect(result.current.nombre).toBe("Bruno Díaz");
    expect(result.current.miembroEditandoId).toBe("2");
    expect(result.current.procesando).toBe(false);
  });

  test("no elimina localmente si falla la persistencia", async () => {
    const { result } = await renderHook(() =>
      useMiembros({
        datosIniciales: miembrosDePrueba,
        eliminarMiembroPersistido: async () => false,
      })
    );

    let eliminado: boolean | undefined;

    await act(async () => {
      eliminado = await result.current.eliminarMiembro("1");
    });

    expect(eliminado).toBe(false);
    expect(result.current.miembros).toEqual(miembrosDePrueba);
    expect(result.current.procesando).toBe(false);
  });

  test("impide guardar dos veces mientras una escritura está pendiente", async () => {
    const { promesa, resolver } = crearPromesaControlada();
    const persistirMiembro = jest.fn((_miembro: Miembro) => promesa);

    const { result } = await renderHook(() =>
      useMiembros({ persistirMiembro })
    );

    await act(() => {
      result.current.setNombre("Ana");
    });

    let primerGuardado: Promise<boolean> | undefined;

    await act(async () => {
      primerGuardado = result.current.guardarMiembro();
    });

    expect(result.current.procesando).toBe(true);

    let segundoGuardado: boolean | undefined;

    await act(async () => {
      segundoGuardado = await result.current.guardarMiembro();
    });

    expect(segundoGuardado).toBe(false);
    expect(persistirMiembro).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolver(true);
      await primerGuardado;
    });

    expect(result.current.miembros).toHaveLength(1);
    expect(result.current.procesando).toBe(false);
  });

  test("impide eliminar dos veces mientras una escritura está pendiente", async () => {
    const { promesa, resolver } = crearPromesaControlada();
    const eliminarMiembroPersistido = jest.fn((_id: string) => promesa);

    const { result } = await renderHook(() =>
      useMiembros({ datosIniciales: miembrosDePrueba, eliminarMiembroPersistido })
    );

    let primeraEliminacion: Promise<boolean> | undefined;

    await act(async () => {
      primeraEliminacion = result.current.eliminarMiembro("1");
    });

    expect(result.current.procesando).toBe(true);

    let segundaEliminacion: boolean | undefined;

    await act(async () => {
      segundaEliminacion = await result.current.eliminarMiembro("2");
    });

    expect(segundaEliminacion).toBe(false);
    expect(eliminarMiembroPersistido).toHaveBeenCalledTimes(1);
    expect(eliminarMiembroPersistido).toHaveBeenCalledWith("1");

    await act(async () => {
      resolver(true);
      await primeraEliminacion;
    });

    expect(result.current.miembros).toEqual([{ id: "2", nombre: "Bruno" }]);
    expect(result.current.procesando).toBe(false);
  });

  test("libera el bloqueo aunque la persistencia lance un error", async () => {
    const persistirMiembro = jest
      .fn<Promise<boolean>, [Miembro]>()
      .mockRejectedValueOnce(new Error("fallo inesperado"))
      .mockResolvedValueOnce(true);

    const { result } = await renderHook(() =>
      useMiembros({ persistirMiembro })
    );

    await act(() => {
      result.current.setNombre("Ana");
    });

    await act(async () => {
      await expect(result.current.guardarMiembro()).rejects.toThrow(
        "fallo inesperado"
      );
    });

    expect(result.current.procesando).toBe(false);

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarMiembro();
    });

    expect(guardado).toBe(true);
    expect(result.current.procesando).toBe(false);
  });

  test("no permite cambiar ni cancelar la edición durante una escritura", async () => {
    const { promesa, resolver } = crearPromesaControlada();

    const { result } = await renderHook(() =>
      useMiembros({
        datosIniciales: miembrosDePrueba,
        persistirMiembro: () => promesa,
      })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.miembros[0]);
    });

    let guardado: Promise<boolean> | undefined;

    await act(async () => {
      guardado = result.current.guardarMiembro();
    });

    await act(() => {
      result.current.prepararEdicion(result.current.miembros[1]);
      result.current.cancelarEdicion();
    });

    expect(result.current.miembroEditandoId).toBe("1");
    expect(result.current.nombre).toBe("Ana");

    await act(async () => {
      resolver(true);
      await guardado;
    });

    expect(result.current.miembroEditandoId).toBeNull();
    expect(result.current.procesando).toBe(false);
  });
});
