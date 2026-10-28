import { useCallback, useState } from "react";
import { eventosIniciales } from "../data/eventosIniciales";
import type { EstadoEvento, Evento, TipoEvento } from "../types/evento";

interface UseEventosOptions {
  datosIniciales?: Evento[];
  persistirEvento?: (evento: Evento) => Promise<boolean>;
  eliminarEventoPersistido?: (id: string) => Promise<boolean>;
}

export function useEventos(options: UseEventosOptions = {}) {
  const {
    datosIniciales = eventosIniciales,
    persistirEvento,
    eliminarEventoPersistido,
  } = options;

  const [eventos, setEventos] = useState<Evento[]>(datosIniciales);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("concierto");
  const [estado, setEstado] = useState<EstadoEvento>("pendiente");
  const [fecha, setFecha] = useState("");
  const [tecnicoIds, setTecnicoIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);

  const reemplazarEventos = useCallback((nuevosEventos: Evento[]) => {
    setEventos([...nuevosEventos]);
  }, []);

  function limpiarFormulario() {
    setTitulo("");
    setFecha("");
    setTipo("concierto");
    setEstado("pendiente");
    setTecnicoIds([]);
    setError("");
  }

  function alternarTecnico(tecnicoId: string) {
    setTecnicoIds((idsActuales) =>
      idsActuales.includes(tecnicoId)
        ? idsActuales.filter((id) => id !== tecnicoId)
        : [...idsActuales, tecnicoId]
    );
  }

  async function guardarEvento(): Promise<boolean> {
    if (titulo.trim() === "" || fecha.trim() === "") {
      setError("El título y la fecha son obligatorios");
      return false;
    }

    const editando = eventoEditandoId !== null;

    const eventoGuardado: Evento = {
      id: eventoEditandoId ?? Date.now().toString(),
      titulo: titulo.trim(),
      tipo: tipo,
      fecha: fecha,
      estado: estado,
      tecnicoIds: [...tecnicoIds],
    };

    // Primero se persiste; el estado local solo cambia si la persistencia lo confirma
    const persistido = persistirEvento
      ? await persistirEvento(eventoGuardado)
      : true;

    if (!persistido) {
      return false;
    }

    if (editando) {
      setEventos((eventosActuales) =>
        eventosActuales.map((evento) =>
          evento.id === eventoGuardado.id ? eventoGuardado : evento
        )
      );
      setEventoEditandoId(null);
    } else {
      setEventos((eventosActuales) => [...eventosActuales, eventoGuardado]);
    }

    limpiarFormulario();

    return true;
  }

  async function eliminarEvento(id: string): Promise<boolean> {
    const eliminado = eliminarEventoPersistido
      ? await eliminarEventoPersistido(id)
      : true;

    if (!eliminado) {
      return false;
    }

    setEventos((eventosActuales) =>
      eventosActuales.filter((evento) => evento.id !== id)
    );

    if (eventoEditandoId === id) {
      setEventoEditandoId(null);
      limpiarFormulario();
    }

    return true;
  }

  function cancelarEdicion() {
    setEventoEditandoId(null);
    limpiarFormulario();
  }

  function prepararEdicion(evento: Evento) {
    setEventoEditandoId(evento.id);
    setTitulo(evento.titulo);
    setTipo(evento.tipo);
    setFecha(evento.fecha);
    setEstado(evento.estado);
    setTecnicoIds([...evento.tecnicoIds]);
  }

  return {
    eventos,
    titulo,
    tipo,
    estado,
    fecha,
    tecnicoIds,
    error,
    eventoEditandoId,
    setTitulo,
    setTipo,
    setEstado,
    setFecha,
    alternarTecnico,
    reemplazarEventos,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
  };
}
