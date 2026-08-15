# MusicApp

Clone de estudo do [Songless](https://less.gg/songless): o jogador ouve um trecho curto, tenta adivinhar a música, e palpites errados liberam mais áudio.

Monorepo com frontend Next.js, backend .NET 10 e PostgreSQL.

## Inicialização local (Docker)

1. Instala [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Copia o arquivo de ambiente: `Copy-Item .env.example .env`
3. Na raiz do repositório:

```bash
docker compose up --build
```

| Serviço   | URL                    |
|-----------|------------------------|
| Frontend  | http://localhost:3000  |
| API       | http://localhost:8080  |
| Health    | http://localhost:8080/health/live |
| PostgreSQL | localhost:5432        |

O navegador fala com `localhost`. Os contêineres falam entre si pela rede do Compose (`postgres`, `backend`, `frontend`).

## Inicialização sem Docker (desenvolvimento)

O Compose empacota imagens prontas (sem recarga ao editar). No dia a dia, na raiz:

```bash
pnpm install
pnpm dev
```

`pnpm install` instala o frontend e restaura os pacotes .NET. `pnpm dev` sobe o PostgreSQL no Docker e, no host, a API (`dotnet watch`, http://localhost:5080) e o frontend (`next dev`, http://localhost:3000). Ctrl+C para a API e o frontend; o banco no Docker continua até `docker compose stop postgres`.

## Testes da API

```bash
dotnet test backend/MusicApp.slnx
```

## Documentação

Tudo o que o projeto vai fazendo fica em [`.docs/`](.docs/README.md): arquitetura, histórico de entregas, ADRs e changelog.
