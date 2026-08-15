---
name: plano-refatoracao
description: Cria plano de refatoração grande/arriscada com escopo, riscos, etapas incrementais (strangler fig, branch by abstraction, expand/contract), critérios de sucesso, rollback e métricas de progresso. Use SEMPRE que o utilizador pedir para planear refactor, refatorar módulo grande, modernizar legado, migrar de arquitetura, dividir monolito, trocar biblioteca core, ou pedir @plano-refatoracao. Aplique antes de tocar em código quando o escopo for incerto ou arriscado.
---

# Plano de Refatoração

Skill para transformar "vamos refatorar X" em **plano executável** com escopo, riscos mapeados, etapas reversíveis e critérios de sucesso. Salva a equipa de refactor que **começa e nunca termina**.

## Quando aplicar

- "Vamos extrair o módulo de pagamentos do monolito."
- "A nossa camada de acesso a dados está uma confusão, precisamos refazer."
- "Vamos migrar de Vue 2 para Vue 3 / .NET Framework para .NET 9 / Pages Router para App Router."
- "Esse domínio cresceu demais, queremos quebrar em sub-bounded contexts."
- "Precisamos trocar a biblioteca de forms toda."

**Não use** para refactor pequeno feito dentro de uma feature (isso é parte do dia a dia).

---

## 1. Antes de planejar — entender o problema

Pergunte:

1. **Sintoma observado**: o que está doendo agora? Bugs frequentes? Tempo de implementação cresceu? Performance? Onboarding novo dev demora?
2. **Causa hipotética**: por que isso está a acontecer?
3. **Custo de não-fazer**: quanto tempo/dinheiro perde-se por mês? Há risco de incidente?
4. **Tempo disponível**: equipa inteira, 30% capacidade, fim de sprint?
5. **Pode parar de entregar funcionalidades?**: refactor "stop the world" raramente é viável.
6. **Cobertura de testes actual**: você tem rede de segurança ou refactor é cego?
7. **Stakeholders**: quem precisa aprovar? Quem vai sentir o impacto (suporte, ops, produto)?
8. **Janela de regressão tolerada**: pode haver leve queda de performance/UX durante a transição?

> Se a resposta a "quanto custa não-fazer" for "não sei", o refactor está em risco antes de começar — **não há baseline para medir sucesso**.

---

## 2. Princípios — refactor seguro

1. **Refactor incremental**, **não Big Bang**. Cada passo deve ser *mergeable* e *releasable*.
2. **Sempre verde**: a *master* nunca quebra. Cada PR mantém o sistema funcional.
3. **Reversibilidade**: cada etapa pode ser revertida sem perder dado/funcionalidade.
4. **Comportamento preservado**: refactor não muda comportamento observável. Mudança de comportamento é **outro** PR, separado.
5. **Testes antes**: se não houver cobertura, **escreva testes de caracterização** primeiro (que documentam o comportamento actual).
6. **Mediã o progresso**: métrica concreta (linhas movidas, módulos migrados, % testes na nova abordagem).
7. **Feature flag**: para mudanças que afectam runtime do utilizador.

---

## 3. Estratégias canónicas — escolha a certa

### 3.1 Strangler Fig — *Estrangulador*

Use quando: substituindo sistema/módulo legado por um novo, em **produção**.

```
[Cliente] → [Proxy / Router] → [Sistema Antigo (90%)]
                              → [Sistema Novo (10%)]
```

- Novo módulo cresce, antigo encolhe.
- Roteamento por feature/usuário/percentual.
- No fim, antigo é removido.

**Bom para:** trocar arquitetura, extrair de monolito, migrar entre stacks.

### 3.2 Branch by Abstraction

Use quando: refatorando **dentro** de um único codebase sem dividir tráfego.

```
1. Crie abstração (interface) cobrindo a antiga implementação.
2. Faça código cliente usar a abstração.
3. Crie nova implementação atrás da abstração.
4. Alterne com feature flag.
5. Remova antiga implementação.
```

**Bom para:** trocar ORM, biblioteca de UI, padrão de tratamento de erros — sem precisar branch longo.

