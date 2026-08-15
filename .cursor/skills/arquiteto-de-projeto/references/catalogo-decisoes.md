# Catálogo de decisões arquiteturais

Referência de apoio para o `arquiteto-de-projeto`. Lê quando precisares de comparar estilos, escolher padrões ou validar requisitos não-funcionais. Não é para copiar inteiro para o manual — é para **decidir com critério**.

## Índice
- [1. Estilos arquiteturais](#1-estilos-arquiteturais)
- [2. Padrões de projeto úteis (e quando NÃO usar)](#2-padroes-de-projeto-uteis)
- [3. Guia de decisão de stack](#3-guia-de-decisao-de-stack)
- [4. Checklist de requisitos não-funcionais](#4-checklist-de-requisitos-nao-funcionais)
- [5. Heurísticas de escala](#5-heuristicas-de-escala)

---

## 1. Estilos arquiteturais

Ordenados do mais simples ao mais complexo. **Começa em cima e só desce com justificativa.**

| Estilo | Quando encaixa | Custo/risco | Sinais de que é cedo demais |
|---|---|---|---|
| **Monólito modular** | Maioria dos produtos novos; equipe pequena/média; domínio ainda a estabilizar | Baixo. Exige disciplina de fronteiras entre módulos | É o default — raramente é cedo demais |
| **Monólito + workers assíncronos** | Há tarefas pesadas/lentas (e-mail, relatórios, processamento) | Baixo-médio. Fila + idempotência | Não há trabalho assíncrono real |
| **Serverless / FaaS** | Carga intermitente, picos imprevisíveis, glue code, eventos | Médio. Cold start, lock-in, observabilidade difícil | Carga constante e previsível |
| **Event-driven** | Integração desacoplada, múltiplos consumidores do mesmo evento, auditoria | Médio-alto. Consistência eventual, debugging distribuído | Fluxo simples request/response |
| **Microsserviços** | Equipes autónomas, escala independente por módulo, ciclos de release distintos | Alto. Rede, observabilidade distribuída, dados distribuídos, devops maduro | Equipe única, domínio instável, sem devops |

**Regras práticas:**
- Microsserviços resolvem um problema **organizacional** (equipes) antes de técnico. Sem várias equipes, normalmente não compensa.
- Podes ter um **monólito modular com fronteiras explícitas** e extrair um serviço só quando a dor aparecer (estratégia de extração tardia).
- Consistência eventual é uma decisão de negócio, não só técnica — confirma com o usuário antes de assumir.

---

## 2. Padrões de projeto úteis

Recomenda só os que pagam o seu custo neste projeto. Padrão a mais é dívida.

**Estrutura interna (por serviço/módulo):**
- **Clean Architecture / Hexagonal / Ports & Adapters** — isola domínio de I/O. Bom quando há regra de negócio rica. Excesso quando é CRUD fino.
- **Vertical slices** — organiza por feature, não por camada técnica. Reduz acoplamento acidental.
- **Camadas clássicas (controller/service/repository)** — simples, conhecido, suficiente para muitos casos.

**Aplicação:**
- **CQRS** — separa leitura de escrita. Útil com modelos de leitura/escrita muito diferentes ou escala assimétrica. **Não** para CRUD comum.
- **Repository / Unit of Work** — abstrai persistência. Cuidado para não duplicar o ORM.
- **Result/Either** em vez de exceções para fluxo previsível de erro.
- **Mediator** — desacopla handlers. Bom em apps maiores; cerimónia a mais em apps pequenas.

**Integração/dados:**
- **Outbox** — garante publicação de eventos com a transação (consistência).
- **Saga / Process manager** — transações distribuídas de longa duração.
- **API Gateway / BFF** — agrega/adapta APIs para clientes específicos.
- **Idempotência** — obrigatória em qualquer consumidor de fila/webhook.

**Anti-padrões a vigiar:** God service, base de dados partilhada entre serviços ("distributed monolith"), abstração especulativa (YAGNI), microsserviço anémico que só faz CRUD de uma tabela.

---

## 3. Guia de decisão de stack

**Default do repositório:** .NET (backend), Next.js/React + TypeScript + Tailwind (frontend), PostgreSQL (BD). Preferir isto reduz atrito com as regras (`AGENTS.md`, `.cursor/rules/`) e com as skills `@feature-backend-completa`, `@feature-frontend-completa`, `@migracao-ef-segura`, `@tuning-query-postgres`.

**Quando considerar sair do default — e para onde:**

| Necessidade dominante | Considerar | Porquê |
|---|---|---|
| Pipeline de dados / ML / scripting científico | Python | Ecossistema de dados/ML maduro |
| Concorrência massiva / tempo-real / baixa latência | Go, Elixir/Phoenix, Rust | Modelo de concorrência e footprint |
| App mobile nativa | Swift/Kotlin, ou React Native/Flutter | Acesso a APIs nativas / partilha de código |
| Realtime colaborativo (docs, chat) | WebSockets + Elixir/Node | Conexões persistentes em escala |
| Equipe só domina JS/TS | Node + Nest/Express | Velocidade > pureza de stack |

**Decisões transversais a tratar sempre:**
- **Base de dados:** relacional (PostgreSQL por defeito) salvo necessidade clara de documento (Mongo), chave-valor/cache (Redis), série temporal, ou grafo. Justifica qualquer NoSQL pelo padrão de acesso, não pela moda.
- **Auth:** sessão vs JWT; provider próprio vs gerido (Auth0/Entra/Keycloak/Supabase). Gerido poupa esforço e risco de segurança.
- **Estilo de API:** REST (default), GraphQL (clientes heterogéneos, over-fetching), gRPC (interno, alta performance).
- **Infra:** PaaS (App Service, Render, Railway) para começar rápido; Kubernetes só com escala/equipe que o justifiquem.
- **Mensageria:** RabbitMQ / SQS / Azure Service Bus para filas; Kafka só com volume/streaming real.

> Qualquer destas, quando tiver peso, vira candidata a **ADR** (`@adr-decisao-arquitetura`).

---

## 4. Checklist de requisitos não-funcionais

Percorre esta lista na entrevista e no manual. Marca cada um como "tratado" ou "não aplicável".

- **Performance:** alvos de latência (p95/p99), throughput esperado.
- **Escala:** usuários/pedidos no início e horizonte; crescimento linear ou viral?
- **Disponibilidade:** SLA, RTO/RPO, tolerância a downtime, janelas de manutenção.
- **Segurança:** authn/authz, gestão de segredos, OWASP Top 10 (`@owasp-revisao`), superfície de ataque.
- **Privacidade/Conformidade:** LGPD/GDPR, dados pessoais, consentimento, retenção, direito ao esquecimento, residência de dados, auditoria.
- **Observabilidade:** logs estruturados, métricas, tracing distribuído, alertas, dashboards.
- **Manutenibilidade:** testabilidade, CI/CD, complexidade aceitável para a equipe.
- **Acessibilidade:** WCAG 2.2 AA para UI (`@auditoria-acessibilidade`).
- **Internacionalização:** idiomas, fusos, moeda, formatos.
- **Custo:** orçamento de infra, custo por usuário/transação, FinOps.
- **Portabilidade/lock-in:** dependência de provider, estratégia de saída.

---

## 5. Heurísticas de escala

Para evitar sobre-engenharia. Números aproximados, ajusta ao contexto.

- **< 10k usuários / baixa carga:** monólito modular + 1 BD relacional + PaaS resolve. Não precisas de cache distribuído, filas complexas, nem micro.
- **Picos pontuais (ex.: campanhas):** considera serverless ou autoscaling antes de reescrever arquitetura.
- **Leitura >> escrita:** cache (Redis) e/ou réplicas de leitura antes de CQRS pleno.
- **Crescimento incerto:** otimiza para **reversibilidade** e para mudar de ideias barato, não para escala que talvez nunca venha.
- **Sinal real de microsserviços:** múltiplas equipes a colidir no mesmo código/deploy, ou um módulo com perfil de escala radicalmente diferente do resto.

> A pergunta certa não é "isto escala para milhões?" mas "qual é o caminho mais barato para chegar ao próximo patamar **quando** (e se) precisarmos?".
