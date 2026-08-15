# Auditoria de Performance — `ServicoIntegracaoCambio`

## 1. Resumo executivo

O sintoma descrito — **"funciona com pouca gente", mas sob carga (Black Friday) a latência sobe em escada e aparecem erros de socket/conexão** — é a assinatura clássica de **dois antipadrões somados**:

1. **`new HttpClient()` por chamada dentro de `using`** → esgotamento de portas/sockets (*socket exhaustion*).
2. **Bloqueio síncrono sobre código assíncrono (`.Result`)** → esgotamento do *thread pool* (*thread pool starvation*), que produz exatamente a "latência em escada".

Com pouca gente nenhum dos dois limites é atingido, por isso parece saudável. Sob carga, ambos saturam e derrubam a aplicação **inteira** (não só o câmbio), porque o thread pool e as portas TCP são recursos do processo, partilhados por todos os endpoints.

Abaixo está o diagnóstico detalhado por causa, a correção recomendada e uma versão final pronta para carga.

---

## 2. Diagnóstico por causa

### Causa A (crítica) — `HttpClient` criado e descartado por requisição

```csharp
public CotacaoDto ObterCotacao(...)
{
    using var http = new HttpClient();          // <- novo socket pool por chamada
    http.BaseAddress = new Uri("https://api.cambio-externo.example");
    ...
}
```

Cada `new HttpClient()` cria um novo `HttpMessageHandler` com o seu próprio *connection pool*. Ao sair do `using`, o handler é descartado, **mas a conexão TCP subjacente não fecha imediatamente** — fica em estado `TIME_WAIT` durante ~tipicamente 1–4 minutos (dependendo do SO).

Consequências sob carga:

- **Esgotamento de portas efémeras**: o intervalo de portas efémeras do SO (na ordem de ~16k–28k) enche-se de conexões em `TIME_WAIT`. Quando acaba, novas conexões falham com `SocketException` (`Only one usage of each socket address...` / `Address already in use`) → **exatamente os "erros de socket/conexão" relatados**.
- **Custo de handshake repetido**: cada chamada abre nova conexão TCP + TLS (handshake completo), em vez de reaproveitar conexões *keep-alive*. Isso adiciona latência e CPU por requisição.
- Aparece **em quase todo request de checkout** porque `MontarResumo` chama o serviço 2× para câmbio + 1× para crédito → **3 sockets novos por checkout**.

> Nota: o mesmo problema existe em `ObterLimiteCredito` (`using var http = new HttpClient()`).

### Causa B (crítica) — *sync-over-async* com `.Result`

```csharp
var cotacao = http.GetFromJsonAsync<CotacaoDto>(...).Result;   // bloqueia thread
...
var limite = ObterLimiteCredito(clienteId).Result;            // bloqueia thread
```

`ObterCotacao` é **síncrono** e bloqueia com `.Result` numa operação de I/O que é intrinsecamente assíncrona. Cada chamada **prende um thread do pool** enquanto espera a rede responder (dezenas a centenas de ms).

Consequências sob carga:

- **Thread pool starvation**: sob concorrência, todos os threads disponíveis ficam bloqueados à espera de I/O. O .NET ThreadPool injeta novos threads de forma **deliberadamente lenta** (aproximadamente 1 thread por ~500 ms após atingir o mínimo). Resultado: a fila de trabalho cresce e a latência **sobe em degraus/escada** — precisamente o que foi descrito.
- O efeito é **global**: como o thread pool é do processo, *qualquer* endpoint da app (não só checkout) fica lento ou começa a dar timeout. Daí "a aplicação inteira travar".
- Risco adicional de **deadlock** em contextos com `SynchronizationContext` (menos provável em ASP.NET Core, mas o padrão continua errado).

### Causa C (alta) — Sem timeout, sem cancelamento, sem resiliência

- Não há `CancellationToken` nem timeout explícito apropriado. Se a API externa de câmbio ficar lenta (provável na Black Friday), as chamadas penduram, agravando A e B (mais threads e sockets presos por mais tempo).
- Não há **retry com backoff**, **circuit breaker** nem **timeout por tentativa**. Quando o downstream degrada, a aplicação não se protege — propaga e amplifica a falha (*cascading failure*).

### Causa D (média) — Chamadas sequenciais desnecessárias