### 3.3 Expand & Contract — *Parallel Change*

Use para: mudar contrato (schema, API, função pública) sem quebrar consumidores.

```
EXPAND  : adicionar novo (campo, endpoint, função) e manter antigo.
MIGRATE : migrar consumidores um a um do antigo para o novo.
CONTRACT: remover o antigo quando ninguém usar.
```

**Bom para:** rename de coluna, mudar formato de API, dividir parâmetro composto.

### 3.4 Characterization Tests — *Tests de Caracterização*

Use quando: há lógica sem testes que precisa ser refatorada.

```
1. Escreva testes que capturam o comportamento ACTUAL (mesmo bugs).
2. Faça o refactor.
3. Garanta que os testes continuam passando.
4. Depois, em PR separado, corrija bugs encontrados.
```

**Bom para:** legado sem suite, função misteriosa que ninguém entende.

### 3.5 Big Bang — quando aceitar

**Raramente.** Aceite só se: cobertura de testes alta, módulo pequeno, equipa dedicada por janela curta, downtime aceito.

---

## 4. Template do plano

Salve em `Documentacao/Refactor/<slug>.md`. Use o template:

```markdown
# Refactor: <título curto>

> **Status**: Rascunho | Aprovado | Em execução | Concluído | Cancelado
> **Responsável**: <nome>
> **Equipa envolvida**: <nomes ou papéis>
> **Data de início**: AAAA-MM-DD
> **Data alvo**: AAAA-MM-DD
> **Estratégia**: Strangler Fig | Branch by Abstraction | Expand & Contract | Big Bang | Mista

---

## 1. Motivação

### 1.1 Sintoma
<O que está doendo agora — com dados se possível>

### 1.2 Causa
<Hipótese técnica — por que isto está a acontecer>

### 1.3 Custo de não-fazer
<Quanto se perde por mês ou trimestre — esforço, bugs, oportunidade>

### 1.4 Resultado esperado
<O que muda quando terminar — com métrica>

## 2. Escopo

### 2.1 No escopo
- <bloco 1>
- <bloco 2>
- ...

### 2.2 Fora do escopo
- <coisa que pode parecer parte mas não é>
- ...

### 2.3 Dependências
- <equipa X precisa aprovar mudança no contrato>
- <serviço Y precisa de upgrade antes>
- ...

## 3. Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| 1 | <ex.: queda de performance durante coexistência> | Média | Alto | <feature flag + monitoramento + rollback rápido> |
| 2 | ... | ... | ... | ... |

## 4. Plano de etapas

### Etapa 1: <nome curto>
**Objetivo:** <o que esta etapa entrega>
**Critério de saída:** <observável e mensurável>
**Risco isolado:** Baixo / Médio / Alto
**Tempo estimado:** <X dias úteis>
**Sub-tarefas:**
- [ ] <tarefa 1>
- [ ] <tarefa 2>
- ...

### Etapa 2: <nome>
...

### Etapa N: <nome — limpeza>
**Objetivo:** Remover código antigo, feature flags, dependências obsoletas.
**Critério de saída:** Zero referências ao módulo/código antigo (`rg "OldName"` retorna vazio).

> **Importante**: cada etapa precisa ser *releasable*. Se a etapa 3 ficar pela metade, o sistema continua funcional na produção.

## 5. Métricas de progresso

Métricas concretas que mostram avanço:

- **Cobertura**: <X% antes → Y% durante → Z% depois>
- **% de tráfego no novo caminho**: <0% → 50% → 100%>
- **Linhas no módulo antigo**: <N → 0>
- **Tempo de build**: <X s → Y s>
- **Tempo de testes**: <X s → Y s>

Reporte semanalmente em retro ou daily.

## 6. Plano de rollback

Para cada etapa, **como reverter**:

| Etapa | Como reverter |
|---|---|
| 1 | <ex.: feature flag em OFF e merge revert> |
| 2 | <ex.: rodar migration de revert; sem perda de dados> |
| ... | ... |

> Se uma etapa não tem rollback claro, **não execute** sem decisão consciente do tech lead.

## 7. Critérios de sucesso

A refactor está **concluído** quando:
- [ ] Todas as etapas com checklist em ✅.
- [ ] Métricas da secção 5 batem o target.
- [ ] Suite de testes verde com cobertura mantida ou melhorada.
- [ ] Documentação actualizada.
- [ ] Equipa fez retrospectiva (lições aprendidas).
- [ ] Código antigo **removido**, não apenas desactivado.

## 8. Comunicação

- **Tech lead aprova plano** antes de começar.
- **Update semanal** em <canal/reunião> com a tabela de métricas.
- **Em caso de risco materializado**: parar, reunião de emergência, decidir rollback ou ajuste de plano.

## 9. Pós-conclusão

- [ ] Retrospectiva da equipa.
- [ ] ADR (se houver decisão arquitetural não documentada).
- [ ] Atualizar onboarding/docs.
- [ ] Encerrar este documento (status: Concluído).
```

