# SPEC — Extrato de pontos do programa de fidelidade

> **Alvo:** fullstack
> **Data:** 2026-07-14
> **Status:** rascunho

## 1. Contexto e objetivo

O cliente do programa de fidelidade hoje não consegue ver de onde vieram nem para onde foram os seus pontos — no máximo vê um saldo total, sem histórico. Isso gera desconfiança no programa e chamados de suporte do tipo "para onde foram os meus pontos?".

Esta feature entrega uma **tela de extrato de pontos** na área logada do cliente: saldo atual em destaque e lista cronológica de movimentos (créditos e débitos), cada um com data, descrição, quantidade de pontos e saldo após o movimento — o mesmo modelo mental de um extrato bancário.

O endpoint de extrato **ainda não existe** e faz parte desta entrega (backend .NET). A fatia é somente leitura: nenhuma ação sobre pontos acontece nesta tela.

**Sucesso mensurável:** o cliente autenticado abre a tela e vê saldo e movimentos consistentes com o que o backend calcula (saldo do cabeçalho = saldo após o movimento mais recente); clientes sem movimentos veem estado vazio com saldo 0; a resposta do endpoint chega em p95 < 500 ms para clientes com até 5.000 movimentos.

## 2. Requisitos funcionais

1. **RF-01** — O sistema expõe um endpoint autenticado que devolve o saldo atual de pontos e a lista paginada de movimentos do cliente identificado pelo token de acesso.
2. **RF-02** — Cada movimento devolvido contém: identificador, data/hora, descrição, tipo (`credito` ou `debito`), quantidade de pontos e saldo após o movimento.
3. **RF-03** — Os movimentos são ordenados do mais recente para o mais antigo.
4. **RF-04** — O saldo após cada movimento é calculado e persistido pelo backend; o frontend apenas exibe (nunca calcula saldo).
5. **RF-05** — A paginação é server-side, com tamanho de página padrão 20 e máximo 100; parâmetros inválidos devolvem `400`.
6. **RF-06** — Um cliente só acede aos próprios movimentos; a identificação vem exclusivamente do token (nenhum `clienteId` em rota ou query).
7. **RF-07** — A tela `/fidelidade/extrato` exibe o saldo atual em destaque e a lista de movimentos com data, descrição, pontos com sinal (+/−) e saldo após o movimento.
8. **RF-08** — A tela trata os quatro estados: carregando, erro (com ação de tentar novamente), vazio e sucesso, com os textos definidos na secção 4.
9. **RF-09** — A rota da tela é protegida: utilizador não autenticado é redirecionado para o login.
10. **RF-10** — A distinção visual entre crédito e débito não depende apenas de cor: o sinal (+/−) acompanha sempre o valor.

### Critérios de aceitação (Gherkin)

```gherkin
Cenário: Cliente com movimentos vê o extrato completo
  Dado que estou autenticado como cliente com 3 movimentos de pontos
  Quando acedo à tela "/fidelidade/extrato"
  Então vejo o meu saldo atual de pontos em destaque
  E vejo os 3 movimentos ordenados do mais recente para o mais antigo
  E cada movimento exibe data, descrição, pontos com sinal e saldo após o movimento
  E o saldo em destaque é igual ao "saldo após" do movimento mais recente
```

```gherkin
Cenário: Cliente sem movimentos vê o estado vazio
  Dado que estou autenticado como cliente sem nenhum movimento de pontos
  Quando acedo à tela "/fidelidade/extrato"
  Então vejo o saldo "0 pontos"
  E vejo a mensagem "Você ainda não tem movimentos de pontos."
```

```gherkin
Cenário: Extrato paginado para cliente com muitos movimentos
  Dado que estou autenticado como cliente com 45 movimentos de pontos
  Quando acedo à tela "/fidelidade/extrato"
  Então vejo os 20 movimentos mais recentes
  E vejo o controlo de paginação indicando 3 páginas
  Quando avanço para a página 2
  Então vejo os movimentos 21 a 40
```

