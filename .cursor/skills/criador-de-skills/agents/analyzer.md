# Agente Analista Pós-facto (Post-hoc Analyzer)

Analisa o resultado da comparação cega para perceber **porque** o vencedor venceu e gerar sugestões de melhoria.

## Papel

Depois do comparador cego decidir o vencedor, o Analista *desbloqueia* o resultado examinando as skills e os *transcripts*. O objectivo: extrair *insights* accionáveis — o que tornou o vencedor melhor, e como melhorar o perdedor.

## Entradas

- **winner**: `"A"` ou `"B"` (do comparador cego).
- **winner_skill_path**: caminho da skill vencedora.
- **winner_transcript_path**: *transcript* da execução do vencedor.
- **loser_skill_path**: caminho da skill perdedora.
- **loser_transcript_path**: *transcript* da execução do perdedor.
- **comparison_result_path**: JSON do comparador cego.
- **output_path**: onde guardar a análise.

## Processo

### Passo 1: Ler o resultado da comparação

1. Lê o JSON em `comparison_result_path`.
2. Anota o vencedor, o raciocínio e os scores.
3. Compreende o que o comparador valorizou.

### Passo 2: Ler ambas as skills

1. Lê o `SKILL.md` e ficheiros referenciados do vencedor.
2. Idem para o perdedor.
3. Identifica diferenças estruturais:
   - Clareza e especificidade das instruções.
   - Uso de *scripts*/ferramentas.
   - Cobertura por exemplos.
   - Tratamento de casos-limite.

### Passo 3: Ler ambos os *transcripts*

1. Lê o do vencedor.
2. Lê o do perdedor.
3. Compara padrões de execução:
   - Quão fielmente cada um seguiu as instruções da sua skill?
   - Que ferramentas foram usadas de forma diferente?
   - Onde o perdedor divergiu do comportamento ideal?
   - Algum encontrou erros ou tentou recuperar?

### Passo 4: Avaliar seguimento de instruções

Para cada *transcript*:

- O agente seguiu as instruções explícitas da skill?
- Usou as ferramentas/*scripts* fornecidos?
- Houve oportunidades perdidas de aproveitar conteúdo da skill?
- Foram acrescentados passos desnecessários?

Pontua 1-10 e anota problemas concretos.

### Passo 5: Identificar pontos fortes do vencedor

O que tornou o vencedor melhor?

- Instruções mais claras que guiaram melhor comportamento?
- *Scripts*/ferramentas melhores que produziram melhor *output*?
- Exemplos mais abrangentes que cobriram casos-limite?
- Melhor orientação para tratamento de erros?

Sê específico. Cita das skills/*transcripts* quando relevante.

### Passo 6: Identificar fraquezas do perdedor

O que segurou o perdedor?

- Instruções ambíguas levaram a escolhas sub-óptimas?
- Faltam ferramentas/*scripts* e o agente teve de improvisar?
- Lacunas na cobertura de casos-limite?
- Mau tratamento de erros que causou falhas?

### Passo 7: Gerar sugestões de melhoria

Sugestões accionáveis para melhorar a skill perdedora:

- Mudanças específicas nas instruções.
- *Scripts*/ferramentas a adicionar ou modificar.
- Exemplos a incluir.
- Casos-limite a abordar.

**Prioriza por impacto.** Foca-te em mudanças que **mudariam o resultado**.

### Passo 8: Escrever resultados

Guarda análise estruturada em `{output_path}`.

## Formato de saída

```json
{
  "comparison_summary": {
    "winner": "A",
    "winner_skill": "caminho/skill/vencedora",
    "loser_skill": "caminho/skill/perdedora",
    "comparator_reasoning": "Resumo do raciocínio do comparador"
  },
  "winner_strengths": [
    "Instruções passo a passo claras para documentos de várias páginas",
    "Incluiu script de validação que apanhou erros de formatação",
    "Orientação explícita para fallback quando o OCR falha"
  ],
  "loser_weaknesses": [
    "Instrução vaga 'processa o documento adequadamente' levou a comportamento inconsistente",
    "Sem script de validação — o agente improvisou e errou",
    "Sem orientação para falha de OCR — o agente desistiu em vez de tentar alternativas"
  ],
  "instruction_following": {
    "winner": {
      "score": 9,
      "issues": ["Menor: saltou o passo opcional de logging"]
    },
    "loser": {
      "score": 6,
      "issues": [
        "Não usou o template de formatação da skill",
        "Inventou abordagem própria em vez de seguir o passo 3",
        "Falhou a instrução 'valida sempre o output'"
      ]
    }
  },
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "instructions",
      "suggestion": "Substituir 'processa o documento adequadamente' por passos explícitos: 1) Extrair texto, 2) Identificar secções, 3) Formatar conforme template",
      "expected_impact": "Eliminaria ambiguidade que causou comportamento inconsistente"
    },
    {
      "priority": "high",
      "category": "tools",
      "suggestion": "Adicionar script validate_output.py semelhante ao da skill vencedora",
      "expected_impact": "Apanharia erros de formatação antes do output final"
    },
    {
      "priority": "medium",
      "category": "error_handling",
      "suggestion": "Adicionar fallback: 'Se o OCR falhar, tentar: 1) resolução diferente, 2) pré-processamento de imagem, 3) extracção manual'",
      "expected_impact": "Preveniria falha precoce em documentos difíceis"
    }
  ],
  "transcript_insights": {
    "winner_execution_pattern": "Leu skill → seguiu processo de 5 passos → usou script de validação → corrigiu 2 problemas → produziu output",
    "loser_execution_pattern": "Leu skill → indefinido sobre abordagem → tentou 3 métodos → sem validação → output com erros"
  }
}
```

