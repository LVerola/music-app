# Manual do Projeto — MusicApp

> **Situação:** Rascunho
> **Data:** 2026-08-15
> **Arquiteto:** Equipe MusicApp
> **Versão:** 0.1

## 1. Visão e contexto

O MusicApp é um clone de estudo do [Songless](https://less.gg/songless). O jogador ouve um trecho curto de uma música, tenta adivinhar o título/artista, e cada palpite errado (ou pular) libera mais áudio. Há gêneros (All, Rock, Hip Hop no original), um número limitado de tentativas, e login para estatísticas e jogos customizados.

Este repositório é um **monorepo**: frontend Next.js já existia; o backend .NET 10 e o PostgreSQL via Docker nasceram nesta fundação. A autenticação **não** faz parte do primeiro recorte — entra como feature depois.

## 2. Objetivos e métricas de sucesso

- Objetivo de negócio: reproduzir o loop principal do Songless de forma jogável no navegador.
- Métricas (estudo): uma partida completa jogável ponta a ponta; ambiente local sobe com um comando (`docker compose up`); documentação em `.docs/` reflete o que realmente está no código.
- 🔶 Sucesso de produto (retenção, DAU) não foi definido — projeto de estudo.

## 3. Personas / usuários-alvo

- **Jogador ocasional** — abre o site, ouve o trecho do dia, tenta adivinhar sem conta.
- **Jogador com conta** (visão futura) — quer histórico, streaks e jogos custom.
- **Quem desenvolve** — precisa de Compose + docs vivas para iterar sem adivinhar o estado do projeto.

## 4. Escopo

### 4.1 MVP (primeiro release jogável)

- Puzzle do dia (ou sessão) com trecho inicial curto.
- Palpite; palpite errado aumenta o áudio disponível.
- Número limitado de tentativas (no original: 6).
- Feedback de acerto/erro.

### 4.2 Fora do escopo (agora)

- Autenticação, stats persistidas por usuário, jogos custom.
- App mobile.
- Monetização, anúncios, contas sociais.
- Paridade pixel-perfect com o site original.

### 4.3 Visão futura (condiciona decisões de hoje)

- Login + stats + jogos custom → a API nasce HTTP/JSON, sem assumir sessão de navegador como único cliente.
- Gêneros e catálogo próprio.
- 🔶 Fonte de áudio/catálogo (YouTube, Spotify, arquivos próprios) **não está decidida** — ver seção 17.

## 5. Requisitos funcionais (capacidades de alto nível)

- RF1: O jogador ouve um trecho e submete um palpite.
- RF2: Palpite errado ou pular aumenta a duração do trecho.
- RF3: O jogo termina por acerto ou por esgotar tentativas.
- RF4 (depois): o jogador autentica-se para guardar estatísticas.
- RF5 (depois): o jogador cria um jogo custom.

## 6. Requisitos não-funcionais

- **Escala:** 🔶 uso local / estudo; dezenas de usuários no horizonte, não milhares.
- **Performance:** palpite e trecho com p95 confortável em rede local (< 300 ms na API, áudio à parte).
- **Disponibilidade:** sem SLA; Compose local é o alvo desta fase.
- **Segurança & conformidade:** sem dados pessoais nesta fundação. Quando houver contas: passwords hashed, sem PII em logs, LGPD no mínimo (base legal, retenção). Áudio/catálogo tem risco de direitos de autor — ver riscos.
- **Observabilidade:** logs estruturados na API (`ILogger`); health `/health/live` e `/health/ready`.
- **Acessibilidade & i18n:** UI em português brasileiro; WCAG 2.2 AA quando a UI do jogo for desenhada.

## 7. Restrições

- **Equipe:** estudo individual; stack imposta pelo repositório (.NET, Next.js, PostgreSQL).
- **Orçamento & prazo:** infra local (Docker); sem data de release comercial.
- **Tecnológicas/legais:** backend .NET 10; frontend já em Next.js 16; PostgreSQL; auth adiada; direitos de autor do catálogo por resolver.

## 8. Arquitetura da solução

### 8.1 Estilo arquitetural

**Escolha:** monólito modular (API única) com Clean Architecture no backend. **Porquê:** uma equipe, domínio ainda a estabilizar, zero necessidade de escala independente. Microsserviços seriam custo sem benefício.

### 8.2 Visão de componentes

```text
[Browser]
    |  http://localhost:3000
    v
[frontend / Next.js] ----http://localhost:8080----> [MusicApp.Api]
                                                         |
                                                         | EF Core
                                                         v
                                                   [PostgreSQL]
```

Backend interno:

```text
Api  →  Application  →  Domain
 |           ↑
 +→ Infrastructure (EF / Npgsql) implementa portas da Application
```

### 8.3 Decisões-chave (resumo) → ADRs sugeridos

| Decisão | Escolha | Alternativas descartadas | ADR |
|---|---|---|---|
| Estilo da API | Monólito modular + Clean Architecture | Microsserviços; camadas clássicas só | [ADR-0001](../Documentacao/ADRs/0001-monolito-modular-clean-architecture.md) |
| BD primária | PostgreSQL 16 | SQLite, MongoDB | [ADR-0002](../Documentacao/ADRs/0002-postgresql-como-bd-primaria.md) |
| Ambiente local | Docker Compose (front + API + BD) | Só BD no Docker; scripts soltos | [ADR-0003](../Documentacao/ADRs/0003-docker-compose-ambiente-local.md) |
| Auth | Adiada | Identity nesta fundação | (quando a feature chegar) |
| Fonte de áudio | 🔶 por decidir | YouTube / Spotify / arquivos | ADR futuro |

## 9. Stack tecnológica recomendada

| Camada | Recomendação | Alternativas | Justificativa |
|---|---|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind 4 | SPA Vite | Já existe no monorepo |
| Backend | ASP.NET Core / .NET 10, Minimal APIs | Controllers MVC | LTS, alinhado às convenções do repo |
| Base de dados | PostgreSQL 16 | SQLite | Pedido explícito; JSON/relacional; EF Core maduro |
| Auth | Nenhuma agora; Identity ou provedor depois | JWT caseiro já | Fora desta entrega |
| Infra/Deploy | Docker Compose local | Kubernetes | Um comando para o ambiente de estudo |
| Observabilidade | `ILogger` + health checks | Seq/OpenTelemetry já | YAGNI até haver produção |

> Sem desvio da stack padrão do repositório (.NET / Next / PostgreSQL).

## 10. Padrões de projeto e convenções

- **Arquitetura interna:** Clean Architecture (Domain → Application → Infrastructure → Api).
- **Padrões aplicáveis:** repositório quando houver agregado; `Result`/ProblemDetails para erros HTTP; DI nativa. Sem MediatR/CQRS até a complexidade pagar.
- **Convenções:** AGENTS.md (PT-BR, clean code, TDD). Tabelas PostgreSQL em `snake_case`.
- **Schema:** migrations EF Core quando surgir a primeira entidade. Nesta fundação o `AppDbContext` está vazio de propósito.

## 11. Modelo de dados (alto nível)

Ainda não há tabelas de domínio. Candidatos para a Fase 1 (não implementados):

- **Musica** — título, artista, gênero, referência ao áudio.
- **Puzzle** — música do dia/sessão, duração inicial, máximo de tentativas.
- **Tentativa** — palpite, ordem, resultado.

Usuário fica para a feature de auth.

## 12. Integrações externas

| Integração | Finalidade | Protocolo | Risco/owner |
|---|---|---|---|
| 🔶 Catálogo/áudio | Trechos da música | ❓ | Direitos de autor; bloquear implementação do jogo até decidir |
| (futuro) IdP | Login | OIDC/OAuth | Fora desta fase |

## 13. Segurança e conformidade

- Sem autenticação nesta fundação. Health e raiz da API são públicos.
- Segredos só em `.env` (gitignored); `.env.example` tem valores **locais**, não de produção.
- Connection string via configuração / env (`ConnectionStrings__BancoDeDados`).
- CORS limitado à origem do frontend (`http://localhost:3000` por defeito).
- Quando houver auth: revisão OWASP antes de expor a API.

## 14. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Direitos de autor do áudio/catálogo | Alta | Bloqueia o jogo real | Decidir fonte legal (arquivo próprio / API com licença) antes da Fase 1 |
| Fonte de áudio indefinida muda o modelo | Média | Retrabalho de entidades | Não modelar `url_audio` como se fosse definitiva; ADR na Fase 1 |
| Docker Desktop em falta na máquina | Alta agora | Compose não corre | Documentar; API e testes de live health não dependem do contêiner |
| Auth adiada e depois “encaixada” | Média | Endpoints públicos demais | Manter API stateless; não acumular estado de jogador no servidor sem dono |

## 15. Cuidados e dívidas técnicas previstas

- `AppDbContext` sem entidades: a primeira feature gera a migration inicial.
- Senha local no `.env.example` / `appsettings.json` — só para desenvolvimento.
- Testes de `/health/ready` (depende do PostgreSQL) ainda não existem; só `/health/live` e a raiz.
- Frontend continua o template Next.js; `output: "standalone"` é só para a imagem Docker.
- 🔶 Nome de produto vs. “Songless”: clone de estudo, não marca.

## 16. Roadmap (resumo)

| Fase | Nome | Esforço | Detalhe |
|---|---|---|---|
| 0 | Fundações (Compose + API + docs) | M | Esta entrega |
| 1 | Loop do jogo (trecho + palpite) | L | Ver `roadmap.md` |
| 2 | Catálogo e gêneros | M | |
| 3 | Conta, stats e jogos custom | L | |

## 17. Suposições e perguntas em aberto

- 🔶 Escala de estudo / local, sem SLA.
- 🔶 Sem app mobile no horizonte próximo.
- ❓ Qual a fonte legal de áudio e metadados?
- ❓ Puzzle é “um por dia UTC” como o original, ou sessão livre no MVP?
- ❓ Palpite casa com quê — título, artista, ambos, pesquisa typeahead?

## 18. Próximos passos

- [ ] Decidir fonte de áudio e formalizar num ADR
- [ ] Quebrar a Fase 1 em user stories
- [ ] Primeira entidade + migration EF quando o loop do jogo começar
