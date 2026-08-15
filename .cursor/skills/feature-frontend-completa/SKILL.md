---
name: feature-frontend-completa
description: Implementa uma fatia vertical completa de uma feature no frontend Next.js 15 / React 19 / TypeScript / Tailwind 4 — rota, componentes, formulário (RHF+Zod), serviço HTTP (axios + TanStack Query), estados (loading/erro/vazio), tipos e testes. Use SEMPRE que o utilizador pedir para criar uma tela, página, fluxo, feature, módulo ou funcionalidade nova no frontend; quando mencionar Next.js, React, App Router, server component, client component, página, rota, listagem, formulário, CRUD no front, ou pedir @feature-frontend-completa.
---

# Feature Frontend Completa

Skill para implementar uma **fatia vertical** completa de uma feature no frontend, do tipo de dado até a tela renderizada, seguindo as convenções da regra `@frontend`.

## Quando aplicar

Sempre que o trabalho envolver mais que um arquivo isolado — quando o entregável é "permitir o utilizador fazer X". Exemplos:

- "Cria a tela de listagem de produtos com filtro e paginação".
- "Adiciona um wizard de cadastro de cliente em 3 etapas".
- "Implementa a página de edição de pedido com validação".
- "Cria a feature de upload de comprovante com pré-visualização".

---

## 1. Antes de codar — alinhar contexto

Faça (com brevidade) estas perguntas se a US/issue não responder:

1. **Rota e nome de exibição** — qual o caminho? (`/portal/clientes` etc.) Aparece no menu? Em qual papel?
2. **Permissões** — quem pode aceder? Há comportamento condicional por *role*?
3. **Origem dos dados** — endpoint REST existe? Qual o contrato? Se não existir, qual o backend a contactar/criar?
4. **Tipos** — já há DTOs em `src/types/`? Sigam-os.
5. **Componentes existentes** — já existe um `<DataTable>` ou `<Modal>` no `components/ui/`? Reaproveite.
6. **Acessibilidade / i18n** — texto em PT-BR (regra `AGENTS.md`); há requisito de WCAG explícito?
7. **Testes esperados** — TDD obrigatório para regra de negócio nova; E2E em Playwright para o fluxo crítico.

---

## 2. Estrutura mínima da fatia vertical

Toda feature gera (na ordem) estes arquivos:

```
src/
├── types/<dominio>.ts                                  # DTOs/entidades/enums
├── services/<dominio>/<dominio>.service.ts             # chamadas axios via apiRequest
├── services/<dominio>/<dominio>.queries.ts             # hooks TanStack Query (useX, useXById)
├── services/<dominio>/<dominio>.mutations.ts           # hooks de mutation (criar/editar/apagar)
├── services/<dominio>/<dominio>.schema.ts              # schemas Zod (form + DTO se necessário)
├── components/portal/<dominio>/                        # UI específica deste fluxo
│   ├── lista-<dominio>.tsx                             # tabela/cards de listagem
│   ├── formulario-<dominio>.tsx                        # form RHF + Zod
│   ├── modal-<dominio>.tsx (se houver)
│   └── colunas-<dominio>.ts (se houver tabela)
├── components/portal/<dominio>/__tests__/              # testes unitários (Jest + TL)
│   └── formulario-<dominio>.test.tsx
└── app/(portal)/<dominio>/                             # rotas
    ├── page.tsx                                        # rota de listagem (server component)
    ├── [id]/page.tsx                                   # rota de detalhe (server component)
    └── components/                                     # quando o componente é único da rota
```

**Princípios:**

- `page.tsx` deve ser **fino**: orquestra (busca inicial, layout, *suspense*) e delega.
- Chamadas HTTP **nunca** vão no componente — sempre num *service*.
- Estado de servidor **sempre** via TanStack Query — não use `useEffect + fetch`.
- *Client components* só quando há interactividade real (form, drag, hover state significativo).

---

## 3. Sequência de implementação (TDD)

### Passo 1: Tipos e contratos (`src/types/<dominio>.ts`)

Defina DTOs alinhados ao backend e tipos da UI quando divergem:

```ts
export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  email: string;
  criadoEm: string;
}

export interface CriarClienteInput {
  nome: string;
  documento: string;
  email: string;
}

export type ClienteListagem = Pick<Cliente, "id" | "nome" | "documento" | "email">;
```

### Passo 2: Schemas Zod (`schema.ts`)

