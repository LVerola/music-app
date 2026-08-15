using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Loja.Api.Pedidos;

[ApiController]
[Route("pedidos")]
public class PedidosController : ControllerBase
{
    private readonly AppDbContext _ctx;

    public PedidosController(AppDbContext ctx) => _ctx = ctx;

    // GET /pedidos?clienteId=...
    // Listagem usada na tela principal do back-office. Reclamam que está lenta
    // quando o cliente tem muitos pedidos.
    [HttpGet]
    public async Task<ActionResult<List<PedidoResumoDto>>> Listar(Guid clienteId)
    {
        var pedidos = await _ctx.Pedidos
            .Where(p => p.ClienteId == clienteId)
            .ToListAsync();

        var resultado = new List<PedidoResumoDto>();
        foreach (var pedido in pedidos)
        {
            // Cliente é navegação lazy
            var nomeCliente = pedido.Cliente.Nome;

            // Itens é navegação lazy
            var totalItens = pedido.Itens.Count;
            var total = pedido.Itens.Sum(i => i.Quantidade * i.PrecoUnitario);

            resultado.Add(new PedidoResumoDto
            {
                Id = pedido.Id,
                Numero = pedido.Numero,
                NomeCliente = nomeCliente,
                QuantidadeItens = totalItens,
                Total = total
            });
        }

        return Ok(resultado);
    }
}

public class PedidoResumoDto
{
    public Guid Id { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string NomeCliente { get; set; } = string.Empty;
    public int QuantidadeItens { get; set; }
    public decimal Total { get; set; }
}
