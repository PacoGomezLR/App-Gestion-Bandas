import { act, renderHook } from "@testing-library/react-native";
import { useTecnicos } from "../useTecnicos";

describe("useTecnicos", () => {
  test("crea un técnico", async () => {
    const { result } = await renderHook(() => useTecnicos());

    expect(result.current.tecnicos).toHaveLength(2);

    await act(() => {
      result.current.setNombre("Lucía");
    });

    await act(() => {
      result.current.guardarTecnico();
    });

    expect(result.current.tecnicos).toHaveLength(3);
    expect(result.current.tecnicos[2].nombre).toBe("Lucía");
    expect(result.current.nombre).toBe("");
    expect(result.current.error).toBe("");
  });

  test("no crea un técnico sin nombre", async () => {
    const { result } = await renderHook(() => useTecnicos());

    await act(() => {
      result.current.guardarTecnico();
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

    await act(() => {
      result.current.guardarTecnico();
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

    await act(() => {
      result.current.eliminarTecnico("1");
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

    await act(() => {
      result.current.eliminarTecnico("1");
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

    await act(() => {
      result.current.eliminarTecnico("2");
    });

    expect(result.current.tecnicos).toEqual([{ id: "1", nombre: "Carlos" }]);
    expect(result.current.tecnicoEditandoId).toBe("1");
    expect(result.current.nombre).toBe("Carlos");
  });
});
