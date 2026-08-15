---
name: criador-de-skills
description: Cria novas skills do Cursor em PT-BR e melhora skills existentes de forma iterativa. Use SEMPRE que o utilizador pedir para criar uma skill, montar uma skill, escrever um SKILL.md, adicionar uma skill ao seu Cursor, melhorar/iterar uma skill, optimizar a descrição (triggering) de uma skill, ou correr avaliações (evals) sobre uma skill. Também aplica quando ele pedir explicitamente @criador-de-skills.
---

# Criador de Skills

Uma skill para **criar novas skills** e **iterá-las** de forma sistemática.

A ideia, em alto nível:

- Decidir o que a skill deve fazer e como deve fazê-lo.
- Escrever um rascunho da skill.
- Criar alguns *prompts* de teste e correr um agente-com-acesso-à-skill sobre eles.
- Ajudar o utilizador a avaliar os resultados (qualitativa e quantitativamente):
  - Enquanto as execuções correm em background, esboçar avaliações quantitativas (asserções) se ainda não existirem. Explicá-las ao utilizador.
  - Usar `eval-viewer/generate_review.py` para mostrar os resultados em browser e também as métricas quantitativas.
- Reescrever a skill com base no *feedback* do utilizador (e em falhas óbvias detectadas nas métricas).
- Repetir até estar bom.
- Expandir o conjunto de testes e tentar em maior escala.

O teu trabalho ao usar esta skill é perceber onde o utilizador está neste processo e ajudá-lo a avançar. Por exemplo, se ele disser "quero fazer uma skill para X", podes ajudar a refinar o âmbito, escrever um rascunho, definir casos de teste, decidir como avaliar, correr os *prompts* e iterar.

Por outro lado, se ele já trouxer um rascunho, vai directo para a fase de avaliar/iterar.

E claro: se o utilizador disser "não preciso de evals, só vibra comigo", também faz isso. Sê flexível.

Depois da skill estar "boa" (mas a ordem é flexível), também podes correr o **optimizador da descrição** — há um *script* específico para isso (`scripts/run_loop.py`) que melhora o *triggering* da skill.

## Comunicar com o utilizador

Esta skill pode ser usada por pessoas com níveis muito diferentes de familiaridade com termos técnicos. Adapta a comunicação a partir das pistas do diálogo:

- **"avaliação"** e **"benchmark"** já estão no limite — mas costumam ser OK.
- **"JSON"** e **"asserção"** precisam de pistas claras de que o utilizador conhece os termos antes de os usares sem explicação.

Em dúvida, podes definir brevemente um termo. Não trates o utilizador como expert por defeito.

---

## Criar uma skill

### 1) Capturar a intenção

Começa por perceber o que o utilizador quer. A conversa actual já pode ter o *workflow* que ele quer capturar (ex.: "transforma isto numa skill"). Se for esse o caso, extrai dos turnos anteriores: as ferramentas usadas, a sequência de passos, correções que ele fez, formatos de entrada/saída observados. O utilizador valida o que falta.

Perguntas a fazer (sempre):

1. O que esta skill deve permitir o agente fazer?
2. **Quando** deve ela disparar? (que frases/contextos do utilizador)
3. Qual o formato esperado de saída?
4. Faz sentido montar **casos de teste** para verificar a skill?

Skills com saídas objectivamente verificáveis (transformações de ficheiros, extracção de dados, geração de código, passos fixos) **beneficiam de evals**. Skills com saídas subjectivas (estilo de escrita, design visual) muitas vezes **não precisam**. Sugere o padrão certo, mas deixa o utilizador decidir.

### 2) Entrevistar e investigar

Pergunta proactivamente sobre *edge cases*, formatos de entrada/saída, ficheiros de exemplo, critérios de sucesso, dependências. **Não escrevas *prompts* de teste antes de estar resolvido.**

Se houver MCPs úteis (procurar documentação, encontrar skills semelhantes, ver *best practices*), investiga em paralelo via *subagents* se possível, ou inline. Vem preparado para reduzir o esforço do utilizador.

