## Auditoria de performance — `GET /pedidos?clienteId=...` (listagem de pedidos)

### 1. Linha de base (medição)

- **Métrica alvo:** latência do endpoint — actual em produção: **~4 s** (era ~300 ms) para um cliente com ~200 pedidos | meta razoável: **< 400 ms** e tempo ~constante com o nº de pedidos.
- **Nº de queries por request (estimado pelo código):** **1 + 2·N**.
  - 1 query para carregar a lista de pedidos (`Pedidos.Where(...).ToListAsync()`).
  - +N queries de *lazy loading* para `pedido.Cliente` (uma por pedido).
  - +N queries de *lazy loading* para `pedido.Itens` (uma por pedido).
  - Para N = 200 → **~401 queries por request**.
- **Onde o tempo se vai:** camada de **acesso a dados (EF Core)** — o tempo cresce ~linearmente com o nº de pedidos, confirmando o padrão de query por item (round-trips ao banco), não trabalho de CPU/serialização (~95%+ do tempo).

> Observação: os números acima são **inferidos por leitura de código**, não medidos. O primeiro passo de confirmação é ligar o log do EF Core e **contar as queries de um único request** (ver secção 5). O comportamento descrito ("300 ms → 4 s à medida que crescem os pedidos") é exatamente a assinatura de N+1.

---

### 2. Gargalos identificados (ordenados por impacto)

1. **Acesso a dados — N+1 por *lazy loading*** (impacto dominante).
   - `pedido.Cliente.Nome` dentro do `foreach` dispara **1 query por pedido** para buscar o cliente.
   - `pedido.Itens.Count` / `pedido.Itens.Sum(...)` dentro do `foreach` dispara **1 query por pedido** para buscar os itens.
   - Resultado: `1 + 2·N` round-trips. Com 200 pedidos, ~401 idas ao banco em série — é a causa do salto para ~4 s.

2. **Over-fetching / falta de projeção.**
   - `Pedidos...ToListAsync()` materializa a **entidade `Pedido` inteira** (todas as colunas) só para devolver 5 campos no DTO.
   - Os itens são carregados como entidades completas só para fazer `Count` e `Sum` — cálculo que o banco faz num único `SELECT`.

3. **Agregação feita em memória, não no banco.**
   - `Count` e `Sum(i => i.Quantidade * i.PrecoUnitario)` rodam no C# depois de trazer todas as linhas de itens. Deviam ser `COUNT`/`SUM` no SQL.

4. **`tracking` desnecessário em leitura.**
   - É uma leitura pura (não há `SaveChanges`), mas falta `AsNoTracking()`. O EF monta o *change tracker* para cada entidade `Pedido` (e itens) — CPU e memória proporcionais ao volume.

5. **Sem paginação.**
   - O endpoint devolve **todos** os pedidos do cliente. Mesmo com a query corrigida, um cliente com milhares de pedidos volta a doer. A tela de back-office deveria paginar.

6. **`CancellationToken` não propagado.**
   - A assinatura não recebe `CancellationToken` e nada é passado ao EF. Se o cliente desistir, o trabalho (e a conexão) continua preso até terminar.

---

### 3. Causa-raiz principal

> **N+1 por *lazy loading*: o `foreach` acede a `pedido.Cliente` e `pedido.Itens` por pedido, transformando uma listagem em `1 + 2·N` queries (≈401 para 200 pedidos).** O tempo escala com o nº de pedidos — daí 300 ms → ~4 s. O over-fetching e a agregação em memória amplificam, mas o dominante são os round-trips.

---

### 4. Proposta(s)

#### Opção A — Projeção no banco numa única query (recomendada)

Substituir o carregamento de entidades + `foreach` por uma **projeção LINQ→SQL** que selecciona só os campos necessários e calcula a contagem/soma no próprio banco. Isto colapsa `1 + 2·N` queries para **1 query** e elimina o over-fetching e o tracking.

```csharp
[HttpGet]
public async Task<ActionResult<List<PedidoResumoDto>>> Listar(
    Guid clienteId,
    CancellationToken ct)
{
    var resultado = await _ctx.Pedidos
        .Where(p => p.ClienteId == clienteId)
        .OrderByDescending(p => p.CriadoEm) // ordem estável p/ a tela e p/ paginação futura
        .Select(p => new PedidoResumoDto
        {
            Id = p.Id,
            Numero = p.Numero,
            NomeCliente = p.Cliente.Nome,                 // vira JOIN, não query extra
            QuantidadeItens = p.Itens.Count,              // COUNT no SQL
            Total = p.Itens.Sum(i => i.Quantidade * i.PrecoUnitario) // SUM no SQL
        })
        .AsNoTracking()
        .ToListAsync(ct);

    return Ok(resultado);
}
```

