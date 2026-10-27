import { act, renderHook } from "@testing-library/react-native";
import { useEventos } from "../useEventos";

describe("useEventos", () => {
  test("crea un evento", async () => {
    const { result } = await renderHook(() => useEventos());

    expect(result.current.eventos).toHaveLength(3);

    await act(() => {
      result.current.setTitulo("Concierto en Sevilla");
      result.current.setFecha("2026-11-15");
      result.current.alternarTecnico("1");
      result.current.alternarTecnico("2");
    });

    await act(() => {
      result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(4);

    expect(result.current.eventos[3]).toMatchObject({
      titulo: "Concierto en Sevilla",
      tipo: "concierto",
      fecha: "2026-11-15",
      estado: "pendiente",
      tecnicoIds: ["1", "2"],
    });

    expect(result.current.tecnicoIds).toEqual([]);
  });

  test("no crea un evento si faltan título o fecha", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(() => {
      result.current.setTitulo("Concierto sin fecha");
    });

    await act(() => {
      result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(3);
    expect(result.current.error).toBe(
      "El título y la fecha son obligatorios"
    );
  });

  test("edita un evento existente", async () => {
    const { result } = await renderHook(() => useEventos());

    const primerEventoOriginal = result.current.eventos[0];
    const eventoOriginal = result.current.eventos[1];
    const tercerEventoOriginal = result.current.eventos[2];

    await act(() => {
      result.current.prepararEdicion(eventoOriginal);
    });

    await act(() => {
      result.current.setTitulo("Ensayo completo");
      result.current.setEstado("confirmado");
    });

    await act(() => {
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

  test("elimina un evento existente", async () => {
    const { result } = await renderHook(() => useEventos());

    const primerEventoOriginal = result.current.eventos[0];
    const eventoAEliminar = result.current.eventos[1];
    const tercerEventoOriginal = result.current.eventos[2];

    await act(() => {
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

  test("sale del modo edición si elimina el evento que estaba editando", async () => {
    const { result } = await renderHook(() => useEventos());

    const eventoEditado = result.current.eventos[0];

    await act(() => {
      result.current.prepararEdicion(eventoEditado);
    });

    expect(result.current.eventoEditandoId).toBe("1");
    expect(result.current.titulo).toBe(eventoEditado.titulo);
    expect(result.current.tipo).toBe(eventoEditado.tipo);
    expect(result.current.fecha).toBe(eventoEditado.fecha);
    expect(result.current.estado).toBe(eventoEditado.estado);

    await act(() => {
      result.current.eliminarEvento("1");
    });

    expect(result.current.eventos).toHaveLength(2);
    expect(
      result.current.eventos.some((evento) => evento.id === "1")
    ).toBe(false);
    expect(result.current.eventoEditandoId).toBeNull();
    expect(result.current.titulo).toBe("");
    expect(result.current.fecha).toBe("");
    expect(result.current.tipo).toBe("concierto");
    expect(result.current.estado).toBe("pendiente");
    expect(result.current.error).toBe("");
  });

  test("mantiene la edición si elimina otro evento", async () => {
    const { result } = await renderHook(() => useEventos());

    const eventoEditado = result.current.eventos[0];

    await act(() => {
      result.current.prepararEdicion(eventoEditado);
    });

    await act(() => {
      result.current.eliminarEvento("2");
    });

    expect(result.current.eventos).toHaveLength(2);
    expect(
      result.current.eventos.some((evento) => evento.id === "2")
    ).toBe(false);
    expect(result.current.eventoEditandoId).toBe("1");
    expect(result.current.titulo).toBe(eventoEditado.titulo);
    expect(result.current.fecha).toBe(eventoEditado.fecha);
    expect(result.current.tipo).toBe(eventoEditado.tipo);
    expect(result.current.estado).toBe(eventoEditado.estado);
  });

  test("cancela la edición sin modificar los eventos", async () => {
    const { result } = await renderHook(() => useEventos());

    const eventosOriginales = [...result.current.eventos];

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    expect(result.current.eventoEditandoId).toBe("1");

    await act(() => {
      result.current.setTitulo("Título modificado");
    });

    await act(() => {
      result.current.cancelarEdicion();
    });

    expect(result.current.eventos).toEqual(eventosOriginales);
    expect(result.current.eventoEditandoId).toBeNull();
    expect(result.current.titulo).toBe("");
    expect(result.current.fecha).toBe("");
    expect(result.current.tipo).toBe("concierto");
    expect(result.current.estado).toBe("pendiente");
    expect(result.current.error).toBe("");
  });

  test("asigna y desasigna técnicos en el formulario", async () => {
    const { result } = await renderHook(() => useEventos());

    expect(result.current.tecnicoIds).toEqual([]);

    await act(() => {
      result.current.alternarTecnico("1");
    });

    expect(result.current.tecnicoIds).toEqual(["1"]);

    await act(() => {
      result.current.alternarTecnico("2");
    });

    expect(result.current.tecnicoIds).toEqual(["1", "2"]);

    await act(() => {
      result.current.alternarTecnico("1");
    });

    expect(result.current.tecnicoIds).toEqual(["2"]);
  });

  test("carga y modifica los técnicos asignados al editar", async () => {
    const { result } = await renderHook(() => useEventos());

    // Primero se asigna un técnico al evento "2" para tener asignaciones que cargar
    await act(() => {
      result.current.prepararEdicion(result.current.eventos[1]);
    });

    await act(() => {
      result.current.alternarTecnico("1");
    });

    await act(() => {
      result.current.guardarEvento();
    });

    expect(result.current.eventos[1].tecnicoIds).toEqual(["1"]);

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[1]);
    });

    expect(result.current.tecnicoIds).toEqual(["1"]);

    await act(() => {
      result.current.alternarTecnico("1");
      result.current.alternarTecnico("2");
    });

    await act(() => {
      result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(3);
    expect(result.current.eventos[1]).toMatchObject({
      id: "2",
      tecnicoIds: ["2"],
    });
    expect(result.current.tecnicoIds).toEqual([]);
  });
});
