---
name: tuning-query-postgres
description: Faz tuning sistemático de queries lentas no PostgreSQL — interpreta EXPLAIN (ANALYZE, BUFFERS), identifica gargalo (seq scan, nested loop, sort em disco, N+1, falta de índice), propõe índices/reescritas, valida ganho e estima impacto. Use SEMPRE que o usuário mencionar query lenta, timeout no banco, performance do PostgreSQL, EXPLAIN, ANALYZE, índice, sequential scan, nested loop, lock, vacuum, autovacuum, plano de execução, ou pedir @tuning-query-postgres.
---

# Tuning de Query no PostgreSQL

Skill para diagnosticar e resolver **queries lentas** no PostgreSQL com método científico: medir antes, propor mudança, medir depois, comparar.

## Quando aplicar

- "Esta query está demorando 12 segundos, era 200ms".
- "O dashboard de relatórios travou".
- "Vai ter timeout na API quando vier o pico".
- "Onde devo criar índice nesta tabela?".
- "Por que esse `JOIN` está lento?".

---

## 1. Antes de tunar — colher contexto

Sem estes dados, **não diagnostique no escuro**. Pergunte:

1. **A query exata** (não uma versão simplificada).
2. **Parâmetros típicos** (valores reais, especialmente datas, IDs e *flags*).
3. **Tamanho das tabelas envolvidas** (`SELECT reltuples FROM pg_class WHERE relname = '...'` ou estimativa).
4. **Schema** das tabelas (DDL + índices existentes).
5. **Versão do PostgreSQL** (`SELECT version();`).
6. **Hardware/ambiente** (dev local? produção? RDS? *shared_buffers* configurado?).
7. **Quando começou a ficar lento?** (Mudou volume, código, plano, configuração?).
8. **É leitura, escrita ou ambas?** (Lock e vacuum afetam diferentemente.)

---

## 2. Diagnóstico — sempre comece pelo plano real

**Nunca** confie só no `EXPLAIN` (estimativa). Use **`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)`**:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS, FORMAT TEXT)
SELECT p.id, p.numero, c.nome
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id
WHERE p.criado_em >= now() - interval '30 days'
  AND p.status = 'Confirmado'
