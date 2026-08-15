# Esquemas JSON

Este documento define os esquemas JSON usados pelo `criador-de-skills`.

---

## `evals.json`

Define as *evals* de uma skill. Localizado em `evals/evals.json` dentro do diretório da skill.

```json
{
  "skill_name": "skill-exemplo",
  "evals": [
    {
      "id": 1,
      "prompt": "Prompt de exemplo do usuário",
      "expected_output": "Descrição do resultado esperado",
      "files": ["evals/files/exemplo1.pdf"],
      "expectations": [
        "O output inclui X",
        "A skill usou o script Y"
      ]
    }
  ]
}
```

**Campos:**

- `skill_name`: nome igual ao do *frontmatter* da skill.
- `evals[].id`: identificador inteiro único.
- `evals[].prompt`: tarefa a executar.
- `evals[].expected_output`: descrição legível do sucesso.
- `evals[].files`: lista opcional de arquivos de entrada (caminhos relativos à raiz da skill).
- `evals[].expectations`: lista de afirmações verificáveis.

---

## `history.json`

Acompanha a progressão de versões em modo *Improve*. Localizado na raiz do *workspace*.

```json
{
  "started_at": "2026-01-15T10:30:00Z",
  "skill_name": "pdf",
  "current_best": "v2",
  "iterations": [
    {"version": "v0", "parent": null, "expectation_pass_rate": 0.65, "grading_result": "baseline", "is_current_best": false},
    {"version": "v1", "parent": "v0", "expectation_pass_rate": 0.75, "grading_result": "won", "is_current_best": false},
    {"version": "v2", "parent": "v1", "expectation_pass_rate": 0.85, "grading_result": "won", "is_current_best": true}
  ]
}
```

**Campos:**

- `started_at`: ISO da hora em que começou a melhoria.
- `skill_name`: nome da skill em melhoria.
- `current_best`: identificador da versão atual com melhor performance.
- `iterations[].version`: identificador (v0, v1, ...).
- `iterations[].parent`: versão anterior de onde foi derivada.
- `iterations[].expectation_pass_rate`: taxa de aprovação no *grading*.
- `iterations[].grading_result`: `"baseline"`, `"won"`, `"lost"` ou `"tie"`.
- `iterations[].is_current_best`: se é a melhor atual.

---

## `grading.json`

Output do agente avaliador. Localizado em `<dir-do-run>/grading.json`.

```json
{
  "expectations": [
    {"text": "O output inclui o nome 'João Silva'", "passed": true, "evidence": "Transcript passo 3: 'Extracted names: João Silva, Sarah Costa'"},
    {"text": "A spreadsheet tem fórmula SUM em B10", "passed": false, "evidence": "Nenhuma spreadsheet criada. O output é texto."}
  ],
  "summary": {"passed": 2, "failed": 1, "total": 3, "pass_rate": 0.67},
  "execution_metrics": {
    "tool_calls": {"Read": 5, "Write": 2, "Bash": 8},
    "total_tool_calls": 15,
    "total_steps": 6,
    "errors_encountered": 0,
    "output_chars": 12450,
    "transcript_chars": 3200
  },
  "timing": {"executor_duration_seconds": 165.0, "grader_duration_seconds": 26.0, "total_duration_seconds": 191.0},
  "claims": [
    {"claim": "O formulário tem 12 campos preenchíveis", "type": "fatual", "verified": true, "evidence": "Contei 12 campos em field_info.json"}
  ],
  "user_notes_summary": {
    "uncertainties": ["Usou dados de 2023, podem estar desatualizados"],
    "needs_review": [],
    "workarounds": ["Recorreu a sobreposição de texto para campos não-preenchíveis"]
  },
  "eval_feedback": {
    "suggestions": [
      {"assertion": "O output inclui o nome 'João Silva'", "reason": "Um documento alucinado que mencione o nome também passaria"}
    ],
    "overall": "As asserções verificam presença mas não correcção."
  }
}
```

**Campos:**

