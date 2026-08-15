export const CATEGORIAS_DESPESA = [
  'alimentacao',
  'transporte',
  'moradia',
  'lazer',
  'saude',
  'outros',
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];

export interface Despesa {
  id: string;
  descricao: string;
  valorCentavos: number;
  /** A API pode devolver categorias fora da lista conhecida; tratamos como string na leitura. */
  categoria: string;
  /** Data em ISO 8601. */
  criadaEm: string;
}

export interface NovaDespesa {
  descricao: string;
  valorCentavos: number;
  categoria: CategoriaDespesa;
}

const ROTULOS_CATEGORIA: Record<CategoriaDespesa, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  moradia: 'Moradia',
  lazer: 'Lazer',
  saude: 'Saúde',
  outros: 'Outros',
};

export function rotuloCategoria(categoria: string): string {
  return ROTULOS_CATEGORIA[categoria as CategoriaDespesa] ?? categoria;
}
