# SPEC — Formulário de solicitação de férias

> **Alvo:** frontend
> **Data:** 2026-07-14
> **Status:** rascunho

## 1. Contexto e objetivo

O portal do colaborador precisa de um formulário para o colaborador solicitar as suas próprias férias, informando **data de início**, **data de fim** e uma **observação**. Hoje não existe esse fluxo no portal.

O objetivo desta entrega é a fatia de **envio da solicitação**: o colaborador preenche o formulário, o sistema valida os dados localmente e submete a solicitação, que fica registada para posterior tratamento pelo RH.

**Medida de sucesso:** o colaborador consegue submeter uma solicitação válida e recebe confirmação visual; entradas inválidas são bloqueadas com mensagem clara antes do envio.

**Aviso importante para a IA implementadora:** o fluxo de aprovação do RH e o contrato do endpoint de submissão **não foram definidos** (ver secção 8). Implemente a camada de serviço isolada por interface, de forma que o contrato real possa ser ligado depois sem alterar o formulário.

## 2. Requisitos funcionais

1. **RF-01** — O formulário exibe três campos: data de início (obrigatório), data de fim (obrigatório) e observação (texto livre).
2. **RF-02** — A data de fim deve ser igual ou posterior à data de início; caso contrário, o envio é bloqueado com mensagem de erro no campo.
3. **RF-03** — A data de início não pode ser anterior à data de hoje; caso contrário, o envio é bloqueado com mensagem de erro no campo.
4. **RF-04** — O botão de envio fica desativado enquanto os campos obrigatórios estiverem vazios ou inválidos, e durante o envio em curso.
5. **RF-05** — Após envio bem-sucedido, o colaborador vê confirmação de que a solicitação foi registada e ficará a aguardar tratamento pelo RH.
6. **RF-06** — Em caso de falha no envio, o formulário mantém os valores preenchidos e exibe mensagem de erro com opção de tentar novamente.
7. **RF-07** — A submissão envia os três campos através de um serviço de solicitação de férias isolado por interface (contrato real pendente — ver secção 8).

### Critérios de aceitação (Gherkin)

```gherkin
Cenário: Envio de solicitação válida
  Dado que o colaborador está na tela de solicitação de férias
  Quando preenche data de início "2026-08-10", data de fim "2026-08-24" e observação "Férias de verão"
  E clica em "Enviar solicitação"
  Então o sistema submete a solicitação
  E exibe a mensagem "Solicitação de férias enviada. Aguarde a análise do RH."
```

```gherkin
Cenário: Data de fim anterior à data de início
  Dado que o colaborador preencheu data de início "2026-08-10"
  Quando preenche data de fim "2026-08-05"
  Então o campo de data de fim exibe o erro "A data de fim deve ser igual ou posterior à data de início."
  E o botão "Enviar solicitação" permanece desativado
```

```gherkin
Cenário: Data de início no passado
  Dado que hoje é "2026-07-14"
  Quando o colaborador preenche data de início "2026-07-01"
  Então o campo de data de início exibe o erro "A data de início não pode ser anterior a hoje."
  E o botão "Enviar solicitação" permanece desativado
```

```gherkin
Cenário: Campos obrigatórios vazios
  Dado que o colaborador está na tela de solicitação de férias
  E não preencheu a data de início nem a data de fim
  Então o botão "Enviar solicitação" está desativado
```

```gherkin
Cenário: Falha no envio
  Dado que o colaborador preencheu o formulário com dados válidos
  Quando clica em "Enviar solicitação" e o serviço devolve erro
  Então o sistema exibe "Não foi possível enviar a solicitação. Tente novamente."
  E os valores preenchidos são mantidos no formulário
```

```gherkin
Cenário: Duplo clique durante o envio
  Dado que o colaborador clicou em "Enviar solicitação" e o envio está em curso
  Quando tenta clicar novamente no botão
  Então nenhum segundo envio é disparado, pois o botão está desativado com o texto "A enviar..."
```

## 3. Contratos técnicos

- **Rota da página:** `/ferias/solicitar` (portal do colaborador).
- **Endpoint de submissão:** **NÃO CONFIRMADO** — o utilizador não sabe qual endpoint usar (ver QA-01 na secção 8). Não invente o contrato HTTP. Enquanto o contrato não for confirmado:
  - Isole a chamada numa interface de serviço (ex.: `servicos/servico-ferias.ts` com função `enviarSolicitacaoFerias(solicitacao)`), consumida pelo formulário via TanStack Query mutation.
  - A implementação concreta da interface fica com um `TODO` referenciando QA-01, e os testes usam um stub/mock do serviço.
- **Tipo de dados do formulário (conhecido e confirmado):**

```ts
interface SolicitacaoFerias {
  dataInicio: string;   // ISO 8601, ex.: "2026-08-10"
  dataFim: string;      // ISO 8601, ex.: "2026-08-24"
  observacao: string;   // texto livre; pode ser vazio (ver QA-04)
}
```

- **Componentes a reutilizar:** verificar no repositório do portal os componentes existentes de formulário, date picker e toast/alerta e reutilizá-los em vez de criar novos. (Esta spec foi escrita sem acesso ao repositório do portal — a IA implementadora deve inventariar `components/ui/` ou equivalente antes de criar qualquer componente.)

## 4. Fluxo de UX e estados

**Fluxo:**

