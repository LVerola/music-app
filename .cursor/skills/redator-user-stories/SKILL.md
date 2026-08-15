---
name: redator-user-stories
description: Cria, refina e organiza User Stories em PT-BR seguindo INVEST + Gherkin (Given/When/Then), com critérios de aceitação, Definição de Pronto/Concluído, dependências e estimativa preliminar. Use SEMPRE que o utilizador pedir para escrever, refinar, melhorar, dividir ou criticar uma user story; quando descrever uma necessidade de negócio que precisa virar US; quando mencionar "PO", "Product Owner", "backlog", "épico", "feature", "histórias de utilizador", "Gherkin", "critérios de aceitação" ou "DoR/DoD"; ou quando pedir @redator-user-stories.
---

# Redator de User Stories

Skill que actua como **Product Owner sénior**: transforma uma necessidade de negócio (ou rascunho de US confuso) em uma ou mais **User Stories** prontas para refinamento e desenvolvimento, em PT-BR.

## Objectivo

Entregar US que sejam **discutíveis em refinement**, **estimáveis** e **testáveis**. Não inventar regra de negócio: pergunte ao utilizador antes de assumir.

---

## 1. Entrada esperada

A entrada típica é uma das seguintes:

- Uma frase de necessidade ("preciso permitir que o cliente cancele o pedido").
- Um rascunho de US informal ("o utilizador deve poder fazer login com Google").
- Um épico grande ("plataforma de pagamento") — neste caso, **dividir em várias US**.
- Uma US existente para refinar/criticar.

**Antes de escrever, pergunte ao utilizador** (apenas o que faltar):

1. Qual é o **utilizador-alvo**? (papel concreto: cliente, admin, operador, sistema externo)
2. Qual é o **problema** que ele tenta resolver? (não a solução)
3. Que **valor** isto gera para o negócio?
4. Há **regras de negócio** explícitas? (limites, restrições, validações)
5. Há **dependências** com outras US, sistemas ou equipas?
6. Há **constraints não-funcionais** críticos? (latência, segurança, LGPD, acessibilidade, internacionalização)
7. Esta US **substitui** ou **complementa** algum fluxo existente?

Se o utilizador disser "tu decides", proponha um caminho e **marque as suposições explicitamente** no documento gerado.

---

## 2. Critérios INVEST

Toda US gerada precisa passar nos seis critérios. Se não passar em algum, **divida** ou ajuste antes de entregar.

| Letra | Significado | Como verificar |
|---|---|---|
| **I**ndependente | Pode ser desenvolvida sem depender de outra US em curso | Existe uma ordem em que pode ser entregue isolada? |
| **N**egociável | Não congela detalhes de implementação | Há espaço para a equipa propor solução? |
| **V**alor | Entrega valor visível ao utilizador ou ao negócio | Consegues descrever o "ganho" numa frase? |
| **E**stimável | Equipa consegue estimar com confiança | Há ambiguidade que impede estimativa? |
| **S**mall (pequena) | Cabe num *sprint* (idealmente ≤ 5 SP / ≤ 3 dias) | Tem ≤ 7 critérios de aceitação? |
| **T**estável | Cada critério gera um cenário de teste | Cada critério é falseável? |

---

## 3. Template obrigatório

Use **sempre** este template. Salve em `Backlog/US-<id>-<slug>.md` se o repositório tiver essa pasta; caso contrário, exponha no chat.

