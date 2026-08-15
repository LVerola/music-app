FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY global.json ./
COPY src/MusicApp.Domain/MusicApp.Domain.csproj src/MusicApp.Domain/
COPY src/MusicApp.Application/MusicApp.Application.csproj src/MusicApp.Application/
COPY src/MusicApp.Infrastructure/MusicApp.Infrastructure.csproj src/MusicApp.Infrastructure/
COPY src/MusicApp.Api/MusicApp.Api.csproj src/MusicApp.Api/
RUN dotnet restore src/MusicApp.Api/MusicApp.Api.csproj

COPY src/ src/
RUN dotnet publish src/MusicApp.Api/MusicApp.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "MusicApp.Api.dll"]
