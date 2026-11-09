import { useCallback, useRef, useState } from "react";
import { eventosIniciales } from "../data/eventosIniciales";
import type {
  CachesPorEvento,
  CambioCache,
  EstadoEvento,
  Evento,
  TipoEvento,
} from "../types/evento";
import { importeParaFormulario, parsearImporte } from "../utils/dinero";
import { esEnlaceGoogleMapsValido, normalizarEnlaceGoogleMaps } from "../utils/googleMaps";
import { generarTituloEvento } from "../utils/tituloEvento";

// HH:MM de 00:00 a 23:59
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const SIN_CACHES: CachesPorEvento = {};

const ERROR_SIN_TIPO = "Selecciona un tipo de evento.";

interface UseEventosOptions {
  datosIniciales?: Evento[];
  // Devuelve el evento tal como quedó guardado (con el id definitivo) o null si falla
  persistirEvento?: (
    evento: Evento,
    esNuevo: boolean,
    cache?: CambioCache
  ) => Promise<Evento | null>;
  eliminarEventoPersistido?: (id: string) => Promise<boolean>;
  // Los cachés ya cargados: rellenan el campo al editar
  cachesEvento?: CachesPorEvento;
}

export function useEventos(options: UseEventosOptions = {}) {
  const {
    datosIniciales = eventosIniciales,
    persistirEvento,
    eliminarEventoPersistido,
    cachesEvento = SIN_CACHES,
  } = options;

  const [eventos, setEventos] = useState<Evento[]>(datosIniciales);
  // null = sin elegir todavía: un evento nuevo nunca se guarda con un tipo supuesto
  const [tipo, setTipoElegido] = useState<TipoEvento | null>(null);
  const [estado, setEstado] = useState<EstadoEvento>("pendiente");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("");
  const [notas, setNotas] = useState("");
  // Lo que hay escrito en el campo; al guardar, vacío se convierte en null
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [tecnicoIds, setTecnicoIds] = useState<string[]>([]);
  // Se recalcula en cada cambio de tipo, lugar o fecha: no hay campo de título
  const titulo = tipo === null ? "" : generarTituloEvento(tipo, lugar, fecha);
  const [error, setError] = useState("");
  const [eventoEditandoId, setEventoEditandoId] = useState<string | null>(null);
  // null = sin tocar: el campo enseña el caché guardado y al enviar no se cambia
  const [cacheEscrito, setCacheEscrito] = useState<string | null>(null);
  const cacheGuardado = eventoEditandoId === null ? undefined : cachesEvento[eventoEditandoId];
  const cache =
    cacheEscrito ?? (cacheGuardado === undefined ? "" : importeParaFormulario(cacheGuardado));
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
    setGoogleMapsUrl("");
    setTipoElegido(null);
    setEstado("pendiente");
    setTecnicoIds([]);
    setCacheEscrito(null);
    setError("");
  }

  // Elegir un tipo resuelve su error; cualquier otro sigue a la vista
  function setTipo(nuevoTipo: TipoEvento) {
    setTipoElegido(nuevoTipo);
    setError((actual) => (actual === ERROR_SIN_TIPO ? "" : actual));
  }

  function alternarTecnico(tecnicoId: string) {
    setTecnicoIds((idsActuales) =>
      idsActuales.includes(tecnicoId)
        ? idsActuales.filter((id) => id !== tecnicoId)
        : [...idsActuales, tecnicoId]
    );
  }

  async function guardarEvento(): Promise<boolean> {
    // El título se genera solo: lo obligatorio es la fecha y el tipo
    if (fecha.trim() === "") {
      setError("La fecha es obligatoria");
      return false;
    }

    if (tipo === null) {
      setError(ERROR_SIN_TIPO);
      return false;
    }

    // La hora es opcional, pero si se escribe debe ser válida
    if (hora.trim() !== "" && !FORMATO_HORA.test(hora.trim())) {
      setError("La hora debe tener formato HH:MM");
      return false;
    }

    if (!esEnlaceGoogleMapsValido(googleMapsUrl)) {
      setError("Introduce un enlace válido de Google Maps.");
      return false;
    }

    let cambioCache: CambioCache = undefined;

    if (cacheEscrito !== null) {
      // Vaciar el campo quita el caché; escribir 0 lo registra como 0
      if (cacheEscrito.trim() === "") {
        cambioCache = null;
      } else {
        const importe = parsearImporte(cacheEscrito, { permitirCero: true });

        if (!importe.valido) {
          setError(importe.error);
          return false;
        }

        cambioCache = importe.centimos;
      }
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
        googleMapsUrl: normalizarEnlaceGoogleMaps(googleMapsUrl),
      };

      // Primero se persiste; el estado local solo cambia si la persistencia lo confirma
      const persistido = persistirEvento
        ? await persistirEvento(eventoGuardado, !editando, cambioCache)
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
    setTipoElegido(evento.tipo);
    setError("");
    setFecha(evento.fecha);
    setHora(evento.hora);
    setLugar(evento.lugar);
    setNotas(evento.notas);
    setGoogleMapsUrl(evento.googleMapsUrl ?? "");
    setEstado(evento.estado);
    setTecnicoIds([...evento.tecnicoIds]);
    setCacheEscrito(null);
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
    googleMapsUrl,
    tecnicoIds,
    cache,
    error,
    eventoEditandoId,
    procesando,
    setTipo,
    setEstado,
    setFecha,
    setHora,
    setLugar,
    setNotas,
    setGoogleMapsUrl,
    setCache: setCacheEscrito,
    alternarTecnico,
    reemplazarEventos,
    guardarEvento,
    eliminarEvento,
    prepararEdicion,
    cancelarEdicion,
  };
}
