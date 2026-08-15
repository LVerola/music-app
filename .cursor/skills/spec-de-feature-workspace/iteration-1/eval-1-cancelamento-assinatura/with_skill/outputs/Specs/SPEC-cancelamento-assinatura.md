# SPEC — Cancelamento de assinatura

> **Alvo:** backend
> **Data:** 2026-07-14
> **Status:** rascunho

## 1. Contexto e objetivo

Assinantes precisam de poder cancelar a sua assinatura de forma autónoma, sem passar pelo suporte. Hoje não existe endpoint para isso. Esta feature entrega o endpoint `POST /assinaturas/{id}/cancelar`, acessível apenas ao dono da assinatura ou a um administrador.

Há uma regra comercial de proteção de receita: quando o cancelamento acontece a **menos de 7 dias da próxima renovação**, é cobrada uma **multa de 10% do valor mensal** da assinatura. Fora dessa janela, o cancelamento é gratuito.

O sucesso mede-se por: (a) o assinante consegue cancelar sozinho e recebe e-mail de confirmação; (b) a multa é aplicada exatamente nos casos previstos (janela < 7 dias) e com o valor correto; (c) nenhum utilizador consegue cancelar assinatura de terceiros.

## 2. Requisitos funcionais

1. **RF-01** — O sistema deve expor o endpoint `POST /assinaturas/{id}/cancelar` que altera o estado da assinatura para `cancelada`.
2. **RF-02** — Apenas o dono da assinatura ou um utilizador com papel de administrador pode executar o cancelamento; qualquer outro utilizador autenticado recebe `403`.
3. **RF-03** — Requisições não autenticadas recebem `401`.
4. **RF-04** — Se faltarem **menos de 7 dias** (i.e., `dataRenovacao - dataCancelamento < 7 dias`) para a próxima renovação, o sistema deve cobrar multa de **10% do valor mensal** da assinatura, registada junto ao cancelamento.
5. **RF-05** — Se faltarem **7 dias ou mais** para a renovação, o cancelamento não gera multa (multa = 0).
6. **RF-06** — Após o cancelamento bem-sucedido, o sistema deve enviar um e-mail de confirmação ao dono da assinatura, informando o cancelamento e, quando aplicável, o valor da multa cobrada.
7. **RF-07** — Cancelar uma assinatura que já está `cancelada` não deve produzir efeito adicional (sem nova multa, sem novo e-mail) e deve devolver erro de conflito (`409`).
8. **RF-08** — Tentar cancelar uma assinatura inexistente devolve `404`.
9. **RF-09** — A resposta de sucesso deve informar o novo estado da assinatura, a data do cancelamento e o valor da multa aplicada (0 quando não houver).

### Critérios de aceitação (Gherkin)

```gherkin
Cenário: Dono cancela fora da janela de multa
  Dado uma assinatura ativa do utilizador "Ana" com renovação daqui a 20 dias
  E "Ana" está autenticada
  Quando "Ana" chama POST /assinaturas/{id}/cancelar
  Então a resposta tem status 200
  E a assinatura fica com estado "cancelada"
  E o valor da multa na resposta é 0.00
  E um e-mail de confirmação de cancelamento é enviado para "Ana"
```

```gherkin
Cenário: Dono cancela dentro da janela de multa (menos de 7 dias)
  Dado uma assinatura ativa do utilizador "Ana" com valor mensal de R$ 100,00 e renovação daqui a 3 dias
  E "Ana" está autenticada
  Quando "Ana" chama POST /assinaturas/{id}/cancelar
  Então a resposta tem status 200
  E a assinatura fica com estado "cancelada"
  E o valor da multa na resposta é 10.00
  E o e-mail de confirmação enviado para "Ana" menciona a multa de R$ 10,00
```

```gherkin
Cenário: Limite exato de 7 dias não gera multa
  Dado uma assinatura ativa com renovação daqui a exatamente 7 dias
  E o dono está autenticado
  Quando o dono chama POST /assinaturas/{id}/cancelar
  Então a resposta tem status 200
  E o valor da multa na resposta é 0.00
```

