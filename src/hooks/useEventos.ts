import { useCallback, useRef, useState } from "react";
import { eventosIniciales } from "../data/eventosIniciales";
import type { EstadoEvento, Evento, TipoEvento } from "../types/evento";

// HH:MM de 00:00 a 23:59
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [notas, setNotas] = useState("");
  const [tecnicoIds, setTecnicoIds] = useState<string[]>([]);
  const [miembroIds, setMiembroIds] = useState<string[]>([]);
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
    setTitulo("");
    setFecha("");
    setHora("");
    setLugar("");
    setNotas("");
    setTipo("concierto");
    setEstado("pendiente");
    setTecnicoIds([]);
    setMiembroIds([]);
    setError("");
  }

  function alternarTecnico(tecnicoId: string) {
    setTecnicoIds((idsActuales) =>
      idsActuales.includes(tecnicoId)
        ? idsActuales.filter((id) => id !== tecnicoId)
        : [...idsActuales, tecnicoId]
    );
  }

  // Asignar miembros es opcional: un evento sin miembros es válido
  function alternarMiembro(miembroId: string) {
    setMiembroIds((idsActuales) =>
      idsActuales.includes(miembroId)
        ? idsActuales.filter((id) => id !== miembroId)
        : [...idsActuales, miembroId]
    );
  }

  async function guardarEvento(): Promise<boolean> {
    if (titulo.trim() === "" || fecha.trim() === "") {
      setError("El título y la fecha son obligatorios");
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
        titulo: titulo.trim(),
        tipo: tipo,
        fecha: fecha,
        hora: hora.trim(),
        lugar: lugar.trim(),
        notas: notas.trim(),
        estado: estado,
        tecnicoIds: [...tecnicoIds],
        miembroIds: [...miembroIds],
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
    setTitulo(evento.titulo);
    setTipo(evento.tipo);
    setFecha(evento.fecha);
    setHora(evento.hora);
    setLugar(evento.lugar);
    setNotas(evento.notas);
    setEstado(evento.estado);
    setTecnicoIds([...evento.tecnicoIds]);
    setMiembroIds([...evento.miembroIds]);
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
    miembroIds,
    error,
    eventoEditandoId,
    procesando,
    setTitulo,
    setTipo,
    setEstado,
    setFecha,
    setHora,
    setLugar,
    setNotas,
    alternarTecnico,
    alternarMiembro,
    reemplazarEventos,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
  };
}
