---
name: architecture-check
description: Checklist de arquitetura e prioridade reutilizar→estender→compor→criar. Use SEMPRE antes de criar arquivo novo (componente, service, hook, repositório, DTO, caso de uso, skill, regra ou utilitário). Verifica camada dona, grep de similares, fronteiras e naming. Pular só ao editar arquivo existente no sítio. Também @architecture-check.
---

# Architecture check — antes de criar artefato novo

## Quando usar

**Antes** de criar qualquer componente, service, hook, repositório, DTO, caso de uso, skill, regra, utilitário ou arquivo novo.

Pular apenas ao **editar** um arquivo existente no lugar (sem arquivo novo).

## Checklist

Responde **cada** item. Qualquer desconhecido → PARE e pergunta ou lê o código.

- [ ] Qual camada/módulo é dono desta responsabilidade?
- [ ] Já existe implementação similar? (grep — não confie na memória)
- [ ] Existe service/caso de uso/skill que deveria ser **estendido**?
- [ ] Existe componente/regra que deveria ser **reutilizado**?
- [ ] Isto viola fronteiras? (ex.: domain → infra; componente com `fetch`; skill só numa ferramenta)
- [ ] Requer ADR ou nota de design?
- [ ] Nomenclatura consistente com o projeto / esta biblioteca?
- [ ] Direção de dependência correcta? (camadas externas dependem das internas)

## Código existente primeiro

Ordem de prioridade:

1. **Reutilizar** — usar o existente sem mudança.
2. **Estender** — método/prop/seção no existente.
3. **Compor** — combinar peças existentes.
4. **Criar** — só quando 1–3 falharem.

Ao criar, declara numa linha por que reutilizar/estender/compor foi rejeitado.

## Padrões de busca (projeto-alvo típico)

### Backend

- Caso de uso / Application
- Porta `I*Repositorio` + implementação em Infrastructure
- Contratos / Endpoints na Api
- Entidades em Domain

### Frontend

- `features/<nome>/` (components, hooks, services)
- `components/ui/` ou design system
- `app/` rotas
- `lib/` utilitários

### Este repo Agents

- Skill: `cursor/.cursor/skills/<nome>/SKILL.md` (depois `replicar-skills.py`)
- Regra Cursor: `cursor/.cursor/rules/`
- Espelhos: `claude/`, `copilot/`, `gemini/`, `windsurf/`, `generic/`
