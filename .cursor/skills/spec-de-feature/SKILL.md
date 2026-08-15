---
name: spec-de-feature
description: Entrevista o usuário sobre uma feature nova (frontend ou backend) e gera uma spec em markdown (Specs/SPEC-<slug>.md) pronta para guiar uma IA na implementação — contexto, requisitos com Gherkin, contratos técnicos, fluxo de UX, fora de escopo, plano de implementação passo a passo e estratégia de testes. Use SEMPRE que o usuário pedir para criar uma spec, especificação, "spec para IA", documento de requisitos de uma feature/tela/endpoint antes de implementar; quando disser "quero especificar", "monta a spec", "prepara o contexto para a IA implementar", ou pedir @spec-de-feature.
---

# Spec de Feature (para IA)

Skill para transformar uma ideia de feature — de frontend ou de backend — numa **spec em markdown** completa o suficiente para outra sessão de IA implementar sem voltar a perguntar o essencial. O produto final é um arquivo `Specs/SPEC-<slug>.md`.

A spec é um **contrato de intenção**: quem a lê deve conseguir implementar a feature certa mesmo sem acesso a esta conversa. Otimize para remover ambiguidade, não para volume de texto.

## Quando aplicar

- "Quero especificar a tela de relatórios antes de mandar a IA implementar".
- "Monta uma spec para o endpoint de exportação de pedidos".
- "Prepara um documento de requisitos dessa feature para eu usar noutro chat".

---

## 1. Fase de entrevista — obrigatória

**Não escreva a spec de primeira.** O valor desta skill está em extrair do usuário o que ele ainda não disse. Entreviste em 1–2 rondas curtas (máx. ~7 perguntas por ronda); pergunte só o que não conseguir inferir do pedido ou do código do projeto.

**Espere as respostas do usuário** antes de gerar o arquivo — não assuma respostas nem preencha lacunas com suposições silenciosas. Se o usuário disser que já tem tudo definido e pedir formalização rápida, faça no máximo 1–2 perguntas sobre lacunas reais e avance.

Antes de perguntar, **leia o que o usuário já trouxe** (US, issue, mockup, mensagem) e **investigue o repositório**: tipos, services, componentes, endpoints e convenções existentes respondem a muitas perguntas sozinhos — e a spec deve referenciá-los (ex.: "reutilizar `<DataTable>` de `components/ui/`").

### Perguntas-base (adapte ao caso)

**Sempre:**

1. **Problema e objetivo** — que dor do usuário esta feature resolve? Como sabemos que ficou pronta e certa?
2. **Ator** — quem usa? Há papéis/permissões diferentes?
3. **Escopo** — o que fica explicitamente de fora desta entrega?
4. **Regras de negócio** — validações, limites, cálculos, casos especiais ("e se já existir?", "e se estiver vazio?").
5. **Dependências** — a feature depende de endpoint/tabela/serviço que ainda não existe?

**Se for frontend (tela/fluxo):**

6. Rota, ponto de entrada (menu? botão? deep link?) e navegação de saída.
7. Dados exibidos e origem (endpoint + contrato); campos de formulário e validações.
8. Estados da tela: loading, erro, vazio, sucesso — e o que cada um mostra.
9. Responsividade/acessibilidade com requisito explícito?

**Se for backend (endpoint/use case):**

6. Contrato HTTP — método, rota, body, response, códigos de erro por cenário.
7. Persistência — entidade nova ou existente? Migration?
8. Efeitos colaterais — eventos, notificações, integrações externas.
9. Idempotência, concorrência, volume esperado.

Se o usuário não souber responder a algo, **registre a dúvida na spec** (seção "Questões em aberto") em vez de inventar uma resposta. Uma spec honesta sobre o que não se sabe vale mais que uma spec falsamente completa.

---

## 2. Estrutura da spec

Grave em `Specs/SPEC-<slug>.md` (crie a pasta `Specs/` na raiz do projeto se não existir; slug em kebab-case, ex.: `SPEC-exportacao-pedidos.md`). Use SEMPRE este template:

