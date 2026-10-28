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
  procesando: boolean;
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
  procesando,
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
        editable={!procesando}
      />

      <CalendarioEventos
        fecha={fecha}
        fechasConEventos={fechasConEventos}
        onSeleccionarFecha={(fechaSeleccionada) => {
          // El calendario no tiene modo deshabilitado: se ignora la fecha mientras se guarda
          if (!procesando) {
            onSeleccionarFecha(fechaSeleccionada);
          }
        }}
      />

      <Text>Tipo de evento: {tipo}</Text>

      <View>
        <Button
          title="Concierto"
          onPress={() => onCambiarTipo("concierto")}
          disabled={procesando}
        />

        <Button
          title="Ensayo"
          onPress={() => onCambiarTipo("ensayo")}
          disabled={procesando}
        />

        <Button
          title="Reunión"
          onPress={() => onCambiarTipo("reunion")}
          disabled={procesando}
        />

        <Button
          title="Otro"
          onPress={() => onCambiarTipo("otro")}
          disabled={procesando}
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
              disabled={procesando}
            />
          );
        })}
      </View>

      {error !== "" && <Text>{error}</Text>}

      <Button
        title={editando ? "Guardar cambios" : "Guardar evento"}
        onPress={onGuardar}
        disabled={procesando}
      />

      {editando && (
        <Button
          title="Cancelar"
          onPress={onCancelar}
          disabled={procesando}
        />
      )}

      <Text>Estado: {estado}</Text>

      <View>
        <Button
          title="Pendiente"
          onPress={() => onCambiarEstado("pendiente")}
          disabled={procesando}
        />

        <Button
          title="Confirmado"
          onPress={() => onCambiarEstado("confirmado")}
          disabled={procesando}
        />

        <Button
          title="Cancelado"
          onPress={() => onCambiarEstado("cancelado")}
          disabled={procesando}
        />
      </View>
    </>
  );
}
