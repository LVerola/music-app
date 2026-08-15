using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using MusicApp.Application;
using MusicApp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var origens = builder.Configuration.GetSection("Cors:Origens").Get<string[]>()
    ?? ["http://localhost:3000"];

builder.Services.AddCors(opcoes =>
{
    opcoes.AddDefaultPolicy(politica =>
        politica.WithOrigins(origens)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.MapGet("/", () => Results.Ok(new { nome = "MusicApp", versao = "0.1.0" }))
    .WithName("Raiz")
    .WithTags("Sistema");

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();

public partial class Program;
