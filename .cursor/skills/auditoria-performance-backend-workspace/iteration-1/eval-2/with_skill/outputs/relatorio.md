## Auditoria de performance — "ServicoIntegracaoCambio (cotação/limite no checkout sob carga)"

> Nota de método: o pedido descreve sintomas de produção (Black Friday) sem trazer números (p95, req/s, contagem de sockets, métricas do threadpool). Não há trace/APM anexado. Por isso esta auditoria parte de **análise estática do código** — e os defeitos aqui são determinísticos e bem conhecidos, com assinatura idêntica ao sintoma relatado ("latência sobe em escada", "erros de socket/conexão", "funciona com pouca gente"). Ainda assim, **o primeiro passo antes de dar por resolvido é instrumentar e medir** (secção 5). Não se otimiza no escuro.

---

### 1. Linha de base (medição)

Não fornecida pelo utilizador. O que sabemos pelo relato + leitura do código:

- **Métrica alvo:** latência p95/p99 do checkout sob concorrência + taxa de erros de socket. Atual: degrada "em escada" sob carga até travar a aplicação inteira; meta: estável sob a concorrência de pico, sem `SocketException`/timeouts de conexão.
- **Chamadas HTTP externas por `MontarResumo`:** 3 chamadas síncronas em série (USD, EUR, limite de crédito).
- **`HttpClient` criados por `MontarResumo`:** 3 instâncias novas (uma por chamada), cada uma `using` (descartada logo) → cada chamada abre/fecha socket próprio.
- **Onde o tempo/recursos se vão:** I/O HTTP externo bloqueado de forma síncrona + esgotamento de sockets e de threads do pool. Não é gargalo de CPU nem de banco — é de **gestão de recursos e de async**.

> Importante: o sintoma "funciona normal com pouca gente, trava sob carga" é a **assinatura clássica** de dois problemas que só explodem com concorrência: (a) `new HttpClient()` por chamada → exaustão de portas/sockets, e (b) sync-over-async → threadpool starvation. Os dois estão presentes neste ficheiro.

---

### 2. Gargalos identificados (ordenados por impacto)

1. **Recursos / pool — `new HttpClient()` por chamada (socket exhaustion).** Linhas 11 e 38: cada `ObterCotacao` e cada `ObterLimiteCredito` cria e descarta um `HttpClient`. Cada socket fechado fica em `TIME_WAIT` por ~minutos; sob carga as portas efémeras do host esgotam → `SocketException` / "erro de conexão". Esta é a causa direta dos **erros de socket** relatados. (Anti-padrão da secção 8.1 e 12 da skill.)

2. **Async / concorrência — sync-over-async (`.Result`).** Linhas 16 (`...GetFromJsonAsync(...).Result`) e 26 (`ObterLimiteCredito(clienteId).Result`). `MontarResumo` e `ObterCotacao` são síncronos e bloqueiam uma thread do threadpool à espera de I/O. Sob carga, a fila do threadpool cresce, novas threads entram devagar (e podem nem chegar), a latência **sobe em escada** e a aplicação parece "travada" — inclusive endpoints que nada têm a ver com câmbio, porque o pool é compartilhado. Esta é a causa direta da **latência em escada** e do **"aplicação inteira travar"**. (Secção 5.1 / 12.)

3. **Async / concorrência — chamadas independentes feitas em série.** Linhas 24–26: `cotacaoUsd`, `cotacaoEur` e `limite` são independentes entre si, mas são obtidas uma após a outra. Mesmo depois de tornar tudo `async`, o tempo de `MontarResumo` é a **soma** dos três I/O em vez do **maior** deles. (Secção 5.2.)

4. **Resiliência / timeout — sem timeout, retry com backoff ou circuit breaker.** Não há controlo de tempo nem de falha sobre as APIs externas (`api.cambio-externo`, `api.credito-interno`). Se a dependência externa fica lenta no pico, cada request fica preso indefinidamente, segurando thread + socket → acelera o colapso. (Reforça gargalos 1 e 2.)

5. **Caching ausente — recomputa cotação a cada checkout.** `ObterCotacao("BRL","USD")` e `("BRL","EUR")` são chamadas em "quase todo request de checkout", mas cotação muda devagar e tolera estar alguns segundos/minutos desatualizada. Hoje cada checkout bate 2× na API externa por câmbio. Candidato ideal a cache (caro × lido muito × tolera staleness — secção 7). Reduz drasticamente o nº de chamadas externas no pico.

6. **`CancellationToken` não propagado.** Nenhuma assinatura aceita `ct`. Quando o cliente desiste/timeout, o trabalho HTTP continua segurando thread e socket. (Secção 5.3 / 8.2.)

