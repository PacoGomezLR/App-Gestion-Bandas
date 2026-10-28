import { Button, Text, TextInput, View } from "react-native";
import type { EstadoEvento, TipoEvento } from "../types/evento";
import type { Miembro } from "../types/miembro";
import type { Tecnico } from "../types/tecnico";
import { etiquetaTipoEvento, TIPOS_EVENTO } from "../utils/tiposEvento";
import { CalendarioEventos } from "./CalendarioEventos";

interface FormularioEventoProps {
  titulo: string;
  tipo: TipoEvento;
  estado: EstadoEvento;
  fecha: string;
  hora: string;
  lugar: string;
  notas: string;
  fechasConEventos: string[];
  tecnicos: Tecnico[];
  tecnicoIds: string[];
  miembros: Miembro[];
  miembroIds: string[];
  error: string;
  editando: boolean;
  procesando: boolean;
  onCambiarTitulo: (titulo: string) => void;
  onCambiarTipo: (tipo: TipoEvento) => void;
  onCambiarEstado: (estado: EstadoEvento) => void;
  onSeleccionarFecha: (fecha: string) => void;
  onCambiarHora: (hora: string) => void;
  onCambiarLugar: (lugar: string) => void;
  onCambiarNotas: (notas: string) => void;
  onAlternarTecnico: (tecnicoId: string) => void;
  onAlternarMiembro: (miembroId: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function FormularioEvento({
  titulo,
  tipo,
  estado,
  fecha,
  hora,
  lugar,
  notas,
  fechasConEventos,
  tecnicos,
  tecnicoIds,
  miembros,
  miembroIds,
  error,
  editando,
  procesando,
  onCambiarTitulo,
  onCambiarTipo,
  onCambiarEstado,
  onSeleccionarFecha,
  onCambiarHora,
  onCambiarLugar,
  onCambiarNotas,
  onAlternarTecnico,
  onAlternarMiembro,
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

      {/* Hora, lugar y notas son opcionales */}
      <TextInput
        placeholder="Hora (HH:MM)"
        value={hora}
        onChangeText={onCambiarHora}
        editable={!procesando}
      />

      <TextInput
        placeholder="Lugar"
        value={lugar}
        onChangeText={onCambiarLugar}
        editable={!procesando}
      />

      <TextInput
        placeholder="Notas"
        value={notas}
        onChangeText={onCambiarNotas}
        editable={!procesando}
        multiline
      />

      <Text>Tipo de evento: {etiquetaTipoEvento(tipo)}</Text>

      <View>
        {TIPOS_EVENTO.map((tipoEvento) => (
          <Button
            key={tipoEvento}
            title={etiquetaTipoEvento(tipoEvento)}
            onPress={() => onCambiarTipo(tipoEvento)}
            disabled={procesando}
          />
        ))}
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

      {/* Opcional: no se exige seleccionar ningún miembro */}
      <Text>Músicos que asistirán</Text>

      <View>
        {miembros.map((miembro) => {
          const seleccionado = miembroIds.includes(miembro.id);

          return (
            <Button
              key={miembro.id}
              title={
                seleccionado
                  ? `${miembro.nombre} ✓`
                  : miembro.nombre
              }
              onPress={() => onAlternarMiembro(miembro.id)}
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
