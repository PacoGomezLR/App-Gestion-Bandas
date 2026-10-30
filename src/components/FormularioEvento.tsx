import { Button, Text, TextInput, View } from "react-native";
import type { EstadoEvento, TipoEvento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { ESTADOS_EVENTO, etiquetaEstadoEvento } from "../utils/estadosEvento";
import { etiquetaTipoEvento, TIPOS_EVENTO } from "../utils/tiposEvento";
import { CalendarioEventos } from "./CalendarioEventos";
import { SelectorHora } from "./SelectorHora";

// Sin campo de título: se genera solo a partir de tipo, lugar y fecha
interface FormularioEventoProps {
  tipo: TipoEvento;
  estado: EstadoEvento;
  fecha: string;
  hora: string;
  lugar: string;
  notas: string;
  fechasConEventos: string[];
  tecnicos: Tecnico[];
  tecnicoIds: string[];
  error: string;
  editando: boolean;
  procesando: boolean;
  onCambiarTipo: (tipo: TipoEvento) => void;
  onCambiarEstado: (estado: EstadoEvento) => void;
  onSeleccionarFecha: (fecha: string) => void;
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
  fechasConEventos,
  tecnicos,
  tecnicoIds,
  error,
  editando,
  procesando,
  onCambiarTipo,
  onCambiarEstado,
  onSeleccionarFecha,
  onCambiarHora,
  onCambiarLugar,
  onCambiarNotas,
  onAlternarTecnico,
  onGuardar,
  onCancelar,
}: FormularioEventoProps) {
  return (
    <>
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

      {editando && (
        <Button
          title="Cancelar"
          onPress={onCancelar}
          disabled={procesando}
        />
      )}
    </>
  );
}