7. **`BaseAddress` configurado por chamada.** Linhas 12 e 39: configuração de cliente espalhada no método; deve ser centralizada no registo do `IHttpClientFactory`.

---

### 3. Causa-raiz principal

**Dois defeitos de concorrência que só explodem sob carga, atuando juntos:** `new HttpClient()` por chamada esgota os sockets do host (→ erros de socket), e o sync-over-async (`.Result`) esgota o threadpool (→ latência em escada e travamento global). Com pouca gente nenhum dos dois limites é atingido — por isso "funciona normal". Sob a carga da Black Friday, ambos saturam e a aplicação inteira para.

---

### 4. Proposta(s)

#### Opção A — Correção estrutural (obrigatória): `IHttpClientFactory` + async até ao topo + paralelizar

Resolve os gargalos 1, 2, 3, 6 e 7 de uma vez. É a base; sem isto nada mais importa.

**Registo (em `Program.cs` / composição):**

```csharp
services.AddHttpClient("cambio", c =>
{
    c.BaseAddress = new Uri("https://api.cambio-externo.example");
    c.Timeout = TimeSpan.FromSeconds(3); // teto duro; ajustar ao SLA real
});

services.AddHttpClient("credito", c =>
{
    c.BaseAddress = new Uri("https://api.credito-interno.example");
    c.Timeout = TimeSpan.FromSeconds(3);
});

services.AddScoped<ServicoIntegracaoCambio>();
```

**Serviço (antes → depois):**

```csharp
// ❌ ANTES: new HttpClient() por chamada, .Result, em série, sem ct
public ResumoFinanceiroDto MontarResumo(Guid clienteId)
{
    var cotacaoUsd = ObterCotacao("BRL", "USD");          // .Result lá dentro
    var cotacaoEur = ObterCotacao("BRL", "EUR");          // .Result lá dentro
    var limite     = ObterLimiteCredito(clienteId).Result;
    // ...
}
```

```csharp
// ✅ DEPOIS: clientes do factory, async até ao topo, chamadas independentes em paralelo, ct propagado
public class ServicoIntegracaoCambio(IHttpClientFactory fabricaHttp)
{
    public async Task<CotacaoDto> ObterCotacaoAsync(
        string moedaOrigem, string moedaDestino, CancellationToken ct)
    {
        var http = fabricaHttp.CreateClient("cambio");
        var cotacao = await http.GetFromJsonAsync<CotacaoDto>(
            $"/v1/cotacao?de={moedaOrigem}&para={moedaDestino}", ct);
        return cotacao!;
    }

    public async Task<ResumoFinanceiroDto> MontarResumoAsync(Guid clienteId, CancellationToken ct)
    {
        // chamadas independentes → disparar juntas, esperar o conjunto (tempo ≈ a mais lenta)
        var tarefaUsd    = ObterCotacaoAsync("BRL", "USD", ct);
        var tarefaEur    = ObterCotacaoAsync("BRL", "EUR", ct);
        var tarefaLimite = ObterLimiteCreditoAsync(clienteId, ct);

        await Task.WhenAll(tarefaUsd, tarefaEur, tarefaLimite);

        return new ResumoFinanceiroDto
        {
            CotacaoUsd    = tarefaUsd.Result.Valor,    // já concluída
            CotacaoEur    = tarefaEur.Result.Valor,
            LimiteCredito = tarefaLimite.Result
        };
    }

    private async Task<decimal> ObterLimiteCreditoAsync(Guid clienteId, CancellationToken ct)
    {
        var http = fabricaHttp.CreateClient("credito");
        var resposta = await http.GetFromJsonAsync<LimiteDto>($"/v1/limite/{clienteId}", ct);
        return resposta!.Valor;
    }
}
```

> O `async` tem de subir até o controller/endpoint: o handler que chama `MontarResumoAsync` também tem de ser `async Task` e `await` — nada de `.Result`/`.Wait()` em nenhum ponto do caminho do request. Câmbio é um caso seguro para paralelizar porque são chamadas HTTP independentes; **não** paralelizaríamos se partilhassem o mesmo `DbContext`.

**Ganho esperado:** elimina a exaustão de sockets (factory faz pool de handlers e rotação de DNS) e a starvation de threadpool (sem bloqueio síncrono). `MontarResumo` passa de **soma** dos 3 I/O para **≈ o mais lento** deles. Sob carga, latência deixa de subir "em escada" e os erros de socket desaparecem.
**Custo/risco:** baixo. Mudança de assinatura (síncrono → `async Task`) propaga-se para os chamadores — refactor mecânico mas que toca o controller. Timeout de 3s pode transformar dependência lenta em erro rápido (desejável: falha rápida > thread presa).

