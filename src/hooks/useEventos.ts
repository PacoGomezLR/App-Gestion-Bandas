import { useCallback, useRef, useState } from "react";
import { eventosIniciales } from "../data/eventosIniciales";
import type { EstadoEvento, Evento, TipoEvento } from "../types/evento";
import { generarTituloEvento } from "../utils/tituloEvento";

// HH:MM de 00:00 a 23:59
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

interface UseEventosOptions {
  datosIniciales?: Evento[];
  // Devuelve el evento tal como quedó guardado (con el id definitivo) o null si falla
  persistirEvento?: (evento: Evento, esNuevo: boolean) => Promise<Evento | null>;
  eliminarEventoPersistido?: (id: string) => Promise<boolean>;
}

export function useEventos(options: UseEventosOptions = {}) {
  const {
    datosIniciales = eventosIniciales,
    persistirEvento,
    eliminarEventoPersistido,
  } = options;

  const [eventos, setEventos] = useState<Evento[]>(datosIniciales);
  const [tipo, setTipo] = useState<TipoEvento>("concierto_abierto");
  const [estado, setEstado] = useState<EstadoEvento>("pendiente");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [notas, setNotas] = useState("");
  const [tecnicoIds, setTecnicoIds] = useState<string[]>([]);
  // Se recalcula en cada cambio de tipo, lugar o fecha: no hay campo de título
  const titulo = generarTituloEvento(tipo, lugar, fecha);
  const [error, setError] = useState("");
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  // La ref bloquea de inmediato; el estado solo sirve para que la interfaz se actualice
  const operacionEnCursoRef = useRef(false);

  function iniciarOperacion(): boolean {
    if (operacionEnCursoRef.current) {
      return false;
    }

    operacionEnCursoRef.current = true;
    setProcesando(true);

    return true;
  }

  function finalizarOperacion() {
    operacionEnCursoRef.current = false;
    setProcesando(false);
  }

  const reemplazarEventos = useCallback((nuevosEventos: Evento[]) => {
    setEventos([...nuevosEventos]);
  }, []);

  function limpiarFormulario() {
    setFecha("");
    setHora("");
    setLugar("");
    setNotas("");
    setTipo("concierto_abierto");
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
    // El título se genera solo, así que lo único obligatorio es la fecha
    if (fecha.trim() === "") {
      setError("La fecha es obligatoria");
      return false;
    }

    // La hora es opcional, pero si se escribe debe ser válida
    if (hora.trim() !== "" && !FORMATO_HORA.test(hora.trim())) {
      setError("La hora debe tener formato HH:MM");
      return false;
    }

    if (!iniciarOperacion()) {
      return false;
    }

    try {
      const editando = eventoEditandoId !== null;

      const eventoGuardado: Evento = {
        id: eventoEditandoId ?? Date.now().toString(),
        // Siempre se reconstruye desde tipo, lugar y fecha, también al editar
        titulo: generarTituloEvento(tipo, lugar, fecha),
        tipo: tipo,
        fecha: fecha,
        hora: hora.trim(),
        lugar: lugar.trim(),
        notas: notas.trim(),
        estado: estado,
        tecnicoIds: [...tecnicoIds],
      };

      // Primero se persiste; el estado local solo cambia si la persistencia lo confirma
      const persistido = persistirEvento
        ? await persistirEvento(eventoGuardado, !editando)
        : eventoGuardado;

      if (persistido === null) {
        return false;
      }

      if (editando) {
        setEventos((eventosActuales) =>
          eventosActuales.map((evento) =>
            evento.id === persistido.id ? persistido : evento
          )
        );
        setEventoEditandoId(null);
      } else {
        setEventos((eventosActuales) => [...eventosActuales, persistido]);
      }

      limpiarFormulario();

      return true;
    } finally {
      finalizarOperacion();
    }
  }

  async function eliminarEvento(id: string): Promise<boolean> {
    if (!iniciarOperacion()) {
      return false;
    }

    try {
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
    } finally {
      finalizarOperacion();
    }
  }

  function cancelarEdicion() {
    if (operacionEnCursoRef.current) {
      return;
    }

    setEventoEditandoId(null);
    limpiarFormulario();
  }

  function prepararEdicion(evento: Evento) {
    if (operacionEnCursoRef.current) {
      return;
    }

    setEventoEditandoId(evento.id);
    setTipo(evento.tipo);
    setFecha(evento.fecha);
    setHora(evento.hora);
    setLugar(evento.lugar);
    setNotas(evento.notas);
    setEstado(evento.estado);
    setTecnicoIds([...evento.tecnicoIds]);
  }

  return {
    eventos,
    titulo,
    tipo,
    estado,
    fecha,
    hora,
    lugar,
    notas,
    tecnicoIds,
    error,
    eventoEditandoId,
    procesando,
    setTipo,
    setEstado,
    setFecha,
    setHora,
    setLugar,
    setNotas,
    alternarTecnico,
    reemplazarEventos,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
  };
}
