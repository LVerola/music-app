import { converterParaCentavos, formatarCentavos } from "../dinheiro";

describe("converterParaCentavos", () => {
  it("deve converter valor com vírgula decimal", () => {
    expect(converterParaCentavos("25,90")).toBe(2590);
  });

  it("deve converter valor inteiro sem separador", () => {
    expect(converterParaCentavos("100")).toBe(10000);
  });

  it("deve converter valor com ponto de milhar e vírgula decimal", () => {
    expect(converterParaCentavos("1.250,05")).toBe(125005);
  });

  it("deve aceitar ponto como decimal quando não há vírgula", () => {
    expect(converterParaCentavos("25.9")).toBe(2590);
  });

  it("deve ignorar prefixo R$ e espaços", () => {
    expect(converterParaCentavos(" R$ 12,34 ")).toBe(1234);
  });

  it("deve devolver null para texto vazio ou inválido", () => {
    expect(converterParaCentavos("")).toBeNull();
    expect(converterParaCentavos("abc")).toBeNull();
    expect(converterParaCentavos("12,345")).toBeNull();
    expect(converterParaCentavos("-5")).toBeNull();
  });
});

describe("formatarCentavos", () => {
  it("deve formatar centavos como moeda pt-BR", () => {
    // \u00a0 = espaço não separável usado pelo Intl entre "R$" e o número
    expect(formatarCentavos(2590).replace(/\u00a0/g, " ")).toBe("R$ 25,90");
  });
});
