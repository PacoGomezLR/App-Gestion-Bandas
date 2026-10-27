import { act, renderHook } from "@testing-library/react-native";
import { useEventos } from "../useEventos";

describe("useEventos", () => {
  test("crea un evento", () => {
    const { result } = renderHook(() => useEventos());

    expect(result.current.eventos).toHaveLength(3);

    act(() => {
      result.current.setTitulo("Concierto en Sevilla");
      result.current.setFecha("2026-11-15");
    });

    act(() => {
      result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(4);

    expect(result.current.eventos[3]).toMatchObject({
      titulo: "Concierto en Sevilla",
      tipo: "concierto",
      fecha: "2026-11-15",
      estado: "pendiente",
    });
  });

  test("no crea un evento si faltan título o fecha", () => {
    const { result } = renderHook(() => useEventos());

    act(() => {
      result.current.setTitulo("Concierto sin fecha");
    });

    act(() => {
      result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(3);
    expect(result.current.error).toBe(
      "El título y la fecha son obligatorios"
    );
  });

  test("edita un evento existente", () => {
    const { result } = renderHook(() => useEventos());

    const primerEventoOriginal = result.current.eventos[0];
    const eventoOriginal = result.current.eventos[1];
    const tercerEventoOriginal = result.current.eventos[2];

    act(() => {
      result.current.prepararEdicion(eventoOriginal);
    });

    act(() => {
      result.current.setTitulo("Ensayo completo");
      result.current.setEstado("confirmado");
    });

    act(() => {
      result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(3);

    expect(result.current.eventos[1]).toMatchObject({
      id: eventoOriginal.id,
      titulo: "Ensayo completo",
      tipo: eventoOriginal.tipo,
      fecha: eventoOriginal.fecha,
      estado: "confirmado",
    });

    expect(result.current.eventos[0]).toEqual(primerEventoOriginal);
    expect(result.current.eventos[2]).toEqual(tercerEventoOriginal);
  });

  test("elimina un evento existente", () => {
    const { result } = renderHook(() => useEventos());

    const primerEventoOriginal = result.current.eventos[0];
    const eventoAEliminar = result.current.eventos[1];
    const tercerEventoOriginal = result.current.eventos[2];

    act(() => {
      result.current.eliminarEvento(eventoAEliminar.id);
    });

    expect(result.current.eventos).toHaveLength(2);

    expect(
      result.current.eventos.some(
        (evento) => evento.id === eventoAEliminar.id
      )
    ).toBe(false);

    expect(result.current.eventos[0]).toEqual(primerEventoOriginal);
    expect(result.current.eventos[1]).toEqual(tercerEventoOriginal);
  });
});