```gherkin
Cenário: Admin cancela assinatura de outro utilizador
  Dado uma assinatura ativa do utilizador "Ana"
  E o utilizador "Bruno" está autenticado com papel de administrador
  Quando "Bruno" chama POST /assinaturas/{id}/cancelar
  Então a resposta tem status 200
  E a assinatura fica com estado "cancelada"
  E o e-mail de confirmação é enviado para "Ana" (dona da assinatura)
```

```gherkin
Cenário: Utilizador comum tenta cancelar assinatura de terceiro
  Dado uma assinatura ativa do utilizador "Ana"
  E o utilizador "Carlos" está autenticado sem papel de administrador
  Quando "Carlos" chama POST /assinaturas/{id}/cancelar
  Então a resposta tem status 403
  E a assinatura permanece ativa
  E nenhum e-mail é enviado
```

```gherkin
Cenário: Requisição sem autenticação
  Dado uma assinatura ativa
  Quando é chamado POST /assinaturas/{id}/cancelar sem token de autenticação
  Então a resposta tem status 401
  E a assinatura permanece ativa
```

```gherkin
Cenário: Assinatura já cancelada
  Dado uma assinatura com estado "cancelada"
  E o dono está autenticado
  Quando o dono chama POST /assinaturas/{id}/cancelar
  Então a resposta tem status 409
  E nenhuma nova multa é registada
  E nenhum novo e-mail é enviado
```

```gherkin
Cenário: Assinatura inexistente
  Dado que não existe assinatura com o id informado
  E um utilizador está autenticado
  Quando é chamado POST /assinaturas/{id}/cancelar
  Então a resposta tem status 404
```

## 3. Contratos técnicos

### Endpoint

`POST /assinaturas/{id}/cancelar`

- **Autenticação:** obrigatória (mesmo mecanismo já usado nos demais endpoints autenticados do projeto).
- **Autorização:** `assinatura.donoId == utilizadorAutenticado.id` **ou** utilizador com papel `admin`.
- **Request body:** vazio (toda a informação vem da rota e do contexto de autenticação).

### Response — sucesso (`200 OK`)

```json
{
  "id": "b7f3c2a1-...",
  "estado": "cancelada",
  "dataCancelamento": "2026-07-14T18:32:00Z",
  "multa": {
    "aplicada": true,
    "valor": 10.00,
    "motivo": "Cancelamento a menos de 7 dias da renovação"
  }
}
```

Quando não há multa: `"multa": { "aplicada": false, "valor": 0.00, "motivo": null }`.

### Responses — erro

| Cenário | Status | Body (exemplo) |
|---|---|---|
| Sem autenticação | `401` | `{ "erro": "nao_autenticado" }` |
| Autenticado mas nem dono nem admin | `403` | `{ "erro": "sem_permissao", "mensagem": "Apenas o dono da assinatura ou um administrador pode cancelar." }` |
| Assinatura não encontrada | `404` | `{ "erro": "assinatura_nao_encontrada" }` |
| Assinatura já cancelada | `409` | `{ "erro": "assinatura_ja_cancelada", "mensagem": "Esta assinatura já foi cancelada." }` |

> Alinhar o envelope de erro ao padrão já usado pelos demais endpoints do projeto (ex.: ProblemDetails em .NET); os exemplos acima definem apenas os códigos e a semântica.

### Regra da multa

- Condição: `dataProximaRenovacao - dataDoCancelamento < 7 dias` (comparação em dias completos; exatamente 7 dias **não** gera multa).
- Valor: `valorMensal * 0.10`, arredondado a 2 casas decimais (arredondamento half-up).
- A multa deve ficar **registada/persistida** associada ao cancelamento (para cobrança e auditoria) — ver questão em aberto Q2 sobre o meio de cobrança.

### Persistência

Entidade `Assinatura` (existente ou a confirmar — ver Q1) precisa de suportar:

- `estado` com valor `cancelada`;
- `dataCancelamento`;
- registo da multa (`valorMulta` na própria assinatura ou entidade/tabela própria de cobranças, conforme o padrão do projeto).

Se o modelo atual não tiver estes campos, criar migration correspondente.

### E-mail de confirmação

- Destinatário: dono da assinatura (mesmo quando o cancelamento é feito por admin).
- Conteúdo mínimo (PT-BR): confirmação do cancelamento, data efetiva e, se houver multa, o valor cobrado.
- Assunto sugerido: `Confirmação de cancelamento da sua assinatura`.
- O envio **não pode falhar o cancelamento**: se o serviço de e-mail falhar, o cancelamento persiste e a falha é logada com contexto (id da assinatura) para reenvio/observabilidade.

