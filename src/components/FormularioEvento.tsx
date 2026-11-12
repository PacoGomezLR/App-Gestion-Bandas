import { useCallback, useMemo, useRef } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { type CampoNativo, enfocarCampo } from "@/hooks/plataformaDesplazamiento";
import type { EstadoEvento, TipoEvento } from "../types/evento";
import type { Tecnico } from "../types/tecnico";
import { ESTADOS_EVENTO, etiquetaEstadoEvento } from "../utils/estadosEvento";
import { formatearFecha } from "../utils/fechas";
import { etiquetaTipoEvento, TIPOS_EVENTO } from "../utils/tiposEvento";
import { crearEstilosBloqueEvento } from "./BloqueEvento.styles";
import { DestinoDesplazamiento } from "./DestinoDesplazamiento";
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
  // Lo escrito en el campo, todavía sin validar
  googleMapsUrl: string;
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
  onCambiarGoogleMapsUrl: (url: string) => void;
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
  googleMapsUrl,
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
  onCambiarGoogleMapsUrl,
  onCambiarNotas,
  onAlternarTecnico,
  onGuardar,
  onCancelar,
}: FormularioEventoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosBloqueEvento(tema), [tema]);
  const fechaVisible = formatearFecha(fecha);
  // Campos de texto a los que la pantalla puede llevar (y enfocar) si tienen un error
  const campoMaps = useRef<CampoNativo>(null);
  const campoCache = useRef<CampoNativo>(null);
  const enfocarMaps = useCallback(() => enfocarCampo(campoMaps), []);
  const enfocarCache = useCallback(() => enfocarCampo(campoCache), []);

  return (
    <View style={estilos.formulario}>
      <View style={estilos.grupo}>
        {/* El primer dato que hay que rellenar: aquí lleva la pantalla al abrir el formulario */}
        <DestinoDesplazamiento clave="evento.tipo">
          <SelectorDesplegable
            etiqueta="Tipo de evento"
            placeholder="Selecciona un tipo"
            opciones={OPCIONES_TIPO}
            valor={tipo}
            onCambiar={onCambiarTipo}
            disabled={procesando}
          />
        </DestinoDesplazamiento>

        <DestinoDesplazamiento clave="evento.fecha">
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
              <DestinoDesplazamiento clave="evento.hora">
                <SelectorHora hora={hora} onCambiarHora={onCambiarHora} disabled={procesando} />
              </DestinoDesplazamiento>
            </View>
          </View>
        </DestinoDesplazamiento>

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

        {/* Otro dato, no otra forma de escribir el lugar: se abre tal cual se pegó */}
        <DestinoDesplazamiento clave="evento.maps" enfocar={enfocarMaps}>
          <View style={estilos.campo}>
            <CampoFormulario
              ref={campoMaps}
              etiqueta="Enlace de Google Maps"
              placeholder="https://maps.app.goo.gl/..."
              value={googleMapsUrl}
              onChangeText={onCambiarGoogleMapsUrl}
              editable={!procesando}
              keyboardType="url"
              textContentType="URL"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={estilos.secundario}>
              Pega aquí el enlace compartido desde Google Maps.
            </Text>
          </View>
        </DestinoDesplazamiento>
      </View>

      {tecnicos.length === 0 ? (
        <View style={estilos.campo}>
          <Text style={estilos.etiquetaCampo}>Técnicos</Text>
          <Text style={estilos.secundario}>La banda todavía no tiene técnicos.</Text>
        </View>
      ) : (
        <SelectorVarios
          etiqueta="Técnicos"
          opciones={tecnicos.map(({ id, nombre }) => ({
            valor: id,
            etiqueta: nombre,
          }))}
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
          <DestinoDesplazamiento clave="evento.cache" enfocar={enfocarCache}>
            <CampoFormulario
              ref={campoCache}
              etiqueta="Caché acordado"
              value={datosEconomicos.cache}
              onChangeText={datosEconomicos.onCambiarCache}
              editable={
                !procesando && !datosEconomicos.cargando && datosEconomicos.errorCarga === ""
              }
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
          </DestinoDesplazamiento>
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

      {/* Un error que no es de un campo (por ejemplo, al guardar): la pantalla lleva aquí */}
      {error !== "" && (
        <DestinoDesplazamiento clave="evento.error">
          <Mensaje tipo="error" texto={error} />
        </DestinoDesplazamiento>
      )}

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
