# ADR-0002: Usar PostgreSQL como base de dados primária

> **Situação**: Aceito
> **Data**: 2026-08-15
> **Decisores**: Equipe MusicApp (pedido explícito) + convenção do repositório
> **Consultados**: —
> **Informados**: quem for criar a primeira migration

---

## 1. Contexto e problema

O jogo vai persistir puzzles, palpites e, mais tarde, usuários. Era preciso escolher a BD da fundação e ligá-la à API via EF Core, mesmo sem tabelas de domínio ainda.

## 2. Forças em consideração

- **Pedido explícito:** Docker com PostgreSQL
- **Compatibilidade:** regras e skills do repo assumem PostgreSQL + EF Core
- **Modelo:** relacional (música, puzzle, tentativa) encaixa melhor que documento
- **Custo operacional:** Compose local, sem cloud nesta fase

## 3. Opções consideradas

### A) PostgreSQL 16 + EF Core + Npgsql
- Prós: alinhado ao repo; JSON quando preciso; ecossistema maduro
- Contras: precisa de contêiner; mais pesado que SQLite

### B) SQLite no arquivo
- Prós: zero Docker para a API
- Contras: foge ao pedido; diferenças subtis vs produção Postgres; pior para concorrência

### C) MongoDB
- Prós: flexível se o catálogo for documento
- Contras: relações puzzle/tentativa/usuário são relacionais; fora da stack do repo

## 4. Decisão

Opção **A**. Connection string `ConnectionStrings:BancoDeDados`. `AppDbContext` sem entidades até à primeira feature. Naming futuro: `snake_case`, `timestamptz`, tabelas no plural.

## 5. Consequências

### Positivas
- Uma BD do desenvolvimento à (eventual) produção.
- Health ready valida de fato o Npgsql.

### Negativas
- API local fora do Compose precisa do contêiner `postgres` no ar.
- Sem migration nesta entrega: o schema de domínio ainda não existe.

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Primeira migration grande demais | Gerar na primeira entidade, rever o SQL |
| Senha local no git | Só `.env.example`; `.env` gitignored |

## 7. Plano de revisão

Rever se o catálogo de áudio exigir blob store / fila; Postgres continua a ser a fonte de verdade relacional.

## 8. Referências

- `docker-compose.yml` (serviço `postgres`)
- `backend/src/MusicApp.Infrastructure/Persistencia/AppDbContext.cs`