**Ganho esperado:** de **~401 queries** para **1 query**; tempo de **~4 s → tipicamente < 100–300 ms** (depende de índices), e — crucialmente — **deixa de escalar com o nº de pedidos**. Materialização de N projeções leves em vez de N entidades completas + tracking.

**Custo/risco:** baixo. A projeção acopla o DTO à query (aceitável — é um DTO de resposta dedicado). O `Total`/`Count` passam a ser computados pelo banco a cada chamada; se a query SQL gerada ficar lenta com volume, o gargalo desce para o **plano/índices** (ver secção 6).

#### Opção B — Adicionar paginação (complementar, recomendada para a tela)

Mesmo com a Opção A, devolver **todos** os pedidos não escala. Para a listagem de back-office, paginar:

```csharp
// Keyset (preferível a OFFSET grande): usa o último item visto
var pagina = await _ctx.Pedidos
    .Where(p => p.ClienteId == clienteId
             && (ultimoCriadoEm == null || p.CriadoEm < ultimoCriadoEm))
    .OrderByDescending(p => p.CriadoEm)
    .Select(p => new PedidoResumoDto { /* ...igual à Opção A... */ })
    .AsNoTracking()
    .Take(tamanhoPagina)
    .ToListAsync(ct);
```

**Ganho esperado:** tempo e payload **constantes** independentemente do total de pedidos do cliente.
**Custo/risco:** muda o contrato do endpoint (passa a paginado) — alinhar com o consumidor da tela. *Keyset* evita o custo de `OFFSET` grande.

> **Não** recomendo cache como primeira acção: serviria para mascarar uma query ruim. Corrigida a query (Opção A), avaliar cache só se a leitura for muito quente e o dado tolerar *staleness*.

---

### 5. Como validar

1. **Contar queries (antes/depois).** Ligar o log do EF Core e correr o cenário do cliente com ~200 pedidos:
   ```csharp
   optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information);
   // ou EnableSensitiveDataLogging() em ambiente de teste
   ```
   - **Antes:** ~401 comandos SQL por request.
   - **Depois (Opção A):** **1** comando SQL por request.
2. **Medir latência** do endpoint com o mesmo cliente, comparando a **2ª/3ª execução** (descartar a 1ª por JIT/warm-up/cache de plano).
3. **Confirmar correctude:** os `PedidoResumoDto` devolvidos (Numero, NomeCliente, QuantidadeItens, Total) devem ser idênticos aos da versão antiga para o mesmo cliente.
4. Se a query única ainda for lenta no banco, pegar o SQL gerado e rodar `EXPLAIN (ANALYZE, BUFFERS)` → seguir com **`@tuning-query-postgres`** (provável necessidade de índice em `Pedidos(ClienteId)` e nas FKs de itens).

**Critério de sucesso:** **1 query por request**, **p95 < 400 ms** com 200 pedidos, e tempo **estável** ao aumentar o nº de pedidos (não cresce linearmente).

---

### 6. Efeitos colaterais a monitorar

- **Plano SQL / índices:** com a agregação no banco, garantir índice em `Pedidos(ClienteId)` e nas FKs usadas pelos `Itens`. Sem isso, troca-se N round-trips por 1 query com *seq scan* pesado — medir com `EXPLAIN ANALYZE`.
- **`AsNoTracking`:** correcto aqui (leitura), mas confirmar que nenhum caminho a jusante esperava entidades rastreadas para alteração.
- **Mudança de contrato (Opção B):** paginar altera a resposta do endpoint — coordenar com o frontend da tela.
- **`Lazy loading` global:** se o projecto tem *lazy loading proxies* ligado, este mesmo padrão (acesso a navegação em loop) provavelmente existe noutros endpoints — vale auditar os demais.
- **Regressão de memória:** confirmar com medição que a materialização de DTOs leves reduziu (e não aumentou) alocações vs. a versão que carregava entidades completas + tracking.

---

### Resumo executivo

A lentidão **não** é do banco "estar lento": é **N+1 por lazy loading** no `foreach` (`1 + 2·N` queries, ~401 para 200 pedidos), com over-fetching e agregação em memória por cima. A correcção principal é uma **única query com projeção (`Select` + `AsNoTracking`)** que calcula `Count`/`Sum` no SQL (Opção A), complementada por **paginação** (Opção B) e propagação de `CancellationToken`. Validar contando queries (401 → 1) e medindo p95 na 2ª/3ª execução.
