---
name: auditoria-performance-backend
description: Audita e otimiza desempenho de backend .NET / ASP.NET Core / EF Core / PostgreSQL na camada de aplicação — latência de endpoint, consultas desnecessárias (N+1, over-fetching, falta de projeção), async/await mal usado (sync-over-async, falta de paralelismo), serialização, alocações/GC, caching, connection pool e paginação. Atua com nível de Tech Lead: mede antes de mexer, ataca a causa-raiz, estima ganho e custo. Use SEMPRE que o usuário mencionar endpoint lento, API lenta, latência alta, p95/p99, throughput baixo, timeout sob carga, N+1, EF Core lento, muitas queries, over-fetching, async lento, sync-over-async, alocação de memória, GC alto, connection pool esgotado, socket exhaustion, caching, HttpClient lento, paginação pesada, ou pedir @auditoria-performance-backend. Aplique também quando descrever sintoma de lentidão no backend sem causa identificada.
---

# Auditoria de Performance — Backend (.NET)

Skill para diagnosticar e resolver **lentidão na camada de aplicação** de um backend .NET / ASP.NET Core / EF Core / PostgreSQL, com a postura de um **Tech Lead sênior**: nunca otimiza no escuro, mede antes e depois, ataca a causa-raiz (não o sintoma) e estima ganho × custo × risco antes de propor.

