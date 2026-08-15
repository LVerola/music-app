---
name: feature-backend-completa
description: Implementa uma fatia vertical completa de uma feature no backend .NET / ASP.NET Core / EF Core — endpoint, validação, use case, domínio, repositório, migration, testes de unidade e integração. Use SEMPRE que o usuário pedir para criar um endpoint, controller, API, rota nova no backend, CRUD do back, caso de uso, regra de domínio em .NET; quando mencionar .NET, ASP.NET, EF Core, minimal API, controller, use case, CQRS, domínio, repositório; ou pedir @feature-backend-completa.
---

# Feature Backend Completa

Skill para implementar uma **fatia vertical** no backend .NET seguindo Clean Architecture e as convenções de `@backend-dotnet`. Vai do contrato HTTP até persistência, com testes de unidade e integração.

## Quando aplicar

- "Cria o endpoint POST /pedidos".
- "Adiciona o caso de uso de cancelar pedido".
- "Implementa a API de upload de comprovante".
- "Cria o módulo de relatórios de vendas".

---

## 1. Antes de implementar — alinhar contexto

Faça (com brevidade) estas perguntas se a US/issue não responder:

1. **Contrato HTTP** — método, rota, *path params*, *query string*, *body*, *response codes*.
2. **Autorização** — quem chama? Há *role*/*claim* necessário?
3. **Regras de negócio** — quais validações vão além de tipos (ex.: "valor mínimo R$ 10", "não permitir duplicado nas últimas 24h").
4. **Persistência** — entidade nova ou já existe? Há tabela?
5. **Efeitos colaterais** — emite evento? Notifica externo? Atualiza outro agregado?
6. **Idempotência** — operação pode ser repetida sem efeito duplicado? Quando deve ser?
7. **Performance esperada** — volume, latência aceitável.
8. **Erros** — quais cenários são erro de validação (400), conflito (409), regra de negócio (422), não autorizado (401/403).

---

## 2. Estrutura mínima da fatia vertical

```
src/
├── <Projeto>.Domain/                                  # entidades, regras puras
│   └── Pedidos/
│       ├── Pedido.cs
│       ├── ItemPedido.cs
│       └── Erros/PedidoInvalidoException.cs
├── <Projeto>.Application/                             # use cases + DTOs + interfaces
│   └── Pedidos/
│       ├── CriarPedido/
│       │   ├── CriarPedidoCommand.cs                   # input (record)
│       │   ├── CriarPedidoResponse.cs                  # output (record)
│       │   ├── CriarPedidoValidator.cs                 # FluentValidation
│       │   └── CriarPedidoUseCase.cs                   # orquestração
│       └── Abstracoes/
│           └── IRepositorioPedido.cs
├── <Projeto>.Infrastructure/                          # EF Core, integrações
│   ├── Persistencia/
│   │   ├── AppDbContext.cs
│   │   ├── Configuracoes/PedidoConfiguracao.cs
│   │   └── Migrations/                                 # gerar com `dotnet ef migrations add ...`
│   └── Repositorios/
│       └── RepositorioPedido.cs
└── <Projeto>.Api/                                     # endpoints/controllers
    └── Endpoints/
        └── PedidosEndpoints.cs

tests/
├── <Projeto>.Domain.Tests/
├── <Projeto>.Application.Tests/                       # xUnit + FluentAssertions
└── <Projeto>.IntegrationTests/                        # WebApplicationFactory + Testcontainers
```

**Princípios:**

- Endpoint é **fino**: valida (FluentValidation), chama o *use case*, mapeia para `Results.*`.
- Use case **não conhece HTTP** nem EF — depende de interfaces (`IRepositorioPedido`, `IRelogio`, `INotificador`).
- Domínio **não conhece** *use case* nem EF. Regra pura.
- Infrastructure **implementa** as interfaces de Application.
- DTOs (`Command`, `Response`) são `record` imutáveis.

---

## 3. Sequência de implementação (TDD)

### Passo 1: Modelar o domínio (Domain)

```csharp
namespace Projeto.Domain.Pedidos;

public class Pedido
{
    private readonly List<ItemPedido> _itens = new();

    public Guid Id { get; }
    public Guid ClienteId { get; }
    public StatusPedido Status { get; private set; }
    public DateTimeOffset CriadoEm { get; }
    public IReadOnlyList<ItemPedido> Itens => _itens;
    public decimal Total => _itens.Sum(i => i.Subtotal);

    public Pedido(Guid clienteId, DateTimeOffset criadoEm)
    {
        if (clienteId == Guid.Empty)
            throw new PedidoInvalidoException("Cliente é obrigatório.");

        Id = Guid.NewGuid();
        ClienteId = clienteId;
        Status = StatusPedido.Rascunho;
        CriadoEm = criadoEm;
    }

    public void AdicionarItem(Guid produtoId, int quantidade, decimal precoUnitario)
    {
        if (Status != StatusPedido.Rascunho)
            throw new PedidoInvalidoException("Só é possível adicionar itens em rascunho.");
        if (quantidade <= 0)
            throw new PedidoInvalidoException("Quantidade deve ser positiva.");

        _itens.Add(new ItemPedido(produtoId, quantidade, precoUnitario));
    }

    public void Confirmar()
    {
        if (_itens.Count == 0)
            throw new PedidoInvalidoException("Pedido sem itens não pode ser confirmado.");
        Status = StatusPedido.Confirmado;
    }
}

public enum StatusPedido { Rascunho, Confirmado, Cancelado }
```

**Testes do domínio primeiro** (xUnit + FluentAssertions):

```csharp
public class PedidoTestes
{
    [Fact]
    public void DeveRejeitarConfirmarQuandoNaoTiverItens()
    {
        var pedido = new Pedido(Guid.NewGuid(), DateTimeOffset.UtcNow);

        var act = () => pedido.Confirmar();

        act.Should().Throw<PedidoInvalidoException>()
            .WithMessage("Pedido sem itens não pode ser confirmado.");
    }

    [Fact]
    public void DeveCalcularTotalSomandoSubtotaisDosItens()
    {
        var pedido = new Pedido(Guid.NewGuid(), DateTimeOffset.UtcNow);
        pedido.AdicionarItem(Guid.NewGuid(), 2, 10m);
        pedido.AdicionarItem(Guid.NewGuid(), 1, 5m);

        pedido.Total.Should().Be(25m);
    }
}
```

### Passo 2: Use case com interfaces (Application)

```csharp
public sealed record CriarPedidoCommand(
    Guid ClienteId,
    IReadOnlyList<ItemPedidoCommand> Itens);

public sealed record ItemPedidoCommand(Guid ProdutoId, int Quantidade, decimal PrecoUnitario);

public sealed record CriarPedidoResponse(Guid Id, decimal Total, DateTimeOffset CriadoEm);

public interface IRepositorioPedido
{
    Task AdicionarAsync(Pedido pedido, CancellationToken ct);
    Task<Pedido?> ObterPorIdAsync(Guid id, CancellationToken ct);
}

public interface IRelogio
{
    DateTimeOffset Agora { get; }
}

public class CriarPedidoUseCase
{
    private readonly IRepositorioPedido _repositorio;
    private readonly IRelogio _relogio;
    private readonly ILogger<CriarPedidoUseCase> _logger;

    public CriarPedidoUseCase(
        IRepositorioPedido repositorio,
        IRelogio relogio,
        ILogger<CriarPedidoUseCase> logger)
    {
        _repositorio = repositorio;
        _relogio = relogio;
        _logger = logger;
    }

    public async Task<CriarPedidoResponse> ExecutarAsync(
        CriarPedidoCommand comando,
        CancellationToken ct)
    {
        var pedido = new Pedido(comando.ClienteId, _relogio.Agora);

        foreach (var item in comando.Itens)
            pedido.AdicionarItem(item.ProdutoId, item.Quantidade, item.PrecoUnitario);

        pedido.Confirmar();

        await _repositorio.AdicionarAsync(pedido, ct);

        _logger.LogInformation("Pedido {PedidoId} criado para cliente {ClienteId}",
            pedido.Id, pedido.ClienteId);

        return new CriarPedidoResponse(pedido.Id, pedido.Total, pedido.CriadoEm);
    }
}
```

**Teste do use case** (mockando fronteiras):

```csharp
public class CriarPedidoUseCaseTestes
{
    [Fact]
    public async Task DeveCriarPedidoEPersistirQuandoComandoForValido()
    {
        var repo = Substitute.For<IRepositorioPedido>();
        var relogio = Substitute.For<IRelogio>();
        relogio.Agora.Returns(DateTimeOffset.UtcNow);
        var logger = Substitute.For<ILogger<CriarPedidoUseCase>>();
        var useCase = new CriarPedidoUseCase(repo, relogio, logger);

        var comando = new CriarPedidoCommand(
            ClienteId: Guid.NewGuid(),
            Itens: new[] { new ItemPedidoCommand(Guid.NewGuid(), 2, 10m) });

        var resp = await useCase.ExecutarAsync(comando, CancellationToken.None);

        resp.Total.Should().Be(20m);
        await repo.Received(1).AdicionarAsync(Arg.Any<Pedido>(), Arg.Any<CancellationToken>());
    }
}
```

### Passo 3: Validação (FluentValidation)

```csharp
public class CriarPedidoValidator : AbstractValidator<CriarPedidoCommand>
{
    public CriarPedidoValidator()
    {
        RuleFor(c => c.ClienteId).NotEmpty().WithMessage("Cliente é obrigatório.");
        RuleFor(c => c.Itens).NotEmpty().WithMessage("Pedido precisa de pelo menos um item.");
        RuleForEach(c => c.Itens).ChildRules(item =>
        {
            item.RuleFor(i => i.Quantidade).GreaterThan(0).WithMessage("Quantidade deve ser positiva.");
            item.RuleFor(i => i.PrecoUnitario).GreaterThanOrEqualTo(0).WithMessage("Preço não pode ser negativo.");
        });
    }
}
```

### Passo 4: Persistência (Infrastructure / EF Core)

```csharp
public class PedidoConfiguracao : IEntityTypeConfiguration<Pedido>
{
    public void Configure(EntityTypeBuilder<Pedido> builder)
    {
        builder.ToTable("pedidos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.CriadoEm).IsRequired();

        builder.OwnsMany(p => p.Itens, item =>
        {
            item.ToTable("itens_pedido");
            item.WithOwner().HasForeignKey("PedidoId");
            item.Property<int>("Id").ValueGeneratedOnAdd();
            item.HasKey("Id");
            item.Property(i => i.PrecoUnitario).HasColumnType("decimal(18,2)");
        });
    }
}

public class RepositorioPedido : IRepositorioPedido
{
    private readonly AppDbContext _ctx;

    public RepositorioPedido(AppDbContext ctx) => _ctx = ctx;

    public async Task AdicionarAsync(Pedido pedido, CancellationToken ct)
    {
        _ctx.Pedidos.Add(pedido);
        await _ctx.SaveChangesAsync(ct);
    }

    public Task<Pedido?> ObterPorIdAsync(Guid id, CancellationToken ct) =>
        _ctx.Pedidos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
}
```

Gerar migration:

```powershell
dotnet ef migrations add CriarPedidos -p src/Projeto.Infrastructure -s src/Projeto.Api
dotnet ef database update -p src/Projeto.Infrastructure -s src/Projeto.Api
```

> Antes de aplicar: **inspeccione o `.sql` gerado** com `dotnet ef migrations script`. Se houver `DROP COLUMN`, `ALTER TYPE` ou *rename*, considere a regra `migracao-ef-segura`.

### Passo 5: Endpoint (Api)

```csharp
public static class PedidosEndpoints
{
    public static IEndpointRouteBuilder MapearPedidos(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/pedidos").WithTags("Pedidos");

        grupo.MapPost("/", CriarPedidoAsync)
            .Produces<CriarPedidoResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        return app;
    }

    private static async Task<IResult> CriarPedidoAsync(
        CriarPedidoCommand comando,
        IValidator<CriarPedidoCommand> validator,
        CriarPedidoUseCase useCase,
        CancellationToken ct)
    {
        var resultadoValidacao = await validator.ValidateAsync(comando, ct);
        if (!resultadoValidacao.IsValid)
            return Results.ValidationProblem(resultadoValidacao.ToDictionary());

        try
        {
            var resposta = await useCase.ExecutarAsync(comando, ct);
            return Results.Created($"/pedidos/{resposta.Id}", resposta);
        }
        catch (PedidoInvalidoException ex)
        {
            return Results.Problem(ex.Message, statusCode: StatusCodes.Status422UnprocessableEntity);
        }
    }
}
```

> Erros previsíveis (validação) já voltam como 400 via `ValidationProblem`. Erros de domínio voltam como 422 (regra de negócio violada).

### Passo 6: Teste de integração

```csharp
public class CriarPedidoEndpointTestes : IClassFixture<AppFactory>
{
    private readonly AppFactory _factory;
    public CriarPedidoEndpointTestes(AppFactory factory) => _factory = factory;

    [Fact]
    public async Task DeveCriar201QuandoComandoForValido()
    {
        var client = _factory.CreateClient();
        var comando = new
        {
            clienteId = Guid.NewGuid(),
            itens = new[] { new { produtoId = Guid.NewGuid(), quantidade = 2, precoUnitario = 10m } }
        };

        var resposta = await client.PostAsJsonAsync("/pedidos", comando);

        resposta.StatusCode.Should().Be(HttpStatusCode.Created);
        resposta.Headers.Location.Should().NotBeNull();
    }

    [Fact]
    public async Task DeveDevolver400QuandoNaoTiverItens()
    {
        var client = _factory.CreateClient();
        var comando = new { clienteId = Guid.NewGuid(), itens = Array.Empty<object>() };

        var resposta = await client.PostAsJsonAsync("/pedidos", comando);

        resposta.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

### Passo 7: Registrar DI

```csharp
services.AddScoped<CriarPedidoUseCase>();
services.AddScoped<IRepositorioPedido, RepositorioPedido>();
services.AddSingleton<IRelogio, RelogioSistema>();
services.AddValidatorsFromAssemblyContaining<CriarPedidoValidator>();
```

---

## 4. Códigos HTTP — quando usar

| Cenário | Status | Resposta |
|---|---|---|
| Sucesso GET com recurso | 200 | `Results.Ok(dto)` |
| Sucesso POST criando recurso | 201 | `Results.Created(uri, dto)` |
| Sucesso sem corpo | 204 | `Results.NoContent()` |
| Validação de tipo/obrigatório falhou | 400 | `Results.ValidationProblem(...)` |
| Sem autenticação | 401 | `Results.Unauthorized()` |
| Autenticado mas sem permissão | 403 | `Results.Forbid()` |
| Recurso não existe | 404 | `Results.NotFound()` |
| Conflito (versão, duplicado) | 409 | `Results.Conflict(...)` |
| Regra de negócio violada | 422 | `Results.Problem(..., 422)` |
| Erro de servidor não previsto | 500 | tratado por middleware global |

> **Não use 500 para erros previsíveis.** 500 só para *bugs*/falhas reais.