```markdown
# SPEC — <Nome da feature>

> **Alvo:** frontend | backend | fullstack
> **Data:** <AAAA-MM-DD>
> **Situação:** rascunho | aprovada

## 1. Contexto e objetivo

<Que problema resolve, para quem, e como se mede sucesso. 2–4 parágrafos no máximo.>

## 2. Requisitos funcionais

<Lista numerada RF-01, RF-02... Cada requisito é uma frase verificável.>

### Critérios de aceitação (Gherkin)

<Cenários Given/When/Then em PT-BR — caminho feliz, casos limite e erros.
Um bloco por cenário, com nome descritivo.>

## 3. Contratos técnicos

<O que a IA implementadora precisa para não inventar interfaces:
- Backend: método + rota, request/response em JSON de exemplo, códigos de status por cenário, modelo de dados/migration.
- Frontend: rota da página, endpoint(s) consumidos com contrato, tipos/DTOs, componentes existentes a reutilizar (com caminho no repo).>

## 4. Fluxo de UX e estados

<Só quando há UI. Passo a passo da interação do usuário
+ tabela de estados: loading / erro / vazio / sucesso — o que cada um exibe.
Textos de UI em PT-BR já definidos aqui (labels, mensagens de erro, botões).>

## 5. Fora de escopo e restrições

<O que NÃO fazer nesta entrega (evita a IA "melhorar" além do pedido)
+ restrições técnicas: stack obrigatória, convenções do repo, performance, segurança.>

## 6. Plano de implementação

<Sequência de passos concretos e ordenados que a IA deve seguir,
cada um com os arquivos a criar/alterar (caminhos reais do repo).
Siga a ordem das skills de feature do projeto quando aplicável
(tipos → service → domínio → UI/endpoint → testes).>

## 7. Estratégia de testes

<Que testes a implementação deve entregar: unidade (quais regras),
integração (quais cenários), E2E (qual fluxo crítico). TDD quando houver
regra de negócio nova — teste nasce antes do código.>

## 8. Questões em aberto

<Dúvidas não resolvidas na entrevista, cada uma com dono/decisor.
Se vazio, escreva "Nenhuma".>
```

### Regras de qualidade da spec

- **Verificável > vago.** "O filtro devolve resultados em menos de 2s para 10k registros" em vez de "deve ser rápido".
- **Contratos com exemplos reais.** JSON de request/response de exemplo vale mais que descrição em prosa.
- **Referencie o código existente** com caminhos reais (`src/services/...`), para a IA reutilizar em vez de duplicar.
- **Aponte as skills/regras do projeto** que a implementação deve seguir (ex.: "seguir @feature-frontend-completa") — a spec não repete convenções que já estão nas regras.
- **Textos de UI decididos na spec**, não delegados à IA (evita labels inventadas fora do tom do produto).
- Escreva a spec inteira em **português brasileiro** (ver `AGENTS.md` §1). Sem português europeu e sem inglês de prosa.

---

## 3. Fecho

1. Apresente um resumo da spec (5–8 linhas) e o caminho do arquivo.
2. Pergunte se o usuário aprova ou quer ajustar; ao aprovar, mude `Situação` para `aprovada`.
3. Sugira o próximo passo: implementar com `@feature-frontend-completa`, `@feature-backend-completa` ou `@feature-mobile-completa` conforme o alvo, anexando a spec.

## Padrões a evitar

| Anti-padrão | Por quê |
|---|---|
| Escrever a spec sem entrevistar | O objetivo da skill é extrair o que o usuário ainda não disse |
| Requisito não verificável ("deve ser intuitivo") | A IA implementadora não tem como cumprir nem testar |
| Inventar contrato de endpoint que não foi confirmado | A implementação nasce errada; registre como questão em aberto |
| Spec com >1 feature | Uma spec por fatia entregável; divida épicos |
| Copiar convenções das regras do repo para dentro da spec | Duplicação que desatualiza; referencie a regra/skill |
