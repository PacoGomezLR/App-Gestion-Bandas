import { act, renderHook } from "@testing-library/react-native";
import type { Tecnico } from "../../types/tecnico";
import { useTecnicos } from "../useTecnicos";

describe("useTecnicos", () => {
  test("crea un técnico", async () => {
    const { result } = await renderHook(() => useTecnicos());

    expect(result.current.tecnicos).toHaveLength(2);

    await act(() => {
      result.current.setNombre("Lucía");
    });

    await act(async () => {
      await result.current.guardarTecnico();
    });

    expect(result.current.tecnicos).toHaveLength(3);
    expect(result.current.tecnicos[2].nombre).toBe("Lucía");
    expect(result.current.nombre).toBe("");
    expect(result.current.error).toBe("");
  });

  test("no crea un técnico sin nombre", async () => {
    const { result } = await renderHook(() => useTecnicos());

    await act(async () => {
      await result.current.guardarTecnico();
    });

    expect(result.current.tecnicos).toHaveLength(2);
    expect(result.current.error).toBe("El nombre es obligatorio");
  });

  test("edita un técnico existente", async () => {
    const { result } = await renderHook(() => useTecnicos());

    const segundoTecnicoOriginal = result.current.tecnicos[1];

    await act(() => {
      result.current.prepararEdicion(result.current.tecnicos[0]);
    });

    expect(result.current.tecnicoEditandoId).toBe("1");
    expect(result.current.nombre).toBe("Carlos");

    await act(() => {
      result.current.setNombre("Carlos García");
    });

    await act(async () => {
      await result.current.guardarTecnico();
    });

    expect(result.current.tecnicos).toHaveLength(2);
    expect(result.current.tecnicos[0]).toEqual({
      id: "1",
      nombre: "Carlos García",
    });
    expect(result.current.tecnicos[1]).toEqual(segundoTecnicoOriginal);
    expect(result.current.tecnicoEditandoId).toBeNull();
    expect(result.current.nombre).toBe("");
    expect(result.current.error).toBe("");
  });

  test("elimina un técnico existente", async () => {
    const { result } = await renderHook(() => useTecnicos());

    const segundoTecnicoOriginal = result.current.tecnicos[1];

    await act(async () => {
      await result.current.eliminarTecnico("1");
    });

    expect(result.current.tecnicos).toHaveLength(1);
    expect(
      result.current.tecnicos.some((tecnico) => tecnico.id === "1")
    ).toBe(false);
    expect(result.current.tecnicos[0]).toEqual(segundoTecnicoOriginal);
  });

  test("sale del modo edición si elimina el técnico que estaba editando", async () => {
    const { result } = await renderHook(() => useTecnicos());

    await act(() => {
      result.current.prepararEdicion(result.current.tecnicos[0]);
    });

    expect(result.current.tecnicoEditandoId).toBe("1");
    expect(result.current.nombre).toBe("Carlos");

    await act(async () => {
      await result.current.eliminarTecnico("1");
    });

    expect(result.current.tecnicos).toEqual([{ id: "2", nombre: "Miguel" }]);
    expect(result.current.tecnicoEditandoId).toBeNull();
    expect(result.current.nombre).toBe("");
    expect(result.current.error).toBe("");
  });

  test("mantiene la edición si elimina otro técnico", async () => {
    const { result } = await renderHook(() => useTecnicos());

    await act(() => {
      result.current.prepararEdicion(result.current.tecnicos[0]);
    });

    await act(async () => {
      await result.current.eliminarTecnico("2");
    });

    expect(result.current.tecnicos).toEqual([{ id: "1", nombre: "Carlos" }]);
    expect(result.current.tecnicoEditandoId).toBe("1");
    expect(result.current.nombre).toBe("Carlos");
  });

  test("cancela la edición sin modificar los técnicos", async () => {
    const { result } = await renderHook(() => useTecnicos());

    const tecnicosOriginales = [...result.current.tecnicos];

    await act(() => {
      result.current.prepararEdicion(result.current.tecnicos[0]);
    });

    expect(result.current.tecnicoEditandoId).toBe("1");

    await act(() => {
      result.current.setNombre("Carlos modificado");
    });

    await act(() => {
      result.current.cancelarEdicion();
    });

    expect(result.current.tecnicos).toEqual(tecnicosOriginales);
    expect(result.current.tecnicos[0].nombre).toBe("Carlos");
    expect(result.current.tecnicos[1]).toEqual(tecnicosOriginales[1]);
    expect(result.current.tecnicoEditandoId).toBeNull();
    expect(result.current.nombre).toBe("");
    expect(result.current.error).toBe("");
  });

  test("carga una lista externa de técnicos", async () => {
    const { result } = await renderHook(() =>
      useTecnicos({ datosIniciales: [] })
    );

    expect(result.current.tecnicos).toEqual([]);

    const tecnicosExternos: Tecnico[] = [{ id: "7", nombre: "Lucía" }];

    await act(() => {
      result.current.setNombre("Borrador en el formulario");
    });

    await act(() => {
      result.current.reemplazarTecnicos(tecnicosExternos);
    });

    expect(result.current.tecnicos).toEqual(tecnicosExternos);
    expect(result.current.tecnicos).not.toBe(tecnicosExternos);
    expect(result.current.nombre).toBe("Borrador en el formulario");
  });

  test("no guarda localmente si falla la persistencia", async () => {
    const { result } = await renderHook(() =>
      useTecnicos({ persistirTecnico: async () => null })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.tecnicos[0]);
    });

    await act(() => {
      result.current.setNombre("Carlos García");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarTecnico();
    });

    expect(guardado).toBe(false);
    expect(result.current.tecnicos).toEqual([
      { id: "1", nombre: "Carlos" },
      { id: "2", nombre: "Miguel" },
    ]);
    expect(result.current.nombre).toBe("Carlos García");
    expect(result.current.tecnicoEditandoId).toBe("1");
  });

  test("no elimina localmente si falla la persistencia", async () => {
    const { result } = await renderHook(() =>
      useTecnicos({ eliminarTecnicoPersistido: async () => false })
    );

    let eliminado: boolean | undefined;

    await act(async () => {
      eliminado = await result.current.eliminarTecnico("1");
    });

    expect(eliminado).toBe(false);
    expect(result.current.tecnicos).toHaveLength(2);
    expect(
      result.current.tecnicos.some((tecnico) => tecnico.id === "1")
    ).toBe(true);
  });

  test("persiste exactamente el técnico que se guarda", async () => {
    const persistirTecnico = jest.fn(async (tecnico: Tecnico) => tecnico);

    const { result } = await renderHook(() =>
      useTecnicos({ persistirTecnico })
    );

    await act(() => {
      result.current.setNombre("  Lucía  ");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarTecnico();
    });

    expect(guardado).toBe(true);
    expect(persistirTecnico).toHaveBeenCalledTimes(1);
    expect(persistirTecnico.mock.calls[0][0]).toBe(result.current.tecnicos[2]);
    expect(result.current.tecnicos[2].nombre).toBe("Lucía");
  });

  test("impide guardar dos veces mientras una escritura está pendiente", async () => {
    let resolverPersistencia!: (valor: boolean) => void;

    const persistenciaPendiente = new Promise<boolean>((resolve) => {
      resolverPersistencia = resolve;
    });

    const persistirTecnico = jest.fn((tecnico: Tecnico) =>
      persistenciaPendiente.then((ok) => (ok ? tecnico : null))
    );

    const { result } = await renderHook(() =>
      useTecnicos({ persistirTecnico })
    );

    await act(() => {
      result.current.setNombre("Lucía");
    });

    let primerGuardado: Promise<boolean> | undefined;

    await act(async () => {
      primerGuardado = result.current.guardarTecnico();
    });

    expect(result.current.procesando).toBe(true);

    let segundoGuardado: boolean | undefined;

    await act(async () => {
      segundoGuardado = await result.current.guardarTecnico();
    });

    expect(segundoGuardado).toBe(false);
    expect(persistirTecnico).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolverPersistencia(true);
      await primerGuardado;
    });

    expect(result.current.tecnicos).toHaveLength(3);
    expect(
      result.current.tecnicos.filter((tecnico) => tecnico.nombre === "Lucía")
    ).toHaveLength(1);
    expect(result.current.procesando).toBe(false);
  });

  test("impide eliminar dos veces mientras una escritura está pendiente", async () => {
    let resolverEliminacion!: (valor: boolean) => void;

    const eliminacionPendiente = new Promise<boolean>((resolve) => {
      resolverEliminacion = resolve;
    });

    const eliminarTecnicoPersistido = jest.fn(
      (_id: string) => eliminacionPendiente
    );

    const { result } = await renderHook(() =>
      useTecnicos({ eliminarTecnicoPersistido })
    );

    let primeraEliminacion: Promise<boolean> | undefined;

    await act(async () => {
      primeraEliminacion = result.current.eliminarTecnico("1");
    });

    expect(result.current.procesando).toBe(true);

    let segundaEliminacion: boolean | undefined;

    await act(async () => {
      segundaEliminacion = await result.current.eliminarTecnico("2");
    });

    expect(segundaEliminacion).toBe(false);
    expect(eliminarTecnicoPersistido).toHaveBeenCalledTimes(1);
    expect(eliminarTecnicoPersistido).toHaveBeenCalledWith("1");

    await act(async () => {
      resolverEliminacion(true);
      await primeraEliminacion;
    });

    expect(result.current.tecnicos).toEqual([{ id: "2", nombre: "Miguel" }]);
    expect(result.current.procesando).toBe(false);
  });

  test("no permite cambiar ni cancelar la edición durante una escritura", async () => {
    let resolverPersistencia!: (valor: boolean) => void;

    const persistenciaPendiente = new Promise<boolean>((resolve) => {
      resolverPersistencia = resolve;
    });

    const { result } = await renderHook(() =>
      useTecnicos({ persistirTecnico: (tecnico: Tecnico) =>
          persistenciaPendiente.then((ok) => (ok ? tecnico : null)) })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.tecnicos[0]);
    });

    let guardado: Promise<boolean> | undefined;

    await act(async () => {
      guardado = result.current.guardarTecnico();
    });

    await act(() => {
      result.current.prepararEdicion(result.current.tecnicos[1]);
      result.current.cancelarEdicion();
    });

    expect(result.current.tecnicoEditandoId).toBe("1");
    expect(result.current.nombre).toBe("Carlos");

    await act(async () => {
      resolverPersistencia(true);
      await guardado;
    });

    expect(result.current.tecnicoEditandoId).toBeNull();
    expect(result.current.procesando).toBe(false);
  });

  test("libera el bloqueo aunque la persistencia falle o lance un error", async () => {
    const persistirTecnico = jest
      .fn<Promise<Tecnico | null>, [Tecnico, boolean]>()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("fallo inesperado"))
      .mockImplementationOnce(async (tecnico) => tecnico);

    const { result } = await renderHook(() =>
      useTecnicos({ persistirTecnico })
    );

    await act(() => {
      result.current.setNombre("Lucía");
    });

    let resultado: boolean | undefined;

    await act(async () => {
      resultado = await result.current.guardarTecnico();
    });

    expect(resultado).toBe(false);
    expect(result.current.procesando).toBe(false);

    await act(async () => {
      await expect(result.current.guardarTecnico()).rejects.toThrow(
        "fallo inesperado"
      );
    });

    expect(result.current.procesando).toBe(false);

    await act(async () => {
      resultado = await result.current.guardarTecnico();
    });

    expect(resultado).toBe(true);
    expect(persistirTecnico).toHaveBeenCalledTimes(3);
    expect(result.current.tecnicos).toHaveLength(3);
    expect(result.current.procesando).toBe(false);
  });

  test("guarda en el estado el registro devuelto por la persistencia, con su id definitivo", async () => {
    const persistirTecnico = jest.fn(async (tecnico: Tecnico, esNuevo: boolean) =>
      esNuevo ? { ...tecnico, id: "uuid-supabase" } : tecnico
    );

    const { result } = await renderHook(() =>
      useTecnicos({ datosIniciales: [], persistirTecnico })
    );

    await act(() => {
      result.current.setNombre("Lucía");
    });

    await act(async () => {
      await result.current.guardarTecnico();
    });

    expect(persistirTecnico.mock.calls[0][1]).toBe(true);
    expect(result.current.tecnicos).toEqual([{ id: "uuid-supabase", nombre: "Lucía" }]);
  });
});