```ts
import { z } from "zod";

export const schemaCriarCliente = z.object({
  nome: z.string().min(3, "Nome precisa ter ao menos 3 caracteres"),
  documento: z.string().regex(/^\d{11}|\d{14}$/, "Documento inválido (CPF ou CNPJ)"),
  email: z.string().email("E-mail inválido"),
});

export type FormCriarCliente = z.infer<typeof schemaCriarCliente>;
```

> Reutilize o mesmo schema para validar o *input* enviado ao backend e o estado do form.

### Passo 3: Serviço HTTP (`*.service.ts`)

```ts
import { apiRequest } from "@/lib/apiRequest";
import type { Cliente, CriarClienteInput, ClienteListagem } from "@/types/cliente";

export async function obterClientes(): Promise<ClienteListagem[]> {
  return apiRequest.get<ClienteListagem[]>("/clientes");
}

export async function obterClientePorId(id: string): Promise<Cliente> {
  return apiRequest.get<Cliente>(`/clientes/${id}`);
}

export async function criarCliente(dados: CriarClienteInput): Promise<Cliente> {
  return apiRequest.post<Cliente>("/clientes", dados);
}
```

> O `apiRequest` já trata interceptors de auth, refresh e erros 401. **Não** trate dentro do componente.

### Passo 4: Queries e mutations (TanStack Query)

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { obterClientes, obterClientePorId, criarCliente } from "./cliente.service";

export const chavesClientes = {
  todos: ["clientes"] as const,
  porId: (id: string) => ["clientes", id] as const,
};

export function useClientes() {
  return useQuery({
    queryKey: chavesClientes.todos,
    queryFn: obterClientes,
    staleTime: 60_000,
  });
}

export function useClientePorId(id: string) {
  return useQuery({
    queryKey: chavesClientes.porId(id),
    queryFn: () => obterClientePorId(id),
    enabled: Boolean(id),
  });
}

export function useCriarCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chavesClientes.todos });
    },
  });
}
```

### Passo 5: Testes do formulário e do serviço (antes da UI final)

```tsx
// formulario-cliente.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioCliente } from "../formulario-cliente";

describe("FormularioCliente", () => {
  it("deve mostrar erro quando documento for inválido", async () => {
    render(<FormularioCliente aoSalvar={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/documento/i), "123");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));
    expect(await screen.findByText(/documento inválido/i)).toBeInTheDocument();
  });

  it("deve chamar aoSalvar quando dados válidos forem enviados", async () => {
    const aoSalvar = vi.fn();
    render(<FormularioCliente aoSalvar={aoSalvar} />);

    await userEvent.type(screen.getByLabelText(/nome/i), "Maria Silva");
    await userEvent.type(screen.getByLabelText(/documento/i), "12345678900");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "maria@example.com");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    expect(aoSalvar).toHaveBeenCalledWith({
      nome: "Maria Silva",
      documento: "12345678900",
      email: "maria@example.com",
    });
  });
});
```

### Passo 6: Componente do formulário (RHF + Zod)

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemaCriarCliente, type FormCriarCliente } from "@/services/cliente/cliente.schema";

interface PropsFormularioCliente {
  valoresIniciais?: Partial<FormCriarCliente>;
  aoSalvar: (dados: FormCriarCliente) => Promise<void> | void;
  estaSalvando?: boolean;
}

export function FormularioCliente({ valoresIniciais, aoSalvar, estaSalvando }: PropsFormularioCliente) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormCriarCliente>({
    resolver: zodResolver(schemaCriarCliente),
    defaultValues: valoresIniciais,
  });

  return (
    <form onSubmit={handleSubmit(aoSalvar)} className="space-y-4">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium">Nome</label>
        <input id="nome" {...register("nome")} className="mt-1 w-full rounded-md border px-3 py-2" />
        {errors.nome && <p role="alert" className="mt-1 text-sm text-red-600">{errors.nome.message}</p>}
      </div>
      {/* documento, email — mesmo padrão */}
      <button type="submit" disabled={estaSalvando} className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {estaSalvando ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
```

### Passo 7: Componente de listagem