### 3) Escrever o `SKILL.md`

Com base na entrevista, preenche estas componentes:

- **name**: identificador da skill (kebab-case).
- **description**: **quando** disparar e **o que** faz. Este é o mecanismo primário de *triggering* — inclui o que a skill faz **E** contextos específicos em que deve ser usada. Tudo o que é "quando usar" vai aqui, não no corpo. Nota: as skills hoje têm tendência a **sub-disparar** — não serem usadas quando seriam úteis. Compensa isso tornando a descrição **um bocadinho assertiva**. Por exemplo, em vez de *"Como construir um dashboard interno simples para mostrar dados da empresa"*, escreve *"Como construir um dashboard interno simples para mostrar dados da empresa. Usar SEMPRE que o utilizador mencionar dashboards, visualização de dados, métricas internas, ou queira mostrar qualquer tipo de dados da empresa, mesmo que não peça explicitamente um 'dashboard'."*
- **compatibility**: ferramentas/dependências obrigatórias (opcional, raro).
- **o resto da skill**.

### Guia de escrita da skill

#### Anatomia

```
nome-da-skill/
├── SKILL.md (obrigatório)
│   ├── frontmatter YAML (name, description obrigatórios)
│   └── instruções em markdown
└── Recursos adicionais (opcional)
    ├── scripts/    - código executável para tarefas determinísticas/repetitivas
    ├── references/ - documentos carregados em contexto sob demanda
    └── assets/     - ficheiros usados no resultado (templates, ícones, fontes)
```

#### Divulgação progressiva (*progressive disclosure*)

Skills usam três níveis de carga:

1. **Metadata** (name + description) — sempre em contexto (~100 palavras).
2. **Corpo do `SKILL.md`** — em contexto quando a skill dispara (idealmente <500 linhas).
3. **Recursos adicionais** — carregados sob demanda (sem limite; *scripts* podem executar sem serem carregados).

Estes valores são aproximados — podes ir além se precisares.

**Padrões úteis:**
- Mantém o `SKILL.md` abaixo de ~500 linhas. Se estiveres a chegar lá, adiciona uma camada de hierarquia com referências claras para *onde ir a seguir*.
- Referencia ficheiros a partir do `SKILL.md` com orientação sobre **quando** lê-los.
- Para ficheiros grandes de referência (>300 linhas), inclui um índice no topo.

**Organização por domínio:** quando uma skill cobre vários domínios/frameworks, organiza por variante:

