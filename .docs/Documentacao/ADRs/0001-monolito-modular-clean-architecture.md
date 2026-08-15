# ADR-0001: Adotar monólito modular com Clean Architecture no backend

> **Situação**: Aceito
> **Data**: 2026-08-15
> **Decisores**: Equipe MusicApp
> **Consultados**: convenções do repositório (`AGENTS.md`, backend .NET)
> **Informados**: quem for implementar a Fase 1

---

## 1. Contexto e problema

O monorepo tinha só o frontend Next.js. Era preciso nascer um backend .NET 10 que vá crescer com o jogo (puzzle, palpite, mais tarde auth), sem over-engineering e sem pintar o domínio num único `Program.cs`.

## 2. Forças em consideração

- **Time-to-market:** fundação, não o jogo ainda
- **Maturidade da equipe:** uma pessoa, convenções já pedem Domain/Application/Infrastructure/Api
- **Reversibilidade:** partir uma API anémica depois custa mais do que camadas vazias agora
- **Complexidade atual:** zero regras de negócio nesta entrega

## 3. Opções consideradas

### A) API única com Clean Architecture (4 projetos)
- Prós: alinha às skills/regras; caso de uso testável sem HTTP/EF; composição clara
- Contras: quatro csproj para uma API que hoje só tem health

### B) Um único projeto Web (Minimal API + EF no mesmo sítio)
- Prós: menos arquivos hoje
- Contras: a Fase 1 mistura HTTP, EF e regra de palpite no mesmo sítio; refactor imediato

### C) Microsserviços (catálogo, jogo, auth)
- Prós: escala independente no futuro
- Contras: rede, deploys, dados distribuídos; uma só pessoa; domínio instável

## 4. Decisão

Opção **A**. Projetos `MusicApp.Domain`, `.Application`, `.Infrastructure`, `.Api`. Sem MediatR/CQRS até a complexidade pagar.

## 5. Consequências

### Positivas
- A primeira feature entra como use case + porta + endpoint fino.
- Testes de domínio/application não precisam de Docker.

### Negativas
- Cerimónia visível nesta fundação (`AddApplication()` vazio).

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Camadas virarem pasta morta | A Fase 1 usa-as de verdade; não criar mais projetos “por se acaso” |

## 7. Plano de revisão

Rever se aparecer um segundo serviço real (worker de áudio, por exemplo) ou se a Application ficar só a repetir CRUD sem regra — aí simplificar.

## 8. Referências

- `.docs/Arquitetura/manual-do-projeto.md` §8–10
- `backend/MusicApp.slnx`