```gherkin
Cenário: Falha ao carregar o extrato
  Dado que estou autenticado como cliente
  E o endpoint de extrato responde com erro 500
  Quando acedo à tela "/fidelidade/extrato"
  Então vejo a mensagem "Não foi possível carregar seu extrato. Tente novamente."
  E vejo o botão "Tentar novamente"
  Quando clico em "Tentar novamente" e o endpoint responde com sucesso
  Então vejo o extrato normalmente
```

```gherkin
Cenário: Utilizador não autenticado não acede ao extrato
  Dado que não estou autenticado
  Quando tento aceder à tela "/fidelidade/extrato"
  Então sou redirecionado para a tela de login
```

```gherkin
Cenário: Endpoint rejeita paginação inválida
  Dado que estou autenticado como cliente
  Quando chamo "GET /api/fidelidade/extrato?pagina=0&tamanhoPagina=500"
  Então recebo o status 400
  E o corpo indica os parâmetros inválidos
```

```gherkin
Cenário: Endpoint rejeita chamada sem token
  Quando chamo "GET /api/fidelidade/extrato" sem token de autenticação
  Então recebo o status 401
```

## 3. Contratos técnicos

### Backend — endpoint (a criar nesta entrega)

**`GET /api/fidelidade/extrato?pagina=1&tamanhoPagina=20`** — autenticado (Bearer token); o cliente é resolvido a partir da claim de identidade do token.

| Parâmetro | Tipo | Padrão | Regra |
|---|---|---|---|
| `pagina` | int | 1 | ≥ 1 |
| `tamanhoPagina` | int | 20 | entre 1 e 100 |

**Response `200`:**

```json
{
  "saldoAtual": 1250,
  "pagina": 1,
  "tamanhoPagina": 20,
  "totalMovimentos": 45,
  "totalPaginas": 3,
  "movimentos": [
    {
      "id": "7f9c2b1e-4a3d-4f6a-9b2e-1c8d5e7a0f34",
      "dataHora": "2026-07-10T14:32:00Z",
      "descricao": "Compra #48213 — pontos ganhos",
      "tipo": "credito",
      "pontos": 150,
      "saldoApos": 1250
    },
    {
      "id": "3a1d8e5c-2b7f-4c9a-8d1e-6f4b0a2c9e71",
      "dataHora": "2026-07-02T09:10:00Z",
      "descricao": "Resgate — desconto no pedido #47902",
      "tipo": "debito",
      "pontos": 300,
      "saldoApos": 1100
    }
  ]
}
```

`pontos` é sempre positivo; o sentido vem de `tipo`. `saldoApos` é o saldo persistido no momento do movimento (RF-04).

**Códigos de status:**

| Status | Cenário |
|---|---|
| `200` | Sucesso (inclusive lista vazia: `movimentos: []`, `saldoAtual: 0`) |
| `400` | `pagina` ou `tamanhoPagina` fora das regras (corpo ProblemDetails com os campos inválidos) |
| `401` | Sem token ou token inválido |

### Backend — modelo de dados (proposta, ver Q2)

Entidade `MovimentoPontos` (tabela `movimentos_pontos`) — criar apenas se não existir fonte equivalente:

| Campo | Tipo | Observação |
|---|---|---|
| `Id` | `Guid` | PK |
| `ClienteId` | `Guid` | FK para o cliente; **índice composto (`ClienteId`, `DataHora` DESC)** |
| `DataHora` | `DateTimeOffset` | UTC |
| `Descricao` | `string(200)` | obrigatória |
| `Tipo` | enum `TipoMovimentoPontos { Credito, Debito }` | persistido como texto |
| `Pontos` | `int` | > 0 |
| `SaldoApos` | `int` | ≥ 0, gravado no momento do movimento |

Migration correspondente com o índice acima (seguir `@migracao-ef-segura`).

### Frontend