```
deploy-na-cloud/
├── SKILL.md (workflow + selecção)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

O agente lê apenas o ficheiro relevante.

#### Princípio da falta de surpresa

As skills **não devem** conter *malware*, código de exploração, nem nada que comprometa segurança. O conteúdo da skill não pode surpreender o utilizador relativamente à sua intenção declarada. Não aceites pedidos para criar skills enganadoras ou desenhadas para facilitar acessos não autorizados, exfiltração de dados ou actividades maliciosas. Coisas como "faz *roleplay* de XYZ" são OK.

#### Padrões de escrita

Prefere o imperativo nas instruções.

**Definir formatos de saída** — exemplo:

```markdown
## Estrutura do relatório
Usar SEMPRE este template exacto:
# [Título]
## Sumário executivo
## Principais descobertas
## Recomendações
```

**Padrão de exemplos** — inclui exemplos. Formato sugerido:

```markdown
## Formato da mensagem de commit
**Exemplo 1:**
Entrada: Adicionada autenticação de utilizadores com JWT
Saída: feat(auth): implementa autenticação baseada em JWT
```

### Estilo de escrita

Sempre que possível, **explica o porquê** ao agente, em vez de despejar `MUST`/`NEVER` em maiúsculas. Os LLMs modernos têm boa *theory of mind* — explicar o motivo dá-lhes margem para generalizar bem. Sê genérico, não super-estreito a um caso particular. Escreve rascunho, deixa arrefecer, releia e melhora.

### Casos de teste

Depois do rascunho, formula 2-3 *prompts* de teste realistas — o tipo de coisa que um utilizador real diria. Partilha com o utilizador: *"Tenho aqui uns casos de teste para experimentar. Estão certos ou queres acrescentar mais?"* Depois corre-os.

Guarda os casos em `evals/evals.json`. **Ainda não escrevas asserções** — só os *prompts*. As asserções desenham-se no passo seguinte enquanto as execuções estão em curso.

```json
{
  "skill_name": "exemplo-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "Prompt da tarefa que o utilizador escreveria",
      "expected_output": "Descrição do resultado esperado",
      "files": []
    }
  ]
}
```

Vê `references/schemas.md` para o esquema completo (incluindo o campo `assertions`/`expectations` que adicionas depois).

## Correr e avaliar casos de teste

Esta secção é uma sequência contínua — não pares a meio. **NÃO** uses `/skill-test` ou outras skills de testing.

Põe os resultados em `<nome-da-skill>-workspace/`, irmão do diretório da skill. Dentro, organiza por iteração (`iteration-1/`, `iteration-2/`, ...) e dentro disso cada caso fica numa pasta (`eval-0/`, `eval-1/`, ...). **Não crias tudo à partida** — só cria diretórios à medida que precisares.

### Passo 1: Disparar todas as execuções no mesmo turno

Para cada caso de teste, dispara **dois** *subagents* no mesmo turno — um **com** a skill, outro **sem** (baseline). É importante: **não dispares todos os *with-skill* primeiro e depois voltes para os *baseline***. Lança tudo de uma vez para terminarem em paralelo.

**Execução com a skill:**

```
Executa esta tarefa:
- Caminho da skill: <caminho-para-a-skill>
- Tarefa: <prompt do eval>
- Ficheiros de entrada: <ficheiros do eval, ou "nenhum">
- Salvar outputs em: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs a salvar: <o que o utilizador quer ver — ex.: "o ficheiro .docx", "o CSV final">
```

**Execução *baseline*** (mesmo *prompt*, mas o *baseline* depende do contexto):

- **Skill nova:** sem skill nenhuma. Mesmo *prompt*, sem caminho de skill. Outputs em `without_skill/outputs/`.
- **A melhorar skill existente:** a versão antiga. Antes de editares, faz *snapshot* (`Copy-Item -Recurse <skill-path> <workspace>/skill-snapshot/`) e aponta o *subagent baseline* para o *snapshot*. Outputs em `old_skill/outputs/`.

Escreve um `eval_metadata.json` para cada caso (com `assertions` ainda vazias). Dá um **nome descritivo** a cada *eval* baseado no que está a testar — não só `eval-0`. Usa esse nome para o diretório também. Se esta iteração introduzir *evals* novos ou modificados, cria estes ficheiros para cada novo `eval-<...>/`.

```json
{
  "eval_id": 0,
  "eval_name": "nome-descritivo",
  "prompt": "Prompt da tarefa do utilizador",
  "assertions": []
}
```

### Passo 2: Enquanto correm, esboçar as asserções

Não fiques só à espera — usa este tempo. Esboça asserções **quantitativas** para cada caso e explica-as ao utilizador. Se já existirem em `evals/evals.json`, revê-as e explica o que verificam.

**Boas asserções:**

- São objectivamente verificáveis.
- Têm nomes descritivos — lê-se no *viewer* e percebe-se imediatamente o que cada uma testa.
- Skills subjectivas (estilo de escrita, qualidade de design) avaliam-se melhor **qualitativamente** — não force asserções sobre coisas que precisam de juízo humano.

Actualiza os `eval_metadata.json` e o `evals/evals.json` com as asserções já desenhadas. Explica ao utilizador o que vai ver no *viewer* — outputs qualitativos **e** *benchmark* quantitativo.

### Passo 3: Quando os runs completam, capturar dados de timing

Quando cada *subagent* termina, recebes uma notificação com `total_tokens` e `duration_ms`. Guarda imediatamente esses dados em `timing.json` no diretório do *run*:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

Esta é a **única oportunidade** de capturar isto — chega via notificação e não fica persistido em mais lado nenhum. Processa cada notificação à medida que chega; não tentes acumular.

### Passo 4: *Grading*, agregação e abrir o *viewer*

Quando todos os *runs* terminam:

1. **Avaliar cada *run*** — *spawnar* um *subagent grader* (ou avaliar inline) que lê `agents/grader.md` e avalia cada asserção contra os *outputs*. Guarda os resultados em `grading.json` no diretório do *run*. O array `expectations` no `grading.json` **deve** usar os campos `text`, `passed`, `evidence` (não `name`/`met`/`details` ou variantes) — o *viewer* depende destes nomes. Para asserções que podem ser verificadas programaticamente, **escreve um script** em vez de avaliares à mão — scripts são mais rápidos, mais fiáveis, e reaproveitáveis entre iterações.

2. **Agregar para benchmark** — corre o script de agregação a partir do diretório da skill:

   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <nome>
   ```

   Produz `benchmark.json` e `benchmark.md` com taxa de aprovação, tempo e *tokens* por configuração, com média ± desvio padrão e *delta*. Se gerares `benchmark.json` manualmente, vê `references/schemas.md` para o esquema exacto. **Põe sempre a versão *with_skill* antes da *baseline* correspondente.**

