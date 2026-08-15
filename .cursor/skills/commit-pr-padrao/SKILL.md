---
name: commit-pr-padrao
description: Gera commits atómicos no padrão Conventional Commits em PT-BR e títulos/descrições de Pull Request seguindo template da equipe — separando refactor de mudança de comportamento, com seção de testes e impacto/riscos. Use SEMPRE que o usuário pedir para fazer commit, criar PR, gerar mensagem de commit, abrir pull request, ou descrever mudanças para revisão; quando mencionar conventional commits, mensagem de commit, PR description, ou pedir @commit-pr-padrao. Aplique também antes de propor commit grande para sugerir divisão.
---

# Commits e PRs no Padrão

Skill que atua como "filtro" entre o trabalho feito e o histórico do Git — garantindo que **cada commit conta uma história clara**, em PT-BR, e que cada PR é **revisável em 15 minutos**.

## Princípio orientador

> Um commit / PR responde a uma pergunta: *"qual a intenção desta mudança?"*. Se a resposta for mais de uma intenção, divide.

---

## 1. Antes de commitar — diagnóstico rápido

Pergunte ao Git, não ao usuário:

```powershell
git status
git diff --stat
git diff
```

Se ver:

- Mais de **1 intenção** misturada (refactor + feature, bugfix + lint, etc.) → **dividir**.
- Mais de **300 linhas** mudadas em arquivos sem relação → **dividir**.
- Mudanças em arquivos não tocados pela tarefa (lint automático, formatação) → **dividir** (commit de formatação separado).
- Arquivos sensíveis (`.env`, segredos, dumps) → **alertar e bloquear**.

---

## 2. Conventional Commits — formato

```
<tipo>(<escopo opcional>)<!>: <descrição curta em PT-BR>

[corpo opcional explicando "por quê" — não "o quê"]

[rodapé opcional: referências, breaking changes]
```

### Tipos

| Tipo | Quando usar |
|---|---|
| `feat` | Funcionalidade nova visível ao usuário / consumidor da API |
| `fix` | Correção de bug observável |
| `refactor` | Mudança interna sem alterar comportamento observável |
| `perf` | Melhoria de performance (mensurável) |
| `test` | Adição/correção de testes (não código de produção) |
| `docs` | Documentação |
| `style` | Formatação, lint, sem mudança de código |
| `build` | Build, dependencies, scripts |
| `ci` | CI/CD |
| `chore` | Manutenção sem impacto em código/build |
| `revert` | Reverter commit anterior (corpo cita o SHA) |

### Regras

- **Descrição em minúsculas, sem ponto final, em PT-BR, no imperativo.**
  - ✅ `feat(pedidos): adiciona cancelamento em até 24h`
  - ❌ `feat(pedidos): Adicionado cancelamento.`
- **Máximo 72 caracteres** na linha do título.
- **Escopo** é o módulo/área (`auth`, `pedidos`, `clientes`, `ci`).
- **Breaking change** com `!` antes dos `:` **E** rodapé `BREAKING CHANGE: <motivo>`.

### Exemplos

```
feat(pedidos): adiciona cancelamento em até 24h

Implementa o caso de uso CancelarPedido cobrindo a janela
de 24h pós-confirmação. Bloqueia tentativas fora da janela
com 422. Cliente diferente do dono recebe 403.

Refs: US-127
```

```
fix(auth): corrige refresh token quando expira durante upload

O interceptor não estava capturando 401 em chamadas multipart,
causando interrupção de uploads longos. Adiciona retry único
após refresh bem-sucedido.

Closes #441
```

```
refactor(servicos): extrai helper de chamada axios

Sem mudança de comportamento.
Resolve duplicação em 6 services.
```

```
feat(api)!: remove endpoint /v1/clientes-legado

BREAKING CHANGE: O endpoint /v1/clientes-legado foi descontinuado.
Use /v2/clientes desde 2025-12-01. Clientes antigos têm 30 dias
para migrar.
```

---

## 3. Como dividir um diff grande

Quando o `git diff` tem múltiplas intenções:

### 3.1 Padrões de divisão

