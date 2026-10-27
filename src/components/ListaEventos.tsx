import { Button, Text, View } from "react-native";
import type { Evento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { formatearFecha } from "../utils/fechas";

interface ListaEventosProps {
  eventos: Evento[];
  tecnicos: Tecnico[];
  onEliminar: (id: string) => void;
  onEditar: (evento: Evento) => void;
}

export function ListaEventos({ eventos, tecnicos, onEliminar, onEditar }: ListaEventosProps) {
  return (
    <>
      {eventos.map((evento) => {
        const nombresTecnicos = evento.tecnicoIds
          .map((id) =>
            tecnicos.find((tecnico) => tecnico.id === id)?.nombre
          )
          .filter((nombre): nombre is string => nombre !== undefined);

        return (
          <View key={evento.id}>
            <Text>{evento.titulo}</Text>
            <Text>{evento.tipo}</Text>
            <Text>{formatearFecha(evento.fecha)}</Text>
            <Text>{evento.estado}</Text>
            <Text>
              Técnicos: {nombresTecnicos.length > 0
                ? nombresTecnicos.join(", ")
                : "Sin asignar"}
            </Text>

            <Button
              title="Eliminar"
              onPress={() => onEliminar(evento.id)}
            />

            <Button
              title="Editar"
              onPress={() => onEditar(evento)}
            />
          </View>
        );
      })}
    </>
  );
}