3. **Passagem de analista** — lê o *benchmark* e identifica padrões que as estatísticas agregadas escondem. Vê `agents/analyzer.md` (secção "Analisar resultados de *benchmark*") — coisas como asserções que passam sempre (não discriminam), *evals* com alta variância (provavelmente *flaky*) e *trade-offs* entre tempo/tokens e qualidade.

4. **Abrir o *viewer*** com dados qualitativos e quantitativos:

   ```bash
   nohup python <caminho-criador-de-skills>/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "minha-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```

   Para iteração 2+, passa também `--previous-workspace <workspace>/iteration-<N-1>`.

   **Ambientes sem display:** se `webbrowser.open()` não estiver disponível ou não houver *display*, usa `--static <output_path>` para gerar um ficheiro HTML standalone em vez de servidor. O *feedback* é descarregado como `feedback.json` quando o utilizador clica em "Submit All Reviews". Depois copia esse `feedback.json` para o diretório do *workspace* para a próxima iteração o ler.

   Nota: usa sempre `generate_review.py` para criar o *viewer* — não escrevas HTML à mão.

5. **Diz ao utilizador**, em PT, algo do tipo: *"Abri os resultados no teu browser. Tens dois separadores — 'Outputs' permite navegar pelos casos de teste e deixar comentários; 'Benchmark' mostra a comparação quantitativa. Quando terminares, volta aqui e diz."*

### O que o utilizador vê no *viewer*

Separador **Outputs**, um caso de cada vez:

- **Prompt**: a tarefa que foi dada.
- **Output**: os ficheiros que a skill produziu, renderizados *inline* sempre que possível.
- **Previous Output** (iteração 2+): secção recolhida com o *output* da iteração anterior.
- **Formal Grades** (se o *grading* foi feito): secção recolhida com pass/fail das asserções.
- **Feedback**: uma caixa de texto que auto-grava enquanto o utilizador escreve.
- **Previous Feedback** (iteração 2+): os comentários dele da iteração anterior, mostrados por baixo da caixa.

Separador **Benchmark**: resumo estatístico — *pass rates*, tempo, *tokens* por configuração, *breakdown* por *eval* e observações do analista.

Navegação via *prev/next* ou setas. Quando termina, clica em "Submit All Reviews" e o *feedback* é gravado em `feedback.json`.

### Passo 5: Ler o feedback

Quando o utilizador disser que terminou, lê `feedback.json`:

```json
{
  "reviews": [
    {"run_id": "eval-0-with_skill", "feedback": "o gráfico não tem rótulos nos eixos", "timestamp": "..."},
    {"run_id": "eval-1-with_skill", "feedback": "", "timestamp": "..."},
    {"run_id": "eval-2-with_skill", "feedback": "perfeito, gostei muito", "timestamp": "..."}
  ],
  "status": "complete"
}
```

