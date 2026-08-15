# ADR-0003: Correr frontend, API e PostgreSQL no Docker Compose

> **Situação**: Aceito
> **Data**: 2026-08-15
> **Decisores**: Equipe MusicApp (pedido explícito)
> **Consultados**: —
> **Informados**: quem for desenvolver no dia a dia

---

## 1. Contexto e problema

O ambiente local tinha de ser reproduzível: não basta “instala Postgres na máquina”. O pedido foi os três processos (BD, backend, frontend) no Compose, na raiz do monorepo.

## 2. Forças em consideração

- **Reprodutibilidade:** um comando para quem clonar o repo
- **DX no Windows:** Next e `dotnet watch` são mais rápidos fora do Docker; o Compose continua a ser a fonte de verdade do ambiente
- **Rede:** o navegador usa `localhost`; os contêineres usam DNS interno (`postgres`, `backend`)

## 3. Opções consideradas

### A) Compose com postgres + backend + frontend
- Prós: cumpre o pedido; CI pode reutilizar as mesmas imagens
- Contras: build do Next e do .NET no Docker é mais lento; Docker Desktop é obrigatório

### B) Compose só com PostgreSQL; API e Next no host
- Prós: recarga automática nativa
- Contras: não cumpre o pedido; cada pessoa configura portas/SDK à mão

### C) Kubernetes / Tilt local
- Prós: mais perto de um deploy “a sério”
- Contras: absurdo para um clone de estudo nesta fase

## 4. Decisão

Opção **A** em `docker-compose.yml` na raiz. O desenvolvimento do dia a dia **pode** misturar: `docker compose up postgres` + `dotnet run` + `pnpm dev` (documentado no README). Imagens:

- API: `mcr.microsoft.com/dotnet/aspnet:10.0` (multi-stage)
- Frontend: Node 22 slim, Next standalone
- BD: `postgres:16-alpine`

## 5. Consequências

### Positivas
- Entrada no projeto = Docker Desktop + `docker compose up --build`
- CORS aponta para `http://localhost:3000`, que é a origem real do navegador

### Negativas
- Sem Docker Desktop o Compose não corre (foi o caso nesta máquina no momento da entrega)
- `NEXT_PUBLIC_*` gravado no build: chamadas do navegador para a API devem usar `localhost`, não o hostname `backend`

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Frontend no Docker a chamar `http://backend:8080` a partir do navegador | Documentar: navegador → localhost:8080; Next no servidor → `http://backend:8080` quando existir |
| Imagens desatualizadas | Tags 10.0 / 16 / 22 pinadas por major |

## 7. Plano de revisão

Rever quando houver ambiente de staging/produção (Compose pode deixar de ser o artefato de deploy).

## 8. Referências

- `docker-compose.yml`
- `backend/Dockerfile`, `frontend/Dockerfile`
- `README.md`
