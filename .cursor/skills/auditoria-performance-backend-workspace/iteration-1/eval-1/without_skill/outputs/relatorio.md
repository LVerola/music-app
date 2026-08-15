# Relatório de Auditoria de Performance — `GET /pedidos`

## 1. Resumo executivo

O endpoint de listagem de pedidos sofre de um **problema clássico de N+1 queries**, agravado por **lazy loading** das navegações `Cliente` e `Itens` e por **fazer projeção/agregação em memória** em vez de no banco.

Com ~200 pedidos por cliente, uma única chamada HTTP dispara **cerca de 401 idas ao banco** (1 para listar os pedidos + 1 por pedido para `Cliente` + 1 por pedido para `Itens`). Cada round-trip soma latência de rede + parsing + tracking do EF, o que explica perfeitamente o salto de **~300ms para ~4s** à medida que o número de pedidos cresce: o tempo cresce **linearmente com a quantidade de pedidos**, não com o volume de dados real.

A correção principal é **projetar diretamente para o DTO numa única query** (deixando o EF Core traduzir tudo para SQL) e **desligar o tracking**. Isto reduz de ~401 queries para **1 query** e leva o tempo de volta para a casa das dezenas/poucas centenas de milissegundos.

---

## 2. Diagnóstico detalhado

### 2.1 N+1 por lazy loading (causa raiz)

```csharp
var pedidos = await _ctx.Pedidos
    .Where(p => p.ClienteId == clienteId)
    .ToListAsync();                      // (1) query: SELECT ... FROM Pedidos WHERE ClienteId = @id

foreach (var pedido in pedidos)
{
    var nomeCliente = pedido.Cliente.Nome;                 // (2) +1 query por pedido (lazy)
    var totalItens  = pedido.Itens.Count;                  // (3) +1 query por pedido (lazy)
    var total       = pedido.Itens.Sum(i => i.Quantidade * i.PrecoUnitario); // reusa a coleção já carregada em (3)
}
```

- `pedido.Cliente` e `pedido.Itens` são navegações **lazy**. Cada primeiro acesso a uma navegação ainda não carregada dispara uma query SQL **dentro do loop**.
- Para `N` pedidos: `1 + N (Cliente) + N (Itens)` = **`2N + 1` queries**.
  - N = 200 → **401 queries** por request.
- O custo dominante aqui **não é CPU nem volume de bytes**, é a **latência acumulada de centenas de round-trips** ao banco (e, em produção, a latência de rede entre app e BD é tipicamente maior que em dev — por isso "explode" mais em produção).

Isto bate exatamente com o sintoma descrito: rápido com poucos pedidos, **degradação linear** conforme o cliente acumula pedidos.

### 2.2 Buscar entidades completas e projetar em memória

Mesmo sem o lazy loading, o código:

- Carrega **todas as colunas** de `Pedido` (`SELECT *`), quando o DTO só precisa de `Id`, `Numero`, nome do cliente, contagem e total.
- Materializa **todas as entidades `PedidoItem`** só para fazer `Count` e `Sum` — quando essas agregações poderiam ser calculadas **no banco** (`COUNT`, `SUM`), trafegando apenas os números finais em vez de todas as linhas de itens.

### 2.3 Tracking desnecessário

`ToListAsync()` sem `AsNoTracking()` faz o EF **rastrear** todas as entidades (pedidos + clientes + itens carregados) no `ChangeTracker`. Para uma operação **somente leitura**, isto é overhead puro de memória e CPU, e piora com o número de entidades materializadas.

### 2.4 Possível ausência de índice

Se não existir índice em `Pedidos(ClienteId)`, o `Where(p => p.ClienteId == ...)` faz **seq scan**. Provavelmente não é o gargalo principal aqui (o N+1 domina), mas vale verificar.

---

## 3. Solução recomendada

### 3.1 Correção principal — uma única query com projeção

Reescrever para projetar diretamente no DTO. O EF Core traduz a projeção, o `Count` e o `Sum` para SQL, resolvendo tudo numa só ida ao banco e trazendo apenas os campos necessários.

```csharp
[HttpGet]
public async Task<ActionResult<List<PedidoResumoDto>>> Listar(Guid clienteId)
{
    var resultado = await _ctx.Pedidos
        .AsNoTracking()
        .Where(p => p.ClienteId == clienteId)
        .Select(p => new PedidoResumoDto
        {
            Id = p.Id,
            Numero = p.Numero,
            NomeCliente = p.Cliente.Nome,                 // vira JOIN no SQL
            QuantidadeItens = p.Itens.Count,              // vira COUNT correlacionado
            Total = p.Itens.Sum(i => i.Quantidade * i.PrecoUnitario) // vira SUM correlacionado
        })
        .ToListAsync();

    return Ok(resultado);
}
```

