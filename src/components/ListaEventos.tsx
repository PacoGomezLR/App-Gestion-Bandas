import { Button, Text, View } from "react-native";
import type { Evento } from "../types/evento";
import { formatearFecha } from "../utils/fechas";

interface ListaEventosProps {
  eventos: Evento[];
  onEliminar: (id: string) => void;
  onEditar: (evento: Evento) => void;
}

export function ListaEventos({ eventos, onEliminar, onEditar }: ListaEventosProps) {
  return (
    <>
      {eventos.map((evento) => (
        <View key={evento.id}>
          <Text>{evento.titulo}</Text>
          <Text>{evento.tipo}</Text>
          <Text>{formatearFecha(evento.fecha)}</Text>
          <Text>{evento.estado}</Text>

          <Button
            title="Eliminar"
            onPress={() => onEliminar(evento.id)}
          />

          <Button
            title="Editar"
            onPress={() => onEditar(evento)}
          />
        </View>
      ))}
    </>
  );
}
