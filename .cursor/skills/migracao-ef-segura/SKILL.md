---
name: migracao-ef-segura
description: Cria migrations EF Core seguras para PostgreSQL — sem bloqueio prolongado, sem perda de dados, zero downtime, com plano de rollback e estratégia expand/contract para alterações destrutivas. Avalia o script SQL gerado antes de aplicar. Use SEMPRE que o usuário pedir para criar, gerar, aplicar, reverter ou revisar uma migration EF Core; quando mencionar Add-Migration, dotnet ef migrations, ALTER TABLE, DROP COLUMN, RENAME, schema, expand/contract; ou pedir @migracao-ef-segura.
---

# Migration EF Core Segura

Skill para criar migrations EF Core (Postgres) **sem causar incidente** — controlando locks, downtime, perda de dados e contrato com consumidores em paralelo.

## Princípio orientador

> Cada migration deve ser **reversível ou estritamente aditiva**. Operações destrutivas só com janela combinada e backup recente. Migration que bloqueia tabela por mais de 30 segundos em produção é um *incidente* em potencial.

---

## 1. Antes de gerar — colher contexto

1. **Mudança pretendida**: adicionar coluna? Renomear? Mudar tipo? Remover? Adicionar índice?
2. **Tabela envolvida**: tamanho aproximado (linhas), volume de escrita por hora.
3. **Outros serviços que tocam a tabela**: códigos antigos em produção que precisam continuar funcionando.
4. **Janela de manutenção**: pode parar a aplicação? Por quanto tempo?
5. **Há *replica*?** Lag aceitável durante a migration?
6. **Backup recente?** Antes de operação destrutiva, **confirmar**.
7. **Estratégia de deploy**: blue/green, rolling, downtime planeado?

> Sem essas respostas, **não** gere a migration destrutiva. Gere apenas a aditiva e marque o que falta.

---

## 2. Classificação de operações por risco

### 2.1 Aditivas (baixo risco)

| Operação | Risco | Lock típico |
|---|---|---|
| Adicionar coluna **nullable** sem default | Baixo | `ACCESS EXCLUSIVE` muito breve (metadados) |
| Adicionar coluna com default não-volátil (Postgres 11+) | Baixo | Idem |
| Adicionar índice com `CONCURRENTLY` | Baixo | `SHARE UPDATE EXCLUSIVE` (não bloqueia escritas) |
| Adicionar tabela nova | Baixo | Nenhum |
| Adicionar FK com `NOT VALID` + `VALIDATE` em separado | Baixo | Breve |
| Adicionar enum value | Baixo |  |

### 2.2 Modificativas (risco médio)

| Operação | Risco | Cuidado |
|---|---|---|
| Adicionar coluna com default **volátil** | Médio | Reescreve tabela inteira → lock prolongado |
| Adicionar coluna `NOT NULL` sem default | Alto | Falha se houver linhas existentes; melhor fazer em 3 passos |
| Mudar tipo de coluna compatível (varchar(N) → varchar(M) com M>N) | Médio | Pode ou não rescrever (Postgres às vezes otimiza) |
| Adicionar restrição CHECK | Médio | Pode falhar; melhor com `NOT VALID` + `VALIDATE` |

### 2.3 Destrutivas (risco alto)

| Operação | Risco | Estratégia |
|---|---|---|
| `DROP COLUMN` | Alto | Expand/contract: 1) deprecar nas leituras; 2) deprecar nas escritas; 3) drop |
| `RENAME COLUMN` | Alto | Expand/contract: 1) adicionar nova; 2) sincronizar; 3) migrar consumidores; 4) drop antiga |
| Mudar tipo incompatível (varchar → int) | Muito alto | Criar nova coluna; migrar dados; aplicar lógica; remover antiga |
| `DROP TABLE` | Muito alto | Idem (consumidores podem existir) |
| Adicionar `UNIQUE` em coluna com possíveis duplicados | Alto | Pré-limpar dados; depois aplicar |

---

## 3. Sequência segura — geral

```
1. Pensar
   └→ Operação é aditiva, modificativa ou destrutiva? Risco real?

2. Gerar migration
   └→ dotnet ef migrations add NomeDescritivo -p Infrastructure -s Api

3. Inspeccionar o SQL
   └→ dotnet ef migrations script ÚltimaAnterior NomeNovo -p Infrastructure -s Api > migration.sql
   └→ ler linha a linha; identificar locks, defaults, NOT NULL

4. Reescrever se necessário
   └→ usar OperationBuilder com SQL personalizado quando o gerado não for seguro

5. Testar em ambiente próximo de prod
   └→ staging com volume real, medir tempo de aplicação

6. Aplicar em produção
   └→ em janela curta, com monitoramento, com plano de reversão a postos

7. Validar pós-deploy
   └→ checar latência das queries afetadas; sem alertas
```

