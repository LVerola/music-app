---
name: adr-decisao-arquitetura
description: Cria Architecture Decision Records (ADRs) em PT-BR seguindo o formato Michael Nygard estendido — contexto, opções consideradas com prós/contras, decisão, consequências (positivas e negativas), riscos, plano de revisão. Use SEMPRE que o utilizador pedir para documentar uma decisão técnica, registrar uma escolha de arquitetura, escrever um ADR, comparar tecnologias para uma decisão, ou pedir @adr-decisao-arquitetura. Também aplique quando descrever uma decisão técnica importante que precisa ser registrada para a equipa.
---

# ADR — Architecture Decision Record

Skill para documentar **decisões arquiteturais importantes** de forma que o "futuro" da equipa entenda **o quê** foi decidido, **por que**, **o que foi considerado e rejeitado**, e **quando revisar**.

## Quando usar

Sempre que houver decisão com **impacto não-trivial** e **alternativas plausíveis**. Exemplos:

- "Vamos usar Postgres ou MongoDB para este serviço?"
- "REST ou GraphQL na API pública?"
- "Vamos adoptar feature flags? Qual ferramenta?"
- "Como autenticar serviços internos?"
- "Onde colocar a fila — RabbitMQ, SQS, Kafka?"
- "Adoptar monorepo ou repositórios separados?"

**Não use** para mudanças triviais, escolhas de biblioteca menor sem trade-off, ou ajustes táticos.

---

## 1. Antes de escrever — colher contexto

ADRs **não inventam** decisões. Capturam decisões já em discussão. Antes de gerar:

1. **Pergunta exacta** que está sendo decidida? (Uma só, atómica.)
2. **Forças em jogo**: requisitos, restrições, dores actuais, custos.
3. **Quem decide**: arquiteto? Tech lead? Equipa? Engenharia + produto?
4. **Quando precisa estar decidido**?
5. **Alternativas em cima da mesa** (no mínimo 2-3 — se há só uma, não é decisão, é proposta).
6. **Critérios de avaliação**: como a equipa vai comparar as alternativas?
7. **O que já foi descartado** e por quê?
8. **Decisão preliminar**, se houver, e quem a defende.

Se o utilizador trouxer só "queremos adoptar X", **pare** e force-o a explicitar pelo menos uma alternativa. ADR sem alternativa é decoração.

---

## 2. Template obrigatório

Salve em `Documentacao/ADRs/<numero>-<slug>.md` (numeração sequencial: `0001`, `0002`...). Se a pasta não existir, crie.

```markdown
# ADR-<NNNN>: <Decisão em uma frase, no infinitivo>

> **Status**: Proposto | Em discussão | Aceito | Rejeitado | Superado por ADR-<X> | Obsoleto
> **Data**: AAAA-MM-DD
> **Decisores**: <papéis ou nomes>
> **Consultados**: <equipas/papéis envolvidos no debate>
> **Informados**: <quem precisa saber, sem ter votado>

---

## 1. Contexto e problema

<2-4 parágrafos descrevendo a situação que motiva a decisão. Inclua:>
- O que está acontecendo agora (estado actual).
- Que dor ou oportunidade desencadeia a decisão.
- Que requisitos / restrições são imutáveis (regulatórios, contratuais, técnicos).
- Que métricas ou efeitos a decisão precisa mover.

> Bom contexto: alguém de fora consegue entender **por que** a equipa está parada para decidir isto **agora**, sem precisar ler outro documento.

## 2. Forças em consideração

Liste explicitamente o que **puxa para um lado** e o que **puxa para outro**:

- **Performance**: <ex.: P95 < 200ms é meta de produto>
- **Custo operacional**: <ex.: orçamento de infra é X/mês>
- **Esforço de migração**: <ex.: 3 dev × 2 sprints é o teto>
- **Maturidade da equipa**: <ex.: ninguém na equipa conhece tecnologia Y>
- **Reversibilidade**: <ex.: depois de adoptar, custa N semanas para sair>
- **Conformidade**: <ex.: LGPD exige dados em região X>
- **Time-to-market**: <ex.: precisamos lançar em 6 semanas>
- **Compatibilidade com plataforma actual**: ...

## 3. Opções consideradas

### Opção A — <nome>

**Descrição** (1-2 parágrafos)

**Prós:**
- ...
- ...

**Contras:**
- ...
- ...

**Custo estimado**: <esforço inicial, esforço de manutenção, infraestrutura, licenças>
**Risco**: <baixo / médio / alto — e por quê>

### Opção B — <nome>

(mesmo formato)

### Opção C — <nome>

(mesmo formato)

> **Pelo menos 2 opções** — preferencialmente 3. Se há só uma, isto não é ADR, é uma proposta unilateral.

## 4. Decisão

**Optamos pela Opção <X>: <nome curto>.**

<1-2 parágrafos explicando o porquê — referenciando as forças da secção 2 e os prós/contras da secção 3. Seja específico:>

- "A opção <X> ganha porque atende ao requisito <Y> com folga, mesmo trazendo <contra Z>, que mitigamos com <plano>."
- Evite frases vagas como "porque é mais moderna" ou "é o padrão de mercado". Se for padrão, **diga onde** isso é evidente.

## 5. Consequências

### 5.1 Positivas

- <ganho concreto 1, idealmente com métrica>
- <ganho concreto 2>
- ...

### 5.2 Negativas / *Trade-offs* aceites

- <perda concreta 1>
- <perda concreta 2 — e como vai ser mitigada>
- ...

### 5.3 Neutras

- <mudanças que vão acontecer sem ser boas/ruins, mas precisam ser planeadas>
- <ex.: equipa vai precisar de treinamento na ferramenta X>

## 6. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| <ex.: latência da ferramenta X > 500ms em pico> | Média | Alto | <plano: cache + circuit breaker; medir em staging> |
| ... | ... | ... | ... |

## 7. Critérios de revisão

Esta decisão deve ser **revista** se/quando:

- <ex.: volume passar de N requisições/segundo>
- <ex.: custo mensal de infra ultrapassar R$ X>
- <ex.: aparecer biblioteca Z que tornar a opção rejeitada viável>
- <ex.: depois de 6 meses de uso, com retrospectiva da equipa>

## 8. Plano de adopção

- [ ] <passo concreto 1 — quem é responsável, prazo>
- [ ] <passo concreto 2>
- [ ] <passo concreto 3>

## 9. Referências

- Issue/ticket de origem: <link>
- Documentação técnica relevante: <links>
- ADRs relacionados: <ADR-NNNN, ADR-NNNN>
- Benchmarks / *spikes* / *POCs* consultados: <links>
- Discussões: <RFC, thread no chat>
```

