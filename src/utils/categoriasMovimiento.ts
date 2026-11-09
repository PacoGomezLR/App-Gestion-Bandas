import type {
  CategoriaGasto,
  CategoriaIngreso,
  CategoriaMovimiento,
  TipoMovimiento,
} from "../types/finanzas";

// Record obliga a dar una etiqueta a cada categoría: si se añade una, TypeScript avisa aquí
const ETIQUETAS_CATEGORIA: Record<CategoriaMovimiento, string> = {
  saldo_inicial: "Saldo inicial",
  concierto: "Concierto",
  sobrante_concierto: "Sobrante concierto",
  aportacion: "Aportación",
  merchandising: "Merchandising",
  transporte: "Transporte",
  alquiler_furgoneta: "Alquiler furgoneta",
  tecnico: "Técnico",
  material: "Material",
  local_ensayo: "Local / ensayo",
  comida: "Comida / dietas",
  alojamiento: "Alojamiento",
  promocion: "Promoción",
  comision: "Comisión",
  otro: "Otro",
};

const ETIQUETAS_TIPO: Record<TipoMovimiento, string> = {
  ingreso: "Ingreso",
  gasto: "Gasto",
};

// Orden en que se muestran en el formulario
export const TIPOS_MOVIMIENTO: readonly TipoMovimiento[] = ["ingreso", "gasto"];

const CATEGORIAS_INGRESO: readonly CategoriaIngreso[] = [
  "saldo_inicial",
  "concierto",
  "sobrante_concierto",
  "aportacion",
  "merchandising",
  "otro",
];

const CATEGORIAS_GASTO: readonly CategoriaGasto[] = [
  "transporte",
  "alquiler_furgoneta",
  "tecnico",
  "material",
  "local_ensayo",
  "comida",
  "alojamiento",
  "promocion",
  "comision",
  "otro",
];

export function categoriasDeTipo(tipo: TipoMovimiento): readonly CategoriaMovimiento[] {
  return tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
}

export function etiquetaCategoria(categoria: CategoriaMovimiento): string {
  return ETIQUETAS_CATEGORIA[categoria];
}

export function etiquetaTipoMovimiento(tipo: TipoMovimiento): string {
  return ETIQUETAS_TIPO[tipo];
}
