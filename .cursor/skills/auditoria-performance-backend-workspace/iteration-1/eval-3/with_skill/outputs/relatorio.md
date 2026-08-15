# Auditoria de performance — "Endpoint de relatório de vendas" (p95 ~6s)

> **Antes de tudo:** não tenho o código nem números de medição, só o sintoma (p95 ~6s em produção). A regra de ouro aqui é **não optimizar no escuro**. Optimização sem medição é palpite — costuma piorar o código e não move o número. Por isso o **primeiro entregável não é um *fix*, é um plano para localizar o gargalo com evidência**. Abaixo está como atacar, do macro para o micro, com as hipóteses mais prováveis para este tipo de endpoint já ordenadas por probabilidade.

---

## 1. Contexto que preciso confirmar (responde a estas para afunilar)

Sem isto, qualquer "correcção" é chute:

1. **Métrica e alvo.** p95 = 6s é o número actual — qual é o alvo aceitável (ex.: p95 < 800ms)? Qual é a média e o p99? "Rápido" não é critério.
2. **Forma da carga.** O relatório devolve quantas linhas? Agrega quanto período (1 dia? 1 ano?)? O *payload* tem que tamanho (KB/MB)?
3. **Condição.** É lento **sempre** ou só com certos parâmetros (ex.: intervalo de datas grande, cliente/tenant com muitas vendas)? Só sob carga ou também com 1 utilizador?
4. **Quando começou.** Após que *deploy*? Crescimento natural do volume de dados? Mudança de dependência?
5. **Onde dói.** Só este endpoint, ou todos os relatórios? Tempo no servidor (TTFB) ou também transferência de rede?
6. **Ambiente / observabilidade.** Há APM (Application Insights, OpenTelemetry, Datadog)? Consigo reproduzir em *staging* com carga representativa, ou só existe em produção?

> Se "só acontece em produção" e não há *staging* com dados representativos, o pedido número 1 é **conseguir reproduzir** ou **instrumentar produção** com segurança (amostragem de traces).

---

## 2. Como medir — ferramenta por pergunta

A ideia é descer **do macro para o micro**. Não micro-optimizes um trecho que custa 2% do tempo (Lei de Amdahl).

| Pergunta | Ferramenta | Como |
|---|---|---|
| **Onde o request gasta o tempo?** (HTTP → use case → EF → DB → serialização) | APM / OpenTelemetry (traces) | Olhar os *spans* por camada. Isto sozinho já costuma apontar o culpado. |
| **Quantas queries este endpoint dispara?** | EF Core logging | `optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information)` (ou um interceptor). Contar as queries de **um único request**. |
| **A query é lenta no app ou no banco?** | EF logs com tempo + `EXPLAIN (ANALYZE, BUFFERS)` | Comparar o tempo da query no log do app com o tempo real do plano no Postgres. |
| **O tempo está em alocação/GC/threadpool?** | dotnet-counters | `dotnet-counters monitor -p <pid>` → GC, Allocation Rate, **ThreadPool Queue Length** (fila a crescer = sync-over-async/bloqueio). |
| **Connection pool esgotado?** | `pg_stat_activity` + métricas Npgsql | Conexões `idle in transaction`, espera por conexão. |

**Importante sobre a medição:** o cache aquece. Mede o caminho quente **3 vezes** e compara a 2ª/3ª execução, nunca a 1ª (JIT, cache de plano, *connection warmup*).

**Mínimo viável para a próxima conversa:** liga o log do EF, roda o endpoint **uma vez** com um parâmetro realista, e traz-me **(a)** quantas queries dispararam e **(b)** o tempo de cada uma. Isso normalmente já decide entre os dois grandes ramos: "problema de número de queries / materialização" (camada de aplicação) vs. "uma query lenta no banco" (plano/índice).

---

## 3. Hipóteses ordenadas por probabilidade (relatório de vendas)

Para um endpoint de **relatório de vendas**, a esmagadora maioria da lentidão .NET vive na **camada de acesso a dados**. Ordem em que eu investigaria:

### H1 — N+1 na montagem do relatório *(muito provável)*
Sintoma típico: o relatório lista vendas e, por cada venda, acede a `Cliente`, `Itens`, `Vendedor`… disparando 1 + N queries. Com 2.000 vendas isso são milhares de *round-trips*.
- **Como confirmar:** contar as queries (secção 2). Mais de uma query por relação acedida em loop = N+1.
- **Correcção típica:** `Include` + projeção numa só query, ou `AsSplitQuery()` se incluir várias coleções.

### H2 — Over-fetching / falta de projeção *(muito provável)*
Materializa entidades inteiras (todas as colunas, relações completas) só para devolver um resumo agregado.
- **Como confirmar:** olhar o SQL gerado (colunas a mais, `SELECT *`), e o tamanho do *payload*.
- **Correcção típica:** projectar para DTO no `.Select(...)` (a agregação vai para o SQL) + `AsNoTracking()`.

