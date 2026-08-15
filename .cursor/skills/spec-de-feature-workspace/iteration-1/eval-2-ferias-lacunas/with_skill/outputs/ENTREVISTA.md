# Entrevista — Formulário de solicitação de férias

> O utilizador não estava disponível para responder. Este ficheiro documenta as perguntas
> que seriam feitas na fase de entrevista da skill `@spec-de-feature`, o que já se sabe
> a partir do pedido original, e o que ficou registado como questão em aberto na spec.

## O que o pedido original já responde

- **Feature:** formulário de solicitação de férias no portal do colaborador.
- **Campos conhecidos:** data de início, data de fim e um campo de observação.
- **Lacunas admitidas pelo próprio utilizador:** não sabe como o RH aprova a solicitação
  nem qual endpoint usar. Estas duas lacunas **não foram inventadas** — estão na secção
  "Questões em aberto" da spec.

## Ronda 1 — perguntas gerais

1. **Problema e objetivo** — hoje como o colaborador pede férias (e-mail? papel? sistema legado)? Como sabemos que a feature ficou pronta e certa — basta a solicitação ficar registada, ou precisa de chegar ao RH por algum canal específico?
2. **Ator e permissões** — só o próprio colaborador solicita as suas férias, ou um gestor pode solicitar em nome da equipa? O RH acede pela mesma tela ou por outra área?
3. **Escopo desta entrega** — esta fatia inclui só o formulário de envio, ou também a listagem de solicitações do colaborador e a tela de aprovação do RH? O que fica explicitamente de fora?
4. **Regras de negócio das datas** — data de início tem antecedência mínima (ex.: 30 dias, como na CLT brasileira)? Há duração mínima/máxima do período? Pode fracionar? E se o período se sobrepuser a uma solicitação já existente ou pendente?
5. **Saldo de férias** — o formulário deve validar/exibir o saldo de dias disponíveis do colaborador? Se sim, de onde vem esse dado?
6. **Campo de observação** — é obrigatório ou opcional? Tem limite de caracteres?
7. **Dependências** — o backend desta solicitação já existe (endpoint, tabela) ou precisa de ser criado junto? Há integração com sistema de folha/RH externo (ex.: TOTVS, ADP)?

## Ronda 2 — perguntas de frontend (tela/fluxo)

1. **Rota e ponto de entrada** — qual a rota no portal (ex.: `/ferias/solicitar`)? Entra-se por item de menu, botão numa dashboard, ou ambos? Para onde navega após enviar com sucesso?
2. **Contrato do endpoint** — qual o método/rota, formato do body e da resposta, e códigos de erro por cenário? *(o utilizador declarou não saber — registado como questão em aberto)*
3. **Fluxo de aprovação do RH** — o que acontece depois do envio: a solicitação nasce com estado "pendente"? O colaborador vê o estado? O RH é notificado? *(o utilizador declarou não saber — registado como questão em aberto)*
4. **Estados da tela** — o que mostrar em loading, erro de envio, e sucesso? Após sucesso, o formulário limpa, redireciona, ou mostra confirmação inline?
5. **Componentes existentes** — o portal já tem componentes de formulário, date picker e toast/alerta que devam ser reutilizados? Em que caminhos do repositório?
6. **Edição/cancelamento** — o colaborador pode editar ou cancelar uma solicitação já enviada, ou isso fica fora desta entrega?
7. **Responsividade/acessibilidade** — o portal tem requisito explícito de mobile ou WCAG que esta tela deva cumprir?

## Destino das respostas

- Perguntas com resposta inferível do pedido → incorporadas na spec como requisitos.
- Perguntas sem resposta (incluindo as lacunas admitidas: fluxo de aprovação e endpoint)
  → secção **8. Questões em aberto** de `Specs/SPEC-solicitacao-ferias.md`, cada uma com decisor sugerido.
