import { useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import type {
  EvolucionMensual,
  InformeFinanciero,
  InformePorCategoria,
  InformePorEvento,
  InformeResumenFinanciero,
  LineaCategoria,
  ResultadoCentimos,
  SaldoMensual,
} from "../types/finanzas";
import { etiquetaCategoria } from "../utils/categoriasMovimiento";
import { formatearCentimos } from "../utils/dinero";
import { etiquetaMes } from "../utils/fechas";
import { FilaDato } from "./FilaDato";
import { crearAnchoBarra, crearEstilosFinanzas } from "./Finanzas.styles";
import { EstadoVacio, Seccion, Tarjeta } from "./PantallaInterior";

const TITULOS_INFORME: Record<InformeFinanciero["tipo"], string> = {
  resumen: "Resumen financiero",
  eventos: "Rentabilidad por eventos",
  categorias: "Importes por categoría",
  evolucion: "Evolución del bote",
};

const SIN_MOVIMIENTOS = "No hay movimientos en este periodo.";

function InformeResumen({ informe }: { informe: InformeResumenFinanciero }) {
  return (
    <>
      <Tarjeta titulo={informe.periodo.etiqueta}>
        <FilaDato etiqueta="Saldo inicial" valor={formatearCentimos(informe.saldoInicialCentimos)} />
        <FilaDato etiqueta="Ingresos" valor={formatearCentimos(informe.ingresosCentimos)} />
        <FilaDato etiqueta="Gastos" valor={formatearCentimos(informe.gastosCentimos)} />
        <FilaDato
          etiqueta="Resultado del periodo"
          valor={formatearCentimos(informe.resultadoCentimos)}
        />
        <FilaDato
          etiqueta="Saldo al cierre"
          valor={formatearCentimos(informe.saldoCierreCentimos)}
          destacado
        />
      </Tarjeta>

      {/* Sin movimientos sigue habiendo cifras: el saldo anterior es información real */}
      {informe.movimientosEnPeriodo === 0 && (
        <EstadoVacio
          titulo={
            informe.movimientosEnHistorial === 0
              ? SIN_MOVIMIENTOS
              : "No hubo movimientos durante este periodo."
          }
        />
      )}
    </>
  );
}

function TarjetaResultado({ titulo, resultado }: { titulo: string; resultado: ResultadoCentimos }) {
  return (
    <Tarjeta titulo={titulo}>
      <FilaDato etiqueta="Ingresos" valor={formatearCentimos(resultado.ingresosCentimos)} />
      <FilaDato etiqueta="Gastos" valor={formatearCentimos(resultado.gastosCentimos)} />
      <FilaDato
        etiqueta="Resultado"
        valor={formatearCentimos(resultado.resultadoCentimos)}
        destacado
      />
    </Tarjeta>
  );
}

function InformeEventos({ informe }: { informe: InformePorEvento }) {
  return (
    <>
      {informe.eventos.map((linea) => (
        <TarjetaResultado
          key={linea.eventoId}
          titulo={linea.etiqueta ?? "Evento no disponible"}
          resultado={linea}
        />
      ))}
      {informe.sinEvento !== null && (
        <TarjetaResultado titulo="Sin evento asociado" resultado={informe.sinEvento} />
      )}
    </>
  );
}

interface TarjetaCategoriasProps {
  titulo: string;
  lineas: LineaCategoria[];
  totalCentimos: number;
  textoVacio: string;
}

function TarjetaCategorias({ titulo, lineas, totalCentimos, textoVacio }: TarjetaCategoriasProps) {
  return (
    <Tarjeta titulo={titulo}>
      {lineas.length === 0 ? (
        <EstadoVacio titulo={textoVacio} />
      ) : (
        <>
          {lineas.map(({ categoria, totalCentimos: total }) => (
            <FilaDato
              key={categoria}
              etiqueta={etiquetaCategoria(categoria)}
              valor={formatearCentimos(total)}
            />
          ))}
          <FilaDato etiqueta="Total" valor={formatearCentimos(totalCentimos)} destacado />
        </>
      )}
    </Tarjeta>
  );
}

function InformeCategorias({ informe }: { informe: InformePorCategoria }) {
  return (
    <>
      <TarjetaCategorias
        titulo="Ingresos por categoría"
        lineas={informe.ingresos}
        totalCentimos={informe.totalIngresosCentimos}
        textoVacio="Sin ingresos en este periodo"
      />
      <TarjetaCategorias
        titulo="Gastos por categoría"
        lineas={informe.gastos}
        totalCentimos={informe.totalGastosCentimos}
        textoVacio="Sin gastos en este periodo"
      />
    </>
  );
}

function MesEvolucion({ linea, maximo }: { linea: SaldoMensual; maximo: number }) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);
  const { mes, saldoCierreCentimos } = linea;
  // Solo dibuja: el dato exacto es el número que va encima
  const porcentaje = maximo === 0 ? 0 : Math.round((Math.abs(saldoCierreCentimos) * 100) / maximo);

  return (
    <View style={estilos.mesEvolucion}>
      <FilaDato etiqueta={etiquetaMes(mes)} valor={formatearCentimos(saldoCierreCentimos)} />
      <View style={estilos.pistaBarra}>
        <View
          style={[
            estilos.barra,
            saldoCierreCentimos < 0 && estilos.barraNegativa,
            crearAnchoBarra(porcentaje),
          ]}
        />
      </View>
    </View>
  );
}

function InformeEvolucion({ informe }: { informe: EvolucionMensual }) {
  const maximo = Math.max(...informe.meses.map(({ saldoCierreCentimos }) => Math.abs(saldoCierreCentimos)));

  return (
    <Tarjeta titulo="Saldo al cierre de cada mes">
      {informe.meses.map((linea) => (
        <MesEvolucion key={linea.mes} linea={linea} maximo={maximo} />
      ))}
    </Tarjeta>
  );
}

function ContenidoInforme({ informe }: { informe: InformeFinanciero }) {
  switch (informe.tipo) {
    case "resumen":
      return <InformeResumen informe={informe} />;
    case "eventos":
      return <InformeEventos informe={informe} />;
    case "categorias":
      return <InformeCategorias informe={informe} />;
    case "evolucion":
      return <InformeEvolucion informe={informe} />;
  }
}

// Solo pinta: todos los importes llegan ya calculados
export function ResultadoInforme({ informe }: { informe: InformeFinanciero }) {
  const tema = useTheme();
  const estilos = useMemo(() => crearEstilosFinanzas(tema), [tema]);

  return (
    <Seccion titulo={TITULOS_INFORME[informe.tipo]}>
      <View style={estilos.bloqueInforme}>
        {informe.tipo !== "resumen" && (
          <Text style={estilos.periodoInforme}>{informe.periodo.etiqueta}</Text>
        )}

        {informe.tipo === "resumen" || informe.movimientosEnPeriodo > 0 ? (
          <ContenidoInforme informe={informe} />
        ) : (
          <EstadoVacio titulo={SIN_MOVIMIENTOS} />
        )}
      </View>
    </Seccion>
  );
}
