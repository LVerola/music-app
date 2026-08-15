---
name: owasp-revisao
description: Revisa código procurando vulnerabilidades do OWASP Top 10 — controle de acesso quebrado, falhas criptográficas, injeção (SQL/XSS/SSRF), design inseguro, configuração defeituosa, dependências vulneráveis, falhas de autenticação, integridade, log/monitoramento, falsificação de requisições. Use SEMPRE que o usuário pedir auditoria de segurança, security review, pentest ad-hoc, OWASP, XSS, SQL injection, CSRF, SSRF, autorização, autenticação, hash de senha, criptografia, segredo no código, JWT, ou pedir @owasp-revisao.
---

# Revisão OWASP — Segurança Aplicacional

Skill para revisar código procurando as vulnerabilidades mais comuns na web em 2026 (OWASP Top 10 2021, ainda vigente). Foco em **encontrar problemas reais no código**, não em recitar a OWASP.

## Princípio orientador

> Cada usuário é potencialmente malicioso. Cada *input* externo é potencialmente envenenado. Cada secret precisa ter dono e rotação. Cada erro precisa ser logado **sem vazar segredo**.

---

## 1. Antes de revisar — colher contexto

1. **Escopo da revisão**: feature nova / módulo inteiro / app completo?
2. **Superfície de ataque**: público na internet? Internal? Multi-tenant?
3. **Dados sensíveis envolvidos**: PII (LGPD), financeiro, saúde, autenticação?
4. **Autenticação/autorização atual**: como funciona?
5. **Já houve incidente de segurança nesta área?**
6. **Há SAST/DAST no CI?** Ferramentas activas?
7. **Compliance aplicável** (LGPD, PCI-DSS, ISO 27001)?

---

## 2. OWASP Top 10 — *checklist* prático

### A01: Broken Access Control

**O que verificar:**

- [ ] Toda rota privada tem `[Authorize]` ou middleware equivalente.
- [ ] **Object-level access**: usuário acessa só seus próprios recursos (ex.: `GET /pedidos/{id}` valida que o pedido é dele).
- [ ] **Role/permissão** verificada server-side, nunca só client-side.
- [ ] Sem **IDOR** (Insecure Direct Object Reference) — IDs sequenciais sem checagem.
- [ ] *Default deny*: rotas sem `[AllowAnonymous]` rejeitam não-autenticados.
- [ ] `forceLoginRedirect` ou retorno 401 distintos de 404 sem vazar existência.

**Padrões malignos:**

```csharp
// ❌ BAD — IDOR
[HttpGet("{id}")]
public async Task<Pedido> Get(Guid id) {
    return await _ctx.Pedidos.FindAsync(id);  // qualquer um lê qualquer pedido
}

// ✅ GOOD
[HttpGet("{id}")]
public async Task<IResult> Get(Guid id, ICurrentUser user, CancellationToken ct) {
    var pedido = await _ctx.Pedidos
        .Where(p => p.Id == id && p.ClienteId == user.Id)
        .FirstOrDefaultAsync(ct);
    return pedido is null ? Results.NotFound() : Results.Ok(pedido);
}
```

```tsx
// ❌ BAD — proteção só no cliente
{usuario.role === 'admin' && <BotaoApagar />}
// API deixa qualquer um apagar
```

### A02: Cryptographic Failures

**O que verificar:**

- [ ] Senhas com **hash + salt** moderno (Argon2id ou bcrypt cost ≥12); **nunca** MD5/SHA1 sem salt.
- [ ] Tokens (sessão, reset, API) com entropia ≥ 128 bits.
- [ ] Comunicação interna entre serviços via TLS.
- [ ] PII em repouso encriptada (campos sensíveis no BD).
- [ ] Sem hash usado como cifra (one-way confundido com two-way).
- [ ] Sem encriptação rolling-your-own; use bibliotecas (`System.Security.Cryptography`, `libsodium`).
- [ ] Cookies de sessão: `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict`).
- [ ] HSTS habilitado.
- [ ] Não armazenar dados sensíveis em logs/exceptions.

