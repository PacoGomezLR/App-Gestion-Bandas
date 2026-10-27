import { useState } from "react";
import { eventosIniciales } from "../data/eventosIniciales";
import type { EstadoEvento, Evento, TipoEvento } from "../types/evento";

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>(eventosIniciales);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("concierto");
  const [estado, setEstado] = useState<EstadoEvento>("pendiente");
  const [fecha, setFecha] = useState("");
  const [tecnicoIds, setTecnicoIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);

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

  function guardarEvento() {
    if (titulo.trim() === "" || fecha.trim() === "") {
      setError("El título y la fecha son obligatorios");
      return;
    }

    if (eventoEditandoId !== null) {
      const eventosActualizados = eventos.map((evento) =>
        evento.id === eventoEditandoId
          ? {
              ...evento,
              titulo: titulo.trim(),
              tipo: tipo,
              fecha: fecha,
              estado: estado,
              tecnicoIds: [...tecnicoIds],
            }
          : evento
      );

      setEventos(eventosActualizados);
      setEventoEditandoId(null);
      limpiarFormulario();

      return;
    }

    const nuevoEvento: Evento = {
      id: Date.now().toString(),
      titulo: titulo.trim(),
      tipo: tipo,
      fecha: fecha,
      estado: estado,
      tecnicoIds: [...tecnicoIds],
    };

    setEventos([...eventos, nuevoEvento]);
    limpiarFormulario();
  }

  function eliminarEvento(id: string) {
    const eventosActualizados = eventos.filter(
      (evento) => evento.id !== id
    );

    setEventos(eventosActualizados);

    if (eventoEditandoId === id) {
      setEventoEditandoId(null);
      limpiarFormulario();
    }
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
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
  };
}
