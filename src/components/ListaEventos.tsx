import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import type { CachesPorEvento, ErrorEliminacionEvento, Evento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { formatearCentimos } from "../utils/dinero";
import { etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFechaConBarras } from "../utils/fechas";
import { etiquetaTipoEvento } from "../utils/tiposEvento";
import { BloqueEvento } from "./BloqueEvento";
import { crearEstilosBloqueEvento } from "./BloqueEvento.styles";
import { coloresBadge, crearEstilosListaEventos } from "./ListaEventos.styles";
import { Mensaje } from "./PantallaBase";
import { BotonDestructivo, BotonSecundario } from "./PantallaInterior";

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

  return cache === undefined ? "Sin caché registrado" : formatearCentimos(cache);
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
}: ListaEventosProps) {
  // Solo un evento desplegado a la vez; no se persiste
  const [eventoAbiertoId, setEventoAbiertoId] = useState<string | null>(null);
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosListaEventos(tema), [tema]);
  const estilosBloque = useMemo(() => crearEstilosBloqueEvento(tema), [tema]);
  const badges = useMemo(() => coloresBadge(estilos), [estilos]);

  return (
    <View style={estilos.lista}>
      {eventos.map((evento) => {
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
                pressed && estilos.vistaPreviaPulsada,
              ]}
            >
              <View style={estilos.filaVistaPrevia}>
                <View style={estilos.textosVistaPrevia}>
                  {/* Tipo destacado y lugar en segundo plano; el texto completo sigue siendo "Tipo Lugar" */}
                  <Text style={estilos.tipo}>
                    {tipo}
                    {lugar !== "" && <Text style={estilos.lugar}>{` ${lugar}`}</Text>}
                  </Text>
                  {/* Solo la fecha: la hora se queda en el detalle */}
                  <Text style={estilos.fechaVistaPrevia}>{fechaVisible}</Text>
                </View>
                {/* El estado siempre se muestra con texto, no solo con color */}
                <View style={[estilos.badge, badges[evento.estado].fondo]}>
                  <Text style={[estilos.textoBadge, badges[evento.estado].texto]}>
                    {etiquetaEstado}
                  </Text>
                </View>
              </View>
            </Pressable>

            {abierto && (
              <View style={estilos.detalle}>
                {/* El título se sigue guardando, pero no se muestra: repite tipo, lugar y fecha */}
                <View style={estilos.resumenDetalle}>
                  <Text style={estilos.textoDetalle}>
                    {/* Campos opcionales: solo se muestran si tienen valor */}
                    {evento.hora === "" ? fechaVisible : `${fechaVisible} · ${evento.hora}`}
                  </Text>
                  {evento.lugar !== "" && <Text style={estilos.textoDetalle}>{evento.lugar}</Text>}
                </View>

                <BloqueEvento titulo="Estado">
                  <Text style={estilos.textoDetalle}>{etiquetaEstado}</Text>
                </BloqueEvento>

                <BloqueEvento titulo="Personal">
                  <Text style={estilos.textoDetalle}>
                    {nombresTecnicos.length > 0 ? nombresTecnicos.join(", ") : "Sin asignar"}
                  </Text>
                </BloqueEvento>

                {datosEconomicos !== null && (
                  <BloqueEvento titulo="Datos económicos">
                    <View style={estilos.resumenDetalle}>
                      <Text style={estilosBloque.secundario}>Caché acordado</Text>
                      <Text style={estilosBloque.importe}>
                        {textoCache(datosEconomicos.caches[evento.id], datosEconomicos)}
                      </Text>
                    </View>
                  </BloqueEvento>
                )}

                {evento.notas !== "" && (
                  <BloqueEvento titulo="Notas">
                    <Text style={estilos.textoDetalle}>{evento.notas}</Text>
                  </BloqueEvento>
                )}

                {puedeEditar && (
                  <View style={estilosBloque.acciones}>
                    <BotonSecundario
                      titulo="Editar"
                      onPress={() => onEditar(evento)}
                      disabled={procesando}
                    />

                    <BotonDestructivo
                      titulo="Eliminar"
                      onPress={() => onEliminar(evento.id)}
                      disabled={procesando}
                    />

                    {errorEliminacion?.eventoId === evento.id && (
                      <Mensaje tipo="error" texto={errorEliminacion.mensaje} />
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
