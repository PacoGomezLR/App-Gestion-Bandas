import { useMemo, useState } from "react";
import { Text } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { Evento } from "../types/evento";
import type { DatosMovimiento, MovimientoFinanciero } from "../types/finanzas";
import {
  borradorDeMovimiento,
  borradorNuevo,
  cambiarTipoBorrador,
  LONGITUD_MAXIMA_CONCEPTO,
  LONGITUD_MAXIMA_NOTAS,
  validarBorrador,
} from "../utils/borradorMovimiento";
import {
  categoriasDeTipo,
  etiquetaCategoria,
  etiquetaTipoMovimiento,
  TIPOS_MOVIMIENTO,
} from "../utils/categoriasMovimiento";
import { fechaDeHoy } from "../utils/fechas";
import { crearEstilosFinanzas } from "./Finanzas.styles";
import { BotonPrincipal, CampoFormulario, Mensaje } from "./PantallaBase";
import { BotonSecundario, Tarjeta } from "./PantallaInterior";
import { SelectorEvento } from "./SelectorEvento";
import { SelectorFecha } from "./SelectorFecha";
import { SelectorOpciones } from "./SelectorOpciones";

const OPCIONES_TIPO = TIPOS_MOVIMIENTO.map((tipo) => ({
  valor: tipo,
  etiqueta: etiquetaTipoMovimiento(tipo),
}));

interface FormularioMovimientoProps {
  // Sin movimiento es un alta, con la fecha de hoy ya puesta
  movimiento?: MovimientoFinanciero;
  eventos: Evento[];
  errorEventos: string;
  // Fallo de la base al guardar: lo escrito sigue en el formulario
  errorGuardado: string;
  procesando: boolean;
  onGuardar: (datos: DatosMovimiento) => void;
  onCancelar: () => void;
}

export function FormularioMovimiento({
  movimiento,
  eventos,
  errorEventos,
  errorGuardado,
  procesando,
  onGuardar,
  onCancelar,
}: FormularioMovimientoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const editando = movimiento !== undefined;
  const [borrador, setBorrador] = useState(() =>
    editando ? borradorDeMovimiento(movimiento) : borradorNuevo(fechaDeHoy())
  );
  const [errorValidacion, setErrorValidacion] = useState("");

  const { tipo } = borrador;
  const opcionesCategoria =
    tipo === null
      ? []
      : categoriasDeTipo(tipo).map((categoria) => ({
          valor: categoria,
          etiqueta: etiquetaCategoria(categoria),
        }));

  function guardar() {
    const resultado = validarBorrador(borrador);

    if (!resultado.valido) {
      setErrorValidacion(resultado.error);
      return;
    }

    setErrorValidacion("");
    onGuardar(resultado.datos);
  }

  const textoGuardar = editando ? "Guardar cambios" : "Guardar movimiento";

  return (
    <Tarjeta titulo={editando ? "Editar movimiento" : "Nuevo movimiento"}>
      <SelectorOpciones
        etiqueta="Tipo"
        opciones={OPCIONES_TIPO}
        valor={tipo}
        onCambiar={(nuevoTipo) => setBorrador(cambiarTipoBorrador(borrador, nuevoTipo))}
        disabled={procesando}
      />

      <CampoFormulario
        etiqueta="Importe"
        value={borrador.importe}
        onChangeText={(importe) => setBorrador({ ...borrador, importe })}
        editable={!procesando}
        keyboardType="decimal-pad"
        placeholder="0,00"
      />

      <CampoFormulario
        etiqueta="Concepto"
        value={borrador.concepto}
        onChangeText={(concepto) => setBorrador({ ...borrador, concepto })}
        editable={!procesando}
        autoCapitalize="sentences"
        maxLength={LONGITUD_MAXIMA_CONCEPTO}
      />

      {/* Las categorías dependen del tipo: sin tipo no hay ninguna que ofrecer */}
      {tipo === null ? (
        <Text style={estilos.ayudaCampo}>
          Elige primero si es un ingreso o un gasto para ver las categorías.
        </Text>
      ) : (
        <SelectorOpciones
          etiqueta="Categoría"
          opciones={opcionesCategoria}
          valor={borrador.categoria}
          onCambiar={(categoria) => setBorrador({ ...borrador, categoria })}
          disabled={procesando}
        />
      )}

      <SelectorFecha
        etiqueta="Fecha"
        fecha={borrador.fecha}
        onCambiar={(fecha) => setBorrador({ ...borrador, fecha })}
        disabled={procesando}
      />

      <SelectorEvento
        eventos={eventos}
        eventoId={borrador.eventoId}
        onCambiar={(eventoId) => setBorrador({ ...borrador, eventoId })}
        disabled={procesando}
      />
      {errorEventos !== "" && <Mensaje tipo="error" texto={errorEventos} />}

      <CampoFormulario
        etiqueta="Notas"
        value={borrador.notas}
        onChangeText={(notas) => setBorrador({ ...borrador, notas })}
        editable={!procesando}
        maxLength={LONGITUD_MAXIMA_NOTAS}
        multiline
        textAlignVertical="top"
      />

      {errorValidacion !== "" && <Mensaje tipo="error" texto={errorValidacion} />}
      {errorValidacion === "" && errorGuardado !== "" && (
        <Mensaje tipo="error" texto={errorGuardado} />
      )}

      <BotonPrincipal
        titulo={procesando ? "Guardando..." : textoGuardar}
        onPress={guardar}
        disabled={procesando}
      />
      <BotonSecundario titulo="Cancelar" onPress={onCancelar} disabled={procesando} />
    </Tarjeta>
  );
}
