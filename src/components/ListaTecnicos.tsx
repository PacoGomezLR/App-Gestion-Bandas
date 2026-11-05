import type { Tecnico } from "../types/tecnico";
import { FilaNavegable, FilaTexto, GrupoFilas } from "./PantallaInterior";

interface ListaTecnicosProps {
  tecnicos: Tecnico[];
  procesando: boolean;
  // Solo el admin abre un técnico para gestionarlo; el resto solo consulta
  puedeGestionar: boolean;
  onElegir: (tecnico: Tecnico) => void;
}

export function ListaTecnicos({ tecnicos, procesando, puedeGestionar, onElegir }: ListaTecnicosProps) {
  return (
    <GrupoFilas>
      {tecnicos.map((tecnico) =>
        puedeGestionar ? (
          <FilaNavegable
            key={tecnico.id}
            titulo={tecnico.nombre}
            centrado
            disabled={procesando}
            onPress={() => onElegir(tecnico)}
          />
        ) : (
          <FilaTexto key={tecnico.id} titulo={tecnico.nombre} centrado />
        )
      )}
    </GrupoFilas>
  );
}
