---
name: auditoria-performance-web
description: Audita performance de aplicação web Next.js/React — Core Web Vitals (LCP, INP, CLS), bundle size, server vs client components, lazy loading, prefetch, cache HTTP, imagens otimizadas. Diagnostica gargalos com Lighthouse, Web Vitals e análise estática. Use SEMPRE que o utilizador mencionar página lenta, LCP alto, CLS, INP, TTFB, Core Web Vitals, bundle grande, hydration, performance frontend, Lighthouse, ou pedir @auditoria-performance-web.
---

# Auditoria de Performance Web

Skill que faz auditoria sistemática de performance num app Next.js / React, partindo das **métricas que importam ao utilizador** (Core Web Vitals) e descendo até a causa.

## Quando aplicar

- "A página inicial está lenta".
- "O Lighthouse marca 40 de performance".
- "O LCP saltou para 4s depois do último deploy".
- "Bundle aumentou demais".
- "Time-to-interactive demora 8 segundos".

---

## 1. Antes de auditar — colher contexto

1. **Página/rota específica** ou app inteiro?
2. **Métrica que dói** — número actual e número alvo.
3. **Ambiente** — staging, produção, dispositivo (desktop / mobile / 3G)?
4. **Versão Next.js** e configuração (`next.config.js`, App Router, output).
5. **Quando piorou?** (deploy específico, dependência nova, dado novo)
6. **% de utilizadores afectados** se for métrica de campo (RUM).

---

## 2. Métricas-alvo (Core Web Vitals)

| Métrica | O que mede | Bom | Precisa melhorar | Ruim |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Maior conteúdo visível pintado | ≤ 2.5s | ≤ 4s | > 4s |
| **INP** (Interaction to Next Paint) | Tempo até próxima pintura após interação | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Deslocamento de layout não esperado | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **TTFB** | *Time to first byte* | ≤ 800ms | ≤ 1.8s | > 1.8s |
| **FCP** (First Contentful Paint) | Primeira pintura | ≤ 1.8s | ≤ 3s | > 3s |

---

## 3. Sequência de diagnóstico

```
1. Medir       → Lighthouse + WebPageTest + Real User Monitoring (RUM)
2. Atribuir    → qual métrica está mal e qual recurso/etapa causa
3. Hipotetizar → categoria do gargalo (network, render, JS, image, font, layout)
4. Agir        → menor mudança que move a agulha
5. Re-medir    → confirmar com 3 execuções, ver variação
```

> Sempre meça em **modo incógnito** (sem extensões) e em **mobile throttled** (Slow 4G + 4x CPU) — é onde o utilizador real está.

---

## 4. Como atribuir cada métrica

### LCP — Largest Contentful Paint

Pergunta: **o que é o LCP element?** (Lighthouse mostra).

| LCP element | Acção típica |
|---|---|
| Imagem `<img>` | `priority` + `sizes` certos + formato moderno (WebP/AVIF) + `next/image` |
| Imagem hero CSS background | Trazer para HTML `<img priority>` ou pré-carregar com `<link rel="preload" as="image">` |
| Bloco de texto grande | Reduzir trabalho do servidor (TTFB), evitar fetch bloqueante |
| Vídeo poster | Pré-carregar o poster como imagem |

**Causas comuns**:
- TTFB alto (servidor lento ou rota *all client*).
- Imagem hero sem `priority`.
- Imagem sem formato moderno.
- Fonte web bloqueando render.
- Render bloqueado por JS gigante (hydration).

### INP — Interaction to Next Paint

INP > 500ms significa que o *main thread* está ocupado durante interação.

**Causas comuns**:
- *Heavy* component renderizando tudo a cada *keystroke*.
- *Effect* síncrono em interação.
- *Listener* global sem *debounce/throttle*.
- *State update* causando *re-render* de árvore enorme.

**Acções**:
- `useDeferredValue` ou `startTransition` para *updates* não-urgentes.
- Memoização (`useMemo`, `React.memo`) em componentes pesados (não em todos).
- `requestIdleCallback` para trabalho não crítico.
- Web Worker para CPU-bound (parsing, encriptação).

### CLS — Cumulative Layout Shift

CLS > 0.1 significa que algo entra na página depois e empurra conteúdo.

