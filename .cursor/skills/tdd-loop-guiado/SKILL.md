---
name: tdd-loop-guiado
description: Conduz desenvolvimento orientado a testes em ciclo red→green→refactor com micro-passos — escreve teste que falha, implementa o mínimo para passar, refatora, repete. Útil para lógica de negócio, helpers, validações, use cases. Use SEMPRE que o utilizador pedir TDD, test-driven, escrever teste antes, ciclo red-green-refactor, implementar com testes desde o início, ou pedir @tdd-loop-guiado.
---

# TDD Loop Guiado

Skill para conduzir desenvolvimento por TDD em **micro-passos** — não "escrever todos os testes e depois código", mas o ciclo curto `red → green → refactor` aplicado a uma capacidade real.

## Princípio orientador

> Cada ciclo entrega **um** comportamento observável. Vermelho mostra que o teste mede algo real. Verde mostra que o comportamento existe. Refactor garante que o design não degenera com o tempo.

---

## 1. Quando usar

Bom para:
- Lógica de negócio nova (cálculos, regras de domínio, validações).
- *Use cases* / *handlers* / serviços com fronteiras claras.
- Helpers / parsers / formatadores.
- Adapters / clients de API externa (com mocks).
- Algoritmos.

Menos útil para:
- UI puramente visual (use testes E2E selectivos).
- Glue code trivial (DTO mapping óbvio).
- *Spike* exploratório (faça spike sem testes, depois reescreva com TDD).

---

## 2. Antes do ciclo — alinhar contexto

1. **Comportamento alvo**: o que esta unidade deve fazer? (Não o como.)
2. **Granularidade**: o que é "uma capacidade"? Tente decompor em frases do tipo "deve calcular X quando Y".
3. **Linguagem/framework de teste**: Jest + Testing Library? xUnit + FluentAssertions? PyTest?
4. **Padrão de nomeação**: PT-BR descrevendo comportamento.
5. **Fronteiras**: o que vai ser mockado (BD, HTTP, relógio, aleatoriedade)?

---

## 3. O ciclo

```
┌───────────────────────────────────────────┐
│  ① Escrever o próximo teste pequeno       │  ← uma capacidade
│       (RED — falha por motivo correcto)   │
│                                           │
│  ② Implementar o mínimo p/ passar         │
│       (GREEN — *qualquer* código serve)   │
│                                           │
│  ③ Refatorar mantendo verde               │
│       (REFACTOR — sem mudar comportamento)│
│                                           │
│  ④ Próximo teste                          │
└───────────────────────────────────────────┘
```

### 3.1 RED — escrever o teste

**Características do bom teste:**

- **Nome** descreve **comportamento**, não nome de função interna:
  - ✅ `deveRejeitarDescontoQuandoClienteForBloqueado`
  - ❌ `testarMetodoAplicarDesconto`
- **AAA**: Arrange, Act, Assert separados.
- **Falha por motivo correcto**: rode o teste e veja a mensagem de falha. Ela explica o que está faltando? Se sim, o teste é útil.
- **Mínimo necessário**: cobre **uma** asserção primária. Outras asserções secundárias podem ser confirmações, mas não a "carne" do teste.
- **Independente de implementação**: testa comportamento observável (entrada → saída), não privados.

```csharp
// AAA explícito + nome em PT-BR
[Fact]
public void DeveAplicarDescontoDe10PorcentoQuandoClienteForVip()
{
    // Arrange
    var cliente = new ClienteBuilder().ComNivel(NivelFidelidade.Vip).Construir();
    var calculadora = new CalculadoraDesconto();

    // Act
    var desconto = calculadora.CalcularPara(cliente, valorTotal: 100m);

    // Assert
    desconto.Should().Be(10m);
}
```

### 3.2 GREEN — implementar o mínimo

**Regra:** qualquer código que faz o teste passar serve.

- **Fake it til you make it**: se o teste pede `10`, retornar `10` literal está OK no primeiro ciclo.
- O design real emerge nos próximos testes — eles **forçam** a generalização.
- Resiste a implementar regra que **nenhum teste** está exigindo (YAGNI).

```csharp
// Primeiro ciclo — pode até ser:
public decimal CalcularPara(Cliente cliente, decimal valorTotal) => 10m;
```

> Não, sério. O teste pede 10. Devolva 10. O próximo teste vai obrigar a generalizar.

### 3.3 REFACTOR — limpar mantendo verde

Quando os testes passam, **antes de adicionar mais código**, pergunte:

- Duplicação removida?
- Nomes auto-explicativos?
- Funções pequenas, com 1 responsabilidade?
- Abstrações **justificadas pelos testes existentes** (não pelo futuro hipotético)?

> Se mexer estraga testes, o teste estava acoplado demais à implementação. Repense o teste.

---

## 4. Sequência típica para um *use case*

Imagine: cálculo de desconto de cliente, regra "VIP ganha 10%, Premium 5%, comum 0%, bloqueado nenhum".

**Ciclo 1 — base + cliente comum:**

```csharp
// RED
[Fact] public void DeveAplicarDescontoZeroQuandoClienteForComum() { ... } // espera 0m

// GREEN
public decimal CalcularPara(Cliente c, decimal v) => 0m;
```

**Ciclo 2 — VIP:**

```csharp
// RED
[Fact] public void DeveAplicarDescontoDe10PorcentoQuandoClienteForVip() { ... } // espera 10m

// GREEN — agora generalizar
public decimal CalcularPara(Cliente c, decimal v) =>
    c.Nivel == NivelFidelidade.Vip ? v * 0.10m : 0m;
```

**Ciclo 3 — Premium:**