| Sinal | Como dividir |
|---|---|
| Mudança em testes + código de produção da mesma feature | Mantém juntos (mesmo commit) |
| Mudança em testes + código de feature **diferente** | Separa em 2 commits |
| Bugfix + refactor | 2 commits (`fix:` + `refactor:`) |
| Refactor + nova feature | 2 commits (`refactor:` + `feat:`) — refactor primeiro |
| Lint automático + mudança real | 2 commits (`style:` primeiro, isolado) |
| Migration + endpoint que a usa | 2 commits (`feat(db):` + `feat(api):`) |

### 3.2 Comandos para dividir

**Staging selectivo** (escolher hunks):
```powershell
git add -p   # interactivo: aceita/rejeita cada hunk
git commit -m "<mensagem>"
git add -p   # continua com o resto
git commit -m "<próxima mensagem>"
```

**Por arquivo**:
```powershell
git add caminho/para/arquivo-1 caminho/para/arquivo-2
git commit -m "<mensagem>"
```

**Reabrir último commit** (só se ainda não fez push):
```powershell
git reset --soft HEAD~1   # mantém mudanças staged
git status                # ver tudo
git add -p
git commit -m "<intenção 1>"
git commit -m "<intenção 2>"
```

> **Nunca** reescreva histórico em branch já partilhado (`main`, `develop`). Em branch pessoal, à vontade.

---

## 4. Template de Pull Request

Toda PR usa este template (em PT-BR):

```markdown
## Resumo

<1-3 linhas: o que muda e por quê. Não copie o título.>

## Contexto

<2-4 parágrafos opcionais: por que esta mudança agora, qual problema resolve, qual decisão arquitetural está por trás. Link para US/issue/ADR.>

## Mudanças principais

- <bullet 1: descrição da mudança técnica>
- <bullet 2>
- ...

## Como testar

1. <passo 1 — comando exato ou clique a clique>
2. <passo 2>
3. <resultado esperado>

**Casos a verificar:**
- [ ] Caminho feliz: <X>
- [ ] Caso de erro: <Y>
- [ ] Caso-limite: <Z>

## Screenshots / GIFs

<se houver mudança visual — antes/depois>

## Impacto e riscos

- **Compatibilidade**: <breaking change? quais consumidores afetados?>
- **Performance**: <mensurada? estimada? sem impacto?>
- **Segurança**: <há dado sensível? rota nova autenticada? input sanitizado?>
- **Operações**: <precisa migration? rollback plan? feature flag?>
- **Observabilidade**: <logs/métricas novas? dashboards a atualizar?>

## Checklist

- [ ] Código segue padrões de `AGENTS.md` e regras da stack
- [ ] Testes unitários cobrem caminho feliz + erro
- [ ] Testes de integração / E2E onde aplicável
- [ ] Lint, build e testes verdes no CI
- [ ] Texto da UI em PT-BR
- [ ] Documentação atualizada (se mudou contrato/API/ADR)
- [ ] Migration revisada e idempotente (se houver)
- [ ] Sem `console.log` / `print` / código comentado
- [ ] Sem segredos/tokens no diff (verifiquei manualmente)
- [ ] Feature flag configurada (se aplicável)

## Referências

- US: <link>
- ADR: <link, se houver>
- Issue: <link>
- Dependências: <PRs ou tickets bloqueantes>
```

### Título do PR

Mesmas regras de commit (Conventional Commits, PT-BR, imperativo, ≤72 chars):

- ✅ `feat(pedidos): adiciona cancelamento em até 24h (US-127)`
- ✅ `fix(auth): corrige refresh durante upload`
- ❌ `Updates and improvements`
- ❌ `WIP — não revisar`

---

## 5. Tamanho ideal do PR

| Tipo | Linhas ideais | Linhas máximas |
|---|---|---|
| Bugfix pequeno | < 50 | 200 |
| Feature isolada | 100-300 | 500 |
| Refactor sem mudança comportamental | até 800 (revisão rápida) | 1500 |
| Migração / rename automatizado | qualquer (PR claro do que é) | — |

> Se está a passar de 500 linhas em código novo, considere dividir. Mais texto = revisão pior.

