# AGENTS — Base universal

Este ficheiro contém princípios, convenções e expectativas que **valem para qualquer projeto** (frontend, backend, banco de dados, infraestrutura). Regras específicas por stack ou por workflow ficam em `.cursor/rules/*.mdc` e são carregadas automaticamente pelo Cursor conforme o contexto.

> Se houver conflito entre este ficheiro e uma regra mais específica em `.cursor/rules/`, **a regra específica prevalece**.

---

## 0. Workflow discovery (obrigatório)

Antes de **criar ou alterar ficheiros** (código, skills, regras ou docs deste repo):

1. `@discovery` — classificar, desambiguar, declarar confiança, bloquear alucinação.
2. Discovery de domínio: `@discovery-frontend` | `@discovery-backend` | `@discovery-biblioteca` (este repo Agents).
3. `@architecture-check` antes de **criar** ficheiro novo.

Pular só em perguntas **read-only**. Confiança: **≥ 90%** implementa; **70–89%** pergunta e implementa; **&lt; 70%** recusa.

Regra alwaysApply: `discovery-workflow`. Modo cosmético: `@vibe`.

---

## 1. Idioma

- **Interface (exibição ao utilizador)**: textos de botões, labels, mensagens de erro, toasts, placeholders, títulos e e‑mails em **português brasileiro**.
- **Código novo**: nomes de variáveis, funções, classes, hooks, componentes, métodos, comentários e documentação em **português brasileiro**.
- **Ficheiros e pastas novos**: nomes em português brasileiro (`kebab-case` para rotas/pastas; `PascalCase`/`camelCase` conforme a stack).
- **Excepções razoáveis**:
  - Contratos impostos por APIs/SDKs externos (manter o nome original).
  - Convenções obrigatórias do framework (ex.: `page.tsx`, `layout.tsx`, `Program.cs`, `appsettings.json`).
  - Módulo já inteiramente em inglês — **alinhar ao módulo** para não misturar estilos no mesmo ficheiro.
- Em **código novo** ou módulos novos, preferir sempre **português brasileiro**.

---

## 2. Clean Code (princípios sempre aplicáveis)

### 2.1 Nomes

- Nomes **revelam intenção**: `calcularDescontoPorCategoria` é melhor que `calc` ou `processar`.
- Evitar abreviações opacas (`info`, `dados`, `obj`, `tmp`, `aux`) e nomes genéricos sem contexto.
- Booleans começam com `é`, `tem`, `deve`, `pode` (`éAdmin`, `temPermissao`, `deveValidar`).
- Coleções no plural (`utilizadores`, `produtos`); item singular dentro do loop (`utilizador`, `produto`).
- Verbos para funções/métodos (`obterCliente`, `salvarPedido`); substantivos para classes/tipos (`Cliente`, `Pedido`).
- Evitar qualquer nomenclatura como por exemplo `ehNomeDaFuncao`; utiliza outra nomenclatura nesses casos sem o uso do prefixo `eh`.

### 2.2 Funções e métodos

- **Responsabilidade única**: uma função faz **uma coisa** e fá-la bem.
- **Pequenas**: idealmente até ~20 linhas; se passar disso, considere extrair.
- **Poucos parâmetros**: até 3 é confortável; com mais, agrupe em objeto/`record`/DTO.
- **Sem efeitos colaterais ocultos**: o nome deve refletir tudo o que a função faz.
- **Early return** para reduzir aninhamento; evitar pirâmides de `if`/`else`.
- **Não misturar níveis de abstração** no mesmo método.

### 2.3 Estrutura

- **DRY**: extrair duplicação para helpers, hooks ou serviços antes de copiar/colar.
- **YAGNI**: não criar abstrações para um futuro hipotético; só generalize quando o terceiro caso aparecer.
- **SRP / SOLID**: cada classe/módulo tem **um motivo para mudar**.
- **Coesão alta, acoplamento baixo**: módulos relacionados ficam juntos; dependências passam por interfaces/contratos.
- **Dependency injection** sempre que houver I/O, relógio, aleatoriedade ou recursos externos — facilita teste.

### 2.4 Tratamento de erros

- **Nunca engolir erros** silenciosamente (`catch {}` vazio é proibido).
- **Logar com contexto** (identificadores, parâmetros relevantes — nunca segredos).
- **Erros tipados** quando a linguagem permitir (ex.: `class PedidoInvalidoError extends Error`).
- **Falhar cedo**: validar entradas no topo da função; usar guard clauses.
- **Não usar exceções para controlo de fluxo normal**.

### 2.5 Comentários

- Código auto‑explicativo > comentário. Renomeie antes de comentar.
- Comente **o porquê**, nunca o **o quê** (`// incrementa i` é ruído).
- Use comentários para: trade-offs, decisões não óbvias, restrições de negócio, bugs conhecidos com referência (`TODO(#123): ...`).
- **Não deixe código comentado** no commit final; o histórico do Git já guarda isso.

---

## 3. TDD (Test‑Driven Development)

