---
name: discovery-frontend
description: Discovery de domínio frontend (Next.js/React). Use SEMPRE depois de @discovery e antes de editar UI, rotas, componentes, hooks, services HTTP no cliente, formulários ou estados de ecrã. Cobre feature-first, estados loading/empty/error/success, camada de dados e reuso. Pular só em perguntas read-only sobre frontend. Também @discovery-frontend.
---

# Discovery frontend

Corre **depois** de @discovery, **antes** de qualquer edição de frontend no projecto-alvo.

## Layout esperado (stack desta biblioteca)

- Rotas em `app/` (App Router) — composição sem regra de negócio em `page.tsx`
- Features em `features/<nome>/` (components, hooks, services, schemas, types)
- Primitivos em `components/ui/` (ou equivalente do design system)
- HTTP **só** em `features/*/services/` — nunca `fetch`/`axios` directo em componentes

Adapta caminhos se o projecto usar outra convenção documentada — **lê o código** antes de assumir.

## Escopo

1. Página nova ou existente? Qual rota?
2. Há handoff de design (Figma, screenshot, spec)? UI nova sem fonte de verdade → recusa ou pergunta.
3. Qual feature/pasta é dona desta UI?

## Reuso

4. Ecrã similar já existe na feature?
5. Primitivos reutilizáveis no design system?
6. Estender/compor o existente ou componente novo justificado?

## Estados (obrigatórios)

7. Quais dos quatro estão definidos? Recusa implementar se faltar algum sem adiamento explícito do utilizador:

   - [ ] Loading
   - [ ] Empty
   - [ ] Error
   - [ ] Success

## Camada de dados

8. Chamadas HTTP só na camada de service da feature?
9. Hook de dados (TanStack Query ou padrão do projecto) — qual query key / cache?
10. Endpoint novo no backend? → invoca também @discovery-backend.

Não implementes até cada item estar respondido ou explicitamente adiado pelo utilizador.
