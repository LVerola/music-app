# Spec de Feature — Extrato de Pontos do Programa de Fidelidade

- **Status**: Rascunho aprovado com pressupostos (utilizador indisponível para entrevista; ver §1)
- **Data**: 2026-07-14
- **Autor**: Agente (entrevista simulada)
- **Stack**: Backend .NET / ASP.NET Core / EF Core / PostgreSQL · Frontend Next.js / React / TypeScript / Tailwind
- **Tipo**: Fatia vertical (endpoint novo + tela nova)

---

## 1. Entrevista — perguntas e respostas assumidas

O utilizador não estava disponível para responder. Abaixo, as perguntas que seriam feitas, a resposta assumida e o racional. **Cada pressuposto deve ser validado antes ou durante a implementação**; os de maior risco estão marcados com ⚠️.

| # | Pergunta | Resposta assumida (pressuposto) | Racional |
|---|---|---|---|
| 1 | Já existe modelo de dados de pontos (tabela de movimentos ou só saldo agregado)? | ⚠️ Existe uma tabela de movimentos (`movimentos_pontos`) com crédito/débito por transação; se não existir, criá-la nesta feature. | O pedido menciona "lista de movimentos", o que exige registo transacional, não apenas saldo. |
| 2 | O saldo exibido em cada linha é o saldo **após** o movimento (extrato bancário) ou o saldo atual repetido? | Saldo acumulado após cada movimento, como num extrato bancário. | É o padrão de UX de "extrato" e o que "com data, descrição e saldo" sugere. |
| 3 | O saldo por linha é persistido ou calculado? | ⚠️ Calculado no backend via *window function* (`SUM ... OVER`), não persistido. | Evita inconsistência por estornos/ajustes retroativos; Postgres resolve bem. |
| 4 | Precisa de paginação? Qual o volume esperado? | Sim, paginação por página/tamanho (`pagina`, `tamanhoPagina`, padrão 20, máx. 100). Volume estimado: dezenas a centenas de movimentos por cliente. | Lista potencialmente crescente; paginação offset é suficiente para este volume. |
| 5 | Precisa de filtros (período, tipo ganho/gasto)? | Fora do escopo da v1. Ordenação fixa: mais recente primeiro. | Escopo mínimo pedido: "vê a lista de movimentos". Filtros ficam como evolução. |
| 6 | Pontos expiram? O extrato mostra expiração? | ⚠️ Expiração existe como conceito futuro, mas **fora do escopo da v1**. O modelo prevê o tipo de movimento `Expiracao` para não quebrar depois. | Não mencionado no pedido; modelar o enum aberto custa quase nada. |
| 7 | Como o cliente é identificado? | Utilizador autenticado via JWT já existente; o `clienteId` vem do *claim* do token, **nunca** de parâmetro da rota/query. | "Cliente logado" no pedido; evitar IDOR (acesso ao extrato de outro cliente). |
| 8 | O endpoint devolve também o saldo total atual? | Sim, no corpo da resposta (`saldoAtual`), para o cabeçalho da tela. | Evita segunda chamada; a tela de extrato tipicamente exibe o saldo no topo. |
| 9 | Onde a tela entra na navegação? | Rota `app/fidelidade/extrato` (área autenticada), acessível a partir do menu/perfil do cliente. | Convenção kebab-case em PT do projeto. |
| 10 | Formato de data e idioma? | Interface em português brasileiro; datas `dd/MM/yyyy HH:mm` no fuso do cliente; API devolve ISO 8601 UTC. | Regra de idioma do projeto; separação apresentação vs. transporte. |
| 11 | Estados de UI exigidos? | Loading (skeleton), erro (com retry), vazio ("Ainda não tens movimentos"), lista com paginação ("carregar mais"). | Padrão do projeto para listagens. |
| 12 | Quem escreve os movimentos (ganho/gasto)? | ⚠️ Fora do escopo — esta feature é **somente leitura**. Assume-se que outro fluxo (compras/resgates) já grava ou gravará os movimentos. | O pedido é só a tela de extrato + endpoint de consulta. |

---

## 2. Objetivo e User Story

