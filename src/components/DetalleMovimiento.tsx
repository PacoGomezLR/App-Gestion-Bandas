import { useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type { MovimientoFinanciero } from "../types/finanzas";
import { etiquetaCategoria, etiquetaTipoMovimiento } from "../utils/categoriasMovimiento";
import { formatearImporteMovimiento } from "../utils/dinero";
import { formatearFechaConBarras } from "../utils/fechas";
import { crearEstilosFinanzas } from "./Finanzas.styles";

interface DetalleMovimientoProps {
  movimiento: MovimientoFinanciero;
  // Texto del evento relacionado, ya resuelto; null si no se encuentra entre los cargados
  evento: string | null;
}

function BloqueDato({ etiqueta, texto }: { etiqueta: string; texto: string }) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);

  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${texto}`} style={estilos.bloqueDato}>
      <Text style={estilos.detalleMovimiento}>{etiqueta}</Text>
      <Text style={estilos.textoDato}>{texto}</Text>
    </View>
  );
}

// Solo datos: las acciones las pone la pantalla
export function DetalleMovimiento({ movimiento, evento }: DetalleMovimientoProps) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const { tipo, importeCentimos, categoria, fecha, eventoId, notas } = movimiento;

  return (
    <>
      <Text
        style={[estilos.importeDetalle, tipo === "ingreso" ? estilos.positivo : estilos.negativo]}
      >
        {formatearImporteMovimiento(tipo, importeCentimos)}
      </Text>

      <BloqueDato etiqueta="Tipo" texto={etiquetaTipoMovimiento(tipo)} />
      <BloqueDato etiqueta="Categoría" texto={etiquetaCategoria(categoria)} />
      <BloqueDato etiqueta="Fecha" texto={formatearFechaConBarras(fecha)} />
      {eventoId !== null && (
        <BloqueDato etiqueta="Evento" texto={evento ?? "Evento no disponible"} />
      )}
      {notas !== null && <BloqueDato etiqueta="Notas" texto={notas} />}
    </>
  );
}