> Esta skill cobre a **camada de aplicação** (código C#, EF Core, HTTP, serialização, cache, async, memória). Para tuning do **plano de execução SQL / índices** dentro do PostgreSQL, encadeie com `@tuning-query-postgres`. As duas são complementares: aqui decidimos *que* query fazer e *quantas*; lá decidimos *como* o banco a executa.

## Quando aplicar

- "O endpoint `GET /pedidos` está demorando 4s, antes era 300ms."
- "A API cai sob carga / dá timeout no pico."
- "Acho que tem N+1 nessa listagem."
- "O p95 dessa rota está horrível."
- "Esse serviço está consumindo memória demais / o GC está disparando."
- "O `HttpClient` está estourando sockets em produção."
- "Toda a tela carrega lenta e o gargalo está no back."

---

## 1. Antes de otimizar — colher contexto e medir

> **Regra de ouro: não optimize sem medir.** Optimização sem medição é palpite — frequentemente piora o código e não move o número. Se o usuário não trouxer números, o **primeiro entregável é instrumentar para obtê-los**, não um "fix".

Pergunte (ou levante no código) antes de diagnosticar:

1. **Qual a métrica e o alvo?** Latência média? p95/p99? Throughput (req/s)? Memória? Qual o número atual e qual o aceitável?
2. **Onde dói?** Endpoint específico, *job* em background, *startup*, ou tudo?
3. **Sob que condição?** Sempre, só sob carga, só com certos parâmetros (ex.: cliente com muitos pedidos)?
4. **Quando começou?** Após qual *deploy*, mudança de volume de dados, ou mudança de dependência?
5. **Forma da carga.** Volume de dados retornado, concorrência, tamanho do *payload*.
6. **Ambiente.** Dev local, *staging*, produção? Há APM (Application Insights, OpenTelemetry, Datadog)?

Sem o sintoma localizado, **não chute** — instrumente (seção 2).

---

## 2. Medir — ferramentas por pergunta

Escolha a ferramenta pela **pergunta** que precisa responder:

| Pergunta | Ferramenta | Como |
|---|---|---|
| Onde o request gasta o tempo? | **APM / OpenTelemetry** (traces) | Spans por camada (HTTP → use case → EF → DB) |
| Quantas queries este endpoint dispara? | **EF Core logging** | `LogTo(Console.WriteLine, LogLevel.Information)` ou *interceptor*; conte as queries |
| Esta query específica é lenta no app ou no banco? | **MiniProfiler** / EF logs com tempo | Compare tempo no app vs. `EXPLAIN ANALYZE` |
| Qual o tempo/alocação de um trecho hot? | **BenchmarkDotNet** | Micro-benchmark isolado com `[MemoryDiagnoser]` |
| Há vazamento / GC alto / muitas Gen2? | **dotnet-counters** | `dotnet-counters monitor -p <pid>` (GC, alloc rate, threadpool) |
| O que aloca no caminho quente? | **dotnet-trace** + speedscope / **dotnet-gcdump** | Captura *trace* sob carga e abre no analisador |
| Threadpool a esfomear (starvation)? | **dotnet-counters** (ThreadPool Queue Length) | Fila crescente = sync-over-async ou bloqueio |
| Connection pool esgotado? | `pg_stat_activity` + métricas Npgsql | Conexões `idle in transaction`, espera por conexão |

> **Hierarquia de medição:** comece pelo macro (trace do request inteiro) e só desça ao micro (BenchmarkDotNet) depois de localizar o gargalo. Micro-otimizar um trecho que custa 2% do tempo é desperdício — **Lei de Amdahl**.

> Cache aquece. Meça o caminho quente **3 vezes** e compare a 2ª/3ª execução, nunca a 1ª (JIT, cache de plano, *connection warmup*).

---

## 3. Mapa de gargalos por camada

Pense no request de fora para dentro e localize **onde** o tempo se vai:

```
Cliente → [Middleware/pipeline] → [Endpoint/Controller] → [Use Case]
            → [EF Core / Repositório] → [PostgreSQL] → resposta → [Serialização] → Cliente
```

| Camada | Gargalos típicos | Seção |
|---|---|---|
| Acesso a dados (EF/SQL) | N+1, over-fetching, *tracking* desnecessário, falta de paginação | 4 |
| Async / concorrência | sync-over-async, `await` em série que podia ser paralelo, `Task.Run` indevido | 5 |
| Serialização / payload | DTO gordo, `ReferenceHandler`, sem *streaming*, sem compressão | 6 |
| Caching | recomputar o que não muda, *cache stampede*, sem invalidação | 7 |
| Recursos / pool | `HttpClient` mal usado (socket exhaustion), pool de conexões pequeno | 8 |
| Memória / GC | alocações no caminho quente, LINQ excessivo, *boxing* | 9 |

**Na prática, a esmagadora maioria da lentidão de endpoint .NET vem da camada 4 (acesso a dados).** Comece sempre por contar quantas queries o endpoint faz.

---

## 4. Acesso a dados (EF Core) — o suspeito número 1

### 4.1 N+1: o clássico

**Sintoma:** uma listagem dispara 1 query para a lista + N queries (uma por item) para carregar relações.

```csharp
// ❌ N+1: cada pedido vai ao banco buscar o cliente (lazy loading ou acesso em loop)
var pedidos = await _ctx.Pedidos.ToListAsync(ct);
foreach (var p in pedidos)
    Console.WriteLine(p.Cliente.Nome); // dispara uma query por pedido
```

```csharp
// ✅ Eager loading numa query (ou split query)
var pedidos = await _ctx.Pedidos
    .Include(p => p.Cliente)
    .AsNoTracking()
    .ToListAsync(ct);
```

**Como detectar:** ligue o log do EF e conte as queries de um único request. Mais de uma query por relação acessada em loop = N+1.

### 4.2 Over-fetching: traga só o que precisa

```csharp
// ❌ Materializa a entidade inteira (todas as colunas) só para devolver 3 campos
var itens = await _ctx.Pedidos.Include(p => p.Itens).AsNoTracking().ToListAsync(ct);
return itens.Select(p => new PedidoResumoDto(p.Id, p.Numero, p.Total));

// ✅ Projete no banco — SELECT só das colunas necessárias, sem carregar relações inteiras
var itens = await _ctx.Pedidos
    .Select(p => new PedidoResumoDto(p.Id, p.Numero, p.Itens.Sum(i => i.Subtotal)))
    .AsNoTracking()
    .ToListAsync(ct);
```

Projetar para DTO no `Select` (LINQ → SQL) reduz colunas, evita carregar relações inteiras e dispensa *tracking*.

### 4.3 Tracking desnecessário em leituras

`AsNoTracking()` em **toda leitura que não vai ser alterada** — evita o EF montar o *change tracker* (custo de CPU e memória proporcional ao nº de entidades).

### 4.4 Cartesian explosion vs. split query

`Include` de **várias coleções** na mesma query gera *JOIN* cartesiano (linhas duplicadas, *payload* inflado). Use `AsSplitQuery()` quando incluir mais de uma coleção:

```csharp
var pedido = await _ctx.Pedidos
    .Include(p => p.Itens)
    .Include(p => p.Pagamentos)
    .AsSplitQuery() // duas queries enxutas em vez de um JOIN cartesiano gigante
    .AsNoTracking()
    .FirstOrDefaultAsync(p => p.Id == id, ct);
```

### 4.5 Paginação — nunca devolva a tabela inteira

```csharp
// ❌ OFFSET grande: o banco lê e descarta as primeiras N linhas
.Skip(pagina * tamanho).Take(tamanho)

// ✅ Keyset pagination: usa o último id/data visto, escala constante
.Where(p => p.CriadoEm < ultimoCriadoEm)
.OrderByDescending(p => p.CriadoEm)
.Take(tamanho)
```

### 4.6 Outros padrões de dados

| Padrão | Problema | Acção |
|---|---|---|
| `SaveChangesAsync` dentro de loop | Uma ida ao banco por iteração | Acumular e salvar uma vez; *bulk* para volumes grandes |
| `Count()` + depois `ToList()` da mesma query | Duas viagens ao banco | Materialize uma vez ou use `CountAsync` só quando preciso |
| `.Where(...).FirstOrDefault()` em memória | Trouxe tudo e filtrou no C# | Filtre no `IQueryable` (antes de `ToList`) |
| Query repetida idêntica no mesmo request | Trabalho duplicado | Materialize uma vez e reutilize |
| Query muito quente recompilada | Custo de tradução LINQ→SQL | `EF.CompileAsyncQuery` para *hot paths* |
| Ler 100k linhas para a memória | Pico de memória | *Streaming* com `AsAsyncEnumerable()` |

> Confirme se a query é lenta **no app** (muitas queries, materialização pesada) ou **no banco** (plano ruim). Se for o plano/índice, passe para `@tuning-query-postgres`.

---

## 5. Async / await e concorrência

### 5.1 Sync-over-async — proibido

```csharp
// ❌ Bloqueia a thread do pool esperando I/O → threadpool starvation sob carga
var resultado = _servico.ObterAsync().Result;       // ou .Wait(), ou .GetAwaiter().GetResult()

// ✅ async até ao topo
var resultado = await _servico.ObterAsync(ct);
```

`.Result` / `.Wait()` num caminho de request consome uma thread do pool parada à espera de I/O. Sob carga, a fila do threadpool cresce, a latência dispara e parece "o servidor travou". **Async deve ir até ao topo** (controller/endpoint).

### 5.2 Awaits em série que podiam ser paralelos

```csharp
// ❌ Em série: tempo total = soma dos tempos (chamadas independentes)
var cliente = await _clientes.ObterAsync(id, ct);
var saldo   = await _financeiro.ObterSaldoAsync(id, ct);

// ✅ Em paralelo: tempo total ≈ o mais lento (são independentes)
var tarefaCliente = _clientes.ObterAsync(id, ct);
var tarefaSaldo   = _financeiro.ObterSaldoAsync(id, ct);
await Task.WhenAll(tarefaCliente, tarefaSaldo);
var cliente = tarefaCliente.Result; // já concluída
var saldo   = tarefaSaldo.Result;
```

> Cuidado: **não** paralelize chamadas que partilham o mesmo `DbContext` — ele **não é thread-safe**. Para queries concorrentes, use *contexts* separados (ex.: `IDbContextFactory`).

### 5.3 Outros pontos

| Padrão | Problema | Acção |
|---|---|---|
| `Task.Run` para "tornar async" | Só empurra trabalho síncrono para outra thread, não escala I/O | Use APIs `...Async` reais |
| Faltou propagar `CancellationToken` | Trabalho continua após cliente desistir | Propague `ct` até EF/HttpClient |
| `async void` (fora de event handler) | Exceções não capturáveis, sem await | `async Task` |
| `ValueTask` ignorado em hot path muito chamado | Alocação de `Task` por chamada | `ValueTask` quando frequentemente síncrono |

---

## 6. Serialização e tamanho do payload

| Item | Problema | Acção |
|---|---|---|
| DTO devolve campos a mais | Mais bytes, mais serialização | Devolva só o que o cliente usa |
| Devolver entidade EF crua | Ciclos de referência, *over-fetch*, acoplamento | DTO de resposta dedicado |
| `ReferenceHandler.Preserve` por hábito | `$id`/`$ref` no JSON, payload feio e maior | DTO sem ciclos |
| Sem compressão | Payload grande na rede | *Response compression* (gzip/brotli) para respostas grandes |
| Coleção enorme de uma vez | Pico de memória + latência | Paginação ou *streaming* (`IAsyncEnumerable`) |
| `System.Text.Json` reflexivo em hot path | CPU de serialização | *Source generation* (`JsonSerializerContext`) |

> Prefira **System.Text.Json** (mais rápido e menos alocação que Newtonsoft na maioria dos casos). Reserve Newtonsoft só para recursos específicos que faltem.

---

## 7. Caching — não recompute o que não muda

**Decida o que cachear pela tríade: custo de produzir × frequência de leitura × tolerância a staleness.** Dado caro, lido muito e que tolera estar alguns segundos desatualizado é candidato ideal.

| Tipo | Quando | Cuidado |
|---|---|---|
| `IMemoryCache` (in-process) | Dado quente, 1 instância, pode perder no restart | Não compartilha entre instâncias; limite tamanho |
| Distribuído (Redis) / `HybridCache` | Várias instâncias, dado compartilhado | Serialização + custo de rede; *HybridCache* (.NET 9) protege contra *stampede* |
| *Output caching* | Resposta inteira do endpoint reutilizável | Variar por *query/headers*; invalidar bem |
| `EF.CompileAsyncQuery` | "Cache" do plano LINQ→SQL de query quente | Para queries fixas muito chamadas |

**Padrões obrigatórios:**

- **Cache-aside:** ler cache → *miss* → buscar fonte → preencher cache. Sempre com *expiration*.
- **Anti-stampede:** sob *miss* concorrente, evitar N chamadas simultâneas à fonte (lock por chave / `HybridCache` / `GetOrCreate` com *coalescing*).
- **Invalidação explícita:** ao escrever no dado, invalide/atualize a chave. "Os dois problemas difíceis: invalidação de cache e nomes."
- **Chave determinística** incluindo todos os parâmetros que mudam o resultado (tenant, filtros, versão).

```csharp
// Cache-aside com IMemoryCache + expiração
var chave = $"pedido-resumo:{clienteId}";
var resumo = await _cache.GetOrCreateAsync(chave, async entry =>
{
    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
    return await _repositorio.ObterResumoAsync(clienteId, ct);
});
```

> Não cacheie dado per-request volátil nem dado de segurança/autorização sem pensar muito bem. Cache errado serve dado errado — pior que lentidão.

---

## 8. Recursos e connection pool

### 8.1 HttpClient — socket exhaustion

```csharp
// ❌ new HttpClient() por chamada → sockets em TIME_WAIT, esgota portas sob carga
using var client = new HttpClient();

// ✅ IHttpClientFactory (gere o pool de handlers e o DNS)
public class ServicoPagamento(HttpClient http) { /* injetado via AddHttpClient */ }
```

Registe com `services.AddHttpClient<ServicoPagamento>()`. Um `HttpClient` *singleton* manual fixa DNS; o factory resolve isso.

### 8.2 DbContext e pool de conexões

| Item | Acção |
|---|---|
| `DbContext` *scoped* por request | Padrão correto; **nunca** *singleton* (não é thread-safe) |
| `AddDbContextPool` | Reutiliza instâncias de `DbContext` em APIs de alto throughput |
| Pool Npgsql pequeno (`Maximum Pool Size`) | Dimensione à concorrência real; meça espera por conexão |
| Conexão segurada por trabalho longo | Não faça I/O externo lento com transação/conexão aberta |
| Falta de `CancellationToken` | Conexão presa após cliente desistir |

> Sintoma de pool esgotado: latência sobe em escada sob carga, *timeouts* "esperando por conexão". Veja `pg_stat_activity` e métricas do pool antes de simplesmente aumentar o `Maximum Pool Size` (pode empurrar o gargalo para o banco).

---

## 9. Alocações e GC

Importa **no caminho quente** (alto QPS) ou em *jobs* que processam muitos itens. Não micro-optimize código frio.

| Padrão | Problema | Acção |
|---|---|---|
| Múltiplos `.Where().Select().ToList()` em loop quente | Aloca *iterators* e listas intermédias | Fundir passos; `for` quando crítico |
| Concatenação `+=` em loop | Cria string nova a cada passo | `StringBuilder` |
| *Boxing* (struct → object, LINQ sobre value types) | Alocação no heap | Genéricos; evitar `object` |
| `ToList()` só para iterar uma vez | Lista descartável | Iterar o `IEnumerable` direto |
| Buffers/arrays grandes recriados | Pressão em Gen2 / LOH | `ArrayPool<T>`, `Span<T>`/`Memory<T>` |
| Logar objeto serializado em hot path | Serializa mesmo com log desligado | *Log level check* / *source-gen logging* |

> Confirme com `dotnet-counters` (Allocation Rate, % Time in GC) **antes e depois** — alocação é fácil de "otimizar" no escuro sem mover número nenhum.

---

## 10. Loop científico de otimização

```
1. Medir o caminho quente (trace + contar queries + tempo)  → linha de base
2. Localizar o gargalo dominante (Amdahl: ataque o maior %)
3. Hipótese ("o tempo está em N+1 na listagem de itens")
4. Acção minimamente invasiva (projeção / Include / cache / paralelizar)
5. Medir de novo (mesmo cenário, 2ª-3ª execução)
6. Validar não-regressão (correctude + memória + outros endpoints)
7. Decidir: ganho compensa o custo/risco? Documentar.
```

> Mude **uma coisa de cada vez** e remeça. Se mudar três, não saberá qual moveu o número (ou qual regrediu).

---

## 11. Output esperado da skill

Quando o usuário trouxer um endpoint/cenário lento, devolva um **relatório estruturado**:

```markdown
## Auditoria de performance — "<endpoint/cenário>"

### 1. Linha de base (medição)
- Métrica alvo: <p95 / latência média / memória> — atual: <X> | meta: <Y>
- Nº de queries por request: <N>
- Onde o tempo se vai: <camada/trecho dominante> (~<%>)

### 2. Gargalos identificados (ordenados por impacto)
1. **<camada>** — <observação com número> — <causa>
2. ...

### 3. Causa-raiz principal
<frase única — ex.: "N+1 na projeção de itens dispara 1+200 queries por request">

### 4. Proposta(s)
#### Opção A — <descrição>
```csharp
<antes → depois>
```
**Ganho esperado:** <de X ms para ~Y ms / de N para 1 query>
**Custo/risco:** <ex.: aumenta acoplamento do DTO / cache pode servir dado 5s stale>

### 5. Como validar
<como medir antes/depois — trace, contar queries, BenchmarkDotNet, dotnet-counters>
Critério de sucesso: <ex.: p95 < 400ms, ≤ 2 queries por request, sem regressão de memória>

### 6. Efeitos colaterais a monitorar
- <ex.: invalidação de cache ao escrever; pressão no Redis; memória do pool>
```

---

## 12. Anti-padrões (no diagnóstico e na correcção)

| Anti-padrão | Por quê | Alternativa |
|---|---|---|
| Otimizar sem medir | Palpite; costuma piorar e não move número | Trace/contagem primeiro |
| Micro-otimizar trecho de 2% do tempo | Esforço desperdiçado | Amdahl: ataque o dominante |
| Aumentar *timeout* para "resolver" lentidão | Esconde a causa | Achar e tratar o gargalo |
| Adicionar cache para mascarar query ruim | Empurra o problema, serve dado stale | Corrija a query; cache depois se fizer sentido |
| `.Result`/`.Wait()` para "simplificar" | Threadpool starvation | async até ao topo |
| `new HttpClient()` por chamada | Socket exhaustion | `IHttpClientFactory` |
| Paralelizar sobre o mesmo `DbContext` | Não é thread-safe, dá erro/corrompe | Contexts separados |
| Confiar na 1ª execução medida | Cold JIT/cache engana | Medir 2ª/3ª |
| `Include` de tudo "por garantia" | Over-fetch + cartesiano | Projeção + split query |
| Cachear sem invalidação | Serve dado errado | Cache-aside + invalidação explícita |

---

## 13. Checklist de entrega

- [ ] Linha de base medida (número antes) e meta clara.
- [ ] Gargalo dominante identificado com evidência (trace / contagem de queries), não suposição.
- [ ] Nº de queries por request contado e reduzido onde havia N+1/over-fetch.
- [ ] Leituras usam `AsNoTracking()` + projeção para DTO.
- [ ] Sem `.Result`/`.Wait()`/`async void`; `CancellationToken` propagado.
- [ ] Chamadas independentes paralelizadas (sem partilhar `DbContext`).
- [ ] Cache (se usado) tem expiração, chave determinística e invalidação.
- [ ] `HttpClient` via `IHttpClientFactory`; pool de conexões dimensionado.
- [ ] Medição depois (2ª/3ª execução) confirma o ganho; sem regressão de memória/outros endpoints.
- [ ] Decisão documentada (ganho × custo × risco) no PR/runbook.

---

## 14. Quando pedir ajuda do usuário

- Sem acesso a *trace*/métricas reais → peça os logs do EF, números do APM, ou que rode o cenário com logging ligado.
- Sem clareza sobre o alvo (qual número é "bom") → pergunte; "rápido" não é critério.
- Sem clareza sobre tolerância a *staleness* → pergunte antes de propor cache.
- Sob carga/produção apenas → peça medição em *staging* com carga representativa.

---

## 15. Pós-entrega

- Sugira monitorar a métrica em produção (APM/dashboards) para confirmar o ganho real.
- Se mexeu em query/projeção, peça para correr os testes que dependem dela.
- Se o gargalo era o plano SQL/índice, encadeie `@tuning-query-postgres`.
- Se a mudança foi arquitetural (cache distribuído, paginação keyset), registre um ADR via `@adr-decisao-arquitetura`.
