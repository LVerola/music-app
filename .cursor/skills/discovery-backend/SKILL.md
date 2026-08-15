---
name: discovery-backend
description: Discovery de domínio backend (.NET/ASP.NET Core/EF Core). Use SEMPRE depois de @discovery e antes de editar API, use cases, domínio, repositórios, migrations, workers ou contratos HTTP. Cobre contexto delimitado, auth, contratos, persistência e workers. Pular só em perguntas read-only sobre backend. Também @discovery-backend.
---

# Discovery backend

Corre **depois** de @discovery, **antes** de qualquer edição de backend no projeto-alvo.

## Padrões esperados (stack desta biblioteca)

- Clean Architecture: Domain → Application → Infrastructure → Api
- Casos de uso / handlers na Application; portas por interfaces
- EF Core para persistência; migrations versionadas (não scripts SQL soltos como fonte de verdade)
- Contratos HTTP na camada Api (DTOs / records de request/response)

Adapta se o projeto documentar outro padrão — **lê o código** antes de assumir.

## Ownership

1. Qual contexto/módulo é dono disto?
2. Escrita (comando) ou leitura (consulta)? Qual caso de uso existente é o mais próximo?
3. Se escrita: precisa de transação explícita ou `SaveChanges` único basta?

## Auth / autorização

4. Endpoint protegido? Qual política/esquema?
5. Claims ou roles específicas? Não inventar — documentar ou perguntar.

## Comportamento

6. Auditoria necessária? Quais campos?
7. Logging estruturado? Nível e campos (sem segredos)?
8. Cache? Leitura frequente ou estado distribuído?
9. Throughput / SLA esperado?

## Contratos

10. Request: DTO existente ou novo?
11. Response: contrato existente ou novo?
12. Validação: onde (endpoint, caso de uso, domínio)?
13. Erros: códigos HTTP e mensagens por cenário de falha?

## Persistência

14. Leitura: repositório/query existente ou nova?
15. Escrita: agregado + repositório?
16. Mudança de schema? → migration EF segura (@migracao-ef-segura quando aplicável). Nunca script SQL solto como única alteração.
17. Índice novo necessário?

## Workers / background

18. Lógica na API ou em worker/função? Qual projeto existente?

Não inferir respostas. Recusa e pergunta quando um item for desconhecido.