**Causas comuns**:
- `<img>` sem `width`/`height` ou `aspect-ratio`.
- Fontes web carregando depois (FOIT/FOUT) sem `font-display: optional`.
- Conteúdo injetado dinamicamente acima do *fold* (banner, A/B test).
- Skeleton de tamanho diferente do conteúdo real.

**Acções**:
- `next/image` sempre que possível (preenche `width/height`).
- `font-display: swap` + `next/font` (já optimiza).
- Reservar espaço para banners (`min-height`).

### TTFB

TTFB alto = servidor demora a responder.

**Causas comuns** (Next.js):
- Página renderizada como *Client Component* tudo (sem RSC).
- Fetch sem cache em RSC bloqueando *streaming*.
- API a montante lenta (sem cache, sem stale-while-revalidate).
- Edge não usado quando podia.

---

## 5. Auditoria de bundle JS

### 5.1 Medir tamanho

```powershell
# Next.js mostra ao terminar o build
npm run build

# Análise visual
npm install --save-dev @next/bundle-analyzer
# em next.config.js:
# const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
$env:ANALYZE='true'; npm run build
```

### 5.2 Targets

| Tipo | Alvo |
|---|---|
| First Load JS (rota crítica) | < 200 KB *gzipped* |
| Por rota | < 100 KB *gzipped* novo |
| Shared chunks total | < 250 KB |

### 5.3 Suspeitos comuns

| Pacote | Problema | Alternativa |
|---|---|---|
| `moment` | 70 KB minified | `date-fns` ou `dayjs` |
| `lodash` (full) | 70 KB | `lodash-es` + tree shaking; ou função própria |
| `material-ui` v4 sem tree-shake | Bundle gigante | v5 ou `@mui/material` com imports correctos |
| Ícones inteiros | KB acima da necessidade | Importar ícone a ícone |
| `chart.js` em rota não-gráfica | Carregado para todos | `dynamic(import())` lazy |
| Polyfill desnecessário em browsers modernos | KB inútil | `browserslist` ajustado |

### 5.4 Acções

- **Dynamic import**: `const Chart = dynamic(() => import('./Chart'), { ssr: false })`.
- **Code splitting por rota**: já é padrão no Next.js App Router.
- **Tree-shake**: `import { fn } from 'lib'` em vez de `import * as lib`.
- **Externalizar runtime**: bibliotecas grandes em CDN com cache compartilhado (raramente vale).

---

## 6. Server Components vs Client Components

Padrão Next.js 15 App Router:

| Tipo | Quando |
|---|---|
| **Server Component** (default) | Listagem que só lê dado; render sem interactividade; lógica que precisa de segredo do servidor |
| **Client Component** (`"use client"`) | Form, dropdown interactivo, drag-and-drop, qualquer estado/efeito |

**Anti-padrão**: `"use client"` no topo da `page.tsx` → arrasta árvore inteira para o cliente.

**Padrão correcto**:
```tsx
// page.tsx (server)
import { ListaPedidos } from "./lista-pedidos";          // server
import { FiltroPedidos } from "./filtro-pedidos";        // client

export default async function Pagina() {
  const pedidos = await obterPedidos();
  return (
    <main>
      <FiltroPedidos />              {/* client, pequeno */}
      <ListaPedidos pedidos={pedidos} />  {/* server, grande */}
    </main>
  );
}
```

---

## 7. Imagens

### Regras

- **Sempre** `next/image` (não `<img>` directo) em conteúdo dinâmico.
- **`priority`** na imagem hero (LCP).
- **`sizes`** explícito para imagens responsivas — sem `sizes`, o browser baixa a maior.
- Formato **AVIF > WebP > JPEG**.
- **`alt`** descritivo (acessibilidade); decorativas: `alt=""`.
- Tamanho real próximo do *displayed* — não baixar 4000px para mostrar 400px.

```tsx
<Image
  src="/hero.jpg"
  alt="Equipa em reunião sobre o lançamento"
  width={1200}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
  priority
/>
```

---

## 8. Fontes

- Use `next/font` (auto self-host + `font-display: swap`).
- Subset: só os caracteres que vai usar.
- Pré-carregar a primária; **não** pré-carregar todas (custo de rede).
- Evite **mais de 2 famílias** + 4 pesos.

```tsx
import { Poppins } from "next/font/google";
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });
```

---