Dar ao cliente autenticado visibilidade do histórico do seu saldo de pontos de fidelidade.

> **Como** cliente autenticado do programa de fidelidade,
> **quero** ver o extrato dos meus pontos (ganhos e gastos) com data, descrição e saldo após cada movimento,
> **para** entender como o meu saldo atual foi formado e confiar no programa.

### Fora do escopo (v1)

- Filtros por período ou tipo de movimento.
- Expiração de pontos (apenas previsto no enum).
- Exportação (PDF/CSV).
- Escrita de movimentos (acúmulo/resgate) — feature somente leitura.
- Notificações de movimentos.

---

## 3. Critérios de aceitação (Gherkin)

```gherkin
Funcionalidade: Extrato de pontos do programa de fidelidade

  Contexto:
    Dado que estou autenticado como cliente do programa de fidelidade

  Cenário: Ver extrato com movimentos
    Dado que tenho movimentos de pontos registados
    Quando acedo à tela de extrato de pontos
    Então vejo o meu saldo atual de pontos no topo
    E vejo a lista de movimentos ordenada do mais recente para o mais antigo
    E cada movimento exibe data, descrição, quantidade de pontos (com sinal) e saldo após o movimento

  Cenário: Extrato vazio
    Dado que não tenho nenhum movimento de pontos
    Quando acedo à tela de extrato de pontos
    Então vejo o saldo atual igual a 0
    E vejo a mensagem "Ainda não tens movimentos de pontos"

  Cenário: Paginação
    Dado que tenho mais de 20 movimentos
    Quando acedo à tela de extrato de pontos
    Então vejo os 20 movimentos mais recentes
    E ao acionar "Carregar mais" vejo os 20 seguintes acrescentados à lista

  Cenário: Falha ao carregar
    Dado que o serviço de extrato está indisponível
    Quando acedo à tela de extrato de pontos
    Então vejo uma mensagem de erro em português brasileiro
    E vejo uma ação "Tentar novamente" que refaz a chamada

  Cenário: Acesso não autenticado
    Dado que não estou autenticado
    Quando tento aceder à tela ou ao endpoint de extrato
    Então sou redirecionado para o login (tela) ou recebo 401 (endpoint)

  Cenário: Isolamento entre clientes
    Dado que estou autenticado como cliente A
    Quando consulto o extrato
    Então recebo apenas movimentos do cliente A, mesmo que manipule parâmetros da requisição
```

---

## 4. Contrato de API (backend .NET)

### `GET /api/fidelidade/extrato`

- **Auth**: obrigatória (JWT Bearer). `clienteId` extraído do claim do token — não há parâmetro de cliente.
- **Query params**:

| Parâmetro | Tipo | Padrão | Regras |
|---|---|---|---|
| `pagina` | int | 1 | ≥ 1; inválido → 400 |
| `tamanhoPagina` | int | 20 | 1–100; inválido → 400 |

- **Resposta 200**:

```json
{
  "saldoAtual": 1250,
  "pagina": 1,
  "tamanhoPagina": 20,
  "totalItens": 47,
  "totalPaginas": 3,
  "itens": [
    {
      "id": "b1a4...",
      "dataUtc": "2026-07-10T18:32:00Z",
      "descricao": "Compra #4821",
      "tipo": "Ganho",
      "pontos": 150,
      "saldoApos": 1250
    },
    {
      "id": "9c2e...",
      "dataUtc": "2026-07-02T14:05:00Z",
      "descricao": "Resgate de voucher",
      "tipo": "Gasto",
      "pontos": -300,
      "saldoApos": 1100
    }
  ]
}
```

- **Convenções**: `pontos` já vem com sinal (crédito positivo, débito negativo); `tipo` ∈ `Ganho | Gasto | Expiracao | Ajuste`; datas em ISO 8601 UTC.
- **Erros**: `401` sem/inválido token; `400` (ProblemDetails) parâmetros de paginação inválidos; `500` genérico sem detalhes internos.
- **Cliente sem movimentos**: `200` com `itens: []` e `saldoAtual: 0` (não é erro).

---

## 5. Modelo de dados