ORDER BY p.criado_em DESC
LIMIT 50;
```

> Cuidado: `ANALYZE` **executa a query**. Para `INSERT/UPDATE/DELETE`, embrulhe em transação e faça `ROLLBACK`:
>
> ```sql
> BEGIN;
> EXPLAIN (ANALYZE, BUFFERS) UPDATE ... WHERE ...;
> ROLLBACK;
> ```

### Como ler o plano

Leia **de dentro para fora** (a folha primeiro). Para cada nó:

| Campo | Significado | Sinais de problema |
|---|---|---|
| `atual time` | Tempo real do nó | Discrepância grande vs. `cost` estimado → estatísticas desatualizadas |
| `rows` (estimado) | O que o planner achou | Diferente de `atual rows` em ordem de magnitude → estatísticas erradas |
| `atual rows` | Quantas linhas saíram | Comparar com `rows` estimado |
| `loops` | Quantas vezes o nó rodou | Loops × atual time = tempo total no nó |
| `Buffers: shared hit/read` | hit = cache; read = disco | Muito `read` → falta de cache ou *cold start* |
| `Rows Removed by Filter` | Quantas linhas o filtro descartou | Alto → índice faltando |
| `Rows Removed by Index Recheck` | Recheck pós-bitmap | Alto → considerar índice mais restritivo |

### Sinais de alerta clássicos

| Padrão no plano | Diagnóstico | Acção típica |
|---|---|---|
| `Seq Scan` numa tabela grande filtrando coluna | Falta índice na coluna | `CREATE INDEX` (avaliar selectividade) |
| `Nested Loop` com `atual rows` enorme no externo | JOIN sem índice no interno | Índice no FK da tabela interna |
| `Sort` com `Sort Method: external merge Disk` | *work_mem* insuficiente, sort em disco | Aumentar work_mem ou índice ordenado |
| Estimativa **muito** diferente de atual | Estatísticas obsoletas ou planner enganado | `ANALYZE <tabela>` ou `default_statistics_target` |
| `atual rows × loops` muito alto em Index Scan interno | Loops em demasia | Trocar para `Hash Join` ou `Merge Join` (geralmente índice no outro lado) |
| `Bitmap Heap Scan` com `Recheck Cond` recuperando >30% | Bitmap pouco selectivo | Índice composto ou parcial |
| `Filter:` extenso no nó topo | Predicado não aproveita índice | Reescrever ou índice expressivo |
| Pesquisa de função (`WHERE upper(email) = ...`) | Função invalida índice normal | Índice expressivo: `CREATE INDEX ON tab (upper(email))` |
| Wildcards no início (`LIKE '%abc'`) | Não usa B-tree | `pg_trgm` + `GIN` |

---

## 3. Decidir o índice certo

Antes de criar índice, **avalie**:

1. **Selectividade**: quantas linhas o `WHERE` deixa passar?
   ```sql
   SELECT count(*) FROM pedidos WHERE status = 'Confirmado'
     AND criado_em >= now() - interval '30 days';
   -- vs. count total
   ```
   Se filtra > 10-20% das linhas, índice B-tree pode não ajudar muito.

2. **Cardinalidade da coluna**: muita ou pouca variedade?
   ```sql
   SELECT count(DISTINCT status), count(*) FROM pedidos;
   ```
   Cardinalidade baixa (`status`, *flags*) → preferir **índice parcial**.

3. **Ordem de uso nas queries**: o que vem no `WHERE`, no `ORDER BY`, no `JOIN`?

### Tipos de índice no Postgres

| Tipo | Quando usar |
|---|---|
| **B-tree** (default) | Igualdade e desigualdade em colunas escalar; `ORDER BY` |
| **Hash** | Só igualdade (raramente melhor que B-tree no Postgres moderno) |
| **GIN** | `jsonb @>`, `tsvector`, arrays, `pg_trgm` (LIKE) |
| **GiST** | Geometria, *full-text*, *range types* |
| **BRIN** | Tabelas enormes com dados correlacionados a ordem física (logs, séries temporais) |
| **Índice parcial** | Filtro recorrente em subconjunto pequeno (`WHERE status = 'Confirmado'`) |
| **Índice expressivo** | `WHERE upper(email) = ...` ou `WHERE date_trunc('day', criado_em) = ...` |
| **Índice composto** | Múltiplas colunas no mesmo `WHERE`/`ORDER BY` (atenção à ordem) |
| **Índice de cobertura (INCLUDE)** | Permite *index-only scan* em colunas só lidas |

### Regras práticas

- **Composto:** ordem importa. Coluna mais selectiva geralmente primeiro, **exceto** se outra coluna for usada como `=` em quase toda query (essa vai antes).
- **`ORDER BY` ajuda?** Sim, se a coluna do `ORDER BY` for sufixo do índice composto.
- **`INCLUDE`** evita visitar a *heap* — bom para `SELECT` com poucas colunas.
- **Índice parcial:** `WHERE status = 'Confirmado'` em tabela com 99% cancelados é ouro.

### Exemplos

```sql
-- Caso 1: query filtra por status + range de data + ordena por data
-- Index composto + ordem
CREATE INDEX idx_pedidos_status_criado_em
  ON pedidos (status, criado_em DESC);

-- Caso 2: subconjunto pequeno e recorrente
CREATE INDEX idx_pedidos_pendentes
  ON pedidos (criado_em DESC)
  WHERE status = 'Pendente';

-- Caso 3: LIKE com wildcard
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_clientes_nome_trgm
  ON clientes USING gin (nome gin_trgm_ops);

-- Caso 4: case-insensitive em e-mail
CREATE INDEX idx_clientes_email_lower
  ON clientes (lower(email));
-- Lembre-se: WHERE lower(email) = lower($1) — não WHERE email ILIKE ...

