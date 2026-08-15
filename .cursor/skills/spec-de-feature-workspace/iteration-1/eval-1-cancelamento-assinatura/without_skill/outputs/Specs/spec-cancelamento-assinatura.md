# Spec — Cancelamento de Assinatura

- **Endpoint**: `POST /assinaturas/{id}/cancelar`
- **Status**: Pronta para implementação (com lacunas registadas na secção 10)
- **Data**: 2026-07-14
- **Origem**: definição do utilizador (dono do produto), formalizada sem entrevista adicional

---

## 1. Objetivo

Permitir que o dono de uma assinatura (ou um administrador) cancele essa assinatura. Se o cancelamento ocorrer a menos de 7 dias da data de renovação, é cobrada uma multa de 10% do valor mensal. Após o cancelamento, o sistema envia um e-mail de confirmação ao dono da assinatura.

## 2. Escopo

**Incluído**
- Endpoint `POST /assinaturas/{id}/cancelar`.
- Autorização: apenas o dono da assinatura ou utilizador com papel de administrador.
- Regra da multa de 10% do valor mensal quando faltarem menos de 7 dias para a renovação.
- Envio de e-mail de confirmação de cancelamento.

**Excluído (fora de escopo desta entrega)**
- Fluxo de reativação de assinatura.
- Reembolsos proporcionais (pro-rata).
- Cancelamento agendado para o fim do ciclo (esta spec assume cancelamento imediato — ver lacuna L1).
- Interface de utilizador (esta spec cobre apenas a API).

## 3. Contrato do endpoint

### Requisição

```
POST /assinaturas/{id}/cancelar
Authorization: Bearer <token>
```

