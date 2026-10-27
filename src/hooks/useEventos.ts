import { useState } from "react";
import { eventosIniciales } from "../data/eventosIniciales";
import type { EstadoEvento, Evento, TipoEvento } from "../types/evento";

export function useEventos() {
  const [eventos, setEventos] = useState<Evento[]>(eventosIniciales);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("concierto");
  const [estado, setEstado] = useState<EstadoEvento>("pendiente");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState("");
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);

  function limpiarFormulario() {
    setTitulo("");
    setFecha("");
    setTipo("concierto");
    setEstado("pendiente");
    setError("");
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

  function prepararEdicion(evento: Evento) {
    setEventoEditandoId(evento.id);
    setTitulo(evento.titulo);
    setTipo(evento.tipo);
    setFecha(evento.fecha);
    setEstado(evento.estado);
  }

  return {
    eventos,
    titulo,
    tipo,
    estado,
    fecha,
    error,
    eventoEditandoId,
    setTitulo,
    setTipo,
    setEstado,
    setFecha,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
  };
}
