import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { MovimientoFinanciero } from "../types/finanzas";
import { etiquetaCategoria, etiquetaTipoMovimiento } from "../utils/categoriasMovimiento";
import { formatearCentimos, formatearImporteMovimiento } from "../utils/dinero";
import { etiquetaMes, formatearFechaConBarras } from "../utils/fechas";
import { agruparPorMes } from "../utils/finanzas";
import { crearEstilosFinanzas } from "./Finanzas.styles";
import { GrupoFilas, Seccion } from "./PantallaInterior";

interface ListaMovimientosProps {
  movimientos: MovimientoFinanciero[];
  onElegir: (movimiento: MovimientoFinanciero) => void;
}

interface FilaMovimientoProps {
  movimiento: MovimientoFinanciero;
  onElegir: (movimiento: MovimientoFinanciero) => void;
}

function FilaMovimiento({ movimiento, onElegir }: FilaMovimientoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const { tipo, concepto, categoria, fecha, importeCentimos } = movimiento;
  const fechaVisible = formatearFechaConBarras(fecha);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${concepto}, ${etiquetaTipoMovimiento(tipo).toLowerCase()} de ${formatearCentimos(importeCentimos)}, ${fechaVisible}`}
      onPress={() => onElegir(movimiento)}
      style={({ pressed }) => [estilos.filaMovimiento, pressed && estilos.pulsado]}
    >
      <View style={estilos.textosMovimiento}>
        <Text style={estilos.conceptoMovimiento}>{concepto}</Text>
        <Text style={estilos.detalleMovimiento}>
          {fechaVisible} · {etiquetaCategoria(categoria)}
        </Text>
      </View>
      <Text style={[estilos.importeMovimiento, tipo === "ingreso" && estilos.positivo]}>
        {formatearImporteMovimiento(tipo, importeCentimos)}
      </Text>
    </Pressable>
  );
}

export function ListaMovimientos({ movimientos, onElegir }: ListaMovimientosProps) {
  return (
    <GrupoFilas>
      {movimientos.map((movimiento) => (
        <FilaMovimiento key={movimiento.id} movimiento={movimiento} onElegir={onElegir} />
      ))}
    </GrupoFilas>
  );
}

// El historial completo, con un apartado por mes
export function HistorialMovimientos({ movimientos, onElegir }: ListaMovimientosProps) {
  return agruparPorMes(movimientos).map((grupo) => (
    <Seccion key={grupo.mes} titulo={etiquetaMes(grupo.mes)}>
      <ListaMovimientos movimientos={grupo.movimientos} onElegir={onElegir} />
    </Seccion>
  ));
}