| Elemento | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` (path) | UUID | Sim | Identificador da assinatura a cancelar |
| corpo | — | Não | Sem corpo obrigatório (ver lacuna L2 sobre "motivo do cancelamento") |

### Resposta de sucesso — `200 OK`

```json
{
  "assinaturaId": "3f8a…",
  "status": "cancelada",
  "dataCancelamento": "2026-07-14T18:06:00Z",
  "dataRenovacaoPrevista": "2026-07-19T00:00:00Z",
  "multa": {
    "aplicada": true,
    "percentual": 10,
    "valor": 9.90,
    "moeda": "BRL"
  }
}
```

Quando não há multa, `multa.aplicada = false` e `multa.valor = 0`.

### Respostas de erro

| HTTP | Código de erro | Quando ocorre |
|---|---|---|
| `401 Unauthorized` | `nao_autenticado` | Token ausente ou inválido |
| `403 Forbidden` | `sem_permissao` | Utilizador autenticado não é o dono nem admin |
| `404 Not Found` | `assinatura_nao_encontrada` | `id` inexistente. Também devolvido (em vez de 403) quando o utilizador não-admin consulta assinatura de terceiro, para não revelar a existência do recurso — decisão de segurança; ver lacuna L3 se a equipa preferir 403 |
| `409 Conflict` | `assinatura_ja_cancelada` | Assinatura já está cancelada (idempotência de negócio: não cobra multa nem reenvia e-mail) |
| `422 Unprocessable Entity` | `estado_invalido` | Assinatura em estado que não permite cancelamento (ex.: expirada, inadimplente — ver lacuna L4) |

Formato de erro padrão:

```json
{ "codigo": "sem_permissao", "mensagem": "Não tem permissão para cancelar esta assinatura." }
```

Mensagens exibíveis ao utilizador em português brasileiro.

## 4. Regras de negócio

### RN1 — Autorização
- O cancelamento só é permitido se `utilizadorAutenticado.id == assinatura.donoId` **ou** o utilizador autenticado tem papel `admin`.
- Admin pode cancelar qualquer assinatura; a multa aplica-se da mesma forma (ver lacuna L5 sobre isenção para admin).

### RN2 — Multa por cancelamento próximo da renovação
- Seja `diasParaRenovacao = data da renovação − data/hora do cancelamento` (em dias).
- Se `diasParaRenovacao < 7`, cobra-se multa de **10% do valor mensal** da assinatura.
- Se `diasParaRenovacao >= 7`, não há multa.
- Limite exato: faltando exatamente 7 dias (168h) **não** há multa ("menos de 7 dias" é estrito).
- Arredondamento do valor da multa: 2 casas decimais, arredondamento half-up (ver lacuna L6).
- O cálculo usa o relógio do servidor em UTC no momento da requisição (ver lacuna L7 sobre fuso do ciclo de cobrança).

### RN3 — Efeito do cancelamento
- Status da assinatura passa a `cancelada` e regista-se `dataCancelamento`.
- A operação de mudança de status e o registo da multa devem ocorrer na **mesma transação**.
- Assinatura cancelada não renova nem gera novas cobranças além da multa.
- Assunção: o acesso ao serviço cessa imediatamente no cancelamento (ver lacuna L1).

### RN4 — E-mail de confirmação
- Após cancelamento persistido com sucesso, envia-se e-mail ao **dono** da assinatura (mesmo quando o cancelamento foi feito por admin).
- Conteúdo mínimo: identificação da assinatura/plano, data do cancelamento e, se aplicável, valor da multa cobrada.
- O envio é **assíncrono/pós-commit**: falha no envio do e-mail **não** desfaz o cancelamento; deve ser logada com contexto e reencaminhada para retry (fila/outbox — ver lacuna L8 sobre infraestrutura disponível).
- Texto do e-mail em português brasileiro.

### RN5 — Idempotência
- Segunda chamada de cancelamento sobre assinatura já cancelada devolve `409` sem efeitos colaterais (sem nova multa, sem novo e-mail).

## 5. Cobrança da multa

- A multa é registada como uma cobrança vinculada à assinatura (`tipo = multa_cancelamento`).
- Assunção: a cobrança usa o mesmo meio de pagamento da assinatura, no fluxo de cobrança já existente do sistema (ver lacuna L9 sobre o que fazer se a cobrança da multa falhar — a assunção desta spec é: o cancelamento prossegue e a multa fica pendente de cobrança).

## 6. Modelo de dados (impacto)

| Entidade | Alteração |
|---|---|
| `Assinatura` | Garantir campos `status` (com valor `cancelada`) e `dataCancelamento` |
| `Cobranca` (ou equivalente) | Suportar `tipo = multa_cancelamento` vinculada à assinatura |

Nenhuma tabela nova é estritamente necessária se essas estruturas já existirem.

## 7. Observabilidade

- Log estruturado no cancelamento: `assinaturaId`, `utilizadorId` (quem cancelou), `éAdmin`, `multaAplicada`, `valorMulta`. Sem dados sensíveis (token, dados de cartão).
- Log de erro com contexto em falha de envio de e-mail e em falha de cobrança da multa.

## 8. Critérios de aceitação (Gherkin)

```gherkin
Funcionalidade: Cancelamento de assinatura

  Cenário: Dono cancela com mais de 7 dias para a renovação
    Dado uma assinatura ativa do utilizador "Ana" com renovação daqui a 10 dias
    Quando "Ana" chama POST /assinaturas/{id}/cancelar
    Então a resposta é 200 com status "cancelada"
    E nenhuma multa é cobrada
    E "Ana" recebe um e-mail de confirmação de cancelamento

  Cenário: Dono cancela faltando menos de 7 dias para a renovação
    Dado uma assinatura ativa de "Ana" com valor mensal de R$ 100,00 e renovação daqui a 3 dias
    Quando "Ana" chama POST /assinaturas/{id}/cancelar
    Então a resposta é 200 com multa aplicada de R$ 10,00
    E o e-mail de confirmação informa a multa de R$ 10,00

  Cenário: Faltam exatamente 7 dias para a renovação
    Dado uma assinatura ativa com renovação daqui a exatamente 7 dias (168 horas)
    Quando o dono chama POST /assinaturas/{id}/cancelar
    Então a resposta é 200 e nenhuma multa é cobrada

  Cenário: Admin cancela assinatura de terceiro
    Dado uma assinatura ativa de "Ana"
    E um utilizador "Bruno" com papel admin
    Quando "Bruno" chama POST /assinaturas/{id}/cancelar
    Então a resposta é 200 com status "cancelada"
    E o e-mail de confirmação é enviado para "Ana"

  Cenário: Utilizador comum tenta cancelar assinatura de terceiro
    Dado uma assinatura ativa de "Ana"
    E um utilizador "Carlos" sem papel admin
    Quando "Carlos" chama POST /assinaturas/{id}/cancelar
    Então a resposta é 404 e a assinatura permanece ativa

  Cenário: Requisição sem autenticação
    Quando é feita a chamada POST /assinaturas/{id}/cancelar sem token
    Então a resposta é 401

  Cenário: Assinatura já cancelada
    Dado uma assinatura já cancelada
    Quando o dono chama POST /assinaturas/{id}/cancelar novamente
    Então a resposta é 409
    E nenhuma nova multa é cobrada e nenhum novo e-mail é enviado

  Cenário: Assinatura inexistente
    Quando o dono chama POST /assinaturas/{id-inexistente}/cancelar
    Então a resposta é 404

  Cenário: Falha no envio do e-mail não desfaz o cancelamento
    Dado que o serviço de e-mail está indisponível
    Quando o dono cancela a assinatura
    Então a resposta é 200 e a assinatura fica cancelada
    E a falha de envio é logada e agendada para reenvio