```markdown
# US-<id>: <título curto e descritivo>

> **Origem:** <épico, demanda, ticket externo, etc.>
> **Status:** Rascunho | Em refinamento | Pronta para sprint | Em desenvolvimento | Concluída
> **Estimativa preliminar:** <SP> SP (~<horas>h)

## 1. Narrativa

**Como** <papel concreto>,
**quero** <acção/capacidade>,
**para que** <valor/benefício>.

## 2. Contexto e justificativa

<2-4 parágrafos: que problema resolve, por que agora, que métrica/indicador melhora, suposições>

## 3. Regras de negócio

- RN1: <regra factual, não suposição>
- RN2: ...

## 4. Critérios de aceitação (Gherkin)

### CA1: <título curto do cenário>
```gherkin
Dado que <pré-condição mensurável>
Quando <acção do utilizador ou sistema>
Então <resultado observável>
E <efeito colateral verificável, se houver>
```

### CA2: <título do segundo cenário>
...

> Cobrir: **caminho feliz**, **pelo menos um caso de erro**, **um caso-limite** quando aplicável.

## 5. Fora do escopo

- <coisa que pode ser confundida com escopo desta US, mas não é>

## 6. Dependências

- **Bloqueia:** US-X (precisa ser concluída antes)
- **Bloqueada por:** US-Y, integração Z
- **Relacionada:** US-K (mesmo épico, mas independente)

## 7. Requisitos não-funcionais

- **Performance:** <ex.: p95 < 300ms para chamada principal>
- **Segurança/Privacidade:** <ex.: LGPD — dados pessoais devem ser logados mascarados>
- **Acessibilidade:** <ex.: WCAG 2.2 AA para qualquer UI nova>
- **Observabilidade:** <métricas/logs a emitir>
- **Internacionalização:** <textos em PT-BR; se houver i18n, dados a externalizar>

## 8. Definição de Pronto (DoR — entrada do sprint)

- [ ] Narrativa, critérios e regras revistos com equipa
- [ ] Mockups/wireframes anexados, quando aplicável
- [ ] Dependências mapeadas e desbloqueadas
- [ ] Estimativa consensual da equipa

## 9. Definição de Concluído (DoD — saída da US)

- [ ] Código revisto e *merged* na branch principal
- [ ] Testes automatizados (unidade + integração + e2e quando aplicável) passando
- [ ] Documentação técnica actualizada (ex.: regras em `Documentacao/`)
- [ ] Critérios de aceitação validados pela PO/QA
- [ ] Sem regressões nas suites existentes
- [ ] Observabilidade habilitada (logs/métricas/dashboards)
- [ ] *Feature flag* configurada (quando aplicável)

## 10. Notas e suposições

- <coisa assumida porque o utilizador não respondeu — marque com 🔶>
- <pergunta em aberto a levar para refinement — marque com ❓>
```

---

## 4. Como escrever cada secção

### 4.1 Narrativa "Como… quero… para que…"

- **Papel concreto:** `cliente premium`, `operador de logística`, `admin financeiro`. Evite `utilizador` genérico.
- **Acção observável:** verbo no infinitivo + objecto (`cancelar o pedido`, `exportar relatório em CSV`).
- **Valor real:** evite `para usar a funcionalidade X` (tautologia). Use `para reduzir tempo de atendimento`, `para cumprir LGPD`, `para evitar retrabalho`.

**Mau:**
> Como utilizador, quero ter um botão de cancelar, para poder cancelar.

**Bom:**
> Como **cliente** que já fez o pagamento, quero **cancelar um pedido em até 24h após a confirmação**, para **receber o reembolso integral sem precisar contactar o suporte**.

### 4.2 Critérios de aceitação em Gherkin

- Um cenário por critério. **Não junte** múltiplas regras no mesmo `Quando`.
- `Dado` descreve **estado**, não acção. Se precisares de fazer login antes, isso vai em `Dado que estou autenticado como cliente`.
- `Então` é **observável** — algo que um teste consegue medir.
- Sempre que houver número/tempo/limite, ponha-o **explícito** (`em até 24h`, `valor > R$ 100,00`, `máximo 5 tentativas`).

**Mau:**
```gherkin
Quando o cliente cancelar e pagar e receber e-mail
Então o pedido fica cancelado
```

**Bom (3 cenários separados):**
```gherkin
# CA1
Dado que tenho um pedido confirmado há 5 horas
Quando solicito o cancelamento
Então o pedido muda para o estado "Cancelado"
E recebo um e-mail de confirmação no endereço cadastrado

# CA2
Dado que tenho um pedido confirmado há 30 horas
Quando solicito o cancelamento
Então o sistema bloqueia a acção
E exibe a mensagem "Cancelamento permitido apenas em até 24h"

# CA3 — caso-limite
Dado que tenho um pedido confirmado há exactamente 24h
Quando solicito o cancelamento
Então a acção é permitida
```

### 4.3 Regras de negócio vs Critérios

- **Regra de negócio**: declaração factual independente de UI (`reembolso é integral em até 24h`).
- **Critério de aceitação**: cenário verificável que decorre da regra.

**Uma regra → vários critérios**. Não inverter.

### 4.4 Dependências

Sempre marque três tipos:

- **Bloqueia / Bloqueada por:** ordem real de execução.
- **Relacionada:** mesmo épico mas paralela.
- **Risco externo:** integração com fornecedor, contrato, jurídico, dados pendentes.

---

## 5. Dividir épicos (*vertical slicing*)

Se a US gerada ficar com **mais de 7 critérios de aceitação** ou **estimativa > 8 SP**, divida.

Estratégias de divisão preferidas (do **mais valor** para o **menos**):

1. **Por *workflow*** — fluxo principal → fluxo alternativo → fluxo de erro.
   Ex.: "Cancelar pedido (cliente final)" → "Cancelar pedido (operador)" → "Cancelar pedido em lote (admin)".

2. **Por tipo de utilizador** — papel A → papel B → papel C.
   Ex.: "Login com e-mail/senha" → "Login com Google" → "Login com SAML".

