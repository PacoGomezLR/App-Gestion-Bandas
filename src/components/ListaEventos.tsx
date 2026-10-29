import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import type { EstadoEvento, Evento } from "../types/evento";
import type { Miembro } from "../types/miembro";
import type { Tecnico } from "../types/tecnico";
import { etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFecha } from "../utils/fechas";
import { etiquetaTipoEvento } from "../utils/tiposEvento";

interface ListaEventosProps {
  eventos: Evento[];
  tecnicos: Tecnico[];
  miembros: Miembro[];
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

export function ListaEventos({ eventos, tecnicos, miembros, procesando, puedeEditar, onEliminar, onEditar }: ListaEventosProps) {
  // Solo un evento desplegado a la vez; no se persiste
  const [eventoAbiertoId, setEventoAbiertoId] = useState<string | null>(null);

  return (
    <>
      {eventos.map((evento) => {
        const abierto = eventoAbiertoId === evento.id;
        const tituloVistaPrevia = obtenerTituloVistaPrevia(evento);
        const etiquetaEstado = etiquetaEstadoEvento(evento.estado);

        const nombresTecnicos = evento.tecnicoIds
          .map((id) =>
            tecnicos.find((tecnico) => tecnico.id === id)?.nombre
          )
          .filter((nombre): nombre is string => nombre !== undefined);

        const nombresMiembros = evento.miembroIds
          .map((id) =>
            miembros.find((miembro) => miembro.id === id)?.nombre
          )
          .filter((nombre): nombre is string => nombre !== undefined);

        return (
          <View key={evento.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver detalles de ${tituloVistaPrevia}. Estado ${etiquetaEstado}`}
              accessibilityState={{ expanded: abierto }}
              onPress={() => setEventoAbiertoId(abierto ? null : evento.id)}
            >
              {/* flexWrap: en pantallas estrechas el estado pasa debajo del título */}
              <View style={styles.filaVistaPrevia}>
                <Text>{tituloVistaPrevia}</Text>
                {/* El estado siempre se muestra con texto, no solo con color */}
                <View style={[styles.badge, coloresBadge[evento.estado].fondo]}>
                  <Text style={coloresBadge[evento.estado].texto}>
                    {etiquetaEstado}
                  </Text>
                </View>
              </View>
            </Pressable>

            {abierto && (
              <View>
                <Text>Título: {evento.titulo}</Text>
                <Text>Tipo de evento: {etiquetaTipoEvento(evento.tipo)}</Text>
                <Text>Fecha: {formatearFecha(evento.fecha)}</Text>
                {/* Campos opcionales: solo se muestran si tienen valor */}
                {evento.hora !== "" && <Text>Hora: {evento.hora}</Text>}
                {evento.lugar !== "" && <Text>Lugar: {evento.lugar}</Text>}
                <Text>Estado: {etiquetaEstado}</Text>
                <Text>
                  Técnico: {nombresTecnicos.length > 0
                    ? nombresTecnicos.join(", ")
                    : "Sin asignar"}
                </Text>
                {/* Asignar músicos es opcional: si no hay ninguno válido, no se muestra la línea */}
                {nombresMiembros.length > 0 && (
                  <Text>
                    Músicos: {nombresMiembros.join(", ")}
                  </Text>
                )}
                {evento.notas !== "" && <Text>Nota: {evento.notas}</Text>}

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
    </>
  );
}

const styles = StyleSheet.create({
  filaVistaPrevia: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  fondoPendiente: {
    backgroundColor: "#FEF3C7",
  },
  textoPendiente: {
    color: "#78350F",
  },
  fondoConfirmado: {
    backgroundColor: "#15803D",
  },
  textoConfirmado: {
    color: "#FFFFFF",
  },
});

// Record obliga a dar colores a cada estado: si se añade uno, TypeScript avisa aquí
const coloresBadge: Record<
  EstadoEvento,
  { fondo: { backgroundColor: string }; texto: { color: string } }
> = {
  pendiente: { fondo: styles.fondoPendiente, texto: styles.textoPendiente },
  confirmado: { fondo: styles.fondoConfirmado, texto: styles.textoConfirmado },
};
