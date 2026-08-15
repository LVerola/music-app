# Entrevista — Extrato de pontos do programa de fidelidade

> Registo da fase de entrevista da skill `spec-de-feature`. O utilizador não estava disponível para responder, por isso cada pergunta traz a **resposta assumida** com a justificativa do pressuposto. O que não deu para assumir com segurança foi levado para a secção "Questões em aberto" da spec (`Specs/SPEC-extrato-pontos-fidelidade.md`).

## Ronda 1 — problema, ator, escopo

### 1. Problema e objetivo — que dor esta tela resolve? Como sabemos que ficou pronta e certa?

**Resposta assumida:** o cliente hoje só vê o saldo total de pontos (ou nem isso) e não entende de onde os pontos vieram nem para onde foram, o que gera desconfiança e chamados de suporte. A tela fica pronta quando o cliente logado consegue ver o saldo atual e a lista cronológica de movimentos (crédito/débito) com data, descrição e saldo, sem discrepância com o que o backend calcula.

*Justificativa:* é a motivação padrão de qualquer tela de extrato; o pedido do utilizador ("vê a lista de movimentos com data, descrição e saldo") confirma o formato.

### 2. Ator — quem usa? Há papéis/permissões diferentes?

**Resposta assumida:** apenas o **cliente autenticado**, vendo exclusivamente os **próprios** movimentos. Não há visão de administrador/atendente nesta entrega.

*Justificativa:* o pedido diz "o cliente logado vê". Visões de backoffice seriam outra fatia (outra spec).

### 3. Escopo — o que fica explicitamente de fora desta entrega?

**Resposta assumida:** fora de escopo — resgate/uso de pontos a partir da tela, filtros por período/tipo, exportação (PDF/CSV), notificações de expiração e visão administrativa. Esta fatia é **somente leitura**.

*Justificativa:* o pedido descreve apenas a consulta do extrato; adicionar ações seria inflar a fatia (anti-padrão "spec com >1 feature").

### 4. Regras de negócio — validações, limites, cálculos, casos especiais?

**Resposta assumida:**
- Movimentos são de dois tipos: **crédito** (ganhou pontos) e **débito** (gastou pontos).
- Cada movimento carrega o **saldo após o movimento** (saldo corrente), calculado pelo backend — o frontend nunca calcula saldo.
- Ordenação: mais recente primeiro.
- Cliente sem nenhum movimento vê estado vazio com saldo 0.

*Justificativa:* padrão de extrato bancário, que é o modelo mental que o utilizador invocou. O cálculo no backend evita divergência entre paginação e saldo.

**Não deu para assumir:** se existem pontos com **expiração** (e se a expiração aparece como movimento de débito) → questão em aberto Q1 na spec.

### 5. Dependências — a feature depende de endpoint/tabela/serviço que ainda não existe?

**Resposta confirmada pelo pedido + assumida:** o endpoint **não existe** e será criado nesta entrega (backend .NET). Assumi que a **acumulação/gasto de pontos já acontece hoje** noutro fluxo do sistema (senão não haveria o que exibir), portanto deve existir alguma fonte de dados de movimentos.

**Não deu para assumir:** se já existe tabela/entidade de movimentos de pontos no banco ou se será preciso criar entidade + migration (e, nesse caso, se há dados legados a migrar) → questão em aberto Q2 na spec. A spec propõe o modelo de dados alvo, a validar.

## Ronda 2 — detalhes de frontend e de backend

### 6. (Frontend) Rota, ponto de entrada e navegação de saída?

**Resposta assumida:** rota `/fidelidade/extrato`, acessível a partir do menu da área do cliente (item "Meus pontos"). Saída pela navegação padrão da área logada. Rota protegida: utilizador não autenticado é redirecionado para o login.

*Justificativa:* convenção de kebab-case em português brasileiro das regras do repo; área logada já deve ter menu.

**Não deu para assumir:** se existe também app mobile que precisa da mesma tela → questão em aberto Q4.

### 7. (Frontend) Dados exibidos e origem?

**Resposta assumida:** cabeçalho com **saldo atual** em destaque + lista paginada de movimentos com **data**, **descrição**, **pontos do movimento** (com sinal +/−) e **saldo após o movimento**. Origem: o novo endpoint `GET /api/fidelidade/extrato` (contrato completo na spec). Sem formulários nesta tela.

### 8. (Frontend) Estados da tela — loading, erro, vazio, sucesso?

**Resposta assumida:** os quatro estados, com textos em PT-BR definidos na spec (secção 4). Vazio = "Você ainda não tem movimentos de pontos.". Erro = mensagem + botão "Tentar novamente".

### 9. (Frontend) Responsividade/acessibilidade com requisito explícito?

**Resposta assumida:** a tela segue as convenções já definidas nas regras do repo (responsiva mobile-first, semântica correta); sem requisito adicional específico desta feature. Único cuidado explícito: valores de crédito/débito não podem depender **apenas** de cor para serem distinguidos (usar sinal +/−).

### 10. (Backend) Contrato HTTP — método, rota, response, códigos de erro?

**Resposta assumida (proposta a validar):** `GET /api/fidelidade/extrato?pagina=1&tamanhoPagina=20`, autenticado via token; identifica o cliente pelo token (nunca por parâmetro). Response com saldo atual + página de movimentos. `200` sucesso (inclusive lista vazia), `400` paginação inválida, `401` não autenticado. JSON de exemplo na spec.

*Justificativa:* como o backend é nosso e o endpoint nasce nesta entrega, o contrato é definido pela spec — marcado como proposta para o dono do backend validar naming/versionamento (questão em aberto Q3 sobre convenção de rota do projeto real).

### 11. (Backend) Persistência — entidade nova ou existente? Migration?

Coberto na pergunta 5 → questão em aberto Q2. A spec propõe a entidade `MovimentoPontos` e migration correspondente caso não exista.

### 12. (Backend) Efeitos colaterais — eventos, notificações, integrações?

**Resposta assumida:** nenhum. O endpoint é somente leitura; não emite eventos nem integra com sistemas externos.

### 13. (Backend) Idempotência, concorrência, volume esperado?

**Resposta assumida:** leitura é naturalmente idempotente; sem escrita, sem problema de concorrência. Volume assumido: até ~5.000 movimentos por cliente ao longo da vida da conta → paginação server-side obrigatória (20 por página) e índice por cliente + data. Requisito verificável na spec: p95 < 500 ms para clientes com até 5.000 movimentos.

*Justificativa:* ordem de grandeza típica de programa de fidelidade B2C; se o volume real for muito maior, só muda o índice/particionamento, não o contrato.
