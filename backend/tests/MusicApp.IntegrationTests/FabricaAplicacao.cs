using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace MusicApp.IntegrationTests;

public sealed class FabricaAplicacao : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:BancoDeDados"] =
                    "Host=127.0.0.1;Port=5432;Database=musicapp_test;Username=musicapp;Password=musicapp"
            });
        });
    }
}