Vantagens:
- **1 query** em vez de ~401.
- Traz só as 5 colunas do DTO, não entidades inteiras.
- `Count`/`Sum` calculados no banco (menos tráfego e menos materialização).
- Sem tracking → menos memória/CPU.

> Nota sobre `Sum` e `decimal` nullable: se um pedido puder não ter itens, o `SUM` no SQL devolve `NULL`. Com `Total` do tipo `decimal` (não-nullable), o EF normalmente gera um `COALESCE`/`?? 0`; ainda assim convém testar este caso de borda (cliente com pedido sem itens) para garantir que não há `InvalidOperationException` de cast de `null`.

### 3.2 Paginação (fortemente recomendada)

A tela de back-office quase nunca precisa de **todos** os pedidos de uma vez. Adicionar paginação corta o tamanho do payload e mantém a latência estável independentemente de quantos pedidos o cliente tenha:

```csharp
[HttpGet]
public async Task<ActionResult<List<PedidoResumoDto>>> Listar(
    Guid clienteId, int pagina = 1, int tamanhoPagina = 50)
{
    var resultado = await _ctx.Pedidos
        .AsNoTracking()
        .Where(p => p.ClienteId == clienteId)
        .OrderByDescending(p => p.Numero) // ordem estável e determinística para paginar
        .Skip((pagina - 1) * tamanhoPagina)
        .Take(tamanhoPagina)
        .Select(p => new PedidoResumoDto
        {
            Id = p.Id,
            Numero = p.Numero,
            NomeCliente = p.Cliente.Nome,
            QuantidadeItens = p.Itens.Count,
            Total = p.Itens.Sum(i => i.Quantidade * i.PrecoUnitario)
        })
        .ToListAsync();

    return Ok(resultado);
}
```

### 3.3 Índice de suporte

Garantir índice em `Pedidos(ClienteId)` (e, se usar a ordenação acima, considerar índice composto `(ClienteId, Numero)`):

```csharp
modelBuilder.Entity<Pedido>()
    .HasIndex(p => p.ClienteId);
```

### 3.4 Desligar/Controlar lazy loading

O lazy loading foi o que mascarou o problema (o `foreach` "parecia" inocente). Recomendações:
- Preferir **projeção explícita** (como acima) ou `Include`/`AsSplitQuery` quando precisar de entidades completas.
- Considerar **desativar lazy loading proxies** globalmente para evitar reincidência deste padrão em outros endpoints.

---

## 4. Cuidado a evitar (anti-padrão alternativo)

Resolver com `Include(p => p.Cliente).Include(p => p.Itens)` **elimina o N+1**, mas, numa **única** query com `Include` de coleção, gera *cartesian explosion* (linhas de pedido multiplicadas pelas linhas de itens) e ainda materializa entidades completas. Se for esse o caminho, usar `AsSplitQuery()`. Mesmo assim, para esta tela **a projeção do item 3.1 é superior**, pois nem precisa materializar os itens — só agrega.

---

## 5. Impacto esperado

| Métrica | Antes | Depois (projeção) |
|---|---|---|
| Queries por request (N=200) | ~401 | **1** |
| Crescimento com nº de pedidos | Linear (explode) | Constante por página |
| Dados trafegados | Entidades completas + todos os itens | Só 5 colunas agregadas |
| Tracking EF | Sim (todas as entidades) | Não (`AsNoTracking`) |
| Latência estimada (N=200) | ~4s | dezenas a poucas centenas de ms |

---

## 6. Como validar

1. **Log de SQL do EF Core** (ou `ToQueryString()`): confirmar que passou a sair **1 comando SQL**.
2. **Benchmark** com um cliente real de ~200 pedidos antes/depois (cronometrar o endpoint).
3. **Casos de borda**: cliente sem pedidos (lista vazia), pedido sem itens (`Total` = 0, sem exceção), `clienteId` inexistente.
4. **`EXPLAIN`/plano de execução** da query gerada para confirmar uso de índice em `ClienteId`.

---

## 7. Conclusão

A lentidão é causada por **N+1 via lazy loading** somado a **agregação/projeção em memória** sobre entidades completas e **tracking** desnecessário. A correção de maior impacto e menor risco é **reescrever para uma única query com `Select` projetando para `PedidoResumoDto` + `AsNoTracking()`**, complementada por **paginação** e **índice em `ClienteId`**. Isso reduz de ~401 para 1 query e devolve o endpoint a tempos de resposta estáveis.