---

## 3. Como avaliar opções (matriz simples)

Quando o utilizador pedir "compara X vs Y vs Z", monte uma matriz **antes** de decidir. Pesos opcionais (1-5).

| Critério (peso) | Opção A | Opção B | Opção C |
|---|---|---|---|
| Performance (5) | 4 | 5 | 3 |
| Custo operacional (4) | 3 | 2 | 5 |
| Maturidade na equipa (3) | 5 | 1 | 4 |
| Esforço inicial (3) | 4 | 2 | 4 |
| Reversibilidade (2) | 3 | 2 | 5 |
| **Total ponderado** | **<X>** | **<Y>** | **<Z>** |

**Cuidado:** a matriz é **ajuda para pensar**, não decisão automática. Casos com diferença marginal devem ser decididos por **conversa**, não pelo score.

---

## 4. Status — quando usar cada um

| Status | Quando |
|---|---|
| **Proposto** | Rascunho inicial, ainda não foi discutido com decisores |
| **Em discussão** | Aberto a feedback da equipa antes de votar |
| **Aceito** | Decidido. A partir daqui, qualquer mudança gera ADR novo |
| **Rejeitado** | Avaliado e descartado — guarde mesmo assim (futuro pode revisitar) |
| **Superado por ADR-X** | Foi aceito, mas agora há decisão nova substituindo |
| **Obsoleto** | A contexto mudou e a decisão deixou de fazer sentido (mas ninguém substituiu ainda) |

> **Nunca apague um ADR aceito**, mesmo se for revertido. Crie um novo ADR e marque o anterior como `Superado por ADR-<NNNN>`. Histórico é valor.

---

## 5. Boas práticas de escrita

- **Tempo verbal**: a decisão é no presente (`adoptamos`, `usaremos`). Contexto no passado (`tínhamos`, `começou a falhar`).
- **Sem marketing**: evite "moderno", "robusto", "escalável" — substitua por número.
- **Trade-off explícito**: toda decisão tem **algo de mau**. Se a sua secção 5.2 está vazia, releia.
- **Sem religião**: não diga "X é melhor que Y". Diga "X atende melhor a nosso critério A; Y atende melhor a B; priorizamos A porque...".
- **Concisão**: ADR bom cabe em 2-4 páginas. Se passar disso, está fugindo do ponto.
- **Reversível primeiro**: se a decisão é fácil de reverter, diga (e talvez não precise de ADR formal).

---

## 6. Erros comuns

| Erro | Detecção | Correcção |
|---|---|---|
| Uma "opção" só | Secção 3 tem 1 entrada | Forçar **pelo menos 2** alternativas |
| Decisão sem contras | Secção 5.2 vazia | Listar *trade-offs* honestos |
| "Performance melhor" sem número | Texto vago | Substituir por benchmark / SLA |
| Critério inventado pra justificar pré-conclusão | Matriz com 1 critério desproporcional | Pesos calibrados com equipa |
| ADR escrito após implementação como justificação | Datas, contexto retroactivo | Refazer como "Lições aprendidas" ou ADR de revisão |
| Status "Aceito" sem decisores nomeados | Cabeçalho incompleto | Identificar **quem** decidiu |
| Sem plano de revisão (secção 7) | Decisão eternizada | Adicionar gatilhos concretos |

---

## 7. Quando NÃO criar ADR

- Escolha entre bibliotecas equivalentes com custo de troca baixo (`axios` vs `fetch`).
- Convenções de nomenclatura → vão em `AGENTS.md` ou regras `.mdc`.
- Decisões puramente de UI sem impacto técnico → wireframe basta.
- Decisões pessoais de produto (sem dimensão arquitetural) → vão no backlog/épico.

---

## 8. Estrutura do arquivo no repo

```
Documentacao/
└── ADRs/
    ├── 0001-adoptar-postgres-como-bd-primario.md
    ├── 0002-rest-vs-graphql-na-api-publica.md
    ├── 0003-feature-flags-com-launchdarkly.md
    └── ...
```

- Numeração **sequencial e imutável** (não renumere ao apagar — marque obsoleto).
- Slug em PT-BR, *kebab-case*, frase curta.
- Frontmatter / cabeçalho exactamente como o template.

---

## 9. Pós-entrega

- Sugira que o utilizador compartilhe o ADR no canal técnico para feedback antes de mover para "Aceito".
- Se o ADR fizer parte de US, anexe link à US.
- Lembre que ADRs aceitos viram "fonte de verdade" — se uma regra ou *guideline* mudar por causa do ADR, actualize também a regra.
