export function formatarCentavos(valorCentavos: number): string {
  return (valorCentavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte texto digitado pelo utilizador ("12,34", "12.34", "1.234,56", "R$ 10")
 * em centavos, usando aritmética inteira para evitar erros de ponto flutuante.
 * Devolve null quando o texto não é um valor monetário válido.
 */
export function converterTextoParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/\s|R\$/g, '');
  if (limpo === '') return null;

  // Com vírgula presente, pontos são separadores de milhar ("1.234,56");
  // sem vírgula, o ponto é o separador decimal ("12.34").
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;

  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;

  const [reais, fracao = ''] = normalizado.split('.');
  return Number(reais) * 100 + Number(fracao.padEnd(2, '0'));
}
