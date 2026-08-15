---
name: arquiteto-de-projeto
description: Actua como arquiteto de software sénior — a partir de uma ideia de projeto, escopo inicial e visão futura, levanta a stack tecnológica recomendada, o estilo arquitetural, padrões de projeto, requisitos não-funcionais, riscos e cuidados, e produz um manual do projeto + roadmap faseado pronto para um PO quebrar em entregas factíveis. Entrevista o utilizador quando faltar informação crítica. Use SEMPRE que o utilizador descrever uma ideia ou novo projeto, pedir arquitetura de solução, definição/escolha de stack, padrões ou estilo arquitetural, manual/blueprint de projeto, roadmap técnico, planeamento inicial de um sistema, ou pedir @arquiteto-de-projeto. Aplique também quando trouxer um escopo de produto vago que precisa ser estruturado tecnicamente antes de virar user stories.
---

# Arquiteto de Projeto Sénior

Workflow que conduz como **arquiteto de software sénior**. Recebe uma ideia de projeto (e o escopo que existir) e devolve uma **arquitetura de solução** acionável: stack recomendada com justificativa, estilo arquitetural, padrões, requisitos não-funcionais, riscos, cuidados, e um **manual do projeto + roadmap faseado** que um Product Owner consegue quebrar em entregas.

## Objectivo

Transformar uma ideia (mesmo vaga) num **blueprint técnico defensável**: alguém de fora lê o manual e entende **o que** se vai construir, **com que tecnologias e por quê**, **que riscos existem**, e **em que ordem entregar**. Não inventar requisitos — **entrevistar** o utilizador quando faltar informação crítica.

A saída alimenta directamente o fluxo de produto: o **roadmap** é desenhado para que @redator-user-stories e @tarefas-user-story consigam pegar cada fase e decompor em US e tarefas.

---

## Quando usar

- "Tenho uma ideia de produto X, como devo construí-la?"
- "Que stack uso para este projeto?" / "Que padrões fazem sentido aqui?"
- "Monta um manual / blueprint / roadmap técnico para este sistema."
- "Quero arquitetar uma solução antes de começar a programar."
- Escopo de produto vago que precisa de estrutura técnica antes de virar backlog.

**Não use** para: decisão técnica isolada e atómica (use @adr-decisao-arquitetura), escrever user stories de uma feature já definida (use @redator-user-stories), ou planear refactor de sistema existente (use @plano-refatoracao).

---

## Fluxo geral

```
1. Ler o que o utilizador trouxe  →  detectar lacunas
2. ENTREVISTA (bloqueante): perguntar TUDO o que falta de uma vez
3. Decidir estilo arquitetural + stack (justificando)
4. Definir padrões, NFRs, riscos e cuidados
5. Escrever o manual do projeto (sempre 1 .md principal)
6. Escrever o roadmap faseado (pronto para o PO)
7. Se complexo: quebrar etapas em .md próprios
8. Handoff: sugerir ADRs e o próximo passo (PO)
```

Não saltes a entrevista. Um manual construído sobre suposições não validadas é desperdício.

---

## 1. Entrevista — colher contexto antes de arquitetar

Lê primeiro **tudo** o que o utilizador já forneceu e marca o que está respondido. Depois faz, **de uma só vez** (num único bloco), **apenas as perguntas que faltam**. Não avances para a arquitetura enquanto não tiveres as respostas críticas — exceto o que o utilizador explicitamente mandar assumir.

Agrupa as perguntas por tema. Não despejes 30 perguntas: escolhe as que mudam a arquitetura.

**1.1 Visão e valor**
- Que problema o produto resolve e para quem (personas concretas)?
- Como se mede sucesso (métrica de negócio, não técnica)?
- É produto novo (greenfield) ou integra-se com algo existente?

**1.2 Escopo agora vs futuro**
- O que **tem** de existir no primeiro release (MVP)?
- O que está explicitamente **fora** do MVP mas faz parte da visão?
- Funcionalidades futuras conhecidas que podem condicionar decisões hoje (ex.: "depois vamos ter app mobile", "vamos abrir API pública")?

**1.3 Escala e não-funcionais**
- Quantos utilizadores/pedidos esperados no início e no horizonte de 1-2 anos?
- Há requisitos de latência, disponibilidade (SLA), ou picos sazonais?
- Dados sensíveis? LGPD/GDPR, auditoria, retenção, residência de dados?