```csharp
// RED — espera 5m

// GREEN
public decimal CalcularPara(Cliente c, decimal v) =>
    c.Nivel switch {
        NivelFidelidade.Vip      => v * 0.10m,
        NivelFidelidade.Premium  => v * 0.05m,
        _                        => 0m,
    };
```

**Ciclo 4 — bloqueado:**

```csharp
// RED — espera lançar excepção
[Fact]
public void DeveLancarExcecaoQuandoClienteEstiverBloqueado()
{
    var cliente = new ClienteBuilder().Bloqueado().Construir();
    var calculadora = new CalculadoraDesconto();
    var act = () => calculadora.CalcularPara(cliente, 100m);
    act.Should().Throw<ClienteBloqueadoException>();
}

// GREEN
if (c.EstaBloqueado) throw new ClienteBloqueadoException(c.Id);
return c.Nivel switch { ... };
```

**Ciclo 5 — REFACTOR:**

Se a estrutura ficou clara, refatore. Talvez extrair `ObterPercentualPor(Nivel)`. Mas só se ler melhor — não toque se já está bom.

---

## 5. Padrões de teste

### 5.1 Builders / Object Mother

Para entidades complexas, construa testes legíveis com builder:

```csharp
public class ClienteBuilder
{
    private NivelFidelidade _nivel = NivelFidelidade.Comum;
    private bool _bloqueado = false;

    public ClienteBuilder ComNivel(NivelFidelidade nivel) { _nivel = nivel; return this; }
    public ClienteBuilder Bloqueado() { _bloqueado = true; return this; }

    public Cliente Construir() => new Cliente(Guid.NewGuid(), "Teste", _nivel, _bloqueado);
}
```

> Cliente faz a regra ficar clara: "**cliente** com nível Vip" lê bem.

### 5.2 Theory / Parametrized

Quando o comportamento varia por dado, prefira tabela:

```csharp
[Theory]
[InlineData(NivelFidelidade.Comum, 0.00)]
[InlineData(NivelFidelidade.Premium, 0.05)]
[InlineData(NivelFidelidade.Vip, 0.10)]
public void DeveAplicarPercentualCorrectoPorNivel(NivelFidelidade nivel, decimal esperado)
{
    var cliente = new ClienteBuilder().ComNivel(nivel).Construir();
    var calculadora = new CalculadoraDesconto();
    var desconto = calculadora.CalcularPara(cliente, valorTotal: 100m);
    desconto.Should().Be(100m * esperado);
}
```

### 5.3 Edge cases

Cobrir:

- Caminho feliz.
- Pelo menos 1 caso de erro.
- Limites: 0, máximo, negativos.
- Timing: borda da janela (24h - 1s, 24h + 1s).
- Vazio: lista vazia, string vazia, null/undefined.

---

## 6. Quando mockar e quando não

**Mock fronteiras**: I/O, relógio, aleatoriedade, sistema externo.

```csharp
var relogio = Substitute.For<IRelogio>();
relogio.Agora.Returns(new DateTimeOffset(2026, 1, 15, 10, 0, 0, TimeSpan.Zero));
```

**Não mocke o sistema sob teste**: testar a si mesmo não testa nada.

**Não mocke valores**: prefira fakes/builders em vez de mocks complicados.

> Regra de ouro: **se o mock tem mais código que o teste, está errado**.

---

## 7. Anti-padrões

| Anti-padrão | Por quê | Alternativa |
|---|---|---|
| Escrever 5 testes antes de qualquer código | Bloqueia o design emergente | Um teste por vez |
| Teste que verifica detalhe interno | Quebra ao refatorar | Testar comportamento observável |
| Teste sem AAA explícito | Difícil ler | Marcar `// Arrange / Act / Assert` |
| Mock de tudo, incluindo o que estás a testar | Não testa nada | Mockar só fronteiras |
| Verde com `Assert.True(true)` | Falso positivo | Asserções concretas |
| Nome de teste em inglês com `test_` | Não conta intenção | PT-BR descrevendo comportamento |
| Setup gigante repetido | Indica acoplamento | Builders / factories |
| Teste lendo arquivo / BD real | Lento, frágil | Mock / in-memory |
| Esperar lançar `Exception` genérica | Pode esconder bug | Tipo específico (`ClienteBloqueadoException`) |
| "Vou adicionar testes depois" | Nunca acontece | TDD agora |

---

## 8. Quando TDD não cabe

- Spike exploratório: faça sem testes, depois reescreva com TDD.
- Bug fix em código sem testes: escreva **teste de regressão primeiro** (que falha), depois corrija.
- UI puramente visual: testes E2E selectivos cobrem melhor.
- Setup/configuração trivial.

---

## 9. Saída esperada da skill

Quando o utilizador trouxer uma capacidade nova:

```markdown
## Plano TDD — <capacidade>

### Decomposição
1. <capacidade 1 — 1 teste/ciclo>
2. <capacidade 2>
3. ...

### Ciclo 1 — <capacidade 1>

#### RED
```<linguagem>
<teste que falha>
```
**Saída esperada da execução**:
```
<mensagem de falha que explica o que falta>
```

#### GREEN
```<linguagem>
<código mínimo>
```

#### REFACTOR
- <item de limpeza, se necessário; se não, "Nada a refatorar."

### Ciclo 2 — <capacidade 2>
...

### Resultado final
- N testes verdes.
- Código limpo, com X linhas, Y métodos.
- Cobertura: 100% das capacidades enumeradas.
```

---

## 10. Pós-ciclo

- Rode `coverage` para checar se cobriu o que pretendia.
- Sugira correr `@code-review` no resultado.
- Sugira correr suite inteira (não só novos) — ninguém quer quebrar testes vizinhos.
- Se a capacidade foi parte de uma feature, sugira `@feature-frontend-completa` ou `@feature-backend-completa` para fechar a fatia.
