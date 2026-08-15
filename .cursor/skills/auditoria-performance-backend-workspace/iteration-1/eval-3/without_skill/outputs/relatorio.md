# Auditoria de Performance — Endpoint de Relatório de Vendas (p95 ≈ 6 s)

> Contexto: endpoint de relatório de vendas com **p95 de ~6 s em produção**, sem código fornecido. Este documento é um **plano de ataque sistemático** para localizar e eliminar o gargalo, com base nos padrões mais comuns deste tipo de endpoint (.NET / ASP.NET Core / EF Core / PostgreSQL ou SQL Server).

---

## 1. Princípio: medir antes de mexer

A regra de ouro: **não optimizar às cegas**. Um relatório de vendas lento quase sempre cai num de quatro baldes, e o objectivo da primeira fase é descobrir **em qual balde** o tempo está a ser gasto:

1. **Tempo de base de dados** (query lenta, falta de índice, N+1) — *o suspeito nº 1*.
2. **Tempo de aplicação** (serialização, materialização de muitas entidades, processamento em memória, mapeamento).
3. **Tempo de espera / contenção** (locks, pool de conexões esgotado, thread pool starvation, chamadas externas síncronas).
4. **Tempo de rede / payload** (resposta gigante, sem compressão, sem paginação).

Antes de qualquer alteração, garante uma **medição reproduzível**: isola um conjunto de parâmetros (ex.: um intervalo de datas “pesado”) que reproduza consistentemente os ~6 s. Sem repro, não há como provar a correcção.

---

## 2. Fase 1 — Instrumentar e decompor o tempo

O primeiro passo é quebrar os 6 s em fatias. Sugestões, da mais barata à mais completa:

### 2.1 Logs de tempo por etapa (rápido)
Envolve as secções suspeitas com `Stopwatch` ou logging estruturado para ver onde o tempo realmente está:

```csharp
var sw = Stopwatch.StartNew();
var dados = await _repositorio.ObterVendasAsync(filtro, ct);
_logger.LogInformation("Consulta de vendas demorou {Elapsed} ms, {Linhas} linhas",
    sw.ElapsedMilliseconds, dados.Count);
sw.Restart();
var relatorio = _montador.Montar(dados);
_logger.LogInformation("Montagem do relatório demorou {Elapsed} ms", sw.ElapsedMilliseconds);
```

Isto, sozinho, costuma responder “é o banco ou é a app?” em minutos.

### 2.2 Observabilidade adequada (recomendado)
- **OpenTelemetry / Application Insights**: traces distribuídos mostram o waterfall (controller → handler → query SQL → serialização). Activa a instrumentação de `HttpClient` e do provider de BD para ver cada query e a sua duração.
- **MiniProfiler**: excelente em desenvolvimento para ver, por requisição, **cada SQL executado e quanto tempo levou** — desmascara N+1 instantaneamente.
- **Logging de comandos do EF Core**: liga o log de SQL para contar quantas queries o endpoint dispara.

```csharp
optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information)
              .EnableSensitiveDataLogging(); // só fora de produção
```

### 2.3 Métricas agregadas
- Confirma o p95 com a fonte real (APM, logs do gateway/reverse proxy), e verifica se é **estável** ou se há picos correlacionados com carga, deploys ou jobs.
- Mede também p50 e p99: se p50 é baixo e p95/p99 explodem, cheira a **contenção/fila** (pool, locks) e não a query intrinsecamente lenta.

---

## 3. Fase 2 — Os suspeitos do costume (e como confirmar cada um)

### 3.1 Problema N+1 (muito provável num relatório)
**Sintoma:** dezenas/centenas de queries pequenas por requisição. Típico quando se itera vendas e, para cada uma, se acede a `venda.Cliente.Nome`, `venda.Itens`, etc., sem `Include`/projeção.

**Como confirmar:** conta as queries no log do EF / MiniProfiler.

**Correcção:**
- Projetar directamente para um DTO com `Select` (traz só as colunas necessárias e evita lazy loading):

```csharp
var relatorio = await _db.Vendas
    .Where(v => v.Data >= inicio && v.Data < fim)
    .Select(v => new LinhaRelatorioVendas
    {
        VendaId   = v.Id,
        Data      = v.Data,
        Cliente   = v.Cliente.Nome,
        Total     = v.Itens.Sum(i => i.Quantidade * i.PrecoUnitario)
    })
    .ToListAsync(ct);
```

- Ou usar `Include`/`AsSplitQuery()` quando precisas mesmo das entidades relacionadas.
- **Desligar lazy loading** em endpoints de leitura.

### 3.2 Falta de índice / query não-sargável
**Sintoma:** uma única query domina os 6 s.

**Como confirmar:** pega no SQL real (do log) e roda o plano de execução:
- PostgreSQL: `EXPLAIN (ANALYZE, BUFFERS) <sql>` — procura `Seq Scan` em tabelas grandes, `Sort` em disco, estimativas muito erradas vs. linhas reais.
- SQL Server: `SET STATISTICS IO, TIME ON` + plano de execução real — procura *table/index scans*, *key lookups*, *missing index hints*.

**Correcção típica:**
- Índice cobrindo o filtro + ordenação mais comum, p.ex.:

```sql
CREATE INDEX ix_vendas_data_cliente
    ON vendas (data, cliente_id) INCLUDE (total);
```