```csharp
var cotacaoUsd = ObterCotacao("BRL", "USD");
var cotacaoEur = ObterCotacao("BRL", "EUR");
var limite     = ObterLimiteCredito(clienteId).Result;
```

As 3 chamadas são independentes e ocorrem em série. Mesmo depois de corrigir A e B, a latência por checkout é a **soma** das três. Podem correr em paralelo (`Task.WhenAll`), reduzindo a latência ao tempo da chamada mais lenta.

### Causa E (média) — Sem cache da cotação

Cotações de câmbio variam lentamente (segundos/minutos), mas são buscadas **a cada checkout**. Numa Black Friday isto multiplica chamadas idênticas ao downstream. Um cache curto (p.ex. 30–60 s) corta drasticamente o número de chamadas externas — alívio direto sobre sockets, threads e sobre a API externa.

### Causa F (menor) — Tipagem/robustez

- Uso de `!` (null-forgiving) sem validação: se o downstream devolver corpo vazio/erro, rebenta com `NullReferenceException` em vez de erro tratado.
- DTOs públicos no mesmo ficheiro sem necessidade; aceitável, mas o tratamento de erro merece atenção.

---

## 3. Solução recomendada

### Princípio 1 — Reutilizar `HttpClient` via `IHttpClientFactory` (typed client)

`IHttpClientFactory` gere o ciclo de vida dos `HttpMessageHandler`, faz *pooling* e rotação de handlers (`HandlerLifetime`) e resolve tanto o *socket exhaustion* como o problema de DNS obsoleto. Registar **clientes nomeados/tipados** por destino (câmbio e crédito têm `BaseAddress` diferentes).

Registo (`Program.cs`):

```csharp
builder.Services.AddHttpClient("cambio", c =>
{
    c.BaseAddress = new Uri("https://api.cambio-externo.example");
    c.Timeout = TimeSpan.FromSeconds(3);
});

builder.Services.AddHttpClient("credito", c =>
{
    c.BaseAddress = new Uri("https://api.credito-interno.example");
    c.Timeout = TimeSpan.FromSeconds(3);
});

builder.Services.AddScoped<ServicoIntegracaoCambio>();
```

> Alternativa válida se não houver DI: um **único `static readonly HttpClient`** reutilizado (com `PooledConnectionLifetime` configurado num `SocketsHttpHandler`). `IHttpClientFactory` é preferível por gerir DNS/lifetime automaticamente.

### Princípio 2 — Tornar tudo `async` ponta a ponta (eliminar `.Result`)

Toda a cadeia passa a `async`/`await`, propagando `CancellationToken`. Nunca mais `.Result`/`.Wait()`.

### Princípio 3 — Resiliência (timeout + retry + circuit breaker)

Usar `Microsoft.Extensions.Http.Resilience` (ou Polly) para timeout por tentativa, *retry* com backoff exponencial + jitter e *circuit breaker*, de modo a falhar rápido quando o downstream degradar.

```csharp
builder.Services.AddHttpClient("cambio", c => { /* BaseAddress, Timeout total */ })
    .AddStandardResilienceHandler();   // timeout por tentativa + retry + circuit breaker
```

### Princípio 4 — Paralelizar chamadas independentes

No `MontarResumo`, disparar as 3 chamadas com `Task.WhenAll`.

### Princípio 5 — Cache curto da cotação

`IMemoryCache` (ou cache distribuído) com TTL curto por par de moedas, reduzindo chamadas externas redundantes.

---

## 4. Versão corrigida (pronta para carga)