**Padrões malignos:**

```csharp
// ❌ BAD — MD5
var hash = MD5.HashData(Encoding.UTF8.GetBytes(senha));

// ✅ GOOD — BCrypt
var hash = BCrypt.Net.BCrypt.HashPassword(senha, workFactor: 12);
```

### A03: Injection

**SQL Injection:**

- [ ] Nenhuma string concatenada construindo SQL.
- [ ] EF Core LINQ usado corretamente (mas atenção a `FromSqlRaw` com interpolação).
- [ ] Procedures stored sempre com parâmetros.

```csharp
// ❌ BAD — concatenação
var sql = $"SELECT * FROM pedidos WHERE numero = '{numero}'";
ctx.Database.ExecuteSqlRaw(sql);

// ✅ GOOD — parametrizado
ctx.Pedidos.FromSqlInterpolated($"SELECT * FROM pedidos WHERE numero = {numero}");
// ou via LINQ
ctx.Pedidos.Where(p => p.Numero == numero);
```

**XSS:**

- [ ] React/Next.js renderiza por padrão escapado — **mas** `dangerouslySetInnerHTML` é vetor.
- [ ] Conteúdo vindo do usuário renderizado em HTML server-side passou por sanitização (DOMPurify).
- [ ] CSP (Content-Security-Policy) configurada.

```tsx
// ❌ BAD
<div dangerouslySetInnerHTML={{ __html: comentarioDoUsuario }} />

// ✅ GOOD — usar parser markdown seguro ou render como texto
<div>{comentarioDoUsuario}</div>
```

**Command Injection:**

- [ ] Nenhum `Process.Start(...)` com input do usuário concatenado.
- [ ] Bibliotecas de manipulação de arquivos validam path (sem path traversal).

**SSRF:**

