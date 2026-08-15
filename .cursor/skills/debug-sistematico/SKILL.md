---
name: debug-sistematico
description: Conduz debug com método científico — reproduz o bug, isola, formula hipótese, testa hipótese, corrige causa-raiz (não sintoma), adiciona regressão. Use SEMPRE que o utilizador relatar bug, erro, falha intermitente, comportamento estranho, "às vezes não funciona", "está dando erro X", stack trace, exception, exception aleatória, race condition, memory leak, ou pedir @debug-sistematico. Aplique também quando o utilizador descrever sintoma sem causa identificada.
---

# Debug Sistemático

Skill para resolver bugs de forma **disciplinada**, em vez de "tentar coisas até parar de errar". Cura a causa, não o sintoma. Deixa rastro (teste de regressão + observabilidade) para o bug não voltar.

## Princípio orientador

> *"Não toques no código antes de reproduzir o bug ou de ter hipótese falseável."*
> Cada acção de debug responde a uma pergunta. Cada pergunta tem resposta antes da próxima.

---

## 1. Capturar o relato — pergunta as 5 coisas

Antes de abrir qualquer arquivo:

1. **Sintoma exacto**: o que **você** observa? (Erro? Tela em branco? Valor errado? Lentidão?)
2. **Como reproduzir**: passos exactos, do início (idealmente da abertura do navegador / da chamada). Faltam dados? Pergunte.
3. **Quando começou**: hoje? Após qual deploy? Após qual mudança no ambiente? Sempre foi assim?
4. **Frequência**: 100% das vezes? Intermitente? Só em produção?
5. **Diferenças entre ambientes que funcionam e o que falha**: versão, dados, sistema operativo, navegador, hora do dia.

Se 3 de 5 perguntas não têm resposta, **pare**. Bug "às vezes acontece, no servidor X, com cliente desconhecido" é impossível de debugar — precisa de telemetria primeiro.

---

## 2. Reproduzir — antes de tudo

**Não tente corrigir antes de reproduzir.** Reprodução é metade do debug.

```
[ Conhecido ]     [ Desconhecido ]
   |                    |
   └─ Aproxime o ambiente até o bug aparecer (mesmas versões, mesmos dados, mesma sequência)
```

Estratégias:

- **Bug em produção, não local**: aproximar dados (export de produção sanitizado), versão, configuração, latência da rede (dev tools throttling).
- **Bug intermitente**: rodar em loop (100 iterações). Se 5% reproduzem, é race condition / dado mau.
- **Bug específico de utilizador**: pegar payload exacto da request dele (sanitizado).
- **Bug visual**: pedir screenshot/print, comparar com tela esperada.

**Reproduzido = "consigo fazer o bug aparecer 10 em 10 tentativas".**

> Se não conseguir reproduzir mas o bug é real, vá direto para "instrumentar com logs" (secção 6).

---

## 3. Isolar — binary search

Tem o bug em uma área grande? **Reduza pela metade**:

```
[ todo o sistema ]
       ↓
[ módulo A ]  ← elimine via mock/feature flag
       ↓
[ função X dentro de A ] ← reduza ainda mais
       ↓
[ linha Y ] ← isso aqui é a causa raiz
```

### Técnicas

- **Comentar metade**: comente metade do código (não em produção). Se o bug some, está na metade comentada.
- **`git bisect`**: bug regressão? Use `git bisect start`, `bad`, `good`, e o Git encontra o commit culpado em log(N) passos.
- **Mockar entradas**: substitua input externo por valor fixo. Se o bug some, é problema de input. Se persiste, é lógica interna.
- **Reduzir dados**: se o bug é em arquivo de 10 GB, reduza para 100 KB. Se persiste, isole na linha.
- **Bisseccar dependências**: bug após upgrade? Reverta uma de cada vez.

---

## 4. Formular hipótese — falseável

Cada hipótese precisa ser **falseável**:

- ❌ "Acho que tem alguma coisa com cache." (não falseável)
- ✅ "Hipótese: o valor está sendo lido do `localStorage` antes do `useEffect` que o popula." (testável)

**Como testar uma hipótese:**

```
1. Predição (se hipótese verdadeira, o que verei?)
2. Acção mínima para gerar a observação
3. Resultado:
   - Confirma → siga para fix
   - Refuta → próxima hipótese
   - Inconclusivo → refine a hipótese ou colete mais dado
```

Anote cada hipótese e o resultado. **Não confie na memória.**

---

## 5. Causa-raiz, não sintoma

Use os **"5 Porquês"**:

> Bug: tela trava ao salvar pedido.
> - Por quê? → request HTTP 500.
> - Por quê? → exceção `NullReferenceException` no `Pedido.Itens`.
> - Por quê? → `Itens` veio `null` do client.
> - Por quê? → frontend envia `null` quando o utilizador não adiciona itens.
> - Por quê? → form não valida campos obrigatórios.
>
> **Causa-raiz**: form sem validação. Sintoma: 500.
>
> **Fix do sintoma**: tratar `null` no backend. **Não basta** — o bug volta no próximo bug-spot semelhante.
> **Fix raiz**: validação Zod no form + validação no use case + resposta 400 com erro humano.

**Heurística**: se o fix é uma única linha "se `null` retorna `null`", desconfie. Vá mais fundo.

---

## 6. Instrumentar — logs e observabilidade

Bug intermitente / não reproduzível? Adicione observabilidade **direccionada** primeiro:

- **Log estruturado** com contexto (`pedidoId`, `userId`, `requestId`).
- **Métrica** se a frequência importa (`bug.tela_branca_count`).
- **Tracing**: marcar spans nas suspeitas.
- **Probe condicional**: log só quando a condição "bug provável" é verdadeira (evita spam).

