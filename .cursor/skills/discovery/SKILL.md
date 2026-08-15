---
name: discovery
description: Discovery pré-implementação — classifica o pedido, lista ambiguidades e impactos, aplica limiar de confiança (≥90%), bloqueia alucinação e produz questionário mínimo. Use SEMPRE antes de criar ou editar ficheiros em resposta a feature, bugfix, refactor, alteração de regras/skills ou qualquer mudança. Pular só em perguntas read-only (explicação, busca, status, "o que isso faz?"). Também @discovery.
---

# Discovery — corre ANTES de qualquer edição

## Quando usar

**Antes** de escrever ou editar qualquer ficheiro em resposta a feature, bugfix, refactor, alteração ou mudança neste repositório de instruções.

Pular apenas em perguntas **read-only** (explicação, busca, status, "o que isso faz?").

## 1. Classificar a request

Escolhe **uma**:

- **Totalmente especificada** — entrada, saída, edge cases e restrições claros.
- **Parcialmente especificada** — fluxo principal ok; estados/contratos/detalhes faltando.
- **Ambígua** — várias interpretações válidas do mesmo pedido.
- **Exploratória** — utilizador a pensar em voz alta, sem compromisso.

Se **não** for totalmente especificada: **PARE. Não implementes.** Produz o questionário abaixo e aguarda.

## 2. Resolver ambiguidade

Nunca assumes. Explicitas:

- Todas as ambiguidades (lista cada uma)
- Todos os impactos (camadas, módulos, pastas de ferramenta)
- Pelo menos **duas** abordagens válidas, com trade-off numa linha cada

Depois faz o **mínimo** de perguntas para desambiguar.

**Nunca inferir** (salvo evidência em código, ADR, skill/regra existente ou nesta conversa):

- Regras de negócio
- Segurança
- Performance / SLA
- Padrões arquitecturais
- Estruturas de banco
- Contratos de API
- Comportamento de UI / UX
- Escopo de espelhamento entre pastas de ferramenta (`cursor/`, `claude/`, …)

## 3. Limiar de confiança

Antes de **qualquer edição**, declara confiança numa linha:

| Confiança | Comportamento |
|-----------|----------------|
| **≥ 90%** | Prossegue com a implementação |
| **70–89%** | Pergunta o que falta; só então prossegue |
| **&lt; 70%** | Recusa implementar; reinicia discovery do passo 1 |

A % é autoavaliada com base no que está especificado e evidenciado — não é um score calculado por código.

## 4. Sem alucinação

Nunca inventes: endpoints, DTOs, tabelas, regras, permissões, integrações, decisões de design, fluxos, nomes de campos, caminhos, assinaturas, conteúdo de skills/regras “de memória”.

Sem evidência → **pergunta** ou **lê o código/ficheiro**. Nunca chutes.

## 5. Rotear para discovery de domínio

Depois deste discovery geral:

| Área afectada | Skill a invocar |
|---------------|-----------------|
| UI / Next.js / React / Tailwind (projecto-alvo) | @discovery-frontend |
| API / .NET / EF Core (projecto-alvo) | @discovery-backend |
| Ambos frontend e backend | as duas |
| Este repo de instruções (`cursor/`, `claude/`, `copilot/`, `gemini/`, `windsurf/`, `generic/`, `scripts/`, `AGENTS.md`, …) | @discovery-biblioteca |

Depois do discovery de domínio, se fores **criar ficheiro novo**, invoca @architecture-check.

## Template de saída (quando não podes implementar ainda)

```text
Classificação: [totalmente | parcialmente | ambígua | exploratória]
Confiança: [N]%

Ambiguidades:
1. …

Impactos:
- …

Abordagens:
A) … — trade-off: …
B) … — trade-off: …

Perguntas (mínimas):
1. …

Evidências já lidas: …
Próximo passo: [perguntar | implementar | recusar]
```

## Excepções

- **Read-only** — não invocar; responder sem editar.
- **Modo vibe** — ajustes cosméticos pequenos (UI/copy/estilo local); ver regra vibe. Em dúvida se está especificado, **ainda** invoca discovery.
