import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import type { CachesPorEvento, ErrorEliminacionEvento, Evento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { agruparEventosPorMes } from "../utils/agenda";
import { confirmarEliminacion } from "../utils/confirmaciones";
import { formatearSinCerosDecimales } from "../utils/dinero";
import { etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFechaConBarras } from "../utils/fechas";
import { etiquetaTipoEvento } from "../utils/tiposEvento";
import { AccionesEvento } from "./AccionesEvento";
import { BloqueEvento } from "./BloqueEvento";
import { BotonGoogleMaps } from "./BotonGoogleMaps";
import { coloresBadge, crearEstilosListaEventos } from "./ListaEventos.styles";

interface ListaEventosProps {
  eventos: Evento[];
  tecnicos: Tecnico[];
  procesando: boolean;
  // Solo el admin de la banda edita o elimina; el resto solo consulta
  puedeEditar: boolean;
  // Junto al botón: el aviso general queda arriba y con la lista desplazada no se vería
  errorEliminacion?: ErrorEliminacionEvento | null;
  // Solo para admin. Sin él, el bloque económico no existe
  datosEconomicos?: {
    caches: CachesPorEvento;
    cargando: boolean;
    error: string;
  } | null;
  onEliminar: (id: string) => void;
  onEditar: (evento: Evento) => void;
  // Encabezado «Mes Año» antes de cada mes (listas de varias fechas). Sin él,
  // la lista continua de siempre
  agruparPorMes?: boolean;
}

// Tipo + lugar, por ejemplo "Boda Lucena"; sin lugar, solo el tipo
function obtenerTituloVistaPrevia(evento: Evento): string {
  const tipo = etiquetaTipoEvento(evento.tipo);
  const lugar = evento.lugar.trim();

  return lugar ? `${tipo} ${lugar}` : tipo;
}

// Un fallo o una carga en curso no se confunden con no tener caché
function textoCache(
  cache: number | undefined,
  { cargando, error }: { cargando: boolean; error: string }
): string {
  if (error !== "") {
    return "No disponible";
  }

  if (cargando) {
    return "Cargando...";
  }

  return cache === undefined ? "Sin caché registrado" : formatearSinCerosDecimales(cache);
}

export function ListaEventos({
  eventos,
  tecnicos,
  procesando,
  puedeEditar,
  errorEliminacion = null,
  datosEconomicos = null,
  onEliminar,
  onEditar,
  agruparPorMes = false,
}: ListaEventosProps) {
  // Solo un evento desplegado a la vez; no se persiste
  const [eventoAbiertoId, setEventoAbiertoId] = useState<string | null>(null);
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosListaEventos(tema), [tema]);
  const badges = useMemo(() => coloresBadge(estilos), [estilos]);

  // La tarjeta de siempre (vista previa, detalle, Editar, Eliminar, Maps…)
  function pintarTarjeta(evento: Evento) {
    const abierto = eventoAbiertoId === evento.id;
    const tituloVistaPrevia = obtenerTituloVistaPrevia(evento);
    const tipo = etiquetaTipoEvento(evento.tipo);
    const lugar = evento.lugar.trim();
    const etiquetaEstado = etiquetaEstadoEvento(evento.estado);
    const fechaVisible = formatearFechaConBarras(evento.fecha);

    const nombresTecnicos = evento.tecnicoIds
      .map((id) =>
        tecnicos.find((tecnico) => tecnico.id === id)?.nombre
      )
      .filter((nombre): nombre is string => nombre !== undefined);

    return (
      <View key={evento.id} style={estilos.tarjeta}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver detalles de ${tituloVistaPrevia}, ${fechaVisible}. Estado ${etiquetaEstado}`}
          accessibilityState={{ expanded: abierto }}
          onPress={() => setEventoAbiertoId(abierto ? null : evento.id)}
          style={({ pressed }) => [
            estilos.vistaPrevia,
            abierto && estilos.vistaPreviaAbierta,
            pressed && estilos.vistaPreviaPulsada,
          ]}
        >
          <View style={estilos.textosVistaPrevia}>
            {/* Tipo a la izquierda y estado a la derecha: el tipo ocupa el espacio
                que queda y, si es largo, baja de línea sin mover el badge */}
            <View style={estilos.filaVistaPrevia}>
              <Text style={estilos.tipo}>{tipo}</Text>
              {/* El estado siempre se muestra con texto, no solo con color */}
              <View style={[estilos.badge, badges[evento.estado].fondo]}>
                <Text style={[estilos.textoBadge, badges[evento.estado].texto]}>
                  {etiquetaEstado}
                </Text>
              </View>
            </View>
            {/* Sin lugar no queda línea vacía */}
            {lugar !== "" && <Text style={estilos.lugar}>{lugar}</Text>}
            {/* Solo la fecha: la hora se queda en el detalle */}
            <Text style={estilos.fechaVistaPrevia}>{fechaVisible}</Text>
          </View>
        </Pressable>

        {/* Solo abierta. Hermano de la cabecera, no dentro: un botón dentro de otro
            no se puede alcanzar con el lector de pantalla */}
        {abierto && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cerrar detalles de ${tituloVistaPrevia}`}
            onPress={() => setEventoAbiertoId(null)}
            style={({ pressed }) => [estilos.botonCerrar, pressed && estilos.botonCerrarPulsado]}
          >
            <Text style={estilos.textoCerrar}>✕</Text>
          </Pressable>
        )}

        {abierto && (
          <View style={estilos.detalle}>
            {/* El título se sigue guardando, pero no se muestra: repite tipo, lugar y fecha.
                La fecha tampoco: ya está en la tarjeta. Solo la hora, si se escribió
                ("" = sin hora; nunca se calcula a partir de la fecha) */}
            {evento.hora !== "" && <BloqueEvento etiqueta="Hora">{evento.hora}</BloqueEvento>}

            {/* Lugar, fecha y estado ya están en la tarjeta: el detalle no los repite */}
            <BloqueEvento etiqueta="Técnico">
              {nombresTecnicos.length > 0 ? nombresTecnicos.join(", ") : "Sin asignar"}
            </BloqueEvento>

            {datosEconomicos !== null && (
              <BloqueEvento etiqueta="Caché">
                {textoCache(datosEconomicos.caches[evento.id], datosEconomicos)}
              </BloqueEvento>
            )}

            {evento.notas !== "" && <BloqueEvento etiqueta="Notas">{evento.notas}</BloqueEvento>}

            {/* Al final de la información, como acción útil: para toda la banda y
                sin enlace no queda hueco */}
            {evento.googleMapsUrl ? <BotonGoogleMaps url={evento.googleMapsUrl} /> : null}

            {puedeEditar && (
              <AccionesEvento
                procesando={procesando}
                errorEliminacion={
                  errorEliminacion?.eventoId === evento.id ? errorEliminacion.mensaje : null
                }
                onEditar={() => onEditar(evento)}
                // Borrar no se deshace: primero se confirma con el nombre del evento
                onEliminar={() =>
                  confirmarEliminacion(`${tituloVistaPrevia} del ${fechaVisible}`, () =>
                    onEliminar(evento.id)
                  )
                }
              />
            )}
          </View>
        )}
      </View>
    );
  }

  if (!agruparPorMes) {
    return <View style={estilos.lista}>{eventos.map(pintarTarjeta)}</View>;
  }

  // Por mes y año, en el orden en que llegan (ver agruparEventosPorMes)
  return (
    <View style={estilos.grupos}>
      {agruparEventosPorMes(eventos).map((grupo) => (
        <View key={grupo.clave} style={estilos.grupoMes}>
          <Text accessibilityRole="header" style={estilos.cabeceraMes}>
            {grupo.titulo}
          </Text>
          <View style={estilos.lista}>{grupo.eventos.map(pintarTarjeta)}</View>
        </View>
      ))}
    </View>
  );
}
