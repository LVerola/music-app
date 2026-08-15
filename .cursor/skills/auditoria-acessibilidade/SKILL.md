---
name: auditoria-acessibilidade
description: Faz auditoria de acessibilidade WCAG 2.2 AA em interfaces web — semântica HTML, contraste, navegação por teclado, foco, ARIA correto, leitores de tela, alvos de toque, mensagens de erro acessíveis. Use SEMPRE que o usuário mencionar acessibilidade, WCAG, a11y, screen reader, leitor de tela, navegação por teclado, contraste, ARIA, foco, alvo de toque, deficiência visual/motora/cognitiva, audit, ou pedir @auditoria-acessibilidade. Aplique também antes de release de feature com UI nova.
---

# Auditoria de Acessibilidade

Skill que aplica WCAG 2.2 AA em componentes/telas concretos. Foco em **encontrar** problemas e **corrigir**, não só listar requisitos.

## Princípio orientador

> Acessibilidade não é um *layer* — é parte do design. Faz-se nos próprios componentes, com semântica primeiro e ARIA apenas quando necessário.

---

## 1. Antes de auditar — colher contexto

1. **Componente/tela específica** ou auditoria completa?
2. **Nível de conformidade alvo** — WCAG 2.2 AA (padrão), AAA (raro), apenas A?
3. **Público com necessidades específicas** identificado? (leitor de tela, navegação só por teclado, baixa visão, motora)
4. **Tem testes automatizados de a11y** rodando? (axe-core, eslint-plugin-jsx-a11y)
5. **Há tema escuro ou variantes de cor que precisam ser auditadas separadamente**?

---

## 2. As 4 grandes categorias WCAG

Toda regra WCAG cai em uma destas:

- **Perceptível** — usuário percebe a informação (texto alternativo, contraste, legendas).
- **Operável** — usuário consegue operar (teclado, tempo suficiente, alvos clicáveis).
- **Compreensível** — conteúdo e operação são entendíveis (idioma declarado, mensagens claras, comportamento previsível).
- **Robusto** — tecnologias assistivas conseguem interpretar (semântica HTML, ARIA correto).

---

## 3. *Checklist* sistemático (WCAG 2.2 AA)

Use este *checklist* em ordem. Cada item tem critério **falseável** e correcção típica.

### 3.1 Semântica HTML

| # | Verificar | Como detectar |
|---|---|---|
| S1 | Cada página tem exatamente **um** `<h1>` | `document.querySelectorAll('h1').length === 1` |
| S2 | Hierarquia de cabeçalhos sem pular nível | h1 → h2 → h3, nunca h1 → h3 |
| S3 | Botões clicáveis usam `<button>` (não `<div>` ou `<span>` com onClick) | Inspeccionar |
| S4 | Links que **navegam** usam `<a href>` | `<a>` sem `href` é não-link |
| S5 | Formulário tem `<form>` com `<label>` ligado a cada `<input>` | `for` + `id` ou aninhado |
| S6 | Imagens informativas têm `alt` descritivo | `<img alt="">` é decorativa, vazio mas presente |
| S7 | Listas usam `<ul>/<ol>/<dl>` | Em vez de `<div>` empilhados |
| S8 | Landmarks: `<header>`, `<main>`, `<nav>`, `<footer>` | Exactamente um `<main>` |
| S9 | Tabela tem `<th scope>` e `<caption>` se aplicável | Não usar tabela para layout |
| S10 | `<dialog>` ou padrão *modal* implementado corretamente | Foco preso, tecla Esc, restauração de foco |

### 3.2 Navegação por teclado

| # | Verificar |
|---|---|
| K1 | **Tudo** que se faz com mouse se faz com teclado |
| K2 | Ordem de tabulação segue ordem visual e lógica |
| K3 | Foco visível (anel/outline) em todos os elementos focáveis |
| K4 | Não há trap de foco (Tab sai do elemento ou modal volta para o foco anterior) |
| K5 | Modal abre com foco no primeiro elemento; Esc fecha; foco volta ao trigger |
| K6 | Componentes complexos (dropdown, accordion, tabs) seguem padrão ARIA Authoring Practices |
| K7 | Skip link no topo: "Pular para conteúdo principal" |

### 3.3 Contraste e cor

| # | Verificar | Critério |
|---|---|---|
| C1 | Texto normal (< 18pt) ≥ **4.5:1** | DevTools → Contrast |
| C2 | Texto grande (≥ 18pt regular / 14pt bold) ≥ **3:1** | DevTools → Contrast |
| C3 | Ícones/elementos UI funcionais ≥ **3:1** | DevTools → Contrast |
| C4 | Informação não depende **só** de cor | Erros têm ícone + texto; gráficos têm padrão diferente |
| C5 | Estados (hover, focus, disabled) cumprem contraste |  |

