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
      useTecnicos({ persistirTecnico: async () => false })
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
    const persistirTecnico = jest.fn(async (_tecnico: Tecnico) => true);

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
});