---

## 4. Padrões aplicados

### 4.1 Adicionar coluna com default seguro

Postgres 11+: defaults **constantes** (não voláteis) não reescrevem a tabela.

```csharp
migrationBuilder.AddColumn<bool>(
    name: "esta_ativo",
    table: "clientes",
    type: "boolean",
    nullable: false,
    defaultValue: true);
```

> SQL gerado: `ALTER TABLE clientes ADD COLUMN esta_ativo boolean NOT NULL DEFAULT true;` — operação metadata, lock muito breve.

❌ **Evitar** default volátil:
```csharp
defaultValueSql: "now()" // recurso volátil → reescreve a tabela!
```

### 4.2 Adicionar coluna NOT NULL em tabela com dados — 3 passos

Em vez de:
```csharp
// ❌ vai falhar se houver linhas existentes
migrationBuilder.AddColumn<int>("limite_credito", "clientes", nullable: false);
```

Faça em 3 migrations separadas:

**Migration 1 — adicionar nullable**:
```csharp
migrationBuilder.AddColumn<int>("limite_credito", "clientes", nullable: true);
```

**Migration 2 — backfill (em batches se a tabela for grande)**:
```csharp
migrationBuilder.Sql(@"
    UPDATE clientes SET limite_credito = 0 WHERE limite_credito IS NULL;
");
```

> Para tabelas enormes, fazer backfill **em batches** com `LIMIT` num *job* separado, não na migration.

**Migration 3 — tornar NOT NULL**:
```csharp
migrationBuilder.AlterColumn<int>(
    name: "limite_credito",
    table: "clientes",
    type: "integer",
    nullable: false,
    oldClrType: typeof(int),
    oldType: "integer",
    oldNullable: true);
```

> Cada migration deploya separadamente, validando entre elas.

### 4.3 Renomear coluna — Expand & Contract

**Migration 1 — Expand**:
```csharp
migrationBuilder.AddColumn<DateTime>("criado_em", "pedidos", nullable: true);
migrationBuilder.Sql("UPDATE pedidos SET criado_em = data_criacao;");
// trigger para manter sincronizado se ainda há escritas no nome antigo
migrationBuilder.Sql(@"
    CREATE OR REPLACE FUNCTION sync_pedidos_criado_em() RETURNS trigger AS $$
    BEGIN
      IF NEW.criado_em IS NULL AND NEW.data_criacao IS NOT NULL THEN
        NEW.criado_em := NEW.data_criacao;
      ELSIF NEW.data_criacao IS NULL AND NEW.criado_em IS NOT NULL THEN
        NEW.data_criacao := NEW.criado_em;
      END IF;
      RETURN NEW;
    END $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_sync_pedidos_criado_em
      BEFORE INSERT OR UPDATE ON pedidos
      FOR EACH ROW EXECUTE FUNCTION sync_pedidos_criado_em();
");
```

**Entre Migration 1 e 2**: atualizar código aplicação para ler/escrever `criado_em`. Aguardar todos os consumidores migrarem.

**Migration 2 — Contract** (semanas/sprints depois):
```csharp
migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_sync_pedidos_criado_em ON pedidos;");
migrationBuilder.Sql("DROP FUNCTION IF EXISTS sync_pedidos_criado_em();");
migrationBuilder.DropColumn("data_criacao", "pedidos");
```

### 4.4 Criar índice sem bloquear

```csharp
migrationBuilder.Sql(
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_status_criado_em " +
    "ON pedidos (status, criado_em DESC);");
```

**Importante**: `CONCURRENTLY` **não funciona dentro de transação**. EF Core embrulha migrations em transação por padrão. Você precisa:

```csharp
public partial class CriarIndicePedidos : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Suprimir a transação automática
        migrationBuilder.Sql("COMMIT;", suppressTransaction: true);
        migrationBuilder.Sql(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_status " +
            "ON pedidos (status);", suppressTransaction: true);
        migrationBuilder.Sql("BEGIN;", suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP INDEX IF EXISTS idx_pedidos_status;", suppressTransaction: true);
    }
}
```

> Em alternativa, configure no `OnConfiguring` / `DbContext` que esta migration não usa transação.

### 4.5 Adicionar FK sem bloquear tabela referenciada

```csharp
migrationBuilder.Sql(@"
    ALTER TABLE pedidos
    ADD CONSTRAINT fk_pedidos_clientes
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    NOT VALID;
");

migrationBuilder.Sql(@"
    ALTER TABLE pedidos VALIDATE CONSTRAINT fk_pedidos_clientes;
");
```

> `NOT VALID` cria o constraint para **novas** linhas. `VALIDATE` verifica as antigas — sem `ACCESS EXCLUSIVE`, só `SHARE UPDATE EXCLUSIVE` na tabela.

### 4.6 Mudar tipo incompatível — coluna nova

