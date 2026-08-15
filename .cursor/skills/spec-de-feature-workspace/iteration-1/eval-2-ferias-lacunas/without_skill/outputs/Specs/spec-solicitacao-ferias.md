# Spec — Formulário de Solicitação de Férias (Portal do Colaborador)

> **Status**: Rascunho com lacunas assumidas — ver secções [2. Perguntas em aberto](#2-perguntas-em-aberto-entrevista-pendente) e [3. Premissas adoptadas](#3-premissas-adoptadas).
> **Autor**: gerado por IA a partir do pedido do utilizador.
> **Data**: 2026-07-14

---

## 1. Contexto e objetivo

O colaborador precisa de solicitar férias pelo Portal do Colaborador. Hoje esse pedido é feito fora do sistema. A feature adiciona um formulário de solicitação com **data de início**, **data de fim** e **observação**, que cria um pedido a ser apreciado pelo RH.

**Fora de escopo desta fatia** (confirmar antes de expandir):

- Tela/fluxo de aprovação do lado do RH (só definimos o contrato/estados que ela consumirá).
- Cálculo de saldo de férias, fracionamento legal (CLT), venda de dias (abono pecuniário).
- Notificações (e-mail/push) — registada como dependência futura.
- Edição de pedido já enviado (apenas cancelamento enquanto pendente, se confirmado).

---

## 2. Perguntas em aberto (entrevista pendente)

O utilizador informou que **não sabe o fluxo de aprovação nem o endpoint**. Estas são as perguntas que seriam feitas antes de fechar a spec; a implementação pode começar com as premissas da secção 3, mas **cada resposta abaixo pode invalidar uma premissa**:

### Fluxo de aprovação

1. Quem aprova o pedido: o gestor direto, o RH, ou ambos em etapas (gestor → RH)?
2. Existe reprovação com justificativa obrigatória? O colaborador pode reenviar após reprovação?
3. O colaborador pode **cancelar** um pedido pendente? E um pedido já aprovado?
4. Há prazo mínimo de antecedência para solicitar (ex.: 30 dias antes do início)?
5. Pedidos sobrepostos (novo pedido com período que cruza um pendente/aprovado) são bloqueados?

### Backend / contrato

6. Já existe API de férias no backend ou o endpoint será criado junto com esta feature?
7. Qual o padrão de rotas do portal (ex.: `/api/v1/...`)? Autenticação é o mesmo token de sessão do portal?
8. De onde vem o saldo de dias disponíveis do colaborador? Precisamos exibi-lo no formulário?
9. Existe integração com sistema de folha/ERP (ex.: o pedido aprovado precisa ser exportado)?

### Regras de negócio

10. Dias corridos ou dias úteis? Feriados contam?
11. Duração mínima/máxima do período (ex.: mínimo 5 dias, máximo 30)?
12. A observação é obrigatória em algum caso (ex.: pedido com menos de X dias de antecedência)?

### UX

13. O colaborador vê uma listagem dos seus pedidos anteriores e respetivos status nesta mesma entrega?
14. Onde a tela entra na navegação do portal (menu, dashboard)?

---

## 3. Premissas adoptadas

Para desbloquear a implementação, assumimos o seguinte. **Cada premissa está marcada no corpo da spec com `[PREMISSA-n]` e deve ser validada com o RH/backend antes do release.**

| # | Premissa | Risco se estiver errada |
|---|---|---|
| P1 | Fluxo de aprovação em etapa única: o RH aprova ou reprova (sem passar pelo gestor). Modelado como máquina de estados simples: `pendente → aprovada \| reprovada`, e `pendente → cancelada` pelo colaborador. | Se houver etapa do gestor, adiciona-se um estado `aguardando-gestor` — o enum de status é extensível, o frontend só exibe o rótulo. |
| P2 | O endpoint não existe e será criado: `POST /api/v1/ferias/solicitacoes` (+ `GET` de listagem e `POST /{id}/cancelamento`). Contrato proposto na secção 6. | Se já existir API, adaptar o *service* do frontend; o formulário e as validações não mudam. |
| P3 | Datas em dias corridos, mínimo 5 e máximo 30 dias por pedido, antecedência mínima de 30 dias. Valores parametrizáveis em constante única (`regras-ferias.ts`) para troca barata. | Ajustar constantes; validações continuam as mesmas. |
| P4 | Observação é opcional, máximo 500 caracteres. | Trivial de ajustar. |
| P5 | Períodos sobrepostos com pedidos `pendente` ou `aprovada` são rejeitados **pelo backend** (fonte da verdade); o frontend apenas exibe o erro retornado. | Nenhum — validação fica onde deve ficar. |
| P6 | A entrega inclui uma listagem simples "Minhas solicitações" na mesma página, acima do formulário, para o colaborador ver o status. | Se for outra entrega, remover a listagem — componente isolado. |

---

## 4. Requisitos funcionais

- **RF1** — O colaborador autenticado acede à página "Solicitação de Férias" no portal.
- **RF2** — O formulário contém: **data de início** (obrigatória), **data de fim** (obrigatória), **observação** (opcional, ≤ 500 caracteres) `[PREMISSA P4]`.
- **RF3** — Validações no cliente (e repetidas no servidor):
  - data de início ≥ hoje + 30 dias `[PREMISSA P3]`;
  - data de fim ≥ data de início;
  - duração entre 5 e 30 dias corridos `[PREMISSA P3]`.
- **RF4** — Ao submeter com sucesso, o pedido é criado com status `pendente` e o colaborador vê confirmação com o resumo do período.
- **RF5** — Erros do servidor (ex.: período sobreposto `[PREMISSA P5]`) são exibidos junto ao formulário, em português brasileiro, sem perder os dados preenchidos.
- **RF6** — O colaborador vê a lista das suas solicitações com período, status e data do pedido `[PREMISSA P6]`.
- **RF7** — O colaborador pode cancelar uma solicitação com status `pendente` `[PREMISSA P1]`.

## 5. Requisitos não-funcionais

- Acessibilidade: campos com `label` associado, erros anunciados via `aria-describedby`/`aria-invalid`, navegação por teclado completa nos date pickers.
- Todas as mensagens visíveis em **português brasileiro**.
- Dupla submissão bloqueada (botão desabilitado + idempotência aceitável no backend).
- Datas trafegam na API em ISO 8601 (`YYYY-MM-DD`), exibidas ao utilizador em `DD/MM/AAAA`.

---

## 6. Contrato de API proposto `[PREMISSA P2]`

> Proposta a validar com o backend. Se já existir endpoint, substituir apenas o *service*.

### Criar solicitação

```
POST /api/v1/ferias/solicitacoes
Authorization: Bearer <token do portal>
```

```json
{
  "dataInicio": "2026-09-01",
  "dataFim": "2026-09-15",
  "observacao": "Viagem em família"
}
```

**201 Created**

```json
{
  "id": "b3e1...",
  "status": "pendente",
  "dataInicio": "2026-09-01",
  "dataFim": "2026-09-15",
  "observacao": "Viagem em família",
  "criadaEm": "2026-07-14T18:00:00Z"
}
```

**Erros**

| HTTP | `codigo` | Situação |
|---|---|---|
| 400 | `PERIODO_INVALIDO` | Datas violam RF3 (validação repetida no servidor) |
| 409 | `PERIODO_SOBREPOSTO` | Cruza pedido `pendente`/`aprovada` existente |
| 422 | `ANTECEDENCIA_INSUFICIENTE` | Início a menos de 30 dias `[PREMISSA P3]` |

Formato de erro: `{ "codigo": "PERIODO_SOBREPOSTO", "mensagem": "Já existe uma solicitação para este período." }`

### Listar minhas solicitações

```
GET /api/v1/ferias/solicitacoes  →  200 [{ id, status, dataInicio, dataFim, observacao, criadaEm }]
```

O backend infere o colaborador pelo token; não passar ID do colaborador na URL (evita IDOR).

### Cancelar solicitação pendente

```
POST /api/v1/ferias/solicitacoes/{id}/cancelamento  →  200 { ..., "status": "cancelada" }
```

**409** `STATUS_NAO_PERMITE_CANCELAMENTO` se já aprovada/reprovada.

### Máquina de estados `[PREMISSA P1]`

```
pendente ──(RH aprova)──→ aprovada
pendente ──(RH reprova)──→ reprovada
pendente ──(colaborador cancela)──→ cancelada
```

O frontend trata `status` como string aberta: valores desconhecidos são exibidos como rótulo neutro, para que a inclusão futura de `aguardando-gestor` não quebre a UI.

---

## 7. Estrutura de frontend sugerida

Assumindo o padrão do portal (Next.js / React / TS — confirmar stack real, pergunta 7):

```
app/(portal)/ferias/
  page.tsx                          # rota "Solicitação de Férias"
  componentes/
    formulario-solicitacao-ferias.tsx
    lista-solicitacoes-ferias.tsx   # [PREMISSA P6]
  servicos/ferias-service.ts        # chamadas HTTP (contrato da secção 6)
  regras-ferias.ts                  # constantes: antecedência, min/max dias [PREMISSA P3]
  tipos.ts                          # SolicitacaoFerias, StatusSolicitacao, NovaSolicitacaoFerias
```

Nomenclatura em português brasileiro conforme convenção do projeto (`AGENTS.md` §1).

---

## 8. Critérios de aceitação (Gherkin)

```gherkin
Funcionalidade: Solicitação de férias pelo portal do colaborador

  Cenário: Solicitação válida é criada com status pendente
    Dado que estou autenticado no portal como colaborador
    E hoje é "14/07/2026"
    Quando preencho data de início "01/09/2026", data de fim "15/09/2026" e observação "Viagem"
    E submeto o formulário
    Então vejo a confirmação "Solicitação enviada"
    E a solicitação aparece na minha lista com status "Pendente"

  Cenário: Data de fim anterior à data de início é bloqueada no cliente
    Quando preencho data de início "10/09/2026" e data de fim "05/09/2026"
    E submeto o formulário
    Então vejo o erro "A data de fim deve ser igual ou posterior à data de início"
    E nenhuma requisição é enviada ao servidor

  Cenário: Antecedência mínima não cumprida  # [PREMISSA P3]
    Dado que hoje é "14/07/2026"
    Quando preencho data de início "20/07/2026" e data de fim "30/07/2026"
    E submeto o formulário
    Então vejo o erro "A solicitação deve ser feita com pelo menos 30 dias de antecedência"

  Cenário: Período sobreposto rejeitado pelo servidor  # [PREMISSA P5]
    Dado que já tenho uma solicitação aprovada de "01/09/2026" a "10/09/2026"
    Quando submeto uma nova solicitação de "05/09/2026" a "20/09/2026"
    Então vejo o erro "Já existe uma solicitação para este período"
    E os campos permanecem preenchidos

  Cenário: Cancelamento de solicitação pendente  # [PREMISSA P1]
    Dado que tenho uma solicitação com status "Pendente"
    Quando clico em "Cancelar" e confirmo
    Então a solicitação passa a exibir o status "Cancelada"

  Cenário: Observação acima do limite  # [PREMISSA P4]
    Quando preencho a observação com 501 caracteres
    Então vejo o erro "A observação deve ter no máximo 500 caracteres"
```

---

## 9. Plano de testes

- **Unidade** (nascem com a lógica, TDD): funções de validação de período em `regras-ferias.ts` — antecedência, duração mínima/máxima, fim ≥ início, limites exatos (30 dias de antecedência cravados, duração exata de 5 e de 30 dias).
- **Componente**: formulário exibe erros de validação, desabilita botão durante submissão, preserva dados após erro 409.
- **E2E (Playwright)**: cenários 1, 4 e 5 do Gherkin, com API mockada ou ambiente de teste.

---

## 10. Riscos e dependências

- **Maior risco**: premissas P1 (fluxo) e P2 (endpoint) — validar com RH e backend **antes** de integrar; o formulário e as validações de data podem ser desenvolvidos em paralelo pois não dependem dessas respostas.
- Dependência futura: notificação ao RH quando um pedido é criado (fora de escopo, secção 1).
- Legislação (CLT, fracionamento) deliberadamente fora desta fatia — confirmar com RH se há validação legal a aplicar já no pedido (pergunta 11).

## 11. Definição de pronto

- [ ] Perguntas da secção 2 respondidas e premissas P1–P6 confirmadas ou corrigidas na spec.
- [ ] Validações de RF3 implementadas com testes de unidade a passar.
- [ ] Cenários Gherkin da secção 8 cobertos (componente/E2E).
- [ ] Textos de UI revisados em português brasileiro; acessibilidade da secção 5 verificada.
- [ ] Contrato da secção 6 acordado com o backend (ou substituído pelo real).
