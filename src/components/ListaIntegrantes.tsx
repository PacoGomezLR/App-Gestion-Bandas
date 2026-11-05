import type { IntegranteBanda } from "../types/banda";
import { EstadoVacio, FilaTexto, GrupoFilas } from "./PantallaInterior";

interface ListaIntegrantesProps {
  integrantes: IntegranteBanda[];
}

// Solo nombres: ni correos, ni identificadores, ni roles
export function ListaIntegrantes({ integrantes }: ListaIntegrantesProps) {
  if (integrantes.length === 0) {
    return <EstadoVacio titulo="Sin integrantes" detalle="Aquí aparecerán las personas de la banda." />;
  }

  return (
    <GrupoFilas>
      {integrantes.map(({ usuarioId, nombreVisible }) => (
        <FilaTexto
          key={usuarioId}
          titulo={nombreVisible ?? "Integrante sin nombre"}
          secundario={nombreVisible === null}
        />
      ))}
    </GrupoFilas>
  );
}