- [ ] Chamadas HTTP feitas pela aplicação para URL fornecida pelo usuário são **negadas por padrão** — usar allow-list ou validação rígida.
- [ ] Bloquear IPs internos (`127.0.0.0/8`, `169.254.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).

### A04: Insecure Design

**O que verificar:**

- [ ] *Threat modeling* feito para features sensíveis.
- [ ] *Rate limiting* em endpoints de login, reset de senha, criação de conta.
- [ ] *Multi-tenancy* respeitado em queries (toda query filtra por tenant).
- [ ] *Idempotency* em operações críticas (pagamento, criação de pedido).
- [ ] Limites razoáveis (tamanho de upload, número de items por request).

### A05: Security Misconfiguration

**O que verificar:**

- [ ] Sem credenciais default (admin/admin).
- [ ] Páginas de erro genéricas em produção (sem stack trace).
- [ ] Headers de segurança: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer-when-downgrade`, `X-Frame-Options: DENY` ou `Content-Security-Policy: frame-ancestors 'none'`.
- [ ] CORS configurado restritivamente (não `*` em rotas autenticadas).
- [ ] Banner/server header não expõe versão exata do framework.
- [ ] Modo `Development` desligado em produção.
- [ ] Permissões mínimas no BD (aplicação não usa `superuser`).
- [ ] Endpoints de debug/swagger fora de produção (ou autenticados).
- [ ] Logs em local apropriado e com rotação.

### A06: Vulnerable & Outdated Components

**O que verificar:**

- [ ] `npm audit`, `dotnet list package --vulnerable`, `pip audit` rodando em CI.
- [ ] Política de atualização de dependências (Renovate/Dependabot).
- [ ] Vulnerabilidades críticas resolvidas dentro de 7 dias; altas em 30 dias.
- [ ] Sem dependências abandonadas (sem release > 18 meses sem motivo).
- [ ] Lockfiles versionados.

```powershell
# Auditoria rápida
npm audit
dotnet list package --vulnerable
```

### A07: Identification & Authentication Failures

**O que verificar:**

- [ ] Senhas: política mínima (NIST: ≥8 chars, bloquear leakeds via HIBP, **sem** rotação obrigatória ou regras complexas estúpidas).
- [ ] MFA disponível, obrigatório para perfis administrativos.
- [ ] *Account lockout* após N tentativas (com backoff, não bloqueio infinito DoS-friendly).
- [ ] Reset de senha: token único, expiração curta (≤ 1h), use-uma-vez, sem vazamento por URL.
- [ ] Sessões: expirar, regenerar ID em login/logout, suportar logout em todos os dispositivos.
- [ ] JWT: usar `HS256`/`RS256`, validar `iss`/`aud`/`exp`/`nbf`; refresh token armazenado seguro.
- [ ] *Bot/credential stuffing protection* (rate limit + captcha em login).
- [ ] Login não revela se usuário existe ("e-mail ou senha incorretos", não "e-mail não cadastrado").

### A08: Software & Data Integrity Failures

**O que verificar:**

- [ ] Atualizações vêm de fontes confiáveis (não download dinâmico sem verificação).
- [ ] *Subresource Integrity* (SRI) em scripts externos.
- [ ] Pipeline CI/CD assinado / com verificação.
- [ ] Pacotes internos com namespaces protegidos (evitar *dependency confusion*).
- [ ] Serialização: nada de `BinaryFormatter` ou `JsonConvert` com `TypeNameHandling.All`.

### A09: Logging & Monitoring Failures

**O que verificar:**

- [ ] Eventos de segurança logados: login (ok/fail), mudança de senha, mudança de permissão, acesso a dados sensíveis.
- [ ] Logs **não** contêm: senhas, tokens, CPF/CNPJ completos, números de cartão.
- [ ] Logs estruturados com `userId`, `requestId`, `ip` (mascarar em alguns países).
- [ ] Alertas para padrões anómalos: ≥10 falhas de login do mesmo IP em 1 min.
- [ ] Retenção apropriada (12+ meses para auditoria).
- [ ] *Time sync* — logs com timestamp confiável.

### A10: Server-Side Request Forgery (SSRF)

**O que verificar:**

- [ ] URL fornecida pelo usuário para fetch server-side passa por:
  - Validação de protocolo (só `https`).
  - Allow-list de domínios.
  - Bloqueio de IPs privados / metadata cloud (`169.254.169.254`).
  - Timeout curto.
  - Não-seguimento de redirecionamentos automático (ou validar destino).

```csharp
// ❌ BAD
var resp = await httpClient.GetAsync(urlDoUsuario);

// ✅ GOOD — pelo menos validar
private static readonly string[] _dominiosPermitidos = { "fornecedor.com", "parceiro.com" };

public async Task<HttpResponseMessage> BuscarSeguro(string url) {
    var uri = new Uri(url);
    if (uri.Scheme != Uri.UriSchemeHttps)
        throw new SegurancaException("Apenas HTTPS é permitido.");
    if (!_dominiosPermitidos.Contains(uri.Host))
        throw new SegurancaException($"Domínio não permitido: {uri.Host}");
    if (IPAddress.TryParse(uri.Host, out var ip) && (IPAddress.IsLoopback(ip) || EhPrivado(ip)))
        throw new SegurancaException("IP privado não permitido.");
    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
    return await httpClient.GetAsync(uri, cts.Token);
}
```

---

## 3. Checks extra (fora do Top 10 mas importantes)

### LGPD / PII

- [ ] Inventário de dados pessoais coletados.
- [ ] Base legal para cada uso.
- [ ] Direito de exclusão implementável (não só "anonimizamos").
- [ ] Backups respeitam exclusão (ou política clara).
- [ ] Transferência internacional documentada.
- [ ] Acesso por funcionários auditado.

### Tokens & Segredos

- [ ] Sem segredo em código (`grep -r "password\|secret\|api[_-]key" src/`).
- [ ] Segredos em vault (Azure Key Vault, AWS Secrets Manager).
- [ ] Rotação automática para chaves críticas.
- [ ] Token JWT com payload **mínimo** — sem PII, sem senha.

### Upload de arquivo

- [ ] Validação de extensão **e** *magic number* (não confiar no `Content-Type`).
- [ ] Tamanho máximo enforced no servidor (não só no cliente).
- [ ] Storage isolado (S3 com bucket privado, com URL assinada).
- [ ] Antivirus se aplicável.
- [ ] Não servir arquivos como mesmo origin do app (XSS via SVG).

### CSRF

- [ ] Token CSRF em forms (ou usar `SameSite=Lax/Strict` em cookies de auth).
- [ ] APIs aceitando cookies como auth **devem** ter CSRF; APIs com Bearer puro estão isentas.

---

## 4. Output esperado da skill

```markdown
## Auditoria OWASP — <escopo>

### 1. Resumo executivo

- **Total de findings**: 18
  - Crítico (exploração imediata): 2
  - Alto (exposição importante): 5
  - Médio (mitigação razoável): 7
  - Baixo (hardening): 4

### 2. Findings críticos

#### CRIT-01: IDOR em GET /pedidos/{id}
- **OWASP**: A01 — Broken Access Control
- **Arquivo**: `src/Api/Endpoints/PedidosEndpoints.cs:42`
- **Descrição**: O endpoint não verifica se o pedido pertence ao usuário autenticado. Qualquer usuário autenticado consegue ler pedidos de qualquer outro.
- **Reprodução**: 1. Logar como usuário A. 2. Obter ID de pedido do usuário B (sequencial). 3. `GET /pedidos/{idB}` retorna dados.
- **Correcção**:
  ```csharp
  // ver código
  ```
- **Severidade**: Crítica — exposição de dados pessoais (LGPD).

#### CRIT-02: Hash de senha em SHA256 sem salt
- ...

### 3. Findings altos
...

### 4. Plano priorizado

| # | Finding | OWASP | Severidade | Esforço |
|---|---|---|---|---|
| 1 | IDOR em GET /pedidos | A01 | Crítica | P |
| 2 | Hash SHA256 → BCrypt | A02 | Crítica | M |
| ... | ... | ... | ... | ... |

### 5. Validação

Para cada correcção, sugiro:
- Teste de regressão (security test).
- Verificação manual reproduzindo o ataque.
- Re-auditoria com SAST/DAST.
```

---

## 5. Anti-padrões / *red flags*

| *Red flag* | OWASP | Acção |
|---|---|---|
| `string sql = $"... {var}"` | A03 | Parametrizar |
| `MD5/SHA1` em senha | A02 | BCrypt/Argon2id |
| Token JWT com PII | A02/LGPD | Tirar |
| `[AllowAnonymous]` em endpoints sensíveis | A01 | Remover |
| `dangerouslySetInnerHTML` com input | A03 | Sanitizar/escapar |
| `CORS *` em rota autenticada | A05 | Restringir origem |
| `console.log(password)` | A09 | Remover; treinamento |
| Dependência sem atualização > 18m | A06 | Avaliar/substituir |
| `decodeJWT` no client sem validar assinatura | A02 | Não confiar em payload client-side |
| `Process.Start(cmd)` com input | A03 | Eliminar |
| `Request.GetUrl().FollowRedirect()` server-side | A10 | Validar destino |

---

## 6. Quando pedir ajuda

- Sem acesso a sandbox/staging para validar exploit → pedir ao usuário.
- Sem clareza sobre fluxo de autenticação → pedir documentação/diagrama.
- Suspeita de vulnerabilidade em biblioteca → consultar CVE.

---

## 7. Pós-revisão

- Documente findings em `Documentacao/Seguranca/AUDIT-AAAA-MM-DD.md`.
- Issues no tracker com label `security`.
- Considere SAST permanente (SonarQube, Snyk, GitHub Advanced Security).
- Para findings críticos em produção: **trate como incidente** (hotfix + comunicação).
- Eduque a equipe: cada finding é oportunidade de treinamento.
