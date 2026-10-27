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
});
