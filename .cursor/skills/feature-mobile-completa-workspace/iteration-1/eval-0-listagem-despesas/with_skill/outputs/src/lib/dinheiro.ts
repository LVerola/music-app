/**
 * Converte texto digitado pelo utilizador (ex.: "25,90", "1.250,00", "25.90")
 * em centavos inteiros. Devolve null quando o texto não é um valor válido.
 */
export function converterParaCentavos(texto: string): number | null {
  const limpo = texto.trim().replace(/\s|R\$/g, "");
  if (!limpo) return null;

  // Com vírgula, ela é o separador decimal (pt-BR) e pontos são milhares;
  // sem vírgula, um ponto é aceite como decimal (teclado numérico do iOS).
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;

  const [inteiros, decimais = ""] = normalizado.split(".");
  return Number(inteiros) * 100 + Number(decimais.padEnd(2, "0") || "0");
}

export function formatarCentavos(valorCentavos: number): string {
  return (valorCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