```tsx
"use client";
import { useClientes } from "@/services/cliente/cliente.queries";

export function ListaClientes() {
  const { data: clientes, isLoading, isError, refetch } = useClientes();

  if (isLoading) return <EsqueletoLista quantidade={5} />;
  if (isError) return <EstadoErro aoTentarNovamente={refetch} />;
  if (!clientes?.length) return <EstadoVazio mensagem="Nenhum cliente cadastrado" />;

  return (
    <ul role="list" className="divide-y">
      {clientes.map((cliente) => (
        <li key={cliente.id} className="py-3">
          <span className="font-medium">{cliente.nome}</span>
          <span className="ml-2 text-sm text-gray-500">{cliente.email}</span>
        </li>
      ))}
    </ul>
  );
}
```

> **Sempre** trate os 4 estados: `loading`, `error`, `empty`, `success`. Não exiba "Nenhum resultado" enquanto está a carregar — confusão imediata para o utilizador.

### Passo 8: Rotas App Router

```tsx
// src/app/(portal)/clientes/page.tsx
import { ListaClientes } from "@/components/portal/cliente/lista-clientes";

export default function PaginaClientes() {
  return (
    <main className="p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <BotaoNovoCliente />
      </header>
      <ListaClientes />
    </main>
  );
}
```

> A `page.tsx` é **server component** por defeito. Componentes interativos vão para arquivos próprios com `"use client"`.

### Passo 9: Validação manual e E2E

- Cheque os 4 estados manualmente no navegador.
- Confirme contraste e foco (Tab/Shift+Tab).
- Adicione 1 teste Playwright para o fluxo crítico (criar e listar).

---

## 4. Acessibilidade — mínimos não-negociáveis

- Todo `input` tem `<label htmlFor=...>` ligado.
- Erros de form ficam em `<p role="alert">` para *screen readers*.
- Botões usam `<button>`, não `<div>` com `onClick`.
- Imagens informativas têm `alt` real; decorativas `aria-hidden="true"`.
- Estado de *focus* visível (não remova `outline` sem substituir).
- `aria-busy="true"` em listas/tabelas durante carregamento.

---

## 5. Padrões a evitar

| Anti-padrão | Por que evita | Alternativa |
|---|---|---|
| `useEffect` + `fetch` dentro do componente | Sem cache, sem retry, sem invalidate | `useQuery` |
| Tratar `401`/`refresh` no componente | Lógica duplicada | Já está no `apiRequest` |
| `any` em DTO | Perde *type safety* | DTO em `src/types/` |
| `style={{ ... }}` em vez de Tailwind | Quebra consistência | Tokens via `cn()` |
| Componente com mais de ~200 linhas | Difícil de testar | Extrair subcomponentes/hooks |
| Estado global "porque é mais fácil" | Acopla árvore | Composição/props |
| Salvar token em `localStorage` | XSS-prone | Cookie httpOnly (lado servidor) |
| `"use client"` no topo de `page.tsx` | Perde RSC | Marque só os subcomponentes interactivos |

---

## 6. Checklist de entrega

Antes de dar PR, verifique:

- [ ] Tipos em `src/types/<dominio>.ts`.
- [ ] Service em `src/services/<dominio>/` com nomes em PT-BR (`obterClientes`, `criarCliente`).
- [ ] Queries e mutations exportadas com chaves consistentes (`chavesClientes`).
- [ ] Schema Zod único usado em form **e** validação de input do serviço.
- [ ] Form usa RHF + `zodResolver`, sem `useState` para campos individuais.
- [ ] Componente de listagem trata 4 estados.
- [ ] Componente de form trata 3 estados (idle, submitting, error de submissão do backend).
- [ ] Texto da UI em PT-BR (labels, mensagens de erro, botões).
- [ ] Acessibilidade: labels, roles, foco.
- [ ] Testes unitários para validação e para o `aoSalvar`.
- [ ] Rota integrada e visível no menu (se aplicável).
- [ ] Lint, build e testes passam.

---

## 7. Quando pedir confirmação ao utilizador

- Quando o backend ainda não existir — pergunte se deve **criar mock** (MSW) ou **bloquear até endpoint**.
- Quando o domínio for incerto (`cliente` vs `parceiro` vs `usuario`) — pergunte o nome canónico.
- Quando notar duplicação significativa com domínio existente — pergunte se deve reutilizar/refatorar.

---

## 8. Pós-entrega

- Sugira correr `@code-review` para revisão crítica.
- Sugira correr `@documentacao` para gerar a documentação técnica + funcional da US.
- Se foi entrega de épico, ofereça gerar o **próximo *slice***.