Ciclo **red → green → refactor** sempre que possível.

- Lógica de negócio nova (helpers, serviços, validações, *use cases*, regras de domínio) **deve nascer com testes**.
- Alterações de comportamento existente: **atualizar ou acrescentar testes** na mesma alteração.
- Testes cobrem: caminho feliz, casos limite, erros relevantes.
- **Não desactive testes para “passar o CI”**: corrija a causa ou ajuste a especificação intencionalmente.
- **Não teste detalhes de implementação** (ex.: nomes internos, estrutura de mock); teste comportamento observável.
- Quando o framework permitir, prefira **AAA** (Arrange–Act–Assert) e nomes descritivos:
  - `deveCalcularDescontoQuandoClienteForVip()` em vez de `test1()`.

---

## 4. Convenções gerais por tipo de mudança

### 4.1 Tipagem

- Use **modo estrito** da linguagem (`strict` no TS, *nullable reference types* no C#, etc.).
- Tipos explícitos em **APIs públicas** e contratos entre camadas; inferência local quando óbvio.
- Não use `any` / `object` / `dynamic` salvo último recurso justificado.

### 4.2 Imutabilidade

- Prefira valores imutáveis (`const`, `readonly`, `record`) quando o domínio permitir.
- Mutação deve ser localizada e explícita.

### 4.3 Camadas e responsabilidades

- **Componentes/Controladores**: orquestração, sem regra de negócio.
- **Serviços/Use cases**: regra de negócio, sem detalhe de transporte (HTTP, UI, SQL).
- **Repositórios/Adapters**: I/O isolado por interfaces.
- **Domínio**: entidades e regras puras, sem dependência de framework.

---

## 5. Segurança, segredos e ambiente

- Variáveis sensíveis em `.env`, *user secrets*, Key Vault, Azure App Configuration — **nunca** em código.
- **Não commitar** ficheiros `.env*` reais; manter `.env.example` com nomes e descrições (sem valores).
- **Não colar** valores reais de produção em issues, PRs, chat ou docs.
- Validar e sanitizar **toda entrada externa** (HTTP, fila, ficheiro, BD).
- Logs **não** podem conter: tokens, palavras‑passe, números de cartão, CPF/CNPJ completos sem mascaramento.
- Dependências novas exigem justificação clara (impacto em bundle/imagens, manutenção, licença).

---

## 6. Git, commits e PRs

- **Mensagens em português brasileiro**, no imperativo: `adiciona validação de CPF`, `corrige cálculo de juros`, `remove código morto`.
- Commits **pequenos e atómicos** (uma intenção por commit).
- Prefixos opcionais alinhados ao Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- **Não** misturar refactor com mudança de comportamento no mesmo commit.
- PRs devem descrever: o **quê**, o **porquê**, como **testar** e impacto/riscos.

---

## 7. O que evitar

- Alterações amplas **não solicitadas** (refactors em massa, renomeações globais, formatação de ficheiros inteiros não tocados).
- Dependências novas sem necessidade clara.
- Ignorar lint/build/testes para “entregar mais rápido”.
- Implementar lógica nova **sem testes**.
- Commits gigantes que misturam várias intenções.
- Comentários que explicam o que o código óbvio faz.
- Código morto (funções/imports/variáveis não usadas).

---

## 8. Regras específicas (`.cursor/rules/`)

As regras abaixo são carregadas pelo Cursor automaticamente quando o contexto bate com o `globs` definido em cada uma, ou podem ser invocadas manualmente com `@nome-da-regra`.

| Regra | Quando aplica | Finalidade |
|---|---|---|
| `discovery-workflow.mdc` | Sempre (`alwaysApply`) | Ordem discovery → domínio → architecture-check + limiar ≥90% |
| `vibe.mdc` | Manual (`@vibe`) | Ajustes cosméticos pequenos sem abrir todas as skills |
| `frontend.mdc` | Ficheiros `.ts`, `.tsx`, `.jsx`, `.css`, projetos Next.js/React | Convenções de UI, Tailwind, TanStack, componentização |
| `backend-dotnet.mdc` | Ficheiros `.cs`, `.csproj`, soluções .NET | Convenções de .NET, SOLID, EF Core, async, exceptions |
| `database-postgresql.mdc` | Ficheiros `.sql`, migrations, scripts de BD | Convenções de PostgreSQL, índices, transações, performance |
| `playwright.mdc` | Ficheiros `tests/**/*.ts` e `playwright.config.ts` | Convenções base de testes E2E com Playwright (estrutura, locators, esperas, anti-padrões) |
| `playwright-pom.mdc` | Ficheiros `tests/**/metodos*.ts` | POM funcional — assinaturas tipadas, separação UI vs API, reutilização de helpers |
| `playwright-bd-testes.mdc` | Ficheiros `tests/**/dbUtils.ts`, `tests/**/utils.ts`, `metodos*.ts` e `*.spec.ts` com SQL | Uso seguro de PostgreSQL em testes (prepared statements, polling, cleanup) |
| `documentacao.mdc` | Invocação manual (`@documentacao`) | Gerar documentação técnica + funcional da US em `Documentacao/` |
| `code-review.mdc` | Invocação manual (`@code-review`) | Revisão crítica das alterações em `CodeReview/` |
| `tarefas-user-story.mdc` | Invocação manual (`@tarefas-user-story`) | Decompor uma US em tarefas e estimar esforço |

> Para invocar manualmente uma regra durante uma conversa, mencione‑a com `@` (ex.: `@code-review`) ou peça explicitamente: *"faz o code review"*, *"gera a documentação da US"*, *"quebra esta US em tarefas"*.

---

## 9. Skills (`.cursor/skills/`)

As **skills** complementam as regras: enquanto regras descrevem **convenções** ("como escrever código nesta stack"), skills descrevem **workflows** ("como executar uma tarefa do início ao fim"). Cada skill vive numa pasta `.cursor/skills/<nome>/SKILL.md`, com `evals/evals.json` opcional para testes.

| Skill | Persona / contexto | O que faz |
|---|---|---|
| `discovery` | Todos | Entrevista pré-código: classificar, desambiguar, confiança ≥90% |
| `discovery-frontend` | Frontend | Checklist UI/estados/camada de dados após discovery |
| `discovery-backend` | Backend | Checklist API/domínio/persistência após discovery |
| `discovery-biblioteca` | Meta (repo Agents) | Checklist ao editar skills/regras/pastas de ferramenta |
| `architecture-check` | Todos | Reutilizar→estender→compor→criar antes de ficheiro novo |
| `criador-de-skills` | Meta | Cria novas skills e itera-as com benchmark/evals (réplica do skill-creator em PT-BR) |
| `redator-user-stories` | Product Owner | Escreve/refina User Stories no padrão INVEST + Gherkin com critérios de aceitação e DoR/DoD |
| `feature-frontend-completa` | Frontend Dev | Implementa fatia vertical de feature em Next.js 15 / React 19 / TS / Tailwind (rota → tipos → service → query → form → testes) |
| `feature-backend-completa` | Backend Dev | Implementa fatia vertical em .NET (Domain → Application → Infrastructure → Api) com testes de unidade e integração |
| `tuning-query-postgres` | Data / Backend | Diagnostica e resolve queries lentas no PostgreSQL com `EXPLAIN ANALYZE`, índices, reescritas |
| `adr-decisao-arquitetura` | Tech Lead | Cria ADRs estruturados com contexto, opções, decisão, consequências, plano de revisão |
| `plano-refatoracao` | Tech Lead | Plano de refactor grande com strangler fig / branch by abstraction / expand & contract, etapas reversíveis |
| `commit-pr-padrao` | Dia a dia | Gera commits Conventional Commits em PT-BR e descrições de PR seguindo template |
| `debug-sistematico` | Software Engineer | Conduz debug científico: reproduzir, isolar, formular hipótese, fixar causa-raiz, adicionar regressão |
| `auditoria-performance-web` | Frontend Dev | Auditoria de Core Web Vitals, bundle, RSC vs Client Component, imagens, fontes |
| `auditoria-acessibilidade` | UX / Frontend | Auditoria WCAG 2.2 AA com checklist sistemático e correcções |
| `migracao-ef-segura` | Backend / DBA | Cria migrations EF Core seguras sem downtime e com plano de rollback |
| `owasp-revisao` | Software Engineer | Revisão de segurança OWASP Top 10 com findings priorizados |
| `tdd-loop-guiado` | Software Engineer | Conduz desenvolvimento em ciclos `red → green → refactor` em micro-passos |
| `arquiteto-de-projeto` | Arquiteto de Software | A partir de uma ideia/escopo, levanta stack, estilo arquitetural, padrões, NFRs, riscos e gera um manual do projeto + roadmap faseado pronto para o PO |
| `spec-de-feature` | PO / Tech Lead | Entrevista o utilizador sobre uma feature (front ou back) e gera uma spec em `Specs/SPEC-<slug>.md` pronta para guiar a IA na implementação |
| `feature-mobile-completa` | Mobile Dev | Implementa fatia vertical mobile em React Native + Expo (Expo Router, NativeWind, TanStack Query, RHF+Zod, Jest+RNTL, Maestro) com paridade Android/iOS |

> Para invocar uma skill durante uma conversa, mencione‑a com `@` (ex.: `@redator-user-stories`) ou descreva a tarefa pelo contexto (a skill dispara pela descrição no *frontmatter*).

---

## 10. Quando estiver em dúvida

1. Releia este ficheiro e a regra específica da stack envolvida.
2. Procure padrões já existentes no repositório atual e **siga-os**, mesmo que pessoalmente preferisse outro.
3. Se houver conflito entre padrão existente e estas regras: **alinhe ao padrão do projeto** e **abra um TODO** se achar que vale repensar.
4. Em mudanças com impacto arquitectural, **proponha** antes de executar.
