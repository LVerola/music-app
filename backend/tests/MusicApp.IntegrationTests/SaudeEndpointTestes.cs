using System.Net;
using FluentAssertions;

namespace MusicApp.IntegrationTests;

public sealed class SaudeEndpointTestes : IClassFixture<FabricaAplicacao>
{
    private readonly HttpClient _cliente;

    public SaudeEndpointTestes(FabricaAplicacao fabrica)
    {
        _cliente = fabrica.CreateClient();
    }

    [Fact]
    public async Task DeveResponderOkNoHealthLive()
    {
        var resposta = await _cliente.GetAsync("/health/live");

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeveResponderOkNaRaizComNomeDaApi()
    {
        var resposta = await _cliente.GetAsync("/");

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        var corpo = await resposta.Content.ReadAsStringAsync();
        corpo.Should().Contain("MusicApp");
    }
}