### 3.4 ARIA — usar com parcimónia

**Primeira regra do ARIA**: não use ARIA. Use HTML semântico. Só use ARIA quando não há equivalente.

| # | Verificar |
|---|---|
| A1 | `<div role="button">` é proibido — use `<button>` |
| A2 | `aria-label` em botões com só ícone (sem texto) |
| A3 | `aria-describedby` ligando erro de form ao input |
| A4 | `aria-invalid="true"` em input com erro |
| A5 | `aria-live="polite"` em region que mostra mensagens (toasts, status) |
| A6 | `aria-expanded` em accordion/dropdown |
| A7 | `aria-current="page"` em menu ativo |
| A8 | `aria-hidden="true"` em ícones decorativos |
| A9 | Sem `aria-*` redundante com semântica nativa (ex.: `role="button"` em `<button>`) |
| A10 | Sem `tabindex > 0` (quebra ordem de tabulação) |

### 3.5 Formulários

| # | Verificar |
|---|---|
| F1 | Cada input tem `<label>` real (não placeholder como label) |
| F2 | `placeholder` é dica, não substitui label |
| F3 | Campos obrigatórios marcados visualmente E com `aria-required="true"` ou `required` |
| F4 | Erro aparece junto ao campo, ligado via `aria-describedby` |
| F5 | Mensagem de erro em PT-BR, instrucional ("Informe a data no formato dd/mm/aaaa") |
| F6 | Validação não acontece **só** no submit (mas também não em cada tecla) |
| F7 | Botão de submit não-ambíguo: `<button type="submit">Salvar</button>` |
| F8 | Autocomplete configurado: `autocomplete="email"`, `autocomplete="cc-number"` |
| F9 | Tamanho mínimo do alvo de toque: **24×24 px** (mobile) |

### 3.6 Mídia e movimento

| # | Verificar |
|---|---|
| M1 | Vídeo tem legenda (captions) |
| M2 | Áudio crítico tem transcrição |
| M3 | Conteúdo que pisca não pisca > 3x por segundo |
| M4 | Auto-play de vídeo/áudio com som é proibido |
| M5 | Animações respeitam `prefers-reduced-motion` |
| M6 | Carousel pode ser pausado e navegado por teclado |

### 3.7 Cabeçalho do documento

| # | Verificar |
|---|---|
| D1 | `<html lang="pt-BR">` |
| D2 | `<title>` descritivo único por página |
| D3 | `<meta name="viewport">` permite zoom (sem `user-scalable=no`) |
| D4 | Conteúdo legível em **400% zoom** sem perder funcionalidade |

---

## 4. Como testar — ferramentas

### 4.1 Automatizado (apanha ~30-40% dos problemas)

```powershell
# axe DevTools (extensão browser) — rodar em cada tela
# eslint-plugin-jsx-a11y (já presente em Next.js?)
npm install --save-dev eslint-plugin-jsx-a11y

# Pa11y CLI
npm install -g pa11y
pa11y https://staging.exemplo.com/pagina --standard WCAG2AA

# Lighthouse → seção Accessibility
```

### 4.2 Manual (apanha os outros ~60%)

| Teste | Como |
|---|---|
| **Teclado puro** | Desligue o mouse. Navegue pela página inteira. Use **só** Tab, Shift+Tab, Enter, Espaço, setas, Esc |
| **Leitor de tela** | NVDA (Windows, grátis), VoiceOver (Mac, nativo), TalkBack (Android) |
| **Zoom 200% / 400%** | Configurações do navegador |
| **Modo alto contraste** | Windows: Configurações de Acessibilidade |
| **Daltonismo simulado** | Chrome DevTools → Rendering → Emulate vision deficiencies |
| **Conexão lenta** | Throttling Slow 3G — *spinner* aparece? Faz sentido? |

---

## 5. Padrões de componentes acessíveis

### 5.1 Botão com ícone

```tsx
// ❌ BAD — sem texto, sem aria-label, ícone como botão
<div onClick={apagar}><TrashIcon /></div>

// ✅ GOOD
<button type="button" onClick={apagar} aria-label="Apagar item">
  <TrashIcon aria-hidden="true" />
</button>
```

### 5.2 Modal

```tsx
import { Dialog } from "@radix-ui/react-dialog";

<Dialog>
  <Dialog.Trigger asChild>
    <button>Editar</button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
    <Dialog.Content className="fixed inset-0 m-auto h-fit w-fit rounded-lg bg-white p-6">
      <Dialog.Title>Editar cliente</Dialog.Title>
      <Dialog.Description>Atualize os dados do cliente.</Dialog.Description>
      {/* conteúdo */}
      <Dialog.Close asChild>
        <button>Cancelar</button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog>
```

