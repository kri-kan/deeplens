---
name: nextgen-identity
description: >
  Patterns and guardrails for the NextGen Identity Service — .NET 9 / Duende IdentityServer / Dapper.
  Activate when working in src/NextGen.Identity/ — before modifying auth endpoints,
  tenant provisioning, JWT config, or RBAC.
---

# NextGen Identity — Developer Skill

## Overview

The Identity service handles authentication, authorization, and tenant lifecycle management using **Duende IdentityServer** and **Dapper** (no EF Core).

- **Port**: `5198`
- **Database**: `nextgen_identity` schema on remote PostgreSQL (`192.168.0.170:5432`)
- **ORM**: Pure **Dapper** only — no Entity Framework Core in this service
- **Auth standard**: OAuth 2.0 / OpenID Connect

---

## Project Structure

```
src/NextGen.Identity/
  NextGen.Identity.Api/    ← ASP.NET Core API (controllers, startup, config)
  NextGen.Identity.Core/   ← Domain models (Tenant, User, Token)
  NextGen.Identity.Data/   ← Dapper repositories, PostgreSQL migrations, stored procs
  NextGen.Identity.sln
```

---

## Dapper-Only Rule

This service uses **raw SQL + Dapper** exclusively. No EF Core. No LINQ. No ORM.

```csharp
// ✅ Correct — Dapper with raw SQL
public async Task<User?> GetByEmailAsync(string email)
{
    const string sql = "SELECT * FROM users WHERE email = @Email";
    return await _connection.QuerySingleOrDefaultAsync<User>(sql, new { Email = email });
}

public async Task<IEnumerable<Tenant>> GetAllTenantsAsync()
{
    const string sql = "SELECT * FROM tenants WHERE is_active = TRUE ORDER BY created_at DESC";
    return await _connection.QueryAsync<Tenant>(sql);
}

// ❌ Wrong — EF Core not used here
var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
```

---

## Key Tables (all `lowercase_with_underscores`)

| Table | Purpose |
|---|---|
| `tenants` | Organization configs, resource limits, infra ports |
| `users` | User accounts, roles, auth state |
| `refresh_tokens` | OAuth 2.0 rotation tokens |
| `tenant_api_keys` | M2M authentication for programmatic access |
| `infisical_projects` | Secret management integration registry |

---

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Authenticate, returns JWT access + refresh tokens |
| `/api/auth/refresh` | POST | Exchange refresh token for new access token |
| `/api/auth/profile` | GET | Get authenticated user profile |
| `/api/tenants` | GET | List all tenants |
| `/api/tenants` | POST | Provision a new tenant |
| `/api/tenants/{id}` | GET | Get tenant details |

---

## Tenant Provisioning

When a new tenant is provisioned, the system:
1. Creates a new PostgreSQL database: `deeplens_{tenant_slug}`
2. Creates an isolated MinIO bucket: `tenant-{uuid}`
3. Registers the tenant in the `tenants` table
4. Optionally starts a Qdrant container for vector isolation
5. Bootstraps initial admin credentials

Always provision tenants via the API — never manually insert into `tenants` table.

---

## JWT Configuration

JWT settings live in `NextGen.Identity.Api/appsettings.json`.  
- Access token lifetime: typically 1 hour
- Refresh token: long-lived, rotation strategy
- Claims: `sub` (userId), `tenant_id`, `role`

Never change JWT signing key without coordinating with all consuming services.

---

## CORS

Same intranet CORS predicate as the rest of the stack:
```json
{
  "Cors": {
    "AllowAnyIntranetOrigin": true
  }
}
```
Do not add individual `192.168.x.x` IPs to `AllowedOrigins`.

---

## Running Locally

```bash
# Must start first — all other services depend on it for auth
dotnet run \
    --project src/NextGen.Identity/NextGen.Identity.Api/NextGen.Identity.Api.csproj \
    --urls http://localhost:5198

# Verify it's running
curl http://localhost:5198/health
```

---

## Database Migrations

Migrations in this service are **SQL scripts** in `NextGen.Identity.Data/`, not EF Core migrations.

Apply via the bootstrap script:
```bash
bash setupscripts/core/orchestrate-linux.sh init-db
```

---

## Common Gotchas

1. **Start Identity first**: All other services require a valid JWT — Identity API must be running before any other service
2. **Dapper only**: Don't introduce EF Core — it's intentionally excluded for performance reasons
3. **Tenant ID in JWT claims**: Downstream services extract `tenant_id` from the JWT claim — ensure it's always included when issuing tokens
4. **Password encoding**: Development password `Krikank1$` — the `$` must be URL-encoded as `%24` in connection strings

---

## Related Documentation
- `docs/technical/SECURITY.md` — Full OAuth 2.0/RBAC details
- `infrastructure/TENANT-GUIDE.md` — Tenant provisioning walkthrough
- `docs/technical/database-standards.md` — DB naming rules