Após colher dado por X dias, **remova** os logs especiais ou mude para nível DEBUG.

---

## 7. Bugs frequentes — atalhos de diagnóstico

| Sintoma | Causa frequente | Verificar |
|---|---|---|
| "Funciona local, falha em prod" | Variável de ambiente, versão de dependência, dado real diferente | Comparar `.env`, lockfiles, schema |
| "Funciona, mas só 1 em N vezes" | Race condition, ordem assíncrona, cache stale | Logging de timestamps; rodar em loop |
| `NullReferenceException` aleatório | Inicialização preguiçosa, DI singleton com estado, dado parcial do BD | Ver caminho de criação |
| "Aparece e some" | Cache, *retry*, *eventual consistency* | Forçar invalidação; medir replicação |
| "Funciona no Chrome, falha no Safari/Firefox" | API web não suportada, polyfill ausente | `caniuse.com`, console nativo |
| Memory leak | Listener não removido, ref no closure, cache sem TTL | Heap snapshot |
| CPU 100% em loop | Loop sem break / `useEffect` sem deps correctas | Inspecionar; profiler |
| Erro só em produção sob carga | Pool exausto, deadlock no BD, *thread starvation* | Métricas de pool, locks |
| Funciona com 1 utilizador, falha com 100 | Concorrência, estado partilhado, race | Stress test local |
| Timezone errado | `DateTime.Now` vs `DateTimeOffset.UtcNow`, *server* != *client* | Sempre UTC + convert na exibição |

---

## 8. Corrigir — mínimo necessário

Quando achar a causa raiz:

1. **Fix mínimo**: a menor alteração que resolve. Resiste à tentação de "já que estou aqui, vou reescrever".
2. **Teste de regressão**: escreva o teste **que falha sem o fix** e **passa com o fix**. Sem isso, o bug volta.
3. **Validar não-regressão**: rode toda a suite. Sem teste em volta = sem rede.
4. **Documentar**: comente o **porquê** se a solução for não-óbvia, ou se mascarar um problema mais profundo (`TODO(#X): solução temporária — refactor planeado em ADR-Y`).

---

## 9. Padrões a evitar

| Anti-padrão | Por quê | Alternativa |
|---|---|---|
| `catch (Exception) { return null; }` para "resolver" | Esconde o problema | Logar + relançar tipado |
| `try/catch` aninhado para evitar `NRE` | Codifica fragilidade | Validar input no topo |
| "Funciona agora, depois eu vejo" | Bug volta em pior momento | Teste de regressão |
| Fix sem reproduzir | Pode não ser fix | Reproduza primeiro |
| Mudar 5 coisas e ver se passa | Não saberá qual fix funcionou | Mudar **uma** e medir |
| Rebobinar `git revert` sem testar | Pode introduzir outro bug | Revert + testes + revisão |
| Aumentar timeout para "resolver" lentidão | Esconde o root cause | Tunar a query / a lógica |
| Adicionar `setTimeout`/`Thread.Sleep` para resolver race | Não resolve, só esconde | Sincronização real |
| Reiniciar processo periódico para evitar memory leak | Vai falhar no pior momento | Achar o leak |
| Adicionar log "deve ajudar a debugar depois" sem remover | Ruído permanente | Logs com nível e finalidade clara |

---

## 10. Relatório de debug

Quando o utilizador pedir ajuda com bug, devolva no formato:

```markdown
## Análise do bug

### 1. Sintoma observado
<o que está acontecendo, palavras do utilizador + tradução técnica>

### 2. Reprodução
- Status: ✅ Reproduzido / ❌ Não reproduzido ainda / ⚠️ Reprodução intermitente
- Passos: ...

### 3. Hipóteses

#### Hipótese 1: <descrição falseável>
- Predição: <se verdadeira, observo Y>
- Como testar: <acção concreta>
- Resultado: [pendente / confirma / refuta]

#### Hipótese 2: ...

### 4. Causa-raiz identificada
<frase única; cite linha/função se já isolado>

### 5. Fix proposto

```<linguagem>
<diff mínimo>
```

### 6. Teste de regressão

```<linguagem>
<código do teste que falha sem o fix>
```

### 7. Observabilidade adicionada (se aplicável)
<log, métrica, alerta>

### 8. Riscos colaterais a validar
- ...
```

---

## 11. Quando pedir ajuda do utilizador

- Reprodução exige passos que você não tem (UI/produção): peça vídeo/screenshots.
- Bug em ambiente sem acesso: peça logs, métricas, *stack trace*.
- Suspeita de dados específicos: peça um exemplo sanitizado.
- Múltiplas hipóteses possíveis: peça para o utilizador testar uma e reportar.

---

## 12. Quando declarar "não consigo" honestamente

Algumas vezes:

- Reprodução exige carga real → mover para staging.
- Bug envolve sistema externo opaco → escalar para vendor.
- Reprodução exige ambiente sensível (dados pessoais) → solicitar acesso supervisionado.

**Diga isso explicitamente.** Não invente fixes para se livrar do ticket.

---

## 13. Pós-fix

- [ ] Teste de regressão adicionado.
- [ ] Suite verde.
- [ ] PR descreve **bug + causa raiz + fix + teste** (não só "fixa bug").
- [ ] Observabilidade extra removida ou movida para nível adequado.
- [ ] Se mascarou problema maior, criar issue/TODO para refactor.
- [ ] Se ocorrer em produção com impacto, considerar **post-mortem** breve no `Documentacao/`.