## 9. Cache HTTP / CDN

| Recurso | Estratégia |
|---|---|
| HTML de página dinâmica | `Cache-Control: no-store` ou `s-maxage` curto (60-300s) |
| Página estática | `s-maxage=31536000, stale-while-revalidate` |
| API endpoint | `s-maxage` com `stale-while-revalidate` |
| `_next/static/**` | `immutable, max-age=31536000` (Next.js já configura) |
| Imagens não-críticas | CDN edge + WebP/AVIF |

No App Router, `revalidate` controla o cache em RSC:
```tsx
export const revalidate = 60;       // ISR a cada 60s
```

---

## 10. Hydration

Hydration cara = INP/LCP afectados.

- Reduzir **árvore client**: começar com server, descer para client onde precisa.
- **Streaming** RSC: `<Suspense>` para que partes lentas não bloqueiem o resto.
- **`loading.tsx`** para feedback imediato durante navegação.

```tsx
// app/clientes/page.tsx
import { Suspense } from "react";

export default function Pagina() {
  return (
    <>
      <Filtros />
      <Suspense fallback={<EsqueletoLista />}>
        <ListaClientes />
      </Suspense>
    </>
  );
}
```

---

## 11. Output esperado da skill

Relatório estruturado:

```markdown
## Auditoria de Performance — <rota/app>

### 1. Estado actual (medições)

| Métrica | Actual | Alvo | Status |
|---|---|---|---|
| LCP | 4.2s | 2.5s | ❌ |
| INP | 180ms | 200ms | ✅ |
| CLS | 0.28 | 0.1 | ❌ |
| TTFB | 1.1s | 800ms | ⚠️ |
| First Load JS | 380 KB | 200 KB | ❌ |

### 2. Gargalos identificados

#### Gargalo 1: LCP afectado por imagem hero sem `priority`
- **Evidência**: Lighthouse aponta `<img src="/hero.jpg">` como LCP element, sem `priority`.
- **Causa**: imagem é a maior do *viewport* e bloqueia LCP.

#### Gargalo 2: CLS por banner injetado após render
- ...

### 3. Plano de acção (priorizado por impacto/esforço)

| # | Acção | Impacto esperado | Esforço |
|---|---|---|---|
| 1 | Adicionar `priority` à imagem hero e converter para AVIF | LCP -1.5s | Baixo |
| 2 | Reservar espaço para banner com `min-height` | CLS de 0.28 → ≤0.1 | Baixo |
| 3 | Lazy-load do componente de gráfico em /dashboard | Bundle -120 KB | Médio |
| 4 | Mover componentes da home para Server Components | Hydration -300ms | Médio |

### 4. Como validar

- Rodar Lighthouse 3 vezes (modo incógnito, mobile slow 4G).
- Comparar `next build` antes/depois para tamanho do bundle.
- RUM em produção 24-48h após deploy.

### 5. Riscos e regressões a monitorar
- ...
```

---

## 12. Anti-padrões

| Padrão | Por quê é mau | Alternativa |
|---|---|---|
| `useEffect(() => fetch())` em vez de RSC ou Query | Bloqueio + waterfall | RSC com `fetch` server-side ou TanStack Query |
| `"use client"` no topo de `page.tsx` | Tudo vira client bundle | Marcar só os subcomponentes interactivos |
| `<img>` em vez de `next/image` | Sem optimização | `next/image` |
| `dangerouslySetInnerHTML` com HTML grande | Bloqueia parsing | Render React real |
| `import * as Lib from 'lib'` | Sem tree-shake | `import { fn } from 'lib'` |
| Polyfill global de tudo | KB inúteis | `browserslist` ajustado |
| `JSON.stringify` enorme no client | CPU bloqueada | Server-side ou Web Worker |
| 50 ícones de uma biblioteca | KB enormes | Importar individualmente |
| `setInterval` para "actualizar" UI | Loop infinito | `useQuery` com `refetchInterval` (e cleanup) |

---

## 13. Pós-auditoria

- Sugira correr Lighthouse no CI (`lighthouse-ci`) para evitar regressão.
- Sugira adicionar Web Vitals tracking (`reportWebVitals` ou Vercel Analytics) para medir em campo.
- Se a mudança for grande, sugira ADR para registrar decisões (estratégia de RSC, exclusão de biblioteca).
