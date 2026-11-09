import { useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { EstadoEvento, TipoEvento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { ESTADOS_EVENTO, etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFecha } from "../utils/fechas";
import { etiquetaTipoEvento, TIPOS_EVENTO } from "../utils/tiposEvento";
import { crearEstilosBloqueEvento } from "./BloqueEvento.styles";
import { BotonPrincipal, CampoFormulario, Mensaje } from "./PantallaBase";
import { BotonSecundario } from "./PantallaInterior";
import { SelectorDesplegable } from "./SelectorDesplegable";
import { SelectorHora } from "./SelectorHora";
import { SelectorOpciones } from "./SelectorOpciones";
import { SelectorVarios } from "./SelectorVarios";

const OPCIONES_TIPO = TIPOS_EVENTO.map((tipo) => ({
  valor: tipo,
  etiqueta: etiquetaTipoEvento(tipo),
}));

const OPCIONES_ESTADO = ESTADOS_EVENTO.map((estado) => ({
  valor: estado,
  etiqueta: etiquetaEstadoEvento(estado),
}));

// Sin campo de título: se genera solo a partir de tipo, lugar y fecha.
// Sin calendario propio: la fecha es el día elegido en el calendario del Calendario.
interface FormularioEventoProps {
  // null = sin elegir todavía
  tipo: TipoEvento | null;
  estado: EstadoEvento;
  fecha: string;
  hora: string;
  lugar: string;
  notas: string;
  tecnicos: Tecnico[];
  tecnicoIds: string[];
  // Solo para admin. Sin él, el bloque económico no existe
  datosEconomicos?: {
    cache: string;
    // Sin el dato real no se puede editar: se guardaría a ciegas
    errorCarga: string;
    cargando: boolean;
    onCambiarCache: (cache: string) => void;
  } | null;
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
  datosEconomicos = null,
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
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosBloqueEvento(tema), [tema]);
  const fechaVisible = formatearFecha(fecha);

  return (
    <View style={estilos.formulario}>
      <View style={estilos.grupo}>
        <SelectorDesplegable
          etiqueta="Tipo de evento"
          placeholder="Selecciona un tipo"
          opciones={OPCIONES_TIPO}
          valor={tipo}
          onCambiar={onCambiarTipo}
          disabled={procesando}
        />

        <View style={estilos.filaFechaHora}>
          <View
            accessible
            accessibilityLabel={`Fecha: ${fechaVisible}`}
            style={[estilos.columna, estilos.fecha]}
          >
            <Text style={estilos.etiqueta}>Fecha</Text>
            <Text style={estilos.valor}>{fechaVisible}</Text>
          </View>

          <View style={estilos.columna}>
            <SelectorHora hora={hora} onCambiarHora={onCambiarHora} disabled={procesando} />
          </View>
        </View>

        {/* Lugar, hora y notas son opcionales */}
        <CampoFormulario
          etiqueta="Lugar"
          etiquetaVisible={false}
          placeholder="Lugar"
          value={lugar}
          onChangeText={onCambiarLugar}
          editable={!procesando}
          autoCapitalize="words"
        />
      </View>

      {tecnicos.length === 0 ? (
        <View style={estilos.campo}>
          <Text style={estilos.etiquetaCampo}>Técnicos</Text>
          <Text style={estilos.secundario}>La banda todavía no tiene técnicos.</Text>
        </View>
      ) : (
        <SelectorVarios
          etiqueta="Técnicos"
          opciones={tecnicos.map(({ id, nombre }) => ({ valor: id, etiqueta: nombre }))}
          elegidos={tecnicoIds}
          onAlternar={onAlternarTecnico}
          disabled={procesando}
        />
      )}

      <SelectorOpciones
        etiqueta="Estado"
        opciones={OPCIONES_ESTADO}
        valor={estado}
        onCambiar={onCambiarEstado}
        disabled={procesando}
        suave
      />

      <View style={estilos.grupo}>
        {datosEconomicos !== null && (
          <CampoFormulario
            etiqueta="Caché acordado"
            value={datosEconomicos.cache}
            onChangeText={datosEconomicos.onCambiarCache}
            editable={!procesando && !datosEconomicos.cargando && datosEconomicos.errorCarga === ""}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
        )}
        {datosEconomicos !== null && datosEconomicos.errorCarga !== "" && (
          <Mensaje tipo="error" texto={datosEconomicos.errorCarga} />
        )}

        <CampoFormulario
          etiqueta="Notas"
          etiquetaVisible={false}
          placeholder="Notas"
          value={notas}
          onChangeText={onCambiarNotas}
          editable={!procesando}
          multiline
          textAlignVertical="top"
        />
      </View>

      {error !== "" && <Mensaje tipo="error" texto={error} />}

      <View style={estilos.acciones}>
        <BotonPrincipal
          titulo={editando ? "Guardar cambios" : "Guardar evento"}
          onPress={onGuardar}
          disabled={procesando}
        />
        {/* Crear o editar: Cancelar siempre descarta y cierra el formulario */}
        <View style={estilos.accionSecundaria}>
          <BotonSecundario titulo="Cancelar" onPress={onCancelar} disabled={procesando} />
        </View>
      </View>
    </View>
  );
}