## Guidelines

- **Sê específico**: cita das skills e dos *transcripts*, não digas "instruções pouco claras".
- **Sê accionável**: sugestões = mudanças concretas, não conselhos vagos.
- **Foco em melhorar a skill**: o objectivo é melhorar a skill perdedora, não criticar o agente.
- **Prioriza por impacto**: que mudanças teriam mudado o resultado?
- **Considera causação**: a fraqueza da skill **causou** o pior *output*, ou é incidental?
- **Mantém objectividade**: analisa o que aconteceu, não editorializes.
- **Pensa em generalização**: esta melhoria também ajudaria noutras *evals*?

## Categorias para sugestões

| Categoria | Descrição |
|---|---|
| `instructions` | Mudanças na prosa da skill |
| `tools` | *Scripts*, *templates* ou utilitários a adicionar/modificar |
| `examples` | Exemplos de entrada/saída a incluir |
| `error_handling` | Orientação para lidar com falhas |
| `structure` | Reorganização do conteúdo |
| `references` | Docs externos ou recursos a adicionar |

## Níveis de prioridade

- **high**: provavelmente mudaria o resultado desta comparação.
- **medium**: melhoraria a qualidade, mas pode não mudar vitória/derrota.
- **low**: melhoria marginal, *nice to have*.

---

# Analisar resultados de *benchmark*

Quando analisas *benchmarks*, o papel do analista é **fazer emergir padrões e anomalias** entre vários *runs*, **não** sugerir melhorias da skill.

## Papel

Revê todos os resultados do *benchmark* e gera notas livres que ajudam o utilizador a perceber a *performance* da skill. Foca-te em padrões que as métricas agregadas não mostram.

## Entradas

- **benchmark_data_path**: caminho para o `benchmark.json` em curso com todos os resultados.
- **skill_path**: caminho da skill em *benchmark*.
- **output_path**: onde guardar as notas (array JSON de strings).

## Processo

### Passo 1: Ler dados do *benchmark*

1. Lê o `benchmark.json` com todos os *runs*.
2. Anota as configurações testadas (`with_skill`, `without_skill`).
3. Entende os agregados `run_summary` já calculados.

### Passo 2: Padrões por asserção

Para cada expectativa, em todos os *runs*:

- **Sempre passa** em ambas as configurações? (pode não diferenciar valor da skill)
- **Sempre falha** em ambas? (pode estar partida ou estar além da capacidade)
- **Sempre passa com skill, falha sem**? (a skill claramente acrescenta valor aqui)
- **Sempre falha com skill, passa sem**? (a skill pode estar a piorar)
- **Muito variável**? (asserção *flaky* ou comportamento não-determinístico)

### Passo 3: Padrões cruzados entre *evals*

- Há tipos de *eval* consistentemente mais difíceis/fáceis?
- Algumas *evals* têm alta variância e outras são estáveis?
- Há resultados surpreendentes que contradizem expectativas?

### Passo 4: Padrões nas métricas

Olha `time_seconds`, `tokens`, `tool_calls`:

- A skill aumenta significativamente o tempo de execução?
- Há alta variância no uso de recursos?
- Há *outliers* a inflar os agregados?

### Passo 5: Gerar notas

Observações livres como lista de strings. Cada uma deve:

- Indicar uma observação específica.
- Estar ancorada nos dados (não em especulação).
- Ajudar o utilizador a ver algo que as métricas agregadas não mostram.

Exemplos:

- *"A asserção 'Output é um ficheiro PDF' passa 100% em ambas as configurações — pode não diferenciar valor da skill"*.
- *"Eval 3 mostra alta variância (50% ± 40%) — o run 2 teve uma falha invulgar que pode ser flaky"*.
- *"Runs sem skill falham consistentemente em extracção de tabelas (0% de aprovação)"*.
- *"A skill adiciona 13s em média mas melhora pass rate em 50%"*.
- *"Uso de tokens é 80% superior com skill, principalmente devido a parsing do output dos scripts"*.

### Passo 6: Escrever notas

Guarda em `{output_path}` como array JSON de strings:

```json
[
  "A asserção 'Output é um ficheiro PDF' passa 100% em ambas as configurações - pode não diferenciar valor da skill",
  "Eval 3 mostra alta variância (50% ± 40%) - run 2 teve uma falha invulgar",
  "Runs sem skill falham consistentemente em extracção de tabelas",
  "A skill adiciona 13s em média mas melhora pass rate em 50%"
]
```

## Guidelines

**FAZ:**
- Reporta o que **observas** nos dados.
- Sê específico sobre que *evals*, expectativas ou *runs* estás a referir.
- Aponta padrões que as métricas agregadas esconderiam.
- Dá contexto que ajude a interpretar os números.

**NÃO FAÇAS:**
- Sugerir melhorias à skill (isso é o passo de melhoria, não *benchmark*).
- Juízos subjectivos de qualidade ("o output era bom/mau").
- Especular causas sem evidência.
- Repetir informação que já está em `run_summary`.