Tabela `movimentos_pontos` (criar via migration EF Core se ainda não existir — validar pressuposto #1):

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `cliente_id` | `uuid` NOT NULL | FK para clientes |
| `data_utc` | `timestamptz` NOT NULL | momento do movimento |
| `descricao` | `varchar(200)` NOT NULL | ex.: "Compra #4821" |
| `tipo` | `smallint` NOT NULL | enum `TipoMovimentoPontos` |
| `pontos` | `int` NOT NULL | com sinal; `<> 0` (check constraint) |

- **Índice**: `(cliente_id, data_utc DESC, id DESC)` — cobre a consulta paginada e o desempate por `id` em datas iguais.
- **Saldo por linha**: calculado na query com `SUM(pontos) OVER (ORDER BY data_utc, id)` particionado por cliente (não persistido — pressuposto #3).
- **Saldo atual**: `SUM(pontos)` do cliente na mesma transação de leitura, para consistência com a página exibida.

---

## 6. Desenho da solução

### Backend (.NET, Clean Architecture)

- **Domain**: enum `TipoMovimentoPontos`; entidade `MovimentoPontos` (imutável — extrato é *append-only*).
- **Application**: use case `ObterExtratoPontos` (query) recebendo `clienteId + paginação`, devolvendo DTO `ExtratoPontosDto`; validação de paginação com guard clauses/FluentValidation.
- **Infrastructure**: `RepositorioMovimentosPontos : IRepositorioMovimentosPontos` com a query EF Core/SQL (window function); migration da tabela se necessário.
- **Api**: endpoint `GET /api/fidelidade/extrato` com `[Authorize]`, mapeando claim → use case; sem regra de negócio no controller.

### Frontend (Next.js)

- **Rota**: `app/fidelidade/extrato/page.tsx` (área autenticada).
- **Service**: `services/fidelidade/extrato-pontos.ts` (axios) + hook TanStack Query com `useInfiniteQuery` para "carregar mais".
- **Componentes**: `CabecalhoSaldo` (saldo atual em destaque), `ListaMovimentos`, `LinhaMovimento` (data formatada, descrição, pontos com sinal e cor — verde ganho / vermelho gasto —, saldo após), `EstadoVazio`, `EstadoErro` com retry, skeleton de loading.
- **Acessibilidade**: sinal dos pontos não comunicado só por cor (prefixo "+"/"−" textual); lista semântica; foco gerido ao carregar mais.

---

## 7. Segurança

- `clienteId` **exclusivamente** do token (anti-IDOR); nenhum endpoint aceita cliente por parâmetro.
- Paginação com teto (`tamanhoPagina ≤ 100`) contra abuso.
- Logs com `clienteId` e parâmetros, sem dados sensíveis; erros 500 sem stack trace na resposta.

---

## 8. Plano de testes

- **Unidade (Application)**: validação de paginação (limites 0, 1, 100, 101); mapeamento DTO; cliente sem movimentos → lista vazia e saldo 0.
- **Integração (Api + BD)**: `deveDevolverMovimentosOrdenadosComSaldoAcumulado`, `deveIsolarMovimentosPorCliente`, `deveDevolver401SemToken`, `deveDevolver400ComPaginacaoInvalida`, `devePaginarCorretamente` (borda entre páginas sem duplicar/saltar itens com datas iguais).
- **Frontend**: estados loading/erro/vazio/lista; formatação de data e sinal; "carregar mais" acrescenta sem duplicar.

---

## 9. Riscos e pendências de validação

1. **Pressuposto #1** (existência da tabela de movimentos) muda o tamanho da entrega: se só existir saldo agregado, é preciso migration + *backfill* (ou extrato começa vazio a partir da ativação).
2. **Pressuposto #3** (saldo calculado): com histórico muito grande, a window function na página pode pesar; mitigação futura seria persistir `saldo_apos` na escrita. <!-- ponytail: cálculo on-read é O(n) por cliente; upgrade = coluna saldo_apos preenchida na escrita -->
3. **Pressuposto #12**: sem fluxo de escrita, a tela nasce vazia em produção — alinhar com o PO a ordem das entregas.