---

## 6. Checklist antes de abrir o PR

Antes de clicar em "Create PR":

- [ ] `git status` limpo (nada não commitado).
- [ ] `git log` mostra commits **atómicos** e **legíveis**.
- [ ] Testes locais passam: `npm test` / `dotnet test`.
- [ ] Lint local passa.
- [ ] Build local passa.
- [ ] Re-leu o **próprio diff** com olhar de revisor.
- [ ] Removeu `console.log`, `debugger`, `TODO` sem contexto.
- [ ] Não há segredo, *token*, URL de produção, dados pessoais.
- [ ] Título do PR descreve a mudança principal.
- [ ] Descrição responde "o quê" e "por quê".
- [ ] Como-testar tem passos reproduzíveis.

---

## 7. Anti-padrões — recuse fazer

| Anti-padrão | Risco | Alternativa |
|---|---|---|
| `Update files` / `Misc changes` | Histórico inútil | Mensagem descritiva |
| Commit gigante misturando refactor + feature | Revisão impossível | Dividir |
| Mensagem com nome de arquivo (`update User.cs`) | Não conta intenção | Descrever **o quê faz** |
| Mensagem só com ID de ticket | Não auto-explica | Descrição **+** referência |
| `style:` misturado com feature | Ruído na revisão | Separar |
| Push direto em `main` sem PR | Sem revisão | PR mesmo para fix urgente |
| Force push em branch compartilhada | Reescreve histórico alheio | Rebase só em pessoal |
| PR com label "WIP" sem motivo | Revisor perde tempo | Só abre PR quando estiver para revisar |
| Mensagem em inglês num projeto PT-BR | Quebra convenção | Tudo em PT-BR |

---

## 8. Casos especiais

### 8.1 Revert

```
revert: feat(pedidos): adiciona cancelamento em até 24h

Reverte a3f4e5b por causar regressão no fluxo de reembolso.
Bug detalhado em #532. Vamos refazer com fix.
```

### 8.2 Cherry-pick / hotfix em release

Sempre mencione no corpo o **branch de origem** e o **branch de destino**.

### 8.3 Squash vs merge

- **Squash** quando PR tem muitos commits "fix typo" / "WIP" / "addressing review" — vira **1 commit limpo na main**.
- **Merge commit** quando os commits do PR já são atómicos e contam a história.
- **Rebase + merge** se a equipe prefere história linear.

> Padrão da equipe decide. Se não há padrão, **squash** é o mais seguro.

---

## 9. Quando o usuário pede só commit, não PR

Output esperado:

```
Sugestão de divisão (3 commits):

1. test(pedidos): adiciona testes do caso CancelarPedido
   (apenas tests/PedidoTests.cs)

2. feat(pedidos): adiciona caso de uso CancelarPedido
   (src/Application/Pedidos/CancelarPedido/* + endpoint)

3. docs(pedidos): documenta regra de cancelamento em 24h
   (Documentacao/Regras/cancelamento.md)

Comandos sugeridos (PowerShell):

```powershell
# Commit 1
git add tests/PedidoTests.cs
git commit -m "test(pedidos): adiciona testes do caso CancelarPedido"

# Commit 2
git add src/Application/Pedidos/CancelarPedido/ src/Api/Endpoints/PedidosEndpoints.cs
git commit -m "feat(pedidos): adiciona caso de uso CancelarPedido"

# Commit 3
git add Documentacao/Regras/cancelamento.md
git commit -m "docs(pedidos): documenta regra de cancelamento em 24h"
```
```

---

## 10. Quando o usuário pede PR

Output esperado: **mensagem de commit final** (squash) + **título** + **corpo do PR** preenchendo o template da seção 4 com base no `git diff` da branch.

Comando para criar:

```powershell
gh pr create --title "feat(pedidos): adiciona cancelamento em até 24h (US-127)" --body-file pr-body.md
```

---

## 11. Pós-entrega

- Sugira correr `@code-review` no diff antes de marcar pronto para revisão.
- Se a mudança é grande, sugira **draft PR** primeiro para validar a abordagem.
- Lembrar de associar US/issue no rodapé/labels.