### H3 — Agregação feita em memória em vez de no banco *(provável em relatórios)*
Clássico de relatório: traz **todas** as vendas para o C# e faz `Sum`/`GroupBy`/`Count` em memória.
- **Como confirmar:** ver se há `ToList()`/`AsEnumerable()` **antes** dos `GroupBy/Sum`.
- **Correcção típica:** deixar a agregação no `IQueryable` para o Postgres executar (`GROUP BY`).

### H4 — Query pesada / plano ruim / falta de índice *(provável)*
Se for **uma** query só, mas demora segundos, o gargalo é o **banco**, não o app.
- **Como confirmar:** `EXPLAIN (ANALYZE, BUFFERS)` — procurar *seq scan* em tabela grande, *sort* em disco, *nested loop* explosivo.
- **Próximo passo:** isto sai do escopo da camada de aplicação → encadear com **@tuning-query-postgres** (índice, reescrita).

### H5 — Sem paginação / intervalo de datas ilimitado *(provável)*
Relatório que devolve a tabela inteira escala com o volume — o que era rápido há um ano hoje são 6s.
- **Correcção típica:** paginação (preferir *keyset* a `OFFSET` grande), limitar período, ou *streaming*.

### H6 — Sync-over-async sob carga *(possível, se o p95 piora com concorrência)*
Se p95 só explode **sob carga** (e a média isolada é ok), suspeitar de `.Result`/`.Wait()` num caminho de request → *threadpool starvation*.
- **Como confirmar:** `dotnet-counters` → fila do threadpool a crescer.

### H7 — Serialização / payload gigante *(possível)*
Relatório com dezenas de milhares de linhas serializadas e enviadas sem compressão.
- **Como confirmar:** o *span* de serialização no trace e o tamanho da resposta. Se o TTFB é baixo mas o total é alto, o tempo pode estar na rede/serialização.

---

## 4. Causa-raiz provável (a confirmar com medição)

Sem números, a aposta mais forte para "relatório de vendas com p95 de 6s" é a **combinação H1+H2+H3**: o endpoint traz entidades demais (e/ou em N+1) e agrega em memória. Mas **isto é hipótese, não diagnóstico** — a contagem de queries + um trace decidem em minutos.

---

## 5. Plano de ataque (loop científico, uma mudança de cada vez)

```
1. Medir o caminho quente → linha de base
   - APM/trace do request inteiro (onde se vai o tempo, por camada)
   - Contar queries com log do EF
   - Se for 1 query lenta: EXPLAIN ANALYZE no Postgres
2. Localizar o gargalo dominante (atacar o maior %, não o que é fácil)
3. Formular hipótese concreta ("o tempo está em N+1 na lista de itens: 1+2000 queries")
4. Acção minimamente invasiva (projeção / Include+split / agregar no SQL / índice / paginação)
5. Medir de novo (mesmo cenário, 2ª/3ª execução)
6. Validar não-regressão (correctude dos totais + memória + outros endpoints)
7. Decidir: ganho compensa custo/risco? Documentar.
```

> Muda **uma coisa de cada vez** e remede. Se mudares três, não saberás qual moveu o número (nem qual regrediu).

**O que evitar (anti-padrões):**
- Aumentar o *timeout* para "resolver" — esconde a causa.
- Adicionar cache para mascarar uma query ruim — empurra o problema e serve dado *stale*. Corrige a query primeiro; cache depois, se a tríade (custo × frequência de leitura × tolerância a *staleness*) justificar.
- Micro-optimizar alocações antes de saber se o tempo está no banco.

---

## 6. Critério de sucesso e como validar

- **Critério:** definir o alvo (ex.: p95 < 800ms, ≤ 2 queries por request, sem regressão de memória).
- **Validação:** repetir a **mesma** medição da linha de base (trace + contagem de queries, 2ª/3ª execução) e comparar. Confirmar em produção via APM/dashboard depois do *deploy*.
- **Não-regressão:** conferir que os totais do relatório continuam correctos e que outros endpoints/memória não pioraram.

---

## 7. O que me trazer para eu apontar o gargalo exacto

1. O **trace/APM** do request (ou, na falta, o tempo por fase).
2. A **contagem de queries** e o **SQL gerado** de um request (log do EF).
3. Se for uma query dominante: o `EXPLAIN (ANALYZE, BUFFERS)`.
4. Os parâmetros do cenário lento (intervalo de datas, tenant, nº de linhas devolvidas) e o alvo de p95.

Com isso eu fecho o diagnóstico e devolvo a(s) proposta(s) de correcção com **ganho esperado × custo × risco**, em vez de chutar.