> Radix já trata foco, Esc, restauração de foco, `aria-*` — use a biblioteca em vez de reinventar.

### 5.3 Input com erro

```tsx
<div>
  <label htmlFor="email" className="block text-sm font-medium">
    E-mail <span aria-hidden="true" className="text-red-600">*</span>
  </label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-invalid={Boolean(erros.email)}
    aria-describedby={erros.email ? "email-erro" : undefined}
    autoComplete="email"
    className="mt-1 w-full rounded-md border px-3 py-2"
  />
  {erros.email && (
    <p id="email-erro" role="alert" className="mt-1 text-sm text-red-600">
      {erros.email.message}
    </p>
  )}
</div>
```

### 5.4 Skip link

```tsx
// no topo do <body>
<a
  href="#conteudo-principal"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white"
>
  Pular para conteúdo principal
</a>
<main id="conteudo-principal">...</main>
```

### 5.5 Tabela

```tsx
<table>
  <caption className="sr-only">Lista de clientes activos</caption>
  <thead>
    <tr>
      <th scope="col">Nome</th>
      <th scope="col">E-mail</th>
      <th scope="col">Acções</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Maria Silva</th>
      <td>maria@example.com</td>
      <td><button>Editar</button></td>
    </tr>
  </tbody>
</table>
```

### 5.6 Carousel acessível

- Botões "Anterior" e "Próximo" como `<button>`.
- `aria-live="polite"` na region do *slide* atual.
- Possibilidade de pausar.
- Navegação por setas do teclado.
- Não auto-play sem controle.

---

## 6. Output esperado da skill

```markdown
## Auditoria de acessibilidade — <tela/componente>

### 1. Resumo

- **Total de problemas encontrados**: 14
  - Crítico (impede uso): 3
  - Sério (degrada significativamente): 6
  - Moderado (causa confusão): 4
  - Menor (cosmético/refinamento): 1

### 2. Problemas críticos

#### C1: Modal sem captura de foco
- **Arquivo**: `src/components/modal-confirmacao.tsx:42`
- **Critério WCAG**: 2.4.3 Focus Order (A)
- **Impacto**: Usuário de teclado fica perdido — Tab sai do modal e vai para fundo.
- **Reprodução**: Abrir modal → Tab. Foco sai para botões atrás.
- **Correcção**:
  ```tsx
  // Substituir implementação custom por Radix Dialog
  ```

#### C2: Botão "Apagar" sem texto acessível
...

### 3. Problemas sérios

...

### 4. Plano de correcção (priorizado)

| # | Acção | Esforço | Critério WCAG |
|---|---|---|---|
| 1 | Substituir modal custom por Radix Dialog | M | 2.4.3 |
| 2 | Adicionar aria-label aos botões com só ícone | P | 4.1.2 |
| 3 | Corrigir contraste 3.2:1 → 4.5:1 no texto secundário | P | 1.4.3 |
| ... | ... | ... | ... |

### 5. Como validar

- Rodar axe-core: deve não reportar nenhum erro.
- Teste manual com teclado: navegar a página inteira sem mouse.
- Teste com NVDA: cada acção lê o esperado.
```

---

## 7. Anti-padrões comuns

| Padrão | Por quê é mau | Alternativa |
|---|---|---|
| `<div onClick>` | Não é focável, não tem semântica | `<button>` |
| `placeholder` como label | Some quando digita, contraste fraco | `<label>` real |
| `*` vermelho para campo obrigatório | Daltónico não vê | `required` + texto auxiliar + cor |
| `outline: none` sem substituir | Anula foco visível | Anel customizado |
| `aria-hidden="true"` em conteúdo importante | Esconde de leitor de tela | Remover |
| `role="button"` em `<button>` | Redundante | Remover |
| `tabindex="1"` para "primeiro" | Quebra ordem natural | Reordenar HTML |
| Toast só com cor (vermelho/verde) | Daltónico não diferencia | Ícone + cor |
| Erro de validação só com `border: red` | Sem mensagem de erro | `<p role="alert">` |
| `tabindex="-1"` em link normal | Tira de tabulação | Remover |
| Botão com `type` não declarado em form | Vira submit por padrão | `type="button"` explícito |

---

## 8. Pós-auditoria

- Adicione `eslint-plugin-jsx-a11y` no CI se não houver.
- Considere axe-core nos testes Playwright (snapshot de a11y por tela).
- Documente em `Documentacao/` o estado de a11y do produto e as decisões.
- Para mudanças grandes, considere ADR (ex.: "Adoptamos Radix UI como base de componentes acessíveis").