**1.4 Restrições do mundo real**
- Tamanho e maturidade da equipa; tecnologias que já dominam.
- Orçamento de infra e prazo do primeiro release.
- Tecnologias **impostas** ou **proibidas** (políticas internas, contratos, cloud específica).
- Integrações externas obrigatórias (pagamentos, ERP, e-mail, terceiros).

**1.5 Operação**
- Onde corre (cloud, on-premise, híbrido)? Há preferência de provider?
- Quem opera depois (a mesma equipa, time de SRE, ninguém)?

> Se o utilizador disser "decide tu", propõe um caminho e **marca cada suposição** no manual com 🔶. Não deixes uma decisão importante implícita.

---

## 2. Decidir o estilo arquitetural e a stack

### 2.1 Estilo arquitetural

Escolhe o estilo **mais simples que satisfaz os requisitos** — começa simples e justifica qualquer complexidade adicional pela escala/restrições reais, nunca por modismo. Vê `references/catalogo-decisoes.md` para o catálogo de estilos (monólito modular, microsserviços, serverless, event-driven, etc.), padrões e o guia de NFRs — lê esse ficheiro quando precisares de comparar opções.

Regra de ouro: **monólito modular bem fatiado** é o ponto de partida por defeito para a maioria dos produtos novos. Só vai para microsserviços/serverless quando houver justificativa concreta (escala independente de módulos, equipas autónomas, picos isolados).

### 2.2 Stack tecnológica

Este repositório tem regras fortes para **.NET (backend) + Next.js/React + PostgreSQL**. **Prefere esta stack por defeito** — reduz atrito com as convenções e skills existentes (@feature-backend-completa, @feature-frontend-completa, @migracao-ef-segura, @tuning-query-postgres). 

Mas **justifica sempre** e **abre excepção** quando o projeto pedir claramente outra coisa (ex.: pipeline de dados pesado → Python; app mobile nativa → outra stack; tempo-real massivo → considerar Go/Elixir). Quando recomendares fora do default, explica **porquê** e o custo de sair do padrão do repo.

Para cada camada, recomenda **uma opção principal + 1-2 alternativas** com trade-off curto:

| Camada | Recomendação | Alternativas | Porquê |
|---|---|---|---|
| Frontend | ... | ... | ... |
| Backend/API | ... | ... | ... |
| Base de dados | ... | ... | ... |
| Auth | ... | ... | ... |
| Infra/Deploy | ... | ... | ... |
| Observabilidade | ... | ... | ... |

> Decisões com peso (BD primária, estilo de API, estratégia de auth, monólito vs micro) merecem um **ADR próprio**. No manual, regista a decisão de forma resumida e sugere `@adr-decisao-arquitetura` para a formalizar.

---

## 3. Estrutura de ficheiros gerados

Grava sempre na pasta `Arquitetura/` na raiz do repositório (cria se não existir):

```
Arquitetura/
├── manual-do-projeto.md     # SEMPRE — o blueprint completo
├── roadmap.md               # SEMPRE — fases sequenciadas, prontas para o PO
└── etapas/                  # SÓ quando o projeto for complexo
    ├── 01-<slug-da-fase>.md
    ├── 02-<slug-da-fase>.md
    └── ...
```

**Sempre** gera `manual-do-projeto.md` e `roadmap.md`. Quando o projeto for grande (≥ 4 fases, ou múltiplos subsistemas), cria um `.md` por fase em `etapas/` com o detalhe técnico daquela fase, e mantém o manual como visão consolidada que aponta para eles.

---

## 4. Template — `manual-do-projeto.md`

Usa **sempre** esta estrutura. Adapta o conteúdo, não a espinha dorsal.