-- Caso 5: índice de cobertura para listagem rápida
CREATE INDEX idx_pedidos_listagem
  ON pedidos (cliente_id, criado_em DESC)
  INCLUDE (numero, status, total);
```

---

## 4. Sequência de tuning (loop científico)

```
1. Reproduzir a lentidão (medir)
   └→ EXPLAIN (ANALYZE, BUFFERS) → guardar o plano #1

2. Hipótese (qual gargalo?)
   └→ Seq scan? Nested loop sem índice? Sort em disco? Estatística?

3. Acção minimamente invasiva
   └→ ANALYZE só → CREATE INDEX → reescrita → última: tuning de servidor

4. Medir de novo
   └→ EXPLAIN (ANALYZE, BUFFERS) → comparar planos

5. Validar não-regressão
   └→ Rodar queries vizinhas → verificar se nenhuma piorou
```

> **Crítico:** o cache do PostgreSQL aquece o BD após a primeira execução. Rode **3 vezes** e compare a **2ª e 3ª** medições, não a 1ª.

---

## 5. Quando o plano está estranho — checks de saúde

| Check | Comando | Sinal |
|---|---|---|
| Estatísticas obsoletas | `ANALYZE <tabela>;` | Discrepância estimado/atual diminui |
| `default_statistics_target` baixo | `ALTER TABLE x ALTER COLUMN y SET STATISTICS 1000;` | Distribuição enviesada não vista pelo planner |
| Inchaço (*bloat*) | `pg_stat_user_tables`, extensão `pgstattuple` | Tamanho da tabela >> linhas vivas |
| Vacuum atrasado | `pg_stat_user_tables.n_dead_tup` | Muito *dead tuple* → `VACUUM ANALYZE` |
| Lock | `pg_locks` + `pg_stat_activity` | Query em *idle in transaction* segurando lock |
| Conexões esgotadas | `SELECT count(*) FROM pg_stat_activity;` | Pool exausto, query espera por conexão |
| Estatísticas do índice | `pg_stats` | Distribuição vs. realidade |
| Uso real do índice | `pg_stat_user_indexes` | `idx_scan = 0` = índice morto, remove |

---

## 6. Reescritas frequentes

| Antes (lento) | Depois (rápido) | Por quê |
|---|---|---|
| `WHERE date(criado_em) = '2026-01-15'` | `WHERE criado_em >= '2026-01-15' AND criado_em < '2026-01-16'` | Função quebra uso de índice |
| `WHERE upper(email) = 'X@Y'` | Índice expressivo em `upper(email)` ou guardar e-mail normalizado | Função invalida índice |
| `OR` com colunas diferentes | `UNION ALL` ou índice condicional | Planner não combina índices bem em `OR` |
| `LIKE '%abc%'` | `pg_trgm` + GIN | B-tree não suporta wildcard à esquerda |
| `IN (subquery)` enorme | `EXISTS` ou `JOIN` | Planner trata melhor `EXISTS` em alguns casos |
| `SELECT *` para listagem | `SELECT colunas_necessárias` + índice `INCLUDE` | Permite *index-only scan* |
| `OFFSET 100000` para paginação | *Keyset pagination* (`WHERE id > $ultimoId`) | OFFSET ainda lê e descarta |
| `count(*)` em tabela enorme | `pg_class.reltuples` (aproximado) ou tabela materializada | `count(*)` sempre faz scan |
| `NOT IN (subquery)` com NULLs | `NOT EXISTS` | `NOT IN` + NULL = comportamento contra-intuitivo |

---

## 7. Quando aumentar configurações do servidor

**Última cartada.** Antes de mexer em `work_mem`/`shared_buffers`/`effective_cache_size`, esgote índices + reescrita.

Mas se for inevitável:

| Parâmetro | Quando aumentar | Como medir |
|---|---|---|
| `work_mem` | `Sort Method: external merge Disk` recorrente | Aumentar **por sessão**, medir, depois global |
| `effective_cache_size` | Planner subestima ganho de cache | Ajustar para ~75% da RAM em produção |
| `shared_buffers` | `Buffers: shared read` recorrente em hot tables | ~25% da RAM (Linux) |
| `random_page_cost` | Disco SSD/NVMe sub-utilizado por planner conservador | De 4 → 1.1-1.5 |

Sempre **mude um por vez** e remedir.

---

## 8. Output esperado da skill

Quando o usuário trouxer uma query lenta, devolva um **relatório estruturado**:

```markdown
## Diagnóstico — query "<descrição curta>"

