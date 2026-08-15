using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MusicApp.Infrastructure.Persistencia;

namespace MusicApp.Infrastructure;

public static class ExtensoesInfrastructure
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("BancoDeDados")
            ?? throw new InvalidOperationException("Connection string 'BancoDeDados' não configurada.");

        services.AddDbContext<AppDbContext>(opcoes => opcoes.UseNpgsql(connectionString));

        services.AddHealthChecks()
            .AddDbContextCheck<AppDbContext>("banco-de-dados", tags: ["ready"]);

        return services;
    }
}