*Feedback* vazio significa "ficou bom". Concentra as melhorias nos casos onde o utilizador apontou problemas específicos.

Mata o servidor do *viewer* quando acabares:

```bash
kill $VIEWER_PID 2>/dev/null
```

(No PowerShell: `Stop-Process -Id $VIEWER_PID -Force -ErrorAction SilentlyContinue`.)

---

## Melhorar a skill

O coração do *loop*. Já corre-este os casos, o utilizador revê os resultados e agora vais melhorar.

### Como pensar nas melhorias

1. **Generaliza a partir do feedback.** O objectivo é criar skills usadas milhões de vezes, com muitos *prompts* diferentes. Aqui itera-se sobre uns poucos exemplos porque é rápido para o utilizador avaliar. Mas se a skill **só** funcionar para esses exemplos, é inútil. Em vez de mudanças *fiddly* específicas, ou `MUSTs` opressivos, tenta novas metáforas, novos padrões de trabalho. É barato experimentar.

2. **Mantém o prompt enxuto.** Tira o que não estiver a contribuir. Lê **transcripts**, não só os *outputs* finais — se a skill está a fazer o modelo desperdiçar tempo em coisas improdutivas, corta as partes da skill que causam isso e vê o que acontece.

3. **Explica o porquê.** Tenta sempre explicar **porque** estás a pedir cada coisa. Hoje os LLMs são *smart*. Têm boa *theory of mind* e, com um bom *harness*, vão além de seguir instruções à letra. Mesmo se o feedback for terso ou frustrado, tenta entender o que o utilizador quer realmente. Se te apanhas a escrever `SEMPRE` ou `NUNCA` em maiúsculas, ou a usar estruturas super-rígidas, é um *yellow flag* — reformula e explica o porquê.

4. **Procura trabalho repetido entre casos.** Lê os *transcripts*. Se os *subagents* escreveram independentemente *helpers* parecidos, ou tomaram o mesmo caminho multi-passo, **escreve esse script uma vez**, põe em `scripts/`, e diz à skill para usar. Poupa cada execução futura de reinventar a roda.

Tira o teu tempo. Escreve um rascunho da revisão, deixa arrefecer, melhora. Entra na cabeça do utilizador e percebe o que ele quer.

### O *loop* de iteração

Depois de melhorar:

1. Aplica as melhorias à skill.
2. Recorre todos os casos para um novo `iteration-<N+1>/`, incluindo *baselines*. Se a skill é nova, o *baseline* é sempre `without_skill` (sem skill) — fica constante entre iterações. Se estás a melhorar uma existente, usa o teu juízo: a versão original ou a iteração anterior.
3. Abre o *viewer* com `--previous-workspace` para a iteração anterior.
4. Espera o utilizador rever e dizer "terminei".
5. Lê o novo *feedback*, melhora, repete.

Continua até:

- O utilizador dizer que está feliz.
- O *feedback* estar todo vazio.
- Não estares a fazer progresso significativo.

---

## Avançado: Comparação cega

Para casos mais rigorosos (ex.: "a versão nova é mesmo melhor?"), há um sistema de **comparação cega**. Lê `agents/comparator.md` e `agents/analyzer.md`. A ideia: dá os dois *outputs* a um agente independente sem dizer qual é qual e deixa-o julgar. Depois analisa porque o vencedor venceu.

É opcional, precisa de *subagents*, e a maioria dos utilizadores não precisa. O *loop* humano costuma chegar.

---

## Optimização da descrição

A descrição (frontmatter) é o que decide se o agente invoca a skill. Depois de criar/melhorar uma skill, **oferece** optimizar a descrição.

### Passo 1: Gerar *queries* de teste de *triggering*

Cria 20 *queries* — mistura de *should-trigger* e *should-not-trigger*. Formato:

```json
[
  {"query": "prompt do utilizador", "should_trigger": true},
  {"query": "outro prompt", "should_trigger": false}
]
```

