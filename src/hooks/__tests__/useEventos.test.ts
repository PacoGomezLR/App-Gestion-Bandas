import { act, renderHook } from "@testing-library/react-native";
import type { Evento } from "../../types/evento";
import { useEventos } from "../useEventos";

describe("useEventos", () => {
  test("crea un evento", async () => {
    const { result } = await renderHook(() => useEventos());

    expect(result.current.eventos).toHaveLength(3);

    await act(() => {
      result.current.setFecha("2026-11-15");
      result.current.alternarTecnico("1");
      result.current.alternarTecnico("2");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(4);

    expect(result.current.eventos[3]).toMatchObject({
      titulo: "Concierto abierto 15/11/2026",
      tipo: "concierto_abierto",
      fecha: "2026-11-15",
      estado: "pendiente",
      tecnicoIds: ["1", "2"],
    });

    expect(result.current.tecnicoIds).toEqual([]);
  });

  test("no crea un evento si falta la fecha", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(3);
    expect(result.current.error).toBe(
      "La fecha es obligatoria"
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
      result.current.setEstado("confirmado");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(3);

    expect(result.current.eventos[1]).toMatchObject({
      id: eventoOriginal.id,
      // Al guardar se reconstruye desde tipo, lugar y fecha
      titulo: "Ensayo 02/10/2026",
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

    await act(async () => {
      await result.current.eliminarEvento(eventoAEliminar.id);
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
    expect(result.current.titulo).toBe("Concierto abierto 30/09/2026");
    expect(result.current.tipo).toBe(eventoEditado.tipo);
    expect(result.current.fecha).toBe(eventoEditado.fecha);
    expect(result.current.estado).toBe(eventoEditado.estado);

    await act(async () => {
      await result.current.eliminarEvento("1");
    });

    expect(result.current.eventos).toHaveLength(2);
    expect(
      result.current.eventos.some((evento) => evento.id === "1")
    ).toBe(false);
    expect(result.current.eventoEditandoId).toBeNull();
    // Formulario limpio: solo queda el tipo por defecto
    expect(result.current.titulo).toBe("Concierto abierto");
    expect(result.current.fecha).toBe("");
    expect(result.current.tipo).toBe("concierto_abierto");
    expect(result.current.estado).toBe("pendiente");
    expect(result.current.error).toBe("");
  });

  test("mantiene la edición si elimina otro evento", async () => {
    const { result } = await renderHook(() => useEventos());

    const eventoEditado = result.current.eventos[0];

    await act(() => {
      result.current.prepararEdicion(eventoEditado);
    });

    await act(async () => {
      await result.current.eliminarEvento("2");
    });

    expect(result.current.eventos).toHaveLength(2);
    expect(
      result.current.eventos.some((evento) => evento.id === "2")
    ).toBe(false);
    expect(result.current.eventoEditandoId).toBe("1");
    expect(result.current.titulo).toBe("Concierto abierto 30/09/2026");
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
      result.current.cancelarEdicion();
    });

    expect(result.current.eventos).toEqual(eventosOriginales);
    expect(result.current.eventoEditandoId).toBeNull();
    // Formulario limpio: solo queda el tipo por defecto
    expect(result.current.titulo).toBe("Concierto abierto");
    expect(result.current.fecha).toBe("");
    expect(result.current.tipo).toBe("concierto_abierto");
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

    await act(async () => {
      await result.current.guardarEvento();
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

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(3);
    expect(result.current.eventos[1]).toMatchObject({
      id: "2",
      tecnicoIds: ["2"],
    });
    expect(result.current.tecnicoIds).toEqual([]);
  });

  test("carga una lista externa de eventos", async () => {
    const { result } = await renderHook(() =>
      useEventos({ datosIniciales: [] })
    );

    expect(result.current.eventos).toEqual([]);

    const eventosExternos: Evento[] = [
      {
        id: "10",
        titulo: "Concierto guardado",
        tipo: "concierto_abierto",
        fecha: "2026-12-01",
        hora: "",
        lugar: "",
        notas: "",
        estado: "confirmado",
        tecnicoIds: ["1"],
        miembroIds: [],
      },
    ];

    await act(() => {
      result.current.setLugar("Montilla");
    });

    await act(() => {
      result.current.reemplazarEventos(eventosExternos);
    });

    expect(result.current.eventos).toEqual(eventosExternos);
    // Guarda una copia, no el mismo array recibido
    expect(result.current.eventos).not.toBe(eventosExternos);
    // No toca el formulario
    expect(result.current.titulo).toBe("Concierto abierto Montilla");
  });

  test("no guarda localmente si falla la persistencia", async () => {
    const { result } = await renderHook(() =>
      useEventos({ persistirEvento: async () => null })
    );

    const eventosOriginales = [...result.current.eventos];

    await act(() => {
      result.current.setFecha("2026-11-15");
      result.current.alternarTecnico("1");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarEvento();
    });

    expect(guardado).toBe(false);
    expect(result.current.eventos).toEqual(eventosOriginales);
    expect(result.current.titulo).toBe("Concierto abierto 15/11/2026");
    expect(result.current.fecha).toBe("2026-11-15");
    expect(result.current.tecnicoIds).toEqual(["1"]);
  });

  test("no elimina localmente si falla la persistencia", async () => {
    const { result } = await renderHook(() =>
      useEventos({ eliminarEventoPersistido: async () => false })
    );

    let eliminado: boolean | undefined;

    await act(async () => {
      eliminado = await result.current.eliminarEvento("1");
    });

    expect(eliminado).toBe(false);
    expect(result.current.eventos).toHaveLength(3);
    expect(
      result.current.eventos.some((evento) => evento.id === "1")
    ).toBe(true);
  });

  test("persiste exactamente el evento que se guarda", async () => {
    const persistirEvento = jest.fn(async (evento: Evento) => evento);

    const { result } = await renderHook(() =>
      useEventos({ persistirEvento })
    );

    await act(() => {
      result.current.setFecha("2026-11-15");
      result.current.alternarTecnico("2");
      result.current.alternarMiembro("1");
      result.current.setHora("20:30");
      result.current.setLugar("Sala Principal");
      result.current.setNotas("Llevar amplificador de repuesto");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarEvento();
    });

    expect(guardado).toBe(true);
    expect(persistirEvento).toHaveBeenCalledTimes(1);
    expect(persistirEvento.mock.calls[0][0]).toBe(result.current.eventos[3]);
    expect(persistirEvento.mock.calls[0][0]).toMatchObject({
      miembroIds: ["1"],
      hora: "20:30",
      lugar: "Sala Principal",
      notas: "Llevar amplificador de repuesto",
    });
    expect(result.current.eventos[3]).toMatchObject({
      titulo: "Concierto abierto Sala Principal 15/11/2026",
      fecha: "2026-11-15",
      tecnicoIds: ["2"],
      miembroIds: ["1"],
    });
  });

  test("guarda hora, lugar y notas y después los limpia", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(() => {
      result.current.setFecha("2026-12-12");
      result.current.setHora("20:30");
      result.current.setLugar("Sala Principal");
      result.current.setNotas("Llevar amplificador de repuesto");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos[3]).toMatchObject({
      hora: "20:30",
      lugar: "Sala Principal",
      notas: "Llevar amplificador de repuesto",
    });
    expect(result.current.hora).toBe("");
    expect(result.current.lugar).toBe("");
    expect(result.current.notas).toBe("");
  });

  test("permite guardar sin hora, lugar ni notas", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(() => {
      result.current.setFecha("2026-12-13");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarEvento();
    });

    expect(guardado).toBe(true);
    expect(result.current.error).toBe("");
    expect(result.current.eventos[3]).toMatchObject({
      titulo: "Concierto abierto 13/12/2026",
      hora: "",
      lugar: "",
      notas: "",
    });
  });

  test("rechaza una hora con formato incorrecto sin persistir", async () => {
    const persistirEvento = jest.fn(async (evento: Evento) => evento);
    const { result } = await renderHook(() =>
      useEventos({ persistirEvento })
    );

    for (const horaInvalida of ["25:30", "9:30", "12:90", "abc"]) {
      await act(() => {
        result.current.setFecha("2026-12-14");
        result.current.setHora(horaInvalida);
      });

      let guardado: boolean | undefined;

      await act(async () => {
        guardado = await result.current.guardarEvento();
      });

      expect(guardado).toBe(false);
      expect(result.current.error).toBe("La hora debe tener formato HH:MM");
    }

    expect(persistirEvento).not.toHaveBeenCalled();
    expect(result.current.eventos).toHaveLength(3);
  });

  test("guarda eventos con cada uno de los tipos disponibles", async () => {
    const { result } = await renderHook(() =>
      useEventos({ datosIniciales: [] })
    );

    const tipos = [
      "boda",
      "fiesta_privada",
      "concierto_abierto",
      "ensayo",
      "otro",
    ] as const;

    for (const tipo of tipos) {
      await act(() => {
        result.current.setFecha("2026-12-20");
        result.current.setTipo(tipo);
      });

      let guardado: boolean | undefined;

      await act(async () => {
        guardado = await result.current.guardarEvento();
      });

      expect(guardado).toBe(true);
      // Tras guardar, el formulario vuelve al tipo por defecto
      expect(result.current.tipo).toBe("concierto_abierto");
    }

    expect(result.current.eventos.map((evento) => evento.tipo)).toEqual([
      ...tipos,
    ]);
  });

  test("acepta horas válidas", async () => {
    const { result } = await renderHook(() => useEventos());

    for (const horaValida of ["09:05", "00:00", "23:59"]) {
      await act(() => {
        result.current.setFecha("2026-12-15");
        result.current.setHora(horaValida);
      });

      let guardado: boolean | undefined;

      await act(async () => {
        guardado = await result.current.guardarEvento();
      });

      expect(guardado).toBe(true);
    }

    expect(result.current.eventos.map((evento) => evento.hora)).toEqual([
      "",
      "",
      "",
      "09:05",
      "00:00",
      "23:59",
    ]);
  });

  test("edita hora, lugar y notas conservando el id", async () => {
    const eventoConDetalles: Evento = {
      id: "60",
      titulo: "Concierto en el teatro",
      tipo: "concierto_abierto",
      fecha: "2027-05-20",
      hora: "21:00",
      lugar: "Teatro",
      notas: "Prueba de sonido a las 18:00",
      estado: "confirmado",
      tecnicoIds: [],
      miembroIds: [],
    };

    const { result } = await renderHook(() =>
      useEventos({ datosIniciales: [eventoConDetalles] })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    expect(result.current.hora).toBe("21:00");
    expect(result.current.lugar).toBe("Teatro");
    expect(result.current.notas).toBe("Prueba de sonido a las 18:00");

    await act(() => {
      result.current.setHora("22:00");
      result.current.setLugar("Sala Nueva");
      result.current.setNotas("Entrada por puerta trasera");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0]).toMatchObject({
      id: "60",
      hora: "22:00",
      lugar: "Sala Nueva",
      notas: "Entrada por puerta trasera",
    });
  });

  test("guarda eventos pendientes y confirmados y vuelve a pendiente", async () => {
    const { result } = await renderHook(() =>
      useEventos({ datosIniciales: [] })
    );

    expect(result.current.estado).toBe("pendiente");

    for (const estado of ["pendiente", "confirmado"] as const) {
      await act(() => {
        result.current.setFecha("2026-12-21");
        result.current.setEstado(estado);
      });

      await act(async () => {
        await result.current.guardarEvento();
      });

      expect(result.current.estado).toBe("pendiente");
    }

    expect(result.current.eventos.map((evento) => evento.estado)).toEqual([
      "pendiente",
      "confirmado",
    ]);
  });

  test("cancelar la edición limpia hora, lugar y notas", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    await act(() => {
      result.current.setHora("19:00");
      result.current.setLugar("Bar del centro");
      result.current.setNotas("Sin cambios guardados");
    });

    await act(() => {
      result.current.cancelarEdicion();
    });

    expect(result.current.hora).toBe("");
    expect(result.current.lugar).toBe("");
    expect(result.current.notas).toBe("");
    expect(result.current.eventos[0]).toMatchObject({
      hora: "",
      lugar: "",
      notas: "",
    });
  });

  test("asigna y desasigna miembros en el formulario", async () => {
    const { result } = await renderHook(() => useEventos());

    expect(result.current.miembroIds).toEqual([]);

    await act(() => {
      result.current.alternarMiembro("1");
    });

    expect(result.current.miembroIds).toEqual(["1"]);

    await act(() => {
      result.current.alternarMiembro("2");
    });

    expect(result.current.miembroIds).toEqual(["1", "2"]);

    await act(() => {
      result.current.alternarMiembro("1");
    });

    expect(result.current.miembroIds).toEqual(["2"]);
  });

  test("permite guardar un evento sin miembros asignados", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(() => {
      result.current.setFecha("2026-11-20");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarEvento();
    });

    expect(guardado).toBe(true);
    expect(result.current.error).toBe("");
    expect(result.current.eventos).toHaveLength(4);
    expect(result.current.eventos[3]).toMatchObject({
      titulo: "Concierto abierto 20/11/2026",
      miembroIds: [],
    });
  });

  test("crea un evento con miembros y limpia la selección", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(() => {
      result.current.setFecha("2026-12-05");
      result.current.alternarMiembro("1");
      result.current.alternarMiembro("2");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos[3].miembroIds).toEqual(["1", "2"]);
    expect(result.current.miembroIds).toEqual([]);
  });

  test("edita los miembros de un evento, incluso dejándolo sin ninguno", async () => {
    const eventoConMiembros: Evento = {
      id: "50",
      titulo: "Concierto de primavera",
      tipo: "concierto_abierto",
      fecha: "2027-04-10",
      hora: "",
      lugar: "",
      notas: "",
      estado: "pendiente",
      tecnicoIds: [],
      miembroIds: ["1", "2"],
    };

    const { result } = await renderHook(() =>
      useEventos({ datosIniciales: [eventoConMiembros] })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    expect(result.current.miembroIds).toEqual(["1", "2"]);

    await act(() => {
      result.current.alternarMiembro("1");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0]).toMatchObject({
      id: "50",
      miembroIds: ["2"],
    });
    expect(result.current.miembroIds).toEqual([]);

    // Se puede volver a editar y quitar todos los miembros
    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    await act(() => {
      result.current.alternarMiembro("2");
    });

    let guardado: boolean | undefined;

    await act(async () => {
      guardado = await result.current.guardarEvento();
    });

    expect(guardado).toBe(true);
    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0]).toMatchObject({
      id: "50",
      miembroIds: [],
    });
  });

  test("cancelar la edición limpia también la selección de miembros", async () => {
    const { result } = await renderHook(() => useEventos());

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    await act(() => {
      result.current.alternarMiembro("3");
    });

    expect(result.current.miembroIds).toEqual(["3"]);

    await act(() => {
      result.current.cancelarEdicion();
    });

    expect(result.current.miembroIds).toEqual([]);
    expect(result.current.eventos[0].miembroIds).toEqual([]);
  });

  test("impide guardar dos veces mientras una escritura está pendiente", async () => {
    let resolverPersistencia!: (valor: boolean) => void;

    const persistenciaPendiente = new Promise<boolean>((resolve) => {
      resolverPersistencia = resolve;
    });

    const persistirEvento = jest.fn((evento: Evento) =>
      persistenciaPendiente.then((ok) => (ok ? evento : null))
    );

    const { result } = await renderHook(() =>
      useEventos({ persistirEvento })
    );

    await act(() => {
      result.current.setFecha("2026-11-15");
    });

    let primerGuardado: Promise<boolean> | undefined;

    await act(async () => {
      primerGuardado = result.current.guardarEvento();
    });

    expect(result.current.procesando).toBe(true);

    let segundoGuardado: boolean | undefined;

    await act(async () => {
      segundoGuardado = await result.current.guardarEvento();
    });

    expect(segundoGuardado).toBe(false);
    expect(persistirEvento).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolverPersistencia(true);
      await primerGuardado;
    });

    expect(await primerGuardado).toBe(true);
    expect(result.current.eventos).toHaveLength(4);
    expect(
      result.current.eventos.filter(
        (evento) => evento.titulo === "Concierto abierto 15/11/2026"
      )
    ).toHaveLength(1);
    expect(result.current.procesando).toBe(false);
  });

  test("impide eliminar dos veces mientras una escritura está pendiente", async () => {
    let resolverEliminacion!: (valor: boolean) => void;

    const eliminacionPendiente = new Promise<boolean>((resolve) => {
      resolverEliminacion = resolve;
    });

    const eliminarEventoPersistido = jest.fn(
      (_id: string) => eliminacionPendiente
    );

    const { result } = await renderHook(() =>
      useEventos({ eliminarEventoPersistido })
    );

    let primeraEliminacion: Promise<boolean> | undefined;

    await act(async () => {
      primeraEliminacion = result.current.eliminarEvento("1");
    });

    expect(result.current.procesando).toBe(true);

    let segundaEliminacion: boolean | undefined;

    await act(async () => {
      segundaEliminacion = await result.current.eliminarEvento("2");
    });

    expect(segundaEliminacion).toBe(false);
    expect(eliminarEventoPersistido).toHaveBeenCalledTimes(1);
    expect(eliminarEventoPersistido).toHaveBeenCalledWith("1");

    await act(async () => {
      resolverEliminacion(true);
      await primeraEliminacion;
    });

    expect(result.current.eventos.map((evento) => evento.id)).toEqual(["2", "3"]);
    expect(result.current.procesando).toBe(false);
  });

  test("no permite cambiar ni cancelar la edición durante una escritura", async () => {
    let resolverPersistencia!: (valor: boolean) => void;

    const persistenciaPendiente = new Promise<boolean>((resolve) => {
      resolverPersistencia = resolve;
    });

    const { result } = await renderHook(() =>
      useEventos({ persistirEvento: (evento: Evento) =>
          persistenciaPendiente.then((ok) => (ok ? evento : null)) })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    let guardado: Promise<boolean> | undefined;

    await act(async () => {
      guardado = result.current.guardarEvento();
    });

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[1]);
    });

    expect(result.current.eventoEditandoId).toBe("1");
    expect(result.current.titulo).toBe("Concierto abierto 30/09/2026");

    await act(() => {
      result.current.cancelarEdicion();
    });

    expect(result.current.eventoEditandoId).toBe("1");
    expect(result.current.titulo).toBe("Concierto abierto 30/09/2026");

    await act(async () => {
      resolverPersistencia(true);
      await guardado;
    });

    expect(result.current.eventoEditandoId).toBeNull();
    expect(result.current.procesando).toBe(false);
  });

  test("libera el bloqueo aunque la persistencia falle o lance un error", async () => {
    const persistirEvento = jest
      .fn<Promise<Evento | null>, [Evento, boolean]>()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("fallo inesperado"))
      .mockImplementationOnce(async (evento) => evento);

    const { result } = await renderHook(() =>
      useEventos({ persistirEvento })
    );

    await act(() => {
      result.current.setFecha("2026-11-15");
    });

    let resultado: boolean | undefined;

    await act(async () => {
      resultado = await result.current.guardarEvento();
    });

    expect(resultado).toBe(false);
    expect(result.current.procesando).toBe(false);

    await act(async () => {
      await expect(result.current.guardarEvento()).rejects.toThrow(
        "fallo inesperado"
      );
    });

    expect(result.current.procesando).toBe(false);

    // Tras los dos fallos, el siguiente guardado funciona: no quedó bloqueado
    await act(async () => {
      resultado = await result.current.guardarEvento();
    });

    expect(resultado).toBe(true);
    expect(persistirEvento).toHaveBeenCalledTimes(3);
    expect(result.current.eventos).toHaveLength(4);
    expect(result.current.procesando).toBe(false);
  });

  test("guarda en el estado el evento devuelto por la persistencia, con su id definitivo", async () => {
    const persistirEvento = jest.fn(async (evento: Evento, esNuevo: boolean) =>
      esNuevo ? { ...evento, id: "uuid-supabase" } : evento
    );

    const { result } = await renderHook(() =>
      useEventos({ datosIniciales: [], persistirEvento })
    );

    await act(() => {
      result.current.setFecha("2026-11-15");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(persistirEvento.mock.calls[0][1]).toBe(true);
    expect(result.current.eventos.map((evento) => evento.id)).toEqual(["uuid-supabase"]);

    // Al editarlo se indica que no es nuevo y se conserva el id definitivo
    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    await act(() => {
      result.current.setLugar("Montilla");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(persistirEvento.mock.calls[1][1]).toBe(false);
    expect(persistirEvento.mock.calls[1][0].id).toBe("uuid-supabase");
    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0].titulo).toBe("Concierto abierto Montilla 15/11/2026");
  });

  test("editar un evento con músicos sin tocarlos conserva sus miembroIds", async () => {
    // El formulario ya no muestra el selector de músicos: no debe vaciarlos al guardar
    const conMusicos: Evento = {
      id: "m1",
      titulo: "Boda Lucena 29/10/2026",
      tipo: "boda",
      fecha: "2026-10-29",
      hora: "20:00",
      lugar: "Lucena",
      notas: "",
      estado: "pendiente",
      tecnicoIds: ["1"],
      miembroIds: ["1", "2"],
    };
    const persistirEvento = jest.fn(async (evento: Evento) => evento);

    const { result } = await renderHook(() =>
      useEventos({ datosIniciales: [conMusicos], persistirEvento })
    );

    await act(() => {
      result.current.prepararEdicion(result.current.eventos[0]);
    });

    await act(() => {
      result.current.setLugar("Montilla");
      result.current.setFecha("2026-11-07");
      result.current.setEstado("confirmado");
      result.current.alternarTecnico("2");
    });

    await act(async () => {
      await result.current.guardarEvento();
    });

    expect(persistirEvento).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1", miembroIds: ["1", "2"], tecnicoIds: ["1", "2"] }),
      false
    );
    expect(result.current.eventos[0]).toMatchObject({
      lugar: "Montilla",
      fecha: "2026-11-07",
      estado: "confirmado",
      miembroIds: ["1", "2"],
    });
  });

  describe("título automático", () => {
    test("Concierto abierto + Montilla + 2026-10-29 da «Concierto abierto Montilla 29/10/2026»", async () => {
      const { result } = await renderHook(() => useEventos({ datosIniciales: [] }));

      await act(() => {
        result.current.setTipo("concierto_abierto");
        result.current.setLugar("  Montilla  ");
        result.current.setFecha("2026-10-29");
      });

      expect(result.current.titulo).toBe("Concierto abierto Montilla 29/10/2026");

      await act(async () => {
        await result.current.guardarEvento();
      });

      expect(result.current.eventos[0].titulo).toBe("Concierto abierto Montilla 29/10/2026");
    });

    test("sin lugar da «Ensayo 29/10/2026»", async () => {
      const { result } = await renderHook(() => useEventos({ datosIniciales: [] }));

      await act(() => {
        result.current.setTipo("ensayo");
        result.current.setFecha("2026-10-29");
      });

      await act(async () => {
        await result.current.guardarEvento();
      });

      expect(result.current.eventos[0].titulo).toBe("Ensayo 29/10/2026");
    });

    test("al editar, cambiar tipo, lugar o fecha regenera el título", async () => {
      const { result } = await renderHook(() => useEventos({ datosIniciales: [] }));

      await act(() => {
        result.current.setTipo("ensayo");
        result.current.setFecha("2026-10-29");
      });

      await act(async () => {
        await result.current.guardarEvento();
      });

      await act(() => {
        result.current.prepararEdicion(result.current.eventos[0]);
      });

      await act(() => {
        result.current.setTipo("boda");
      });
      expect(result.current.titulo).toBe("Boda 29/10/2026");

      await act(() => {
        result.current.setLugar("Lucena");
      });
      expect(result.current.titulo).toBe("Boda Lucena 29/10/2026");

      await act(() => {
        result.current.setFecha("2026-11-07");
      });
      expect(result.current.titulo).toBe("Boda Lucena 07/11/2026");

      await act(async () => {
        await result.current.guardarEvento();
      });

      expect(result.current.eventos).toHaveLength(1);
      expect(result.current.eventos[0]).toMatchObject({
        titulo: "Boda Lucena 07/11/2026",
        tipo: "boda",
        lugar: "Lucena",
        fecha: "2026-11-07",
      });
    });

    test("un título antiguo escrito a mano se sustituye al guardar la edición", async () => {
      const { result } = await renderHook(() => useEventos());

      await act(() => {
        result.current.prepararEdicion(result.current.eventos[0]);
      });

      await act(async () => {
        await result.current.guardarEvento();
      });

      expect(result.current.eventos[0].titulo).toBe("Concierto abierto 30/09/2026");
    });
  });
});