1. O colaborador acede a `/ferias/solicitar` (ponto de entrada no menu do portal — confirmar rótulo do item de menu com o padrão existente).
2. Preenche data de início e data de fim (date pickers) e, opcionalmente, a observação (textarea).
3. As validações de RF-02/RF-03 correm no `blur`/alteração dos campos.
4. Clica em **"Enviar solicitação"**; o botão passa a **"A enviar..."** e fica desativado.
5. Em sucesso, vê a confirmação; em erro, vê a mensagem de falha e pode tentar novamente.

**Textos de UI (PT):**

| Elemento | Texto |
|---|---|
| Título da página | Solicitação de férias |
| Label data de início | Data de início |
| Label data de fim | Data de fim |
| Label observação | Observação |
| Placeholder observação | Ex.: motivo ou detalhes relevantes para o RH |
| Botão de envio | Enviar solicitação |
| Botão durante envio | A enviar... |
| Erro data de fim | A data de fim deve ser igual ou posterior à data de início. |
| Erro data de início | A data de início não pode ser anterior a hoje. |
| Erro campo obrigatório | Campo obrigatório. |
| Sucesso | Solicitação de férias enviada. Aguarde a análise do RH. |
| Erro de envio | Não foi possível enviar a solicitação. Tente novamente. |

**Estados da tela:**

| Estado | O que exibe |
|---|---|
| Inicial | Formulário vazio; botão de envio desativado |
| Preenchimento inválido | Erro inline sob o campo inválido; botão desativado |
| Enviando | Botão "A enviar..." desativado; campos bloqueados |
| Sucesso | Mensagem de confirmação (toast ou inline); comportamento pós-sucesso pendente de QA-05 — por defeito, limpar o formulário e manter a confirmação visível |
| Erro de envio | Mensagem de erro; valores mantidos; botão reativado |

## 5. Fora de escopo e restrições

**Fora de escopo desta entrega:**

- Tela/fluxo de aprovação ou rejeição pelo RH (fluxo desconhecido — QA-02).
- Listagem/histórico de solicitações do colaborador e acompanhamento de estado.
- Edição ou cancelamento de solicitação já enviada.
- Validação de saldo de dias de férias e regras legais de antecedência/fracionamento (QA-03).
- Notificações (e-mail, push) ao RH ou ao colaborador.
- Implementação do backend/endpoint (contrato desconhecido — QA-01).

**Restrições:**

- Seguir as convenções do repositório do portal e as regras de stack do projeto (frontend: `@feature-frontend-completa`); esta spec não repete essas convenções.
- Código, nomes e textos em português brasileiro, conforme `AGENTS.md`.
- Não criar dependências novas: usar os componentes e bibliotecas de formulário já presentes no portal.

## 6. Plano de implementação

1. **Tipos** — criar o tipo `SolicitacaoFerias` (ex.: `tipos/ferias.ts`), conforme secção 3.
2. **Serviço** — criar `servicos/servico-ferias.ts` com `enviarSolicitacaoFerias(solicitacao: SolicitacaoFerias)`; corpo com `TODO(QA-01)` até o endpoint ser confirmado, exposto ao formulário via mutation do TanStack Query (ou padrão equivalente do repo).
3. **Validação** — schema de validação (Zod ou padrão do repo) com as regras RF-02/RF-03 e obrigatoriedade dos campos de data.
4. **Página e formulário** — rota `/ferias/solicitar` com o formulário (React Hook Form ou padrão do repo), reutilizando os componentes de UI existentes; implementar todos os estados da secção 4.
5. **Ponto de entrada** — adicionar item de menu/navegação do portal apontando para a rota.
6. **Testes** — conforme secção 7.

Ajustar os caminhos acima à estrutura real do repositório do portal (a spec foi escrita sem acesso a ele).

## 7. Estratégia de testes

- **Unidade (TDD — teste antes do código):**
  - Schema de validação: data de fim anterior à de início rejeitada; data de início no passado rejeitada; período válido aceite; datas vazias rejeitadas.
- **Componente/integração:**
  - Formulário desativa o botão com campos inválidos/vazios.
  - Envio com sucesso (serviço mockado) exibe a mensagem de confirmação.
  - Envio com falha exibe a mensagem de erro e mantém os valores.
  - Duplo clique durante envio não dispara segunda chamada.
- **E2E:** adiar até o endpoint real existir (depende de QA-01); registar como follow-up.

## 8. Questões em aberto

| ID | Questão | Decisor sugerido |
|---|---|---|
| QA-01 | **Qual endpoint usar para submeter a solicitação?** Método, rota, body, response e códigos de erro por cenário. O utilizador declarou não saber. A implementação deve isolar o serviço e não inventar o contrato. | Equipa de backend / tech lead |
| QA-02 | **Como funciona o fluxo de aprovação do RH?** A solicitação nasce "pendente"? O RH aprova onde? O colaborador acompanha o estado? Há notificações? O utilizador declarou não saber. Define entregas futuras (listagem, estados, tela do RH). | RH + Product Owner |
| QA-03 | Regras de negócio das datas: antecedência mínima, duração mínima/máxima, fracionamento, sobreposição com solicitações existentes, validação de saldo de dias. | RH + Product Owner |
| QA-04 | O campo de observação é obrigatório ou opcional? Tem limite de caracteres? (Assumido **opcional e sem limite** até decisão em contrário.) | Product Owner |
| QA-05 | Comportamento pós-sucesso: limpar formulário, redirecionar para histórico (quando existir), ou confirmação inline? (Assumido: limpar + confirmação visível.) | Product Owner / UX |
| QA-06 | Ponto de entrada no menu do portal: rótulo e posição do item de navegação. | UX |