As *queries* têm de ser **realistas** — coisas que um utilizador real de Cursor escreveria. Não pedidos abstractos, mas concretos: caminhos de ficheiro, contexto pessoal (cargo do utilizador, situação), nomes de colunas e valores, nomes de empresas, URLs. Um bocadinho de história. Alguns em *lowercase*, abreviações, *typos*, fala casual. Diferentes comprimentos. Foco em casos-limite.

**Mau:** `"Format this data"`, `"Extrair texto de PDF"`.
**Bom:** *"ok a minha chefe acabou de me mandar um xlsx (está em Downloads, qualquer coisa como 'Q4 vendas final FINAL v2.xlsx') e quer que eu acrescente uma coluna com a margem de lucro em %. A receita está na coluna C e o custo na D, acho eu"*.

Para **should-trigger** (8-10): cobertura — diferentes formulações da mesma intenção (formais, casuais). Casos onde o utilizador não nomeia explicitamente a skill mas precisa dela. Casos pouco comuns. Casos onde compete com outra skill mas devia ganhar.

Para **should-not-trigger** (8-10): os mais valiosos são os **near-misses** — *queries* que partilham palavras-chave mas precisam de outra coisa. Domínios adjacentes, frases ambíguas onde um *match* simplista dispararia mas não deve, casos onde tangencia o que a skill faz mas outra ferramenta encaixa melhor.

**A evitar:** não tornes os *should-not-trigger* obviamente irrelevantes. "Escreve uma função fibonacci" como teste negativo de uma skill de PDF é demasiado fácil — não testa nada.

### Passo 2: Rever com o utilizador

Apresenta o conjunto ao utilizador usando o template HTML:

1. Lê o template `assets/eval_review.html`.
2. Substitui os *placeholders*:
   - `__EVAL_DATA_PLACEHOLDER__` → o array JSON de *evals* (sem aspas — é atribuído a uma variável JS).
   - `__SKILL_NAME_PLACEHOLDER__` → nome da skill.
   - `__SKILL_DESCRIPTION_PLACEHOLDER__` → descrição actual.
3. Grava como `eval_review_<nome>.html` num diretório temporário e abre no browser.
4. O utilizador edita *queries*, alterna *should-trigger*, adiciona/remove entradas, e clica "Export Eval Set".
5. O ficheiro é descarregado para a pasta *Downloads* — confirma a versão mais recente.

Este passo importa — *queries* más → descrição má.

### Passo 3: Correr o *loop* de optimização

Diz ao utilizador: *"Isto demora um pouco. Vou correr em background e ir verificando."*

Guarda o conjunto no *workspace* e corre em background:

```bash
python -m scripts.run_loop \
  --eval-set <path-para-trigger-eval.json> \
  --skill-path <path-para-skill> \
  --model <model-id-desta-sessão> \
  --max-iterations 5 \
  --verbose
```

Usa o `model-id` da sessão actual (o que está a alimentar o assistente neste momento) para que o teste de *triggering* corresponda ao que o utilizador experiencia.

Enquanto corre, vai verificando o *output* periodicamente e dá updates de iteração e *scores*.

Este script lida com tudo: divide o conjunto em 60% treino / 40% teste, avalia a descrição actual (3 vezes por *query* para fiabilidade), chama o agente para propor melhorias com base nas falhas, e re-avalia em treino + teste, até 5 iterações. No fim abre um relatório HTML e devolve JSON com `best_description` — escolhida pelo *score* de **teste** (não treino) para evitar *overfit*.

### Como funciona o *triggering*

O agente decide consultar uma skill com base na descrição. Importante: skills **não disparam** para tarefas triviais. *Queries* como "lê este PDF" podem não disparar uma skill mesmo com descrição perfeita, porque o agente resolve directamente. *Queries* complexas, multi-passo, especializadas disparam de forma fiável quando a descrição encaixa.

Logo, as tuas *queries* de teste têm de ser **substanciais** — caso contrário não testam nada.