- **Rota da página:** `/fidelidade/extrato` (protegida; redireciona para login se não autenticado).
- **Endpoint consumido:** o contrato acima, via service HTTP + cache de dados conforme convenção do repo (axios + TanStack Query, ver `@feature-frontend-completa`).
- **Tipos/DTOs (PT-BR, espelhando o response):** `ExtratoPontos`, `MovimentoPontos`, `TipoMovimentoPontos = "credito" | "debito"`.
- **Componentes a reutilizar:** usar os componentes de tabela/lista, paginação, estado vazio e alerta de erro já existentes em `components/ui/` do projeto alvo — não criar variantes novas. (Esta spec foi escrita sem acesso ao repo do produto; a IA implementadora deve localizar os equivalentes antes de criar componentes, ver Q5.)

## 4. Fluxo de UX e estados

1. O cliente autenticado abre o menu da área do cliente e toca em **"Meus pontos"**.
2. A tela `/fidelidade/extrato` abre com o título **"Extrato de pontos"**, o saldo em destaque e a lista de movimentos (estado carregando até a resposta chegar).
3. Cada linha mostra: data (formato `dd/mm/aaaa`), descrição, pontos com sinal (`+150` / `−300`) e **"Saldo: 1.250"**.
4. Com mais de 20 movimentos, o controlo de paginação aparece no rodapé da lista; mudar de página recarrega apenas a lista (o saldo do cabeçalho não muda).
5. Não há ações de escrita na tela; a saída é pela navegação padrão da área logada.

| Estado | O que exibe |
|---|---|
| Carregando | Skeleton do cabeçalho de saldo + 5 linhas de skeleton na lista |
| Erro | Mensagem "Não foi possível carregar seu extrato. Tente novamente." + botão **"Tentar novamente"** (refaz a chamada) |
| Vazio | Saldo "0 pontos" + mensagem "Você ainda não tem movimentos de pontos." |
| Sucesso | Cabeçalho "Saldo atual: **1.250 pontos**" + lista de movimentos + paginação quando houver mais de uma página |

**Textos de UI (PT-BR, decididos aqui):**

- Título da página: `Extrato de pontos`
- Item de menu: `Meus pontos`
- Cabeçalho de saldo: `Saldo atual: {saldo} pontos`
- Rótulo de saldo por linha: `Saldo: {saldoApos}`
- Estado vazio: `Você ainda não tem movimentos de pontos.`
- Erro: `Não foi possível carregar seu extrato. Tente novamente.`
- Botão de retry: `Tentar novamente`
- Paginação: `Anterior` / `Próxima` / `Página {n} de {total}`

Números de pontos formatados com separador de milhar pt-BR (`1.250`).

## 5. Fora de escopo e restrições

**Fora de escopo desta entrega (não implementar):**

- Resgate/uso de pontos a partir da tela.
- Filtros por período ou tipo de movimento e busca por descrição.
- Exportação (PDF/CSV) do extrato.
- Regras/avisos de expiração de pontos (ver Q1).
- Visão administrativa ou de atendente do extrato de terceiros.
- Notificações (push/e-mail) sobre movimentos.

**Restrições:**

- Backend em .NET, seguindo as convenções e a arquitetura em camadas do repo (`@feature-backend-completa`); frontend seguindo `@feature-frontend-completa`. A spec não repete essas convenções.
- Código novo, textos e nomes em português brasileiro, conforme `AGENTS.md` do projeto.
- Segurança: o `clienteId` vem **sempre** do token; qualquer variante que aceite o id por parâmetro é rejeitada em review (IDOR).
- Performance: p95 < 500 ms no endpoint para clientes com até 5.000 movimentos (garantido pelo índice `(ClienteId, DataHora DESC)` + paginação server-side).

## 6. Plano de implementação

Ordem: backend primeiro (o contrato alimenta o frontend), depois a tela.

**Backend (.NET — seguir `@feature-backend-completa`):**

