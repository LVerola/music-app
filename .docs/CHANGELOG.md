# Changelog

Todas as mudanças relevantes deste repositório, em ordem inversa de data.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## 2026-08-15 — Idioma da documentação

### Alterado

- Documentação em `.docs/`, `README.md`, `AGENTS.md` e instruções em `.cursor/` passam a português brasileiro estrito (sem PT-PT nem inglês de prosa).

## 2026-08-15 — Fundações do monorepo

### Adicionado

- Solução .NET 10 em `backend/` (Domain, Application, Infrastructure, Api) com health checks e EF Core + PostgreSQL.
- `docker-compose.yml` com PostgreSQL 16, API e frontend Next.js.
- Pasta `.docs/` (manual, roadmap, ADRs, documentação de entrega e este changelog).

### Documentação desta entrega

- [`.docs/Documentacao/2026-08-15-fundacoes-backend-docker.md`](Documentacao/2026-08-15-fundacoes-backend-docker.md)
