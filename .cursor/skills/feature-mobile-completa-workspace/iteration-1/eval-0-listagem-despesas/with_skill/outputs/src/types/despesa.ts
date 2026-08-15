export type CategoriaDespesa = "alimentacao" | "transporte" | "outros";

export interface Despesa {
  id: string;
  descricao: string;
  valorCentavos: number;
  categoria: CategoriaDespesa;
  criadaEm: string;
}

export const ROTULOS_CATEGORIA: Record<CategoriaDespesa, string> = {
  alimentacao: "Alimentação",
  transporte: "Transporte",
  outros: "Outros",
};