---

## 5. Idempotência

Sempre que a operação **muda estado** e o cliente pode repetir, considere idempotência:

- **POST de criação:** cliente envia `Idempotency-Key` (header GUID). Backend guarda mapeamento `key → resultado` por 24h. Repetição devolve o mesmo resultado, não cria duplicado.
- **PUT** já é naturalmente idempotente (mesma chamada = mesmo resultado).
- **DELETE** idempotente: 1ª vez 200/204, repetições 404 ou 204 dependendo da política.

---

## 6. Padrões a evitar

| Anti-padrão | Por quê | Alternativa |
|---|---|---|
| Lógica de negócio no controller | Acopla a HTTP, difícil de testar | Use case na Application |
| `catch (Exception)` para retornar 500 | Esconde *bug*, perde *stack* | Middleware global de erros |
| `string.Format` ou `$"..."` em log | Sem estrutura para query | `LogInformation("X {Y}", y)` |
| `DbContext` injetado no controller | Quebra camadas | Repositório/UoW |
| `int` para dinheiro | Erro de arredondamento | `decimal` com `column type` `decimal(18,2)` |
| `DateTime.Now` espalhado | Não testável | Interface `IRelogio` injectada |
| `Task.Run` para escapar de `await` | *Antipattern* sério | Resolver upstream |
| Migration com `DROP COLUMN` aplicada directamente | Risco de downtime | Veja `migracao-ef-segura` |
| Loop com `await SaveChangesAsync` dentro | Trip ao BD por iteração | Uma chamada no fim |
| N+1 com `Include` esquecido | Performance ruim | `AsNoTracking().Include(...)` |