### 1. Plano atual

`<EXPLAIN ANALYZE em bloco fence>`

### 2. Gargalos identificados

- **<nó>**: <observação numérica> — <interpretação>
- ...

### 3. Hipótese principal

<frase única identificando o problema raiz>

### 4. Proposta(s)

#### Opção A — <descrição curta>
```sql
<comando>
```
**Custo estimado:** baixo / médio / alto (em I/O, tempo de criação, ocupação de disco)
**Ganho esperado:** <X% ou de Y ms para Z ms>
**Risco:** <ex.: vai aumentar tempo de INSERT em ~5%>

#### Opção B — <alternativa, se houver>

### 5. Como validar

```sql
-- Antes
EXPLAIN (ANALYZE, BUFFERS) <query>;

-- Aplicar índice
<comando do índice>

-- Depois
EXPLAIN (ANALYZE, BUFFERS) <query>;
```

Critério de sucesso: <ex.: atual time < 200ms, sem seq scan em pedidos>.

### 6. Efeitos colaterais a monitorar

- <ex.: outras queries que escrevem na tabela vão sofrer +X% de tempo>
- <ex.: tamanho do índice estimado em ~Y MB>
- <ex.: cuidado com a próxima migration>
```

---

## 9. Padrões a evitar no diagnóstico

| Anti-padrão | Por quê | Alternativa |
|---|---|---|
| Criar índice antes de medir | Cego, pode até piorar | EXPLAIN ANALYZE primeiro |
| Criar índice para tabela com 1k linhas | Seq scan é melhor | Foque em tabelas grandes |
| Confiar na 1ª execução | Cache cold dá número enganador | Rodar 3 vezes |
| Criar índice em coluna boolean simples | Selectividade quase sempre baixa | Índice parcial |
| Esquecer `WITH (CONCURRENTLY)` em prod | Lock exclusivo na tabela | `CREATE INDEX CONCURRENTLY` |
| Ignorar `VACUUM`/`ANALYZE` | Estatística enganada faz planner errar | Garantir autovacuum activo |
| `SELECT *` em produção | Visita heap mesmo com índice | Listar colunas + INCLUDE |
| Tunar `work_mem` global cedo demais | Memória explode com muitas conexões | `SET work_mem` por sessão |

---

## 10. Checklist final

- [ ] Plano antes/depois (`EXPLAIN ANALYZE BUFFERS`) capturado.
- [ ] Identificado gargalo específico (não "está lento").
- [ ] Acção é a **menos invasiva** que resolve.
- [ ] Índice criado com `CONCURRENTLY` se for em produção.
- [ ] Estimado impacto em INSERT/UPDATE/DELETE.
- [ ] Verificado se não regrediu queries vizinhas.
- [ ] Documentado no PR / runbook.
- [ ] Se mudou config global, documentado por quê e revertível.

---

## 11. Quando pedir ajuda do usuário

- Sem acesso ao banco real → peça que ele rode os EXPLAIN e cole.
- Sem clareza sobre frequência → pergunte (índice para query rara pode não compensar custo de manutenção).
- Sem clareza sobre janela de manutenção → pergunte (mudanças com lock precisam de janela).

---

## 12. Pós-entrega

- Sugira monitorar `pg_stat_statements` para confirmar o ganho na prática.
- Se mudou query, peça para correr os testes que dependem dela.
- Se foi crítico, escreva *runbook* curto no `Documentacao/`.