## 4. Fluxo de UX e estados

Não se aplica — esta entrega é apenas o endpoint de backend (a UI de cancelamento fica fora de escopo).

## 5. Fora de escopo e restrições

**Fora de escopo desta entrega:**

- Tela/fluxo de frontend para cancelamento.
- Reativação de assinatura cancelada.
- Reembolso proporcional do período já pago.
- Fluxo de retenção ("tem certeza? aceite um desconto").
- Processamento efetivo do pagamento da multa no gateway (apenas registo do valor — ver Q2).
- Cancelamento agendado ("cancelar no fim do ciclo") — ver Q3.

**Restrições:**

- Seguir as convenções do repositório e a skill de implementação de backend do projeto (`@feature-backend-completa`).
- Código, nomes e mensagens em português brasileiro, conforme `AGENTS.md`.
- A verificação de autorização acontece **antes** de qualquer efeito (multa, estado, e-mail).
- A operação de cancelamento + registo de multa deve ser atómica (transação): ou tudo persiste, ou nada.

## 6. Plano de implementação

Ordem sugerida (ajustar caminhos aos reais do repositório — não havia código disponível ao escrever esta spec, ver Q1):

1. **Domínio** — adicionar à entidade `Assinatura` o método de cancelamento com a regra da multa (`cancelar(dataAtual)`: valida estado, calcula multa quando `dataRenovacao - dataAtual < 7 dias`, regista `dataCancelamento`). Regra pura, sem dependência de framework. *(TDD: testes primeiro.)*
2. **Persistência** — migration para os campos novos (`estado = cancelada`, `dataCancelamento`, registo da multa), se ainda não existirem.
3. **Use case / serviço de aplicação** — `CancelarAssinatura`: carrega a assinatura, verifica autorização (dono ou admin), invoca o domínio, persiste em transação, dispara o e-mail de confirmação (falha de e-mail não reverte a transação; logar).
4. **Endpoint** — rota `POST /assinaturas/{id}/cancelar` no padrão dos controllers/endpoints existentes, mapeando os códigos 200/401/403/404/409.
5. **E-mail** — template de confirmação em PT-BR usando o serviço de e-mail já existente no projeto (ver Q4).
6. **Testes de integração** — cobrir os cenários Gherkin da secção 2.

## 7. Estratégia de testes

- **Unidade (TDD — testes nascem antes do código):** regra da multa no domínio: sem multa a ≥ 7 dias; multa de 10% a < 7 dias; limite exato de 7 dias; arredondamento do valor; cancelamento de assinatura já cancelada lança erro tipado.
- **Integração (endpoint):** dono cancela com e sem multa; admin cancela assinatura de terceiro; utilizador comum recebe 403; sem token recebe 401; id inexistente recebe 404; já cancelada recebe 409; e-mail disparado no sucesso (verificar via fake/spy do serviço de e-mail); falha do serviço de e-mail não impede o cancelamento.
- **E2E:** não exigido nesta entrega (sem UI).

## 8. Questões em aberto

| # | Questão | Dono/decisor |
|---|---|---|
| Q1 | Não havia código do projeto disponível ao escrever esta spec — confirmar stack, entidade `Assinatura` existente, mecanismo de auth/papéis e caminhos reais antes de implementar. | Tech Lead |
| Q2 | Como a multa é efetivamente **cobrada**? (débito imediato no gateway, fatura avulsa, desconto em reembolso futuro?) Esta spec assume apenas o **registo** do valor; a cobrança no gateway fica pendente de decisão. | PO / Financeiro |
| Q3 | O cancelamento é **imediato** (perde acesso na hora) ou o acesso permanece até o fim do ciclo já pago? Esta spec assume estado `cancelada` imediato; confirmar impacto no controlo de acesso. | PO |
| Q4 | Qual serviço/provedor de e-mail o projeto já usa e existe template base a seguir? | Tech Lead |
| Q5 | A comparação "menos de 7 dias" usa timezone do utilizador ou UTC? Esta spec assume UTC. | PO / Tech Lead |
