# Documentação do MusicApp

Pasta viva do projeto. Novas entregas **acrescentam** arquivos; não reescrevem o passado.

| Pasta / arquivo | Para quê | Quando atualizar |
|---|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico curto, por data, do que entrou | Em **toda** entrega |
| [`Arquitetura/manual-do-projeto.md`](Arquitetura/manual-do-projeto.md) | Visão, stack, decisões, riscos | Quando a arquitetura mudar |
| [`Arquitetura/roadmap.md`](Arquitetura/roadmap.md) | Fases de valor, prontas para o PO | Quando o plano de fases mudar |
| [`Documentacao/`](Documentacao/) | Registro completo de cada entrega (o que foi feito) | No fim de cada fatia |
| [`Documentacao/ADRs/`](Documentacao/ADRs/) | Decisões pontuais com alternativas | Quando uma escolha for difícil de reverter |

## Como incrementar

1. Implementa a fatia.
2. Acrescenta uma entrada em `CHANGELOG.md` (não edite entradas antigas).
3. Cria `Documentacao/AAAA-MM-DD-<slug>.md` com o que ficou no código (não o que se planejava).
4. Se mudou uma decisão de arquitetura: atualiza o manual **e** cria ou supera um ADR.
5. Se a fase do roadmap fechou: marca critérios de saída em `roadmap.md`.

## Convenções

- **Português brasileiro estrito** (`AGENTS.md` §1): sem português europeu e sem inglês de prosa. Nomes de tecnologias ficam no original.
- Não apagar histórico: revisar um documento antigo gera `-v2` ou um ADR que o supera.
- Não inventar comportamento que não está no código. Lacunas ficam como `> ⚠️ A confirmar`.
