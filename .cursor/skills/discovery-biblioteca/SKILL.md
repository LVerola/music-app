---
name: discovery-biblioteca
description: Discovery de domínio para este repositório Agents (biblioteca de regras/skills). Use SEMPRE depois de @discovery ao criar ou alterar skills, regras, AGENTS/CLAUDE, hooks, scripts de replicação ou pastas de ferramenta (cursor/, claude/, copilot/, gemini/, windsurf/, generic/). Garante fonte de verdade, espelhamento e naming. Também @discovery-biblioteca.
---

# Discovery biblioteca (repo Agents)

Corre **depois** de @discovery, **antes** de editar este repositório de instruções.

## Fonte de verdade

1. Skills novas/alteradas: editar em `cursor/.cursor/skills/<nome>/` e correr `python scripts/replicar-skills.py`.
2. Regras de stack: mesma alteração em todas as pastas de ferramenta (formato adaptado) — ver `README.md`.
3. Núcleo (`AGENTS.md` / `CLAUDE.md` / …): manter o **mesmo limiar e workflow** em todos os espelhos.

## Escopo

4. O que muda: skill, regra, hook, script, doc, ou índice?
5. É conteúdo **copiado para projetos-alvo** ou só governação **deste** repo?
6. Precisa de entrada em `TITLES` / `TRIGGER_HINTS` em `scripts/replicar-skills.py`?

## Naming e idioma

7. Nome kebab-case alinhado às skills existentes?
8. Textos de UI, código novo e **qualquer Markdown gerado** em **português brasileiro** (sem PT-PT nem inglês de prosa; exceto contratos de framework/API)?
9. `description` da skill assertiva o bastante para disparar (evitar sub-disparo)?

## Espelhamento

10. Quais pastas de ferramenta têm de reflectir a mudança?
11. Hook Claude (`claude/.claude/hooks/`) e/ou regra Cursor alwaysApply afetados?
12. Após editar skill: `replicar-skills.py` faz parte do DoD?

## Anti-padrões deste repo

- Não criar skill só numa pasta (`claude/` ou `copilot/`) sem passar pela fonte Cursor.
- Não divergir limiar de confiança (≥90% / 70–89% / &lt;70%) entre espelhos.
- Não copiar skills CFlow com nomes/caminhos de produto (`*-cflow`, `frontend/features/recuperacao`) para a biblioteca genérica.

Não implementes até os itens relevantes estarem claros ou adiados pelo usuário.
