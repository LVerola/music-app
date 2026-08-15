using System.Net.Http.Json;

namespace Loja.Api.Cambio;

// Serviço chamado em quase todo request de checkout. Sob carga (Black Friday)
// a aplicação "trava": latência sobe em escada e aparecem erros de socket.
public class ServicoIntegracaoCambio
{
    public CotacaoDto ObterCotacao(string moedaOrigem, string moedaDestino)
    {
        using var http = new HttpClient();
        http.BaseAddress = new Uri("https://api.cambio-externo.example");

        var cotacao = http
            .GetFromJsonAsync<CotacaoDto>($"/v1/cotacao?de={moedaOrigem}&para={moedaDestino}")
            .Result;

        return cotacao!;
    }

    // Usado no resumo do pedido: busca cotação e limites de crédito.
    public ResumoFinanceiroDto MontarResumo(Guid clienteId)
    {
        var cotacaoUsd = ObterCotacao("BRL", "USD");
        var cotacaoEur = ObterCotacao("BRL", "EUR");
        var limite = ObterLimiteCredito(clienteId).Result;

        return new ResumoFinanceiroDto
        {
            CotacaoUsd = cotacaoUsd.Valor,
            CotacaoEur = cotacaoEur.Valor,
            LimiteCredito = limite
        };
    }

    private async Task<decimal> ObterLimiteCredito(Guid clienteId)
    {
        using var http = new HttpClient();
        http.BaseAddress = new Uri("https://api.credito-interno.example");
        var resposta = await http.GetFromJsonAsync<LimiteDto>($"/v1/limite/{clienteId}");
        return resposta!.Valor;
    }
}

public class CotacaoDto { public decimal Valor { get; set; } }
public class LimiteDto { public decimal Valor { get; set; } }
public class ResumoFinanceiroDto
{
    public decimal CotacaoUsd { get; set; }
    public decimal CotacaoEur { get; set; }
    public decimal LimiteCredito { get; set; }
}