- `expectations[]`: expectativas avaliadas, cada uma com `text`, `passed`, `evidence`.
- `summary`: agregados de aprovação/reprovação.
- `execution_metrics`: utilização de ferramentas e tamanho do *output* (do `metrics.json` do executor).
- `timing`: tempo real (do `timing.json`).
- `claims`: afirmações extraídas e verificadas.
- `user_notes_summary`: questões marcadas pelo executor.
- `eval_feedback`: (opcional) sugestões de melhoria das *evals*, presente só quando o avaliador identificou questões que valem a pena levantar.

---

## `metrics.json`

Output do agente executor. Localizado em `<dir-do-run>/outputs/metrics.json`.

```json
{
  "tool_calls": {"Read": 5, "Write": 2, "Bash": 8, "Edit": 1, "Glob": 2, "Grep": 0},
  "total_tool_calls": 18,
  "total_steps": 6,
  "files_created": ["formulario_preenchido.pdf", "valores_campos.json"],
  "errors_encountered": 0,
  "output_chars": 12450,
  "transcript_chars": 3200
}
```

---

## `timing.json`

Tempo real de um *run*. Localizado em `<dir-do-run>/timing.json`.

**Como capturar:** quando um *subagent* termina, a notificação inclui `total_tokens` e `duration_ms`. Grava imediatamente — não fica persistido em mais lado nenhum e não pode ser recuperado depois.

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3,
  "executor_start": "2026-01-15T10:30:00Z",
  "executor_end": "2026-01-15T10:32:45Z",
  "executor_duration_seconds": 165.0,
  "grader_start": "2026-01-15T10:32:46Z",
  "grader_end": "2026-01-15T10:33:12Z",
  "grader_duration_seconds": 26.0
}
```

---

## `benchmark.json`

Output do modo *Benchmark*. Localizado em `benchmarks/<timestamp>/benchmark.json`.

```json
{
  "metadata": {
    "skill_name": "pdf",
    "skill_path": "/caminho/para/pdf",
    "executor_model": "claude-sonnet-4-20250514",
    "analyzer_model": "most-capable-model",
    "timestamp": "2026-01-15T10:30:00Z",
    "evals_run": [1, 2, 3],
    "runs_per_configuration": 3
  },
  "runs": [
    {
      "eval_id": 1,
      "eval_name": "Ocean",
      "configuration": "with_skill",
      "run_number": 1,
      "result": {
        "pass_rate": 0.85,
        "passed": 6,
        "failed": 1,
        "total": 7,
        "time_seconds": 42.5,
        "tokens": 3800,
        "tool_calls": 18,
        "errors": 0
      },
      "expectations": [
        {"text": "...", "passed": true, "evidence": "..."}
      ],
      "notes": [
        "Usou dados de 2023, podem estar desatualizados",
        "Recorreu a sobreposição de texto para campos não-preenchíveis"
      ]
    }
  ],
  "run_summary": {
    "with_skill": {
      "pass_rate": {"mean": 0.85, "stddev": 0.05, "min": 0.80, "max": 0.90},
      "time_seconds": {"mean": 45.0, "stddev": 12.0, "min": 32.0, "max": 58.0},
      "tokens": {"mean": 3800, "stddev": 400, "min": 3200, "max": 4100}
    },
    "without_skill": {
      "pass_rate": {"mean": 0.35, "stddev": 0.08, "min": 0.28, "max": 0.45},
      "time_seconds": {"mean": 32.0, "stddev": 8.0, "min": 24.0, "max": 42.0},
      "tokens": {"mean": 2100, "stddev": 300, "min": 1800, "max": 2500}
    },
    "delta": {"pass_rate": "+0.50", "time_seconds": "+13.0", "tokens": "+1700"}
  },
  "notes": [
    "A asserção 'Output é PDF' passa 100% em ambas as configurações - pode não diferenciar valor da skill",
    "Eval 3 mostra alta variância (50% ± 40%) - pode ser flaky ou dependente do modelo",
    "Runs sem skill falham consistentemente em extracção de tabelas",
    "A skill adiciona 13s em média mas melhora pass rate em 50%"
  ]
}
```

**Campos:**

- `metadata`: informação sobre o *run* de benchmark.
- `runs[]`: resultados individuais.
  - `configuration`: tem de ser `"with_skill"` ou `"without_skill"` (o *viewer* usa esta string exata para agrupar e colorir).
  - `result`: objecto aninhado com `pass_rate`, `passed`, `total`, `time_seconds`, `tokens`, `errors`.
- `run_summary`: agregados estatísticos por configuração.
  - `with_skill` / `without_skill`: cada um contém objectos `pass_rate`, `time_seconds`, `tokens` com `mean` e `stddev`.
  - `delta`: diferenças como `"+0.50"`, `"+13.0"`, `"+1700"`.
- `notes`: observações do analista.

**Importante:** o *viewer* lê estes campos com nomes exatos. Usar `config` em vez de `configuration`, ou pôr `pass_rate` no topo do *run* em vez de aninhado em `result`, faz o *viewer* mostrar valores vazios/zero. Referencia sempre este esquema quando gerares `benchmark.json` manualmente.

---

## `comparison.json`

Output do comparador cego. Localizado em `<dir-grading>/comparison-N.json`.

```json
{
  "winner": "A",
  "reasoning": "O output A oferece solução completa com formatação adequada. O B falta o campo de data e tem inconsistências.",
  "rubric": {
    "A": {
      "content": {"correctness": 5, "completeness": 5, "accuracy": 4},
      "structure": {"organization": 4, "formatting": 5, "usability": 4},
      "content_score": 4.7, "structure_score": 4.3, "overall_score": 9.0
    },
    "B": {
      "content": {"correctness": 3, "completeness": 2, "accuracy": 3},
      "structure": {"organization": 3, "formatting": 2, "usability": 3},
      "content_score": 2.7, "structure_score": 2.7, "overall_score": 5.4
    }
  },
  "output_quality": {
    "A": {"score": 9, "strengths": ["Solução completa", "Bem formatado"], "weaknesses": ["Inconsistência menor no cabeçalho"]},
    "B": {"score": 5, "strengths": ["Output legível"], "weaknesses": ["Sem data", "Inconsistências de formatação", "Extracção parcial"]}
  },
  "expectation_results": {
    "A": {"passed": 4, "total": 5, "pass_rate": 0.80, "details": [{"text": "Output inclui nome", "passed": true}]},
    "B": {"passed": 3, "total": 5, "pass_rate": 0.60, "details": [{"text": "Output inclui nome", "passed": true}]}
  }
}
```

---

## `analysis.json`

Output do analista pós-facto. Localizado em `<dir-grading>/analysis.json`.

```json
{
  "comparison_summary": {
    "winner": "A",
    "winner_skill": "caminho/skill/vencedora",
    "loser_skill": "caminho/skill/perdedora",
    "comparator_reasoning": "Resumo breve do raciocínio do comparador"
  },
  "winner_strengths": [
    "Instruções claras passo a passo para documentos multi-página",
    "Incluiu script de validação que apanhou erros"
  ],
  "loser_weaknesses": [
    "Instrução vaga 'processa o documento adequadamente' levou a comportamento inconsistente",
    "Sem script de validação - o agente improvisou"
  ],
  "instruction_following": {
    "winner": {"score": 9, "issues": ["Menor: saltou o passo opcional de logging"]},
    "loser": {"score": 6, "issues": ["Não usou o template de formatação", "Inventou abordagem em vez de seguir o passo 3"]}
  },
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "instructions",
      "suggestion": "Substituir 'processa o documento adequadamente' por passos explícitos",
      "expected_impact": "Eliminaria a ambiguidade que causou comportamento inconsistente"
    }
  ],
  "transcript_insights": {
    "winner_execution_pattern": "Leu skill → seguiu processo de 5 passos → usou script de validação",
    "loser_execution_pattern": "Leu skill → indefinido → tentou 3 métodos"
  }
}
```