---

## 7. Checklist de entrega

- [ ] Tipos de dados corretos (`Guid` para IDs, `decimal` para dinheiro, `DateTimeOffset` para tempo).
- [ ] `CancellationToken` propagado em toda cadeia até `SaveChangesAsync` e `HttpClient`.
- [ ] Endpoint usa FluentValidation + retorna `ValidationProblem` em 400.
- [ ] Erros de domínio são exceções tipadas (`*Exception : DomainException`) e mapeadas para 422.
- [ ] Use case tem **pelo menos** um teste de unidade por caminho (feliz + erro).
- [ ] Endpoint tem **pelo menos** um teste de integração por status (sucesso, validação, regra de negócio).
- [ ] Migration gerada e revisada (`dotnet ef migrations script` inspeccionado).
- [ ] Repositório usa `AsNoTracking()` em leituras.
- [ ] Logs estruturados com `LogInformation("... {Param}", valor)`.
- [ ] DI registrado com *lifetime* correto.
- [ ] Sem `any` (não aplicável aqui), sem `!` *null-forgiving* sem justificação, sem `.Result`/`.Wait()`.

---

## 8. Quando pedir confirmação

- Quando **idempotência** não estiver clara — pergunte.
- Quando a operação tiver efeito colateral (notificação, evento) — confirme se é síncrono/assíncrono.
- Quando a migration tiver risco (rename, drop, alteração de tipo) — sinalize antes de aplicar.

---

## 9. Pós-entrega

- Correr `@code-review` para revisão crítica.
- Se houver mudança no contrato HTTP, atualizar OpenAPI/Swagger.
- Se aplicável, atualizar a documentação técnica da US via `@documentacao`.
