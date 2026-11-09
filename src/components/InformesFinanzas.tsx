import { useMemo, useState } from "react";

import type { ClavePeriodo, MovimientoFinanciero, TipoInforme } from "../types/finanzas";
import { fechaDeHoy } from "../utils/fechas";
import { crearPeriodo, generarInforme } from "../utils/informesFinanzas";
import { BotonPrincipal, Mensaje } from "./PantallaBase";
import { ResultadoInforme } from "./ResultadoInforme";
import { SelectorOpciones } from "./SelectorOpciones";

const PERIODOS: readonly { valor: ClavePeriodo; etiqueta: string }[] = [
  { valor: "este_mes", etiqueta: "Este mes" },
  { valor: "mes_anterior", etiqueta: "Mes anterior" },
  { valor: "este_anio", etiqueta: "Este año" },
  { valor: "todo", etiqueta: "Todo" },
];

const TIPOS_INFORME: readonly { valor: TipoInforme; etiqueta: string }[] = [
  { valor: "resumen", etiqueta: "Resumen financiero" },
  { valor: "eventos", etiqueta: "Por eventos" },
  { valor: "categorias", etiqueta: "Por categorías" },
  { valor: "evolucion", etiqueta: "Evolución del bote" },
];

interface PeticionInforme {
  tipo: TipoInforme;
  clavePeriodo: ClavePeriodo;
  hoy: string;
}

interface InformesFinanzasProps {
  // Ya cargados: generar un informe no hace ninguna llamada de red
  movimientos: MovimientoFinanciero[];
  etiquetasEventos: Record<string, string>;
  errorEventos: string;
}

export function InformesFinanzas({
  movimientos,
  etiquetasEventos,
  errorEventos,
}: InformesFinanzasProps) {
  const [clavePeriodo, setClavePeriodo] = useState<ClavePeriodo>("este_mes");
  const [tipo, setTipo] = useState<TipoInforme>("resumen");
  const [peticion, setPeticion] = useState<PeticionInforme | null>(null);

  const informe = useMemo(() => {
    if (peticion === null) {
      return null;
    }

    return generarInforme(peticion.tipo, {
      movimientos,
      periodo: crearPeriodo(peticion.clavePeriodo, peticion.hoy),
      hoy: peticion.hoy,
      etiquetasEventos,
    });
  }, [peticion, movimientos, etiquetasEventos]);

  return (
    <>
      <SelectorOpciones
        etiqueta="Periodo"
        opciones={PERIODOS}
        valor={clavePeriodo}
        onCambiar={setClavePeriodo}
      />
      <SelectorOpciones
        etiqueta="Tipo de informe"
        opciones={TIPOS_INFORME}
        valor={tipo}
        onCambiar={setTipo}
      />
      <BotonPrincipal
        titulo="Generar informe"
        onPress={() => setPeticion({ tipo, clavePeriodo, hoy: fechaDeHoy() })}
      />

      {/* Sin eventos cargados, los nombres del informe por eventos no se conocen */}
      {informe?.tipo === "eventos" && errorEventos !== "" && (
        <Mensaje tipo="error" texto={errorEventos} />
      )}

      {informe !== null && <ResultadoInforme informe={informe} />}
    </>
  );
}
