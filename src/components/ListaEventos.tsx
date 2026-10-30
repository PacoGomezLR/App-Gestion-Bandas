import { useMemo, useState } from "react";
import { Button, Pressable, Text, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import type { Evento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFechaConBarras } from "../utils/fechas";
import { etiquetaTipoEvento } from "../utils/tiposEvento";
import { coloresBadge, crearEstilosListaEventos } from "./ListaEventos.styles";

interface ListaEventosProps {
  eventos: Evento[];
  tecnicos: Tecnico[];
  procesando: boolean;
  // Solo el admin de la banda edita o elimina; el resto solo consulta
  puedeEditar: boolean;
  onEliminar: (id: string) => void;
  onEditar: (evento: Evento) => void;
}

// Tipo + lugar, por ejemplo "Boda Lucena"; sin lugar, solo el tipo
function obtenerTituloVistaPrevia(evento: Evento): string {
  const tipo = etiquetaTipoEvento(evento.tipo);
  const lugar = evento.lugar.trim();

  return lugar ? `${tipo} ${lugar}` : tipo;
}

export function ListaEventos({ eventos, tecnicos, procesando, puedeEditar, onEliminar, onEditar }: ListaEventosProps) {
  // Solo un evento desplegado a la vez; no se persiste
  const [eventoAbiertoId, setEventoAbiertoId] = useState<string | null>(null);
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosListaEventos(tema), [tema]);
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
                <Text style={estilos.textoDetalle}>Tipo de evento: {etiquetaTipoEvento(evento.tipo)}</Text>
                <Text style={estilos.textoDetalle}>Fecha: {fechaVisible}</Text>
                {/* Campos opcionales: solo se muestran si tienen valor */}
                {evento.hora !== "" && <Text style={estilos.textoDetalle}>Hora: {evento.hora}</Text>}
                {evento.lugar !== "" && <Text style={estilos.textoDetalle}>Lugar: {evento.lugar}</Text>}
                <Text style={estilos.textoDetalle}>Estado: {etiquetaEstado}</Text>
                <Text style={estilos.textoDetalle}>
                  Técnico: {nombresTecnicos.length > 0
                    ? nombresTecnicos.join(", ")
                    : "Sin asignar"}
                </Text>
                {evento.notas !== "" && <Text style={estilos.textoDetalle}>Nota: {evento.notas}</Text>}

                {puedeEditar && (
                  <>
                    <Button
                      title="Editar"
                      onPress={() => onEditar(evento)}
                      disabled={procesando}
                    />

                    <Button
                      title="Eliminar"
                      onPress={() => onEliminar(evento.id)}
                      disabled={procesando}
                    />
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
