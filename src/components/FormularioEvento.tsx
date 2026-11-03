import { Button, Text, TextInput, View } from "react-native";
import type { EstadoEvento, TipoEvento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { ESTADOS_EVENTO, etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFecha } from "../utils/fechas";
import { etiquetaTipoEvento, TIPOS_EVENTO } from "../utils/tiposEvento";
import { SelectorHora } from "./SelectorHora";

// Sin campo de título: se genera solo a partir de tipo, lugar y fecha.
// Sin calendario propio: la fecha es el día elegido en el calendario del Calendario.
interface FormularioEventoProps {
  tipo: TipoEvento;
  estado: EstadoEvento;
  fecha: string;
  hora: string;
  lugar: string;
  notas: string;
  tecnicos: Tecnico[];
  tecnicoIds: string[];
  error: string;
  editando: boolean;
  procesando: boolean;
  onCambiarTipo: (tipo: TipoEvento) => void;
  onCambiarEstado: (estado: EstadoEvento) => void;
  onCambiarHora: (hora: string) => void;
  onCambiarLugar: (lugar: string) => void;
  onCambiarNotas: (notas: string) => void;
  onAlternarTecnico: (tecnicoId: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
}

export function FormularioEvento({
  tipo,
  estado,
  fecha,
  hora,
  lugar,
  notas,
  tecnicos,
  tecnicoIds,
  error,
  editando,
  procesando,
  onCambiarTipo,
  onCambiarEstado,
  onCambiarHora,
  onCambiarLugar,
  onCambiarNotas,
  onAlternarTecnico,
  onGuardar,
  onCancelar,
}: FormularioEventoProps) {
  return (
    <>
      <Text>Fecha: {formatearFecha(fecha)}</Text>

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

      <TextInput
        placeholder="Lugar"
        value={lugar}
        onChangeText={onCambiarLugar}
        editable={!procesando}
      />

      {/* Lugar, hora y notas son opcionales */}
      <SelectorHora
        hora={hora}
        onCambiarHora={onCambiarHora}
        disabled={procesando}
      />

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

      <Text>Estado: {etiquetaEstadoEvento(estado)}</Text>

      <View>
        {ESTADOS_EVENTO.map((estadoEvento) => (
          <Button
            key={estadoEvento}
            title={etiquetaEstadoEvento(estadoEvento)}
            onPress={() => onCambiarEstado(estadoEvento)}
            disabled={procesando}
          />
        ))}
      </View>

      <TextInput
        placeholder="Notas"
        value={notas}
        onChangeText={onCambiarNotas}
        editable={!procesando}
        multiline
      />

      {error !== "" && <Text>{error}</Text>}

      <Button
        title={editando ? "Guardar cambios" : "Guardar evento"}
        onPress={onGuardar}
        disabled={procesando}
      />

      {/* Crear o editar: Cancelar siempre descarta y cierra el formulario */}
      <Button
        title="Cancelar"
        onPress={onCancelar}
        disabled={procesando}
      />
    </>
  );
}