#### Opção B — Resiliência nas dependências externas (recomendada junto da A)

Adicionar timeout + retry com backoff + circuit breaker via `Microsoft.Extensions.Http.Resilience` (Polly), para que uma API externa lenta no pico não derrube tudo:

```csharp
services.AddHttpClient("cambio", c => { /* BaseAddress + Timeout */ })
        .AddStandardResilienceHandler(); // retry com backoff + circuit breaker + timeout por tentativa
```

**Ganho esperado:** falhas transitórias da API externa não viram erro do checkout; o circuit breaker corta chamadas a uma dependência degradada em vez de empilhar requests presos.
**Custo/risco:** retry mal configurado pode amplificar carga sobre uma dependência já em sofrimento — usar backoff + jitter e limitar tentativas. Adiciona dependência (`Microsoft.Extensions.Http.Resilience`), justificada pelo cenário de pico.

#### Opção C — Cache da cotação (recomendada; ataca o volume, não só o sintoma)

Cotação é lida em quase todo checkout, é cara (I/O externo) e tolera staleness de alguns segundos/minutos → cache-aside com expiração curta:

```csharp
public async Task<CotacaoDto> ObterCotacaoAsync(
    string moedaOrigem, string moedaDestino, CancellationToken ct)
{
    var chave = $"cotacao:{moedaOrigem}:{moedaDestino}";
    return (await _cache.GetOrCreateAsync(chave, async entry =>
    {
        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30); // ajustar à tolerância do negócio
        var http = fabricaHttp.CreateClient("cambio");
        return await http.GetFromJsonAsync<CotacaoDto>(
            $"/v1/cotacao?de={moedaOrigem}&para={moedaDestino}", ct);
    }))!;
}
```

**Ganho esperado:** o nº de chamadas externas de câmbio cai de "2 por checkout" para ~2 por janela de expiração por instância — corta a maior parte do tráfego externo no pico, aliviando sockets e a própria API externa. Para várias instâncias, considerar `HybridCache` (.NET 9), que ainda protege contra *cache stampede*.
**Custo/risco:** serve cotação até N segundos desatualizada — **confirmar com o negócio** a tolerância (staleness em valor financeiro exige aprovação explícita). `IMemoryCache` não compartilha entre instâncias; sob *miss* concorrente, garantir anti-stampede (`HybridCache` ou lock por chave). O limite de crédito (`ObterLimiteCredito`) é per-cliente e mais sensível — **não** cachear sem decisão deliberada.

> Ordem de aplicação: **A primeiro** (corrige a causa-raiz), depois **B** (resiliência) e **C** (volume). Cache (C) não deve ser usado para mascarar os defeitos de A — primeiro corrigir, depois reduzir volume.

---

### 5. Como validar

1. **Reproduzir sob carga** (staging com carga representativa do pico), pois o problema só aparece com concorrência. Medir a **2ª/3ª execução** (descartar cold start/JIT/DNS).
2. **Contar sockets/conexões:** observar portas em `TIME_WAIT` e `SocketException` antes/depois — devem cair a ~zero com o `IHttpClientFactory`.
3. **Threadpool:** `dotnet-counters monitor` na fila do ThreadPool (`ThreadPool Queue Length`) — a fila crescente (starvation) deve desaparecer após remover o sync-over-async.
4. **Latência do `MontarResumo`:** trace/APM por span — confirmar que passou de soma para ≈ a chamada mais lenta após paralelizar.
5. **Chamadas externas:** contar requests à API de câmbio por minuto antes/depois do cache (Opção C).

**Critério de sucesso:** sob a concorrência de pico, p95 estável (sem escada), zero erros de socket/conexão, fila do threadpool plana e nº de chamadas externas de câmbio reduzido pela taxa de acerto do cache.

---

### 6. Efeitos colaterais a monitorar

- **Tornar tudo `async`** propaga a mudança de assinatura até o controller — garantir que nenhum chamador reintroduz `.Result`/`.Wait()` (anula o ganho).
- **Timeout/circuit breaker (B):** podem passar a devolver erro rápido onde antes "pendurava"; tratar a falha no checkout com mensagem ao utilizador em português brasileiro e fallback se aplicável.
- **Cache (C):** staleness da cotação em contexto financeiro precisa de aprovação do negócio; vigiar invalidação e, em múltiplas instâncias, *stampede* e pressão de memória.
- **Resiliência:** retry sem jitter pode amplificar carga sobre dependência já degradada — usar backoff + jitter e limite de tentativas.
- Após estabilizar a app, se a **API externa de câmbio** continuar a ser o gargalo, o problema passa a ser dela (capacidade/SLA) — monitorar e, se preciso, renegociar limites/contratar cache mais agressivo.
