import { Button, Text, TextInput, View } from "react-native";
import type { EstadoEvento, TipoEvento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { CalendarioEventos } from "./CalendarioEventos";

interface FormularioEventoProps {
  titulo: string;
  tipo: TipoEvento;
  estado: EstadoEvento;
  fecha: string;
  fechasConEventos: string[];
  tecnicos: Tecnico[];
  tecnicoIds: string[];
  error: string;
  editando: boolean;
  onCambiarTitulo: (titulo: string) => void;
  onCambiarTipo: (tipo: TipoEvento) => void;
  onCambiarEstado: (estado: EstadoEvento) => void;
  onSeleccionarFecha: (fecha: string) => void;
  onAlternarTecnico: (tecnicoId: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function FormularioEvento({
  titulo,
  tipo,
  estado,
  fecha,
  fechasConEventos,
  tecnicos,
  tecnicoIds,
  error,
  editando,
  onCambiarTitulo,
  onCambiarTipo,
  onCambiarEstado,
  onSeleccionarFecha,
  onAlternarTecnico,
  onGuardar,
  onCancelar,
}: FormularioEventoProps) {
  return (
    <>
      <TextInput
        placeholder="Título del evento"
        value={titulo}
        onChangeText={onCambiarTitulo}
      />

      <CalendarioEventos
        fecha={fecha}
        fechasConEventos={fechasConEventos}
        onSeleccionarFecha={onSeleccionarFecha}
      />

      <Text>Tipo de evento: {tipo}</Text>

      <View>
        <Button
          title="Concierto"
          onPress={() => onCambiarTipo("concierto")}
        />

        <Button
          title="Ensayo"
          onPress={() => onCambiarTipo("ensayo")}
        />

        <Button
          title="Reunión"
          onPress={() => onCambiarTipo("reunion")}
        />

        <Button
          title="Otro"
          onPress={() => onCambiarTipo("otro")}
        />
      </View>

      <Text>Técnicos asignados</Text>

      <View>
        {tecnicos.map((tecnico) => {
          const seleccionado = tecnicoIds.includes(tecnico.id);

          return (
            <Button
              key={tecnico.id}
              title={
                seleccionado
                  ? `${tecnico.nombre} ✓`
                  : tecnico.nombre
              }
              onPress={() => onAlternarTecnico(tecnico.id)}
            />
          );
        })}
      </View>

      {error !== "" && <Text>{error}</Text>}

      <Button
        title={editando ? "Guardar cambios" : "Guardar evento"}
        onPress={onGuardar}
      />

      {editando && (
        <Button
          title="Cancelar"
          onPress={onCancelar}
        />
      )}

      <Text>Estado: {estado}</Text>

      <View>
        <Button
          title="Pendiente"
          onPress={() => onCambiarEstado("pendiente")}
        />

        <Button
          title="Confirmado"
          onPress={() => onCambiarEstado("confirmado")}
        />

        <Button
          title="Cancelado"
          onPress={() => onCambiarEstado("cancelado")}
        />
      </View>
    </>
  );
}