```markdown
# Manual do Projeto — <Nome do Projeto>

> **Status:** Rascunho | Em validação | Aprovado
> **Data:** AAAA-MM-DD
> **Arquiteto:** <nome/papel>
> **Versão:** 0.1

## 1. Visão e contexto
<2-4 parágrafos: que problema resolve, para quem, por que agora, como se integra ao que existe.>

## 2. Objetivos e métricas de sucesso
- Objetivo de negócio: <...>
- Métricas: <ex.: reduzir tempo de X em 30%, suportar N utilizadores>

## 3. Personas / utilizadores-alvo
- <Persona 1 — papel, necessidade, contexto de uso>
- <Persona 2 — ...>

## 4. Escopo
### 4.1 MVP (primeiro release)
- <capacidade 1>
- <capacidade 2>
### 4.2 Fora do escopo (agora)
- <...>
### 4.3 Visão futura (condiciona decisões de hoje)
- <ex.: app mobile no ano 2 → API deve nascer mobile-friendly>

## 5. Requisitos funcionais (capacidades de alto nível)
- RF1: <capacidade observável, não tarefa técnica>
- RF2: ...

## 6. Requisitos não-funcionais
- **Escala:** <utilizadores/pedidos esperados, horizonte>
- **Performance:** <ex.: p95 < 300ms nas chamadas principais>
- **Disponibilidade:** <ex.: 99.5%, janelas de manutenção>
- **Segurança & conformidade:** <LGPD/GDPR, auditoria, retenção>
- **Observabilidade:** <logs, métricas, tracing, alertas>
- **Acessibilidade & i18n:** <WCAG 2.2 AA, idiomas>

## 7. Restrições
- **Equipa:** <tamanho, skills, maturidade>
- **Orçamento & prazo:** <teto de infra, data do release>
- **Tecnológicas/legais:** <impostas, proibidas, cloud obrigatória>

## 8. Arquitetura da solução
### 8.1 Estilo arquitetural
**Escolha:** <ex.: monólito modular>. **Porquê:** <ligado às forças da secção 6/7>.
### 8.2 Visão de componentes
<diagrama em texto/mermaid ou descrição dos módulos e como conversam>
### 8.3 Decisões-chave (resumo) → ADRs sugeridos
| Decisão | Escolha | Alternativas descartadas | ADR sugerido |
|---|---|---|---|
| BD primária | ... | ... | ADR-0001 |

## 9. Stack tecnológica recomendada
| Camada | Recomendação | Alternativas | Justificativa |
|---|---|---|---|
| Frontend | ... | ... | ... |
| Backend | ... | ... | ... |
| Base de dados | ... | ... | ... |
| Auth | ... | ... | ... |
| Infra/Deploy | ... | ... | ... |
| Observabilidade | ... | ... | ... |
> Desvios da stack padrão do repositório (.NET/Next/PostgreSQL) estão justificados acima.

## 10. Padrões de projeto e convenções
- **Arquitetura interna:** <ex.: Clean Architecture / camadas / vertical slices>
- **Padrões aplicáveis:** <ex.: Repository, CQRS leve, Result, DI — só os que agregam>
- **Convenções:** seguir AGENTS.md (idioma PT, clean code, TDD).

## 11. Modelo de dados (alto nível)
<entidades principais e relações — sem detalhe de colunas>

## 12. Integrações externas
| Integração | Finalidade | Protocolo | Risco/owner |
|---|---|---|---|

## 13. Segurança e conformidade
<autenticação, autorização, segredos, dados pessoais, mascaramento de logs, OWASP — sugerir @owasp-revisao em pontos críticos>

## 14. Riscos e mitigações
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|

## 15. Cuidados e dívidas técnicas previstas
- <armadilhas conhecidas, decisões adiadas de propósito, pontos a revisitar>

## 16. Roadmap (resumo)
<tabela curta das fases — detalhe completo em `roadmap.md`>

## 17. Suposições e perguntas em aberto
- 🔶 <suposição assumida por falta de resposta>
- ❓ <pergunta a fechar antes de construir>

## 18. Próximos passos
- [ ] Formalizar decisões-chave como ADRs (`@adr-decisao-arquitetura`)
- [ ] Quebrar as fases do roadmap em US (`@redator-user-stories`)
```

---

## 5. Template — `roadmap.md`

O roadmap é a **ponte para o PO**. Cada fase tem de ser uma fatia de valor entregável, sequenciada, com critérios de saída claros — para que possa virar um épico de US.

```markdown
# Roadmap — <Nome do Projeto>

> Fases ordenadas por valor + dependência. Cada fase é um candidato a épico para o PO decompor.

## Fase 0 — Fundações (opcional)
- **Objetivo:** <infra mínima, esqueleto, CI/CD, auth base>
- **Entregáveis:** <...>
- **Critérios de saída:** <o que precisa estar de pé para começar a Fase 1>
- **Esforço (T-shirt):** S | M | L | XL
- **Dependências:** <nenhuma / X>

## Fase 1 — <nome>
- **Objetivo:** <valor de negócio desta fase>
- **Capacidades incluídas:** <RF1, RF3 do manual>
- **Entregáveis:** <...>
- **Critérios de saída:** <mensuráveis>
- **Riscos:** <...>
- **Esforço (T-shirt):** S | M | L | XL
- **Dependências:** Fase 0

## Fase 2 — <nome>
...

## Mapa de dependências
<ordem obrigatória entre fases — texto ou mermaid>

## Sugestão de decomposição
> Próximo passo: correr `@redator-user-stories` por fase para gerar as US, e `@tarefas-user-story` para o detalhe técnico.
```