❌ **Evitar**:
```csharp
migrationBuilder.AlterColumn<int>(
    name: "codigo",  // era varchar
    table: "produtos",
    type: "integer");
```

✅ **Padrão correto**:

1. Adicionar `codigo_int` como `integer` nullable.
2. Aplicação dual-write (em código novo, escreve nos dois; em código antigo, só `codigo`).
3. Backfill com lógica de conversão.
4. Validar consistência.
5. Migrar consumidores para ler `codigo_int`.
6. Remover `codigo` antiga.

---

## 5. Inspeccionar o SQL gerado — antes de aplicar

**Sempre** gere o script antes de aplicar:

```powershell
dotnet ef migrations script <ÚltimaAnterior> <NomeNova> -p src/Projeto.Infrastructure -s src/Projeto.Api -o migration.sql
```

Procure no SQL:

| Padrão | Bandeira |
|---|---|
| `ALTER TABLE ... ADD COLUMN ... DEFAULT now()` | 🔴 Default volátil — reescreve tabela |
| `ALTER TABLE ... ALTER COLUMN ... TYPE ...` | 🟡 Pode reescrever — verificar |
| `ALTER TABLE ... DROP COLUMN ...` | 🔴 Operação destrutiva |
| `ALTER TABLE ... RENAME COLUMN ...` | 🔴 Quebra consumidores |
| `CREATE INDEX ...` (sem CONCURRENTLY) | 🟡 Bloqueia escritas |
| `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` | 🟢 Bom padrão |
| `UPDATE ... WHERE ...` em tabela grande | 🟡 Avaliar em batches |

---

## 6. Plano de rollback

Toda migration deve ter `Down()` funcional. Mas para destrutivas, `Down()` **não recupera dados**.

```csharp
protected override void Down(MigrationBuilder migrationBuilder)
{
    // Adicionar a coluna de volta — mas dados estão perdidos
    migrationBuilder.AddColumn<string>("documento_antigo", "clientes", nullable: true);
}
```

Para destrutivas, o plano de rollback **real** é:

1. Restaurar backup do ponto pré-migration **OU**
2. Manter dado em coluna paralela durante o ciclo Expand/Contract (recuperação imediata).

---

## 7. Checklist de revisão antes de aplicar

- [ ] Operação classificada (aditiva / modificativa / destrutiva).
- [ ] SQL gerado revisto linha a linha.
- [ ] Nenhum default volátil em coluna nova.
- [ ] Nenhum `NOT NULL` em coluna com dados sem backfill prévio.
- [ ] `CONCURRENTLY` em CREATE INDEX em produção.
- [ ] `NOT VALID` + `VALIDATE` em ADD CONSTRAINT em tabela grande.
- [ ] `RENAME` ou `DROP` segue Expand/Contract com consumidores migrados.
- [ ] Migration tem `Down()` funcional (mesmo que sem recuperação de dado).
- [ ] Testada em staging com volume realista.
- [ ] Backup recente confirmado para destrutivas.
- [ ] Janela combinada se há risco de lock significativo.
- [ ] Monitorização preparada (latência, locks, replicação).
- [ ] Plano de rollback escrito.
- [ ] Migration nomeada descritivamente em PT-BR (`AdicionarColunaCriadoEmPedidos`).

---

## 8. Anti-padrões

| Anti-padrão | Por quê |
|---|---|
| Editar migration já aplicada em produção | Estado inconsistente entre dev/prod |
| Migration com 30+ operações | Difícil reverter, difícil entender, lock prolongado |
| `DROP COLUMN` no mesmo PR da feature | Sem Expand/Contract → quebra consumidores antigos |
| `Down()` vazio "porque não vai precisar reverter" | Sempre precisa |
| `CONCURRENTLY` dentro de transação | Falha em runtime |
| `default now()` para criar `criado_em` em tabela cheia | Reescreve toda a tabela |
| Adicionar `UNIQUE` sem checar duplicados | Migration falha em produção |
| Rodar `dotnet ef database update` direto em prod | Sem revisão, sem rollback claro |
| Não testar a migration `Down()` | Pode ter erro escondido |
| Skip de migration intermediária no histórico | Estado inconsistente |

---

## 9. Quando recusar / pedir confirmação

- Operação destrutiva sem janela combinada.
- Tabela grande sem informação de volume.
- Renomear/drop sem confirmar que consumidores já migraram.
- Pedido de aplicar `dotnet ef database update` direto em produção sem revisão.

---

## 10. Pós-aplicação

- Monitorar tempo de query nas próximas 24h.
- Verificar `pg_stat_user_indexes` para confirmar uso do índice novo.
- Documentar no PR o SQL gerado e o motivo de cada decisão não-trivial.
- Para mudanças complexas, considerar `Documentacao/Runbooks/` com a sequência aplicada (vale ouro para auditoria).