---

## 5. Sequência típica de execução

Para qualquer refactor não-trivial:

```
Semana 0:  Diagnóstico + plano + revisão com tech lead + aprovação
Semana 1:  Testes de caracterização (se houver lacuna)
Semana 2:  Etapa 1 — preparação (abstração / facade / router)
Semana 3+: Etapas 2-N em pequenos PRs *mergeable*, com feature flag
Semana N-1: Migração de tráfego (gradual) com observação
Semana N:  Contract — remover código antigo, flags, docs
Semana N+1: Retro e fechamento
```

---

## 6. Métricas que importam

Não confunda "ocupação" com "progresso". O que importa:

| Métrica | Como medir |
|---|---|
| **% de chamadores migrados** | `rg "ApiAntiga\." \| wc -l` em ambos os lados |
| **% de tráfego no novo** | Telemetria/Grafana |
| **Linhas no módulo antigo** | `tokei` ou `cloc` |
| **Cobertura de testes** | Relatório do CI |
| **Bugs introduzidos por refactor** | Tag/label nos issues |
| **Tempo de build/test** | CI |

---

## 7. Sinais de alerta — pare e reavalie

- **PR de refactor cresce >500 linhas** → quebre em sub-PRs.
- **Etapa fica >2 sprints aberta** → escopo errado, divida.
- **Cobertura caiu** durante refactor → você está perdendo a rede de segurança.
- **Equipa para de entregar features** → custo está alto demais; reduzir % capacidade dedicada.
- **Bugs novos começam a aparecer** → testes de caracterização insuficientes.
- **Ninguém usa o caminho novo** → o produto não confia, reavalie.

---

## 8. Padrões a evitar

| Erro | Por quê |
|---|---|
| "Refactor + nova feature no mesmo PR" | Impossível revisar, impossível reverter sem perder a feature |
| Branch de refactor com 2 meses de vida | Conflito infinito; rebases dolorosos |
| Reescrita "do zero" sem operar em paralelo | Big Bang escondido; sistema novo nunca atinge o velho |
| "Vamos só commentar o código antigo por enquanto" | Código zumbi para sempre |
| "Os testes vão atrasar" | Você está pagando a fatura depois com juros (bugs em produção) |
| Sem feature flag em mudança de runtime | Sem rollback rápido |
| Sem dono claro do refactor | "Vai morrer no meio" |
| Métrica única "está pronto?" sem decomposição | Status sempre 70% |

---

## 9. Quando o utilizador tiver pressa

Se ouvir "mas precisamos fazer isso já":

1. Confirme **qual problema imediato** justifica a urgência.
2. Pergunte se um *band-aid* (fix pontual) cobre por agora, e o refactor depois.
3. Se a urgência for real e a equipa pequena, **reduza o escopo** — entregue 30% do refactor que resolve 80% da dor.
4. **Nunca** aceite "pula o teste de caracterização porque é urgente". Isso é onde o bug aparece.

---

## 10. Pós-entrega

- Sugira gerar **ADR** se a refactor envolveu mudança arquitetural relevante (`@adr-decisao-arquitetura`).
- Sugira `@code-review` em pontos críticos do refactor.
- Após conclusão, retrospectiva curta sobre o que funcionou.