### Passo 4: Aplicar o resultado

Pega `best_description` do JSON e actualiza o `SKILL.md`. Mostra ao utilizador antes/depois e reporta os *scores*.

---

## Empacotar e apresentar (opcional)

Se tiveres acesso a uma ferramenta `present_files`, empacota e apresenta:

```bash
python -m scripts.package_skill <path/para/skill>
```

Aponta o utilizador para o ficheiro `.skill` resultante para instalar.

---

## Instruções específicas para Claude.ai

Em Claude.ai, o *workflow* é o mesmo (rascunho → testar → rever → melhorar → repetir), mas Claude.ai não tem *subagents*, então alguns mecanismos mudam:

- **Correr testes**: sem *subagents*, sem paralelismo. Para cada caso, lê o `SKILL.md` e segue as instruções para resolver o *prompt* tu próprio. Um caso de cada vez. Salta os *baselines* — usa a skill para fazer a tarefa.
- **Rever**: se não conseguires abrir browser, **salta o *viewer***. Apresenta os resultados directamente na conversa. Para cada caso, mostra *prompt* + *output*. Se o output for um ficheiro (.docx, .xlsx), grava no *filesystem* e diz onde está. Pede feedback inline.
- **Benchmark**: salta — depende de *baselines*.
- **Loop**: igual, sem *viewer*.
- **Optimização da descrição**: precisa do CLI `claude -p`, só disponível em Claude Code. Salta.
- **Comparação cega**: precisa de *subagents*. Salta.
- **Empacotar**: funciona com Python + *filesystem*.
- **Actualizar skill existente**: o utilizador pode estar a pedir update, não criação. Nesse caso:
  - **Preserva o nome original.** Anota o diretório e o campo `name` — usa-os sem mudar.
  - **Copia para um local com permissão de escrita antes de editar.** O *path* instalado pode ser *read-only*. Copia para `/tmp/nome-skill/`, edita lá, empacota de lá.
  - **Se empacotares manualmente, *stage* primeiro em `/tmp/`** e depois copia para o destino.

---

## Instruções específicas para Cursor (Windows / PowerShell)

Diferenças relevantes:

- Comandos em background usam `Start-Job` ou `Start-Process` em vez de `nohup ... &`.
- `Copy-Item -Recurse` em vez de `cp -r`.
- `Get-ChildItem` em vez de `ls`.
- `Stop-Process -Id $pid` em vez de `kill $pid`.

Para correr o *viewer* sem servidor (modo estático):

```powershell
python <caminho-criador-de-skills>\eval-viewer\generate_review.py `
  <workspace>\iteration-N `
  --skill-name "minha-skill" `
  --benchmark <workspace>\iteration-N\benchmark.json `
  --static <workspace>\iteration-N\review.html
```

Depois abre `review.html` directamente.

---

## Ficheiros de referência

`agents/` — instruções para *subagents* especializados. Lê quando precisares de *spawnar* o respectivo *subagent*:

- `agents/grader.md` — como avaliar asserções contra *outputs*.
- `agents/comparator.md` — como fazer comparação cega entre dois *outputs*.
- `agents/analyzer.md` — como analisar porque uma versão ganhou.

`references/`:

- `references/schemas.md` — estruturas JSON: `evals.json`, `grading.json`, `benchmark.json`, etc.

---

Repetindo o *loop* central, para ficar na cabeça:

- Descobrir o que a skill é.
- Esboçar ou editar a skill.
- Correr o agente-com-acesso-à-skill nos *prompts* de teste.
- Avaliar com o utilizador:
  - Criar `benchmark.json` e correr `eval-viewer/generate_review.py` para o utilizador rever.
  - Correr avaliações quantitativas.
- Repetir até estar bom.
- Empacotar a skill final e entregar.

Cria *todos* na tua lista para não esqueceres. Em ambientes cowork/headless, coloca explicitamente *"Criar evals JSON e correr `eval-viewer/generate_review.py` para o humano rever"* na *todo list* para garantir que acontece.

Boa sorte.
