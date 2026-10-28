import { Button, Text, View } from "react-native";
import type { Evento } from "../types/evento";
import type { Miembro } from "../types/miembro";
import type { Tecnico } from "../types/tecnico";
import { formatearFecha } from "../utils/fechas";

interface ListaEventosProps {
  eventos: Evento[];
  tecnicos: Tecnico[];
  miembros: Miembro[];
  procesando: boolean;
  onEliminar: (id: string) => void;
  onEditar: (evento: Evento) => void;
}

export function ListaEventos({ eventos, tecnicos, miembros, procesando, onEliminar, onEditar }: ListaEventosProps) {
  return (
    <>
      {eventos.map((evento) => {
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
            <Text>{evento.titulo}</Text>
            <Text>{evento.tipo}</Text>
            <Text>{formatearFecha(evento.fecha)}</Text>
            {/* Campos opcionales: solo se muestran si tienen valor */}
            {evento.hora !== "" && <Text>Hora: {evento.hora}</Text>}
            {evento.lugar !== "" && <Text>Lugar: {evento.lugar}</Text>}
            {evento.notas !== "" && <Text>Tiene notas</Text>}
            <Text>{evento.estado}</Text>
            <Text>
              Técnicos: {nombresTecnicos.length > 0
                ? nombresTecnicos.join(", ")
                : "Sin asignar"}
            </Text>
            {/* Asignar músicos es opcional: si no hay ninguno válido, no se muestra la línea */}
            {nombresMiembros.length > 0 && (
              <Text>
                Músicos: {nombresMiembros.join(", ")}
              </Text>
            )}

            <Button
              title="Eliminar"
              onPress={() => onEliminar(evento.id)}
              disabled={procesando}
            />

            <Button
              title="Editar"
              onPress={() => onEditar(evento)}
              disabled={procesando}
            />
          </View>
        );
      })}
    </>
  );
}