Princípios do roadmap:
- **Fatias verticais de valor**, não camadas técnicas ("Fase: backend" é anti-padrão).
- Cada fase entrega algo demonstrável.
- Esforço em **T-shirt size** (não SP) — a estimativa fina é trabalho do PO/equipa.
- Sequência guiada por **dependência real + valor**, com a fase de maior risco/aprendizagem cedo quando fizer sentido.

---

## 6. Quebrar em `etapas/` (projetos complexos)

Quando criares `etapas/NN-<slug>.md`, cada ficheiro aprofunda **uma fase**:

```markdown
# Fase NN — <nome>

## Objetivo e valor
## Escopo detalhado (capacidades)
## Decisões técnicas específicas desta fase
## Componentes/serviços afetados
## Modelo de dados desta fase
## Integrações e contratos
## Riscos e cuidados específicos
## Critérios de aceitação da fase (saída mensurável)
## Candidatos a US (para o PO)
```

O `manual-do-projeto.md` continua a ser a fonte de verdade consolidada e **aponta** para cada ficheiro de etapa na secção 16.

---

## 7. Princípios de arquitetura a respeitar

- **Simplicidade primeiro:** a melhor arquitetura é a mais simples que cumpre os NFRs. Complexidade exige justificativa explícita.
- **Reversibilidade:** decisões caras de reverter merecem mais escrutínio e um ADR; decisões baratas podem ser tomadas e revistas depois.
- **Sem hype:** não recomendes tecnologia "porque é moderna". Liga cada escolha a um requisito ou restrição concreta.
- **Trade-offs honestos:** toda recomendação tem um custo. Se não consegues nomear o contra, não analisaste o suficiente.
- **Alinhar ao repositório:** segue AGENTS.md (idioma PT, clean code, segurança, TDD) e prefere a stack/skills já existentes salvo justificativa.
- **YAGNI no roadmap:** não arquitetes para um futuro hipotético; mas regista na "visão futura" o que condiciona decisões de hoje.

---

## 8. Checklist final (antes de entregar)

- [ ] Entrevista feita — sem decisões críticas assentes em suposições não marcadas.
- [ ] `manual-do-projeto.md` gerado com todas as secções do template.
- [ ] `roadmap.md` gerado com fases verticais, sequenciadas e com critérios de saída.
- [ ] Estilo arquitetural escolhido **e justificado** pelas forças reais.
- [ ] Stack recomendada por camada, com alternativas e justificativa; desvios do padrão do repo explicados.
- [ ] Pelo menos uma matriz de riscos preenchida.
- [ ] Secção de cuidados/dívidas técnicas com conteúdo real.
- [ ] Suposições (🔶) e perguntas em aberto (❓) marcadas.
- [ ] Decisões-chave sinalizadas para virar ADRs.
- [ ] Handoff para o PO explícito (próximos passos).
- [ ] Projeto complexo → fases quebradas em `etapas/`.

---

## 9. Erros comuns a evitar

| Erro | Como detectar | Correcção |
|---|---|---|
| Arquitetar sem entrevistar | Manual cheio de "assume-se que..." | Parar e perguntar o que falta |
| Microsserviços por defeito | Estilo escolhido sem justificativa de escala | Voltar ao monólito modular salvo prova |
| Stack por moda | "Porque é moderno/popular" | Ligar a requisito/restrição concreta |
| Roadmap por camadas | Fases tipo "Backend", "Frontend" | Refatorar em fatias verticais de valor |
| Recomendação sem trade-off | Secções de alternativas vazias | Listar contras honestos |
| Manual eterno e genérico | Vale para qualquer projeto | Especificar com os dados deste projeto |
| Decisão grande sem ADR | Tabela 8.3 vazia | Sinalizar e sugerir @adr-decisao-arquitetura |
| Fase sem critério de saída | "Fase 1: fazer o sistema" | Definir saída mensurável |

---

## 10. Pós-entrega

1. Sugere formalizar as 2-4 decisões mais pesadas como ADRs (`@adr-decisao-arquitetura`).
2. Sugere correr `@redator-user-stories` por fase do roadmap para gerar o backlog.
3. Lembra que o manual é **vivo**: quando uma decisão mudar, actualiza o manual e cria o ADR correspondente.

## Notas de idioma

- Todo o conteúdo gerado em **PT** (seguindo AGENTS.md): títulos, secções, nomes de ficheiros (`kebab-case`).
- Nomes técnicos (frameworks, protocolos) mantêm o nome original.