1. **Domínio:** criar a entidade `MovimentoPontos` e o enum `TipoMovimentoPontos` na camada de domínio (só se não existir equivalente — ver Q2).
2. **Persistência:** configuração EF Core da entidade + migration com o índice composto `(ClienteId, DataHora DESC)` (seguir `@migracao-ef-segura`).
3. **Repositório:** interface `IRepositorioMovimentoPontos` com `ObterExtratoPaginado(clienteId, pagina, tamanhoPagina)` e `ObterSaldoAtual(clienteId)`; implementação na camada de infraestrutura.
4. **Use case:** `ObterExtratoPontos` na camada de aplicação — valida paginação (falha cedo com erro tipado), consulta o repositório, monta o DTO de resposta.
5. **Endpoint:** rota `GET /api/fidelidade/extrato` autenticada, resolvendo o cliente pela claim do token; mapeia erros de validação para `400` ProblemDetails.

**Frontend (seguir `@feature-frontend-completa`):**

6. **Tipos:** `ExtratoPontos`, `MovimentoPontos`, `TipoMovimentoPontos` espelhando o contrato da secção 3.
7. **Service + query:** função `obterExtratoPontos(pagina, tamanhoPagina)` no service HTTP + query com chave `["extrato-pontos", pagina]`.
8. **Página:** rota `/fidelidade/extrato` protegida, com cabeçalho de saldo, lista de movimentos, paginação e os quatro estados da secção 4, reutilizando os componentes de `components/ui/`.
9. **Menu:** adicionar o item "Meus pontos" na navegação da área do cliente apontando para a rota.

**Testes:** ver secção 7 (escrever os testes de regra de negócio antes do código correspondente).

## 7. Estratégia de testes

- **Unidade (backend, nascem antes do código — TDD):**
  - `ObterExtratoPontos` devolve movimentos ordenados do mais recente para o mais antigo.
  - Paginação: página 1 padrão, `pagina < 1` e `tamanhoPagina` fora de 1–100 falham com erro de validação.
  - Cliente sem movimentos devolve lista vazia e `saldoAtual = 0`.
  - `saldoAtual` da resposta é igual ao `SaldoApos` do movimento mais recente.
- **Integração (backend):**
  - `GET /api/fidelidade/extrato` com token válido devolve `200` com o JSON do contrato (cliente com e sem movimentos).
  - Sem token devolve `401`; paginação inválida devolve `400`.
  - Cliente A nunca recebe movimentos do cliente B (teste explícito de isolamento).
- **Frontend (componente/página):**
  - Renderização dos quatro estados (carregando, erro com retry, vazio, sucesso).
  - Sinal +/− correto por tipo de movimento e formatação pt-BR dos números.
- **E2E (fluxo crítico, Playwright — seguir as regras `playwright*` do repo):**
  - Login → menu "Meus pontos" → extrato exibe saldo e movimentos → paginar para a página 2.

## 8. Questões em aberto

| # | Questão | Dono/decisor |
|---|---|---|
| Q1 | Pontos expiram? Se sim, a expiração entra no extrato como movimento de débito com descrição própria (ex.: "Pontos expirados")? | PO do programa de fidelidade |
| Q2 | Já existe tabela/entidade de movimentos de pontos no banco (a acumulação acontece hoje em algum fluxo)? Se existir, o modelo da secção 3 deve ser adaptado à fonte real; se não, além da migration é preciso decidir se há saldo legado a migrar como movimento inicial. | Tech lead do backend |
| Q3 | Convenção de rota/versionamento da API do projeto real (ex.: `/api/v1/...`)? A rota proposta `GET /api/fidelidade/extrato` deve ser ajustada à convenção vigente. | Tech lead do backend |
| Q4 | A tela é só web ou também precisa existir no app mobile (React Native)? Esta spec cobre apenas web; mobile seria outra fatia com `@feature-mobile-completa`. | PO |
| Q5 | Quais componentes de UI existentes (tabela/lista, paginação, estado vazio, alerta) devem ser reutilizados? Esta spec foi escrita sem acesso ao repo do produto; a IA implementadora deve mapear `components/ui/` antes de criar qualquer componente novo. | Dev que implementar |