```csharp
using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;

namespace Loja.Api.Cambio;

public class ServicoIntegracaoCambio
{
    private readonly IHttpClientFactory _fabricaHttp;
    private readonly IMemoryCache _cache;

    private static readonly TimeSpan TtlCotacao = TimeSpan.FromSeconds(60);

    public ServicoIntegracaoCambio(IHttpClientFactory fabricaHttp, IMemoryCache cache)
    {
        _fabricaHttp = fabricaHttp;
        _cache = cache;
    }

    public async Task<CotacaoDto> ObterCotacaoAsync(
        string moedaOrigem,
        string moedaDestino,
        CancellationToken cancelamento = default)
    {
        var chave = $"cotacao:{moedaOrigem}:{moedaDestino}";

        return await _cache.GetOrCreateAsync(chave, async entrada =>
        {
            entrada.AbsoluteExpirationRelativeToNow = TtlCotacao;

            var http = _fabricaHttp.CreateClient("cambio");
            var cotacao = await http.GetFromJsonAsync<CotacaoDto>(
                $"/v1/cotacao?de={moedaOrigem}&para={moedaDestino}",
                cancelamento);

            return cotacao ?? throw new InvalidOperationException(
                $"Cotação {moedaOrigem}->{moedaDestino} retornou vazia.");
        }) ?? throw new InvalidOperationException("Falha ao obter cotação.");
    }

    public async Task<ResumoFinanceiroDto> MontarResumoAsync(
        Guid clienteId,
        CancellationToken cancelamento = default)
    {
        // Chamadas independentes em paralelo: latência = a mais lenta, não a soma.
        var tarefaUsd = ObterCotacaoAsync("BRL", "USD", cancelamento);
        var tarefaEur = ObterCotacaoAsync("BRL", "EUR", cancelamento);
        var tarefaLimite = ObterLimiteCreditoAsync(clienteId, cancelamento);

        await Task.WhenAll(tarefaUsd, tarefaEur, tarefaLimite);

        return new ResumoFinanceiroDto
        {
            CotacaoUsd = tarefaUsd.Result.Valor,
            CotacaoEur = tarefaEur.Result.Valor,
            LimiteCredito = tarefaLimite.Result
        };
    }

    private async Task<decimal> ObterLimiteCreditoAsync(
        Guid clienteId,
        CancellationToken cancelamento = default)
    {
        var http = _fabricaHttp.CreateClient("credito");
        var resposta = await http.GetFromJsonAsync<LimiteDto>(
            $"/v1/limite/{clienteId}", cancelamento);

        return resposta?.Valor
            ?? throw new InvalidOperationException(
                $"Limite de crédito do cliente {clienteId} retornou vazio.");
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
```

> Após esta mudança, o *call site* (controller/endpoint) também precisa ser `async` e usar `await servico.MontarResumoAsync(...)`. Confirma que não sobra nenhum `.Result`/`.Wait()` na cadeia.

---

## 5. Mapa causa → correção → impacto

| # | Causa | Sintoma que explica | Correção | Severidade |
|---|-------|---------------------|----------|------------|
| A | `new HttpClient()` + `using` por chamada | Erros de socket/conexão; `TIME_WAIT`; handshakes repetidos | `IHttpClientFactory` (cliente tipado/nomeado) | Crítica |
| B | `.Result` (sync-over-async) | Latência "em escada"; app inteira trava | `async`/`await` ponta a ponta | Crítica |
| C | Sem timeout/retry/circuit breaker | Falha em cascata quando downstream degrada | Resilience handler (timeout+retry+breaker) | Alta |
| D | Chamadas sequenciais | Latência = soma das 3 chamadas | `Task.WhenAll` | Média |
| E | Sem cache da cotação | Chamadas externas redundantes sob pico | `IMemoryCache` TTL curto | Média |
| F | `!` sem validação | `NullReferenceException` opaca | Validação + erro tipado | Menor |

---

## 6. Como validar que ficou pronto para carga

1. **Teste de carga** (k6/NBomber/JMeter) reproduzindo concorrência de pico do checkout; comparar p95/p99 antes/depois e confirmar que a latência **não sobe em escada**.
2. **Monitorar portas TCP** durante o teste (`netstat`/contadores do SO): confirmar que `TIME_WAIT` deixa de crescer sem limite e que não há `SocketException`.
3. **Métricas do ThreadPool** (`ThreadPool.ThreadCount`, fila pendente / `dotnet-counters`): confirmar que não há *starvation* (threads bloqueados a crescer).
4. **Telemetria de resiliência**: contar *retries* e aberturas de circuito; verificar que o sistema falha rápido em vez de pendurar.
5. **Cache hit ratio** da cotação: confirmar redução do volume de chamadas externas.
6. Garantir que **não resta nenhum `.Result`/`.Wait()`** em toda a cadeia (lint/análise estática: `xUnit`/analisadores, ou regra `CA2007`/`VSTHRD002`).

---

## 7. Prioridade de execução

1. **A + B juntos** (crítico): typed `HttpClient` + `async` ponta a ponta. Resolve a causa-raiz do colapso.
2. **C** (alto): timeout + retry + circuit breaker, antes do próximo pico.
3. **D + E** (médio): paralelizar e cachear, para reduzir latência e volume.
4. **F** (menor): robustez de erro.