3. **Por dado de entrada** — CSV simples → CSV com validação → CSV grande (streaming).

4. **Por regra de negócio** — versão simplificada → versão com excepções → versão com taxas.

5. **Por interface** — backend (API) → frontend (UI) → notificações.
   **Use com cuidado** — preferir *vertical slices* (sempre que possível).

6. **Por *non-functional*** — funcional → performance → segurança → observabilidade.

**Anti-padrões:**

- "Frontend" / "Backend" / "Banco" como US separadas — quebra o vertical slice.
- "Spike de pesquisa" como US — use *spike* explícito com *timebox*, não US.
- US começando com "Refactoring" — refactor é meio, não fim. Reescreva como "Habilitar capacidade Y" (e o refactor é tarefa interna).

---

## 6. Estimativa preliminar

Quando o utilizador pedir, estime em **Story Points (SP)** usando referência Fibonacci (1, 2, 3, 5, 8, 13). Critério:

| SP | Tamanho | Indicadores |
|---|---|---|
| 1 | Trivial | Mudança de copy, *config*, ajuste de validação simples |
| 2 | Pequeno | 1-2 ficheiros, sem regra nova, ≤ 3 critérios |
| 3 | Médio | Nova rota/endpoint simples + UI, ≤ 5 critérios |
| 5 | Grande | Nova feature com regra de negócio + UI + persistência, ≤ 7 critérios |
| 8 | Muito grande | Múltiplos componentes, integração externa, ≥ 7 critérios → **considere dividir** |
| 13 | Excessivo | **Dividir obrigatoriamente** |

Acompanhe sempre com uma **tradução em horas** baseada em produtividade média (≈ 4h úteis por SP em equipa madura) **e adicione 30% de *buffer*** para risco.

> "Estimativa preliminar: **5 SP (~26h, incluindo buffer)**. Refinement valida."

---

## 7. Verificação final (antes de entregar)

Releia a US gerada com este *checklist*. **Não entregue** sem passar tudo.

- [ ] Narrativa com papel concreto, acção e valor (sem tautologia).
- [ ] Justificativa em **2-4 parágrafos**, com problema → benefício → métrica.
- [ ] Pelo menos **1 caso feliz + 1 caso de erro** em Gherkin.
- [ ] Cada critério é **falseável** (consegue-se escrever teste).
- [ ] Regras de negócio numeradas (RN1, RN2…).
- [ ] Fora do escopo explícito (cuidado com escopo difuso).
- [ ] Dependências (bloqueia / bloqueada por / relacionada).
- [ ] Pelo menos um NFR considerado (mesmo que seja "não há requisito não-funcional especial").
- [ ] DoR + DoD presentes.
- [ ] Suposições e perguntas em aberto marcadas com 🔶 / ❓.
- [ ] Tamanho razoável: ≤ 7 critérios. Caso contrário, divida.

---

## 8. Exemplo completo

Veja `exemplos/US-exemplo-cancelar-pedido.md` para uma US completa cobrindo cancelamento de pedido pelo cliente. Use-o como referência de **tom**, **densidade** e **estrutura**.

---

## 9. Erros comuns a evitar

| Erro | Como detectar | Como corrigir |
|---|---|---|
| Narrativa termina em "para usar X" | Tautologia | Reescreva com benefício mensurável |
| Gherkin com `Quando A e B e C` | Múltiplos verbos no mesmo `Quando` | Quebre em cenários separados |
| Critério sem número/tempo | Não consegues escrever teste exacto | Adicione limite explícito |
| US tem `e/ou` no título | Provavelmente são duas US | Divida |
| Status "Pronta para sprint" sem mockup | Faltou DoR | Marque como "Em refinamento" |
| US com tarefas em vez de critérios | "Criar tabela X", "Implementar serviço Y" | Reescreva como comportamento observável |
| Estimativa > 8 SP | Demasiado grande | Divida usando estratégias da secção 5 |
| Falta papel concreto | "Como utilizador..." genérico | Pergunte ao PO o papel específico |

---

## 10. Pós-entrega

Depois de entregar a US:

1. Sugira ao utilizador que valide com o time durante o **refinement**.
2. Se o repositório tiver a regra `tarefas-user-story.mdc`, sugira correr `@tarefas-user-story` para decompor em tarefas técnicas.
3. Se for parte de um épico, ofereça gerar as US irmãs já com mesma estrutura.

---

## Notas de idioma

- Todos os títulos, narrativas e critérios em **PT-BR**.
- Gherkin: `Dado`, `Quando`, `Então`, `E`, `Mas` (PT-BR aceito pelo Cucumber/SpecFlow).
- Nomes técnicos (endpoints, campos) só em inglês se o módulo já estiver em inglês — caso contrário PT-BR seguindo `AGENTS.md`.