- Evitar funções sobre a coluna no `WHERE` (ex.: `WHERE CAST(data AS date) = @d` impede uso de índice → reescrever como range `data >= @ini AND data < @fim`).
- Garantir que parâmetros têm o **mesmo tipo** da coluna (evita conversões implícitas).

### 3.3 Agregação feita em C# em vez de no banco
**Sintoma:** o endpoint traz milhares/milhões de linhas e faz `GroupBy`/`Sum` em memória.

**Correcção:** empurra a agregação para o SQL (`GROUP BY` no `Select`/LINQ), devolvendo só as linhas agregadas. Reduz drasticamente I/O, materialização e GC.

### 3.4 `AsNoTracking` ausente em leitura
Relatórios são **read-only**. Sem `AsNoTracking()`, o EF cria change-tracking para cada entidade — desperdício de CPU e memória:

```csharp
_db.Vendas.AsNoTracking().Where(...)...
```

(Com projeção `Select` para DTO, o tracking já não se aplica — outra razão para projetar.)

### 3.5 Async usado incorrectamente / bloqueios
- Procurar `.Result`, `.Wait()`, `.GetAwaiter().GetResult()` no caminho da requisição → causam **thread pool starvation** e disparam o p95 sob carga.
- Garantir `async`/`await` ponta-a-ponta e propagar `CancellationToken`.

### 3.6 Pool de conexões / contenção
- Pool esgotado (default 100 no SQL Server / Npgsql) sob carga → requisições ficam **em fila**, p95 explode mesmo com queries rápidas.
- Verificar `Timeout`/`Max Pool Size` na connection string e métricas de conexões activas.
- Confirmar que `DbContext` tem **lifetime scoped** e não está a ser retido.

### 3.7 Payload e serialização
- Resposta gigante (milhares de linhas) sem **paginação** → tempo de serialização + transferência.
- Activar **compressão de resposta** (Brotli/Gzip).
- Para relatórios grandes, considerar **streaming** (`IAsyncEnumerable`) ou exportação assíncrona (gerar ficheiro e devolver link).

---

## 4. Fase 3 — Ataque recomendado (ordem prática)

1. **Reproduzir** o caso lento com parâmetros fixos e medir p50/p95/p99.
2. **Instrumentar** (MiniProfiler/OTel + log de SQL) e responder: *banco ou app?*
3. Se **banco**:
   - Contar queries → se muitas, **matar o N+1** (projeção/Include).
   - Se uma query domina → `EXPLAIN ANALYZE` → **índice/reescrita/agregação no SQL**.
4. Se **app**: verificar materialização excessiva, tracking, mapeamento, serialização, async bloqueante.
5. Se **contenção** (p50 baixo, p95 alto sob carga): pool de conexões, locks, thread pool, dependências externas síncronas.
6. **Cache** quando aplicável: relatórios costumam tolerar dados ligeiramente “stale”. Cachear o resultado (memória/Redis) por alguns minutos, ou materializar numa tabela/vista agregada (rollup) actualizada periodicamente, pode levar 6 s → ms.
7. **Medir de novo** e comparar com o baseline. Só dás por resolvido com número antes/depois.

---

## 5. Quick wins (baixo esforço, alto impacto)

- [ ] `AsNoTracking()` + projeção para DTO em todas as leituras do relatório.
- [ ] Eliminar lazy loading no caminho do endpoint.
- [ ] Garantir filtro por **range de datas sargável** e índice correspondente.
- [ ] Empurrar `Sum`/`GroupBy` para o banco.
- [ ] Paginação ou limite de linhas + compressão de resposta.
- [ ] Remover qualquer `.Result`/`.Wait()` e propagar `CancellationToken`.
- [ ] Cache curto / tabela de rollup se os dados toleram atraso.

---

## 6. Armadilhas a evitar

- **Optimizar sem medir**: adicionar índices ou cache “por intuição” pode mascarar o verdadeiro gargalo e introduzir custos (escrita mais lenta, invalidação de cache).
- **Índice a mais**: cada índice penaliza `INSERT/UPDATE`; cria só o necessário e valida com o plano.
- **Testar só com pouca data**: o problema costuma aparecer com volume realista — testa com dados representativos de produção.
- **Confundir p50 com p95**: a média esconde a cauda; foca-te na distribuição.

---

## 7. O que eu preciso para fechar o diagnóstico

Para sair das hipóteses e apontar a causa exacta, partilha:

1. O **código do endpoint** (controller/handler + a query LINQ/SQL).
2. O **SQL real** que o EF gera (log) e quantas queries por requisição.
3. O **plano de execução** (`EXPLAIN ANALYZE` ou plano do SQL Server) da query mais lenta.
4. **Volume**: nº de linhas devolvidas e ordem de grandeza das tabelas.
5. Se o p95 piora **sob carga** ou é constante mesmo isolado.

Com isso, consigo indicar a correcção específica (índice X, reescrita Y, cache Z) e estimar o ganho.

---

### Resumo de uma linha
Instrumenta primeiro para descobrir se os 6 s são **banco** (quase sempre N+1 ou falta de índice) ou **app**; ataca o maior balde com projeção/`AsNoTracking`, índice sargável e agregação no SQL, e valida com p95 antes/depois.