```

## 9. Plano de testes

- **Unidade**: cálculo da multa (limite de 7 dias exatos, 6d23h59m, valores com arredondamento, valor mensal zero); regra de autorização (dono, admin, terceiro).
- **Integração/API**: todos os cenários Gherkin da secção 8, incluindo idempotência (duas chamadas seguidas) e transacionalidade (falha ao registar multa não pode deixar assinatura cancelada sem multa registada).
- **E-mail**: verificação de disparo com os dados corretos (via fake/spy do serviço de e-mail), incluindo o caso "cancelado por admin, e-mail vai para o dono".

## 10. Lacunas registadas (decisões assumidas — validar com o dono do produto)

O utilizador não estava disponível para responder; as assunções abaixo foram adotadas para não bloquear a implementação e devem ser confirmadas:

| # | Lacuna | Assunção adotada |
|---|---|---|
| L1 | O cancelamento é imediato ou vale até ao fim do ciclo pago? | Imediato (status muda na hora; acesso cessa) |
| L2 | Deve capturar-se motivo de cancelamento? | Não; corpo vazio. Fácil de adicionar depois como campo opcional |
| L3 | 403 vs 404 quando não-dono tenta cancelar assinatura alheia | 404, para não revelar existência do recurso |
| L4 | Quais estados além de "ativa" permitem cancelar (trial, inadimplente, pausada)? | Apenas assinaturas ativas; demais estados devolvem 422 |
| L5 | Cancelamento feito por admin também cobra multa? | Sim, a regra da multa aplica-se independentemente de quem cancela |
| L6 | Arredondamento da multa | 2 casas decimais, half-up |
| L7 | Fuso horário para contar os 7 dias | UTC, comparação por timestamp (168h), não por data de calendário |
| L8 | Mecanismo de envio de e-mail (fila, outbox, provedor) | Usar a infraestrutura de e-mail já existente no projeto, com envio pós-commit e retry |
| L9 | E se a cobrança da multa falhar (cartão recusado)? | Cancelamento prossegue; multa fica registada como pendente para recobrança |
| L10 | Valor mensal com desconto/cupom: multa incide sobre o valor cheio ou o efetivamente pago? | Sobre o valor mensal vigente da assinatura (o que seria cobrado na próxima renovação) |
