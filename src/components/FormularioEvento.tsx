import { useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { EstadoEvento, TipoEvento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { ESTADOS_EVENTO, etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFecha } from "../utils/fechas";
import { etiquetaTipoEvento, TIPOS_EVENTO } from "../utils/tiposEvento";
import { BloqueEvento } from "./BloqueEvento";
import { crearEstilosBloqueEvento } from "./BloqueEvento.styles";
import { BotonPrincipal, CampoFormulario, Mensaje } from "./PantallaBase";
import { BotonSecundario } from "./PantallaInterior";
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
  tipo: TipoEvento;
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

  return (
    <View style={estilos.formulario}>
      <BloqueEvento titulo="Datos del evento">
        <Text style={estilos.texto}>Fecha: {formatearFecha(fecha)}</Text>

        <SelectorOpciones
          etiqueta="Tipo de evento"
          opciones={OPCIONES_TIPO}
          valor={tipo}
          onCambiar={onCambiarTipo}
          disabled={procesando}
          suave
        />

        {/* Lugar, hora y notas son opcionales */}
        <CampoFormulario
          etiqueta="Lugar"
          value={lugar}
          onChangeText={onCambiarLugar}
          editable={!procesando}
          autoCapitalize="words"
        />

        <SelectorHora hora={hora} onCambiarHora={onCambiarHora} disabled={procesando} />
      </BloqueEvento>

      <BloqueEvento titulo="Personal">
        {tecnicos.length === 0 ? (
          <Text style={estilos.secundario}>La banda todavía no tiene técnicos.</Text>
        ) : (
          <SelectorVarios
            etiqueta="Técnicos asignados"
            opciones={tecnicos.map(({ id, nombre }) => ({ valor: id, etiqueta: nombre }))}
            elegidos={tecnicoIds}
            onAlternar={onAlternarTecnico}
            disabled={procesando}
          />
        )}
      </BloqueEvento>

      <BloqueEvento titulo="Estado">
        <SelectorOpciones
          etiqueta="Estado"
          etiquetaVisible={false}
          opciones={OPCIONES_ESTADO}
          valor={estado}
          onCambiar={onCambiarEstado}
          disabled={procesando}
          suave
        />
      </BloqueEvento>

      {datosEconomicos !== null && (
        <BloqueEvento titulo="Datos económicos">
          <CampoFormulario
            etiqueta="Caché acordado"
            value={datosEconomicos.cache}
            onChangeText={datosEconomicos.onCambiarCache}
            editable={!procesando && !datosEconomicos.cargando && datosEconomicos.errorCarga === ""}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <Text style={estilos.secundario}>Importe pactado por la actuación.</Text>
          {datosEconomicos.errorCarga !== "" && (
            <Mensaje tipo="error" texto={datosEconomicos.errorCarga} />
          )}
        </BloqueEvento>
      )}

      <BloqueEvento titulo="Notas">
        <CampoFormulario
          etiqueta="Notas"
          value={notas}
          onChangeText={onCambiarNotas}
          editable={!procesando}
          multiline
          textAlignVertical="top"
        />
      </BloqueEvento>

      {error !== "" && <Mensaje tipo="error" texto={error} />}

      <View style={estilos.acciones}>
        <BotonPrincipal
          titulo={editando ? "Guardar cambios" : "Guardar evento"}
          onPress={onGuardar}
          disabled={procesando}
        />
        {/* Crear o editar: Cancelar siempre descarta y cierra el formulario */}
        <BotonSecundario titulo="Cancelar" onPress={onCancelar} disabled={procesando} />
      </View>
    </View>
  );
}
