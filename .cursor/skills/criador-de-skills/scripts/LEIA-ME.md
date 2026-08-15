# Scripts — Criador de Skills

Os *scripts* desta pasta foram **mantidos com o código original em inglês** porque (a) já têm testes/validações implícitas, (b) traduzir nomes de funções e variáveis traria risco de quebra sem ganho real, (c) os argumentos de linha de comando e as mensagens de erro são consumidos pelo agente, não pelo utilizador final.

Este ficheiro descreve **em PT-BR** o que cada *script* faz, quando usar, e como invocar.

---

## `aggregate_benchmark.py`

**O que faz:** agrega os resultados individuais (`grading.json` de cada *run*) numa iteração e produz um `benchmark.json` + `benchmark.md` com:

- Média, desvio padrão, mínimo e máximo de `pass_rate`, `time_seconds`, `tokens` por configuração (*with_skill* / *without_skill*).
- `delta` entre configurações.
- Observações livres do analista (notes).

**Quando usar:** depois de correr todos os casos de teste de uma iteração e correr o *grader* em cada *run*.

**Como invocar (Windows / PowerShell):**

```powershell
python -m scripts.aggregate_benchmark <workspace>\iteration-N --skill-name <nome>
```

---

## `generate_report.py`

**O que faz:** gera relatório HTML estático com os resultados do *benchmark*.

**Quando usar:** quando queres um relatório autónomo (ex.: para anexar a um *pull request* ou enviar para um *stakeholder*).

---

## `improve_description.py`

**O que faz:** propõe uma **descrição melhor** para o *frontmatter* da skill, com base em falhas observadas no *triggering*.

**Quando usar:** chamado internamente por `run_loop.py` — raramente é invocado directamente.

---

## `package_skill.py`

**O que faz:** empacota uma skill (pasta completa) num ficheiro `.skill` instalável.

**Quando usar:** depois da skill estar pronta e validada, para entregar/distribuir.

**Como invocar:**

```powershell
python -m scripts.package_skill <caminho/para/skill>
```

---

## `quick_validate.py`

**O que faz:** validações rápidas e baratas sobre uma skill antes de tentar correr *evals* completas:

- `SKILL.md` existe?
- *Frontmatter* tem `name` e `description`?
- Existem ficheiros referenciados que não existem?

**Quando usar:** depois de criar/editar uma skill, antes de gastar *tokens* a correr o *loop* completo.

```powershell
python -m scripts.quick_validate <caminho/para/skill>
```

---

## `run_eval.py`

**O que faz:** corre **uma** avaliação de *triggering*: dada uma descrição e uma *query*, decide se o agente disparou ou não a skill.

**Quando usar:** chamado internamente por `run_loop.py`. Pode ser usado directamente para testes pontuais.

---

## `run_loop.py`

**O que faz:** o *loop* completo de optimização da descrição:

1. Divide o conjunto de *trigger eval* em 60% treino / 40% teste.
2. Avalia a descrição actual (3 vezes por *query* para fiabilidade).
3. Chama Claude para propor uma descrição melhor com base em falhas.
4. Re-avalia em treino + teste.
5. Repete até 5 iterações ou convergência.
6. Devolve `best_description` (escolhida pelo score de **teste**, não treino — evita *overfit*).

**Quando usar:** depois da skill estar boa em qualidade de *output*, para optimizar quando ela dispara.

**Como invocar:**

```powershell
python -m scripts.run_loop `
  --eval-set <caminho/para/trigger-eval.json> `
  --skill-path <caminho/para/skill> `
  --model <model-id-da-sessão> `
  --max-iterations 5 `
  --verbose
```

> **Nota:** este *script* invoca `claude -p` via *subprocess*. Disponível apenas em ambientes onde o CLI `claude` está instalado (Claude Code, alguns *coworks*). **Não funciona em Claude.ai**.

---

## `utils.py` e `__init__.py`

Funções utilitárias internas e marcador de módulo. Não devem ser invocados directamente.

---

## Convenções

- Todos os *scripts* usam `argparse` — corre `python -m scripts.<nome> --help` para ver opções.
- Saídas estruturadas estão em JSON nos campos descritos em `references/schemas.md`.
- O *logging* respeita `--verbose`; sem essa *flag*, os scripts são silenciosos excepto em erros.
- *Exit codes*: 0 = sucesso; ≠ 0 = falha (ver `stderr` para detalhe).
