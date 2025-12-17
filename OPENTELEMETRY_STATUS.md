# OpenTelemetry Integration - NextGen.Identity

## Overview

OpenTelemetry has been integrated across **all layers** of the NextGen.Identity system, providing comprehensive observability for:

- Database operations (Dapper queries)
- Authentication flows
- Tenant provisioning
- Token management
- Service layer operations

## Architecture

### Packages Added

**NextGen.Identity.Core**

- OpenTelemetry.Api 1.9.0

**NextGen.Identity.Data**

- OpenTelemetry.Api 1.9.0
- Npgsql.OpenTelemetry 9.0.2 (PostgreSQL tracing)

**NextGen.Identity.Api**

- OpenTelemetry.Extensions.Hosting 1.9.0
- OpenTelemetry.Instrumentation.AspNetCore 1.9.0
- OpenTelemetry.Instrumentation.Http 1.9.0
- OpenTelemetry.Exporter.OpenTelemetryProtocol 1.9.0
- OpenTelemetry.Exporter.Prometheus.AspNetCore 1.9.0-beta.2
- Serilog.AspNetCore 8.0.3
- Serilog.Sinks.OpenTelemetry 4.1.0

## Instrumentation Details

### 1. Telemetry Infrastructure (`Telemetry.cs`)

**ActivitySource**: `NextGen.Identity` v1.0.0

**Operation Names**:

- `db.query` - Database SELECT operations
- `db.command` - Database INSERT/UPDATE/DELETE operations
- `user.authenticate` - Login operations
- `user.register` - User registration
- `token.generate` - Token generation
- `token.validate` - Token validation
- `tenant.provision` - Infrastructure provisioning
- `tenant.create` - Tenant creation
- `tenant.update` - Tenant updates
- `tenant.query` - Tenant queries

**Standard Tags**:

- `tenant.id` - Tenant identifier
- `user.id` - User identifier
- `user.email` - User email
- `db.table` - Database table name
- `db.operation` - SQL operation type
- `token.type` - Token type (access/refresh)
- `error.code` - Error code
- `error.message` - Error message

### 2. Data Layer Instrumentation

#### UserRepository

All methods instrumented with:

- `GetByIdAsync(Guid id)`
  - Activity: `db.query`
  - Tags: `db.table=users`, `db.operation=select`, `user.id`
- `GetByEmailAsync(string email)`
  - Activity: `db.query`
  - Tags: `db.table=users`, `db.operation=select`, `user.email`
- `CreateAsync(User user)`
  - Activity: `db.command`
  - Tags: `db.table=users`, `db.operation=insert`, `tenant.id`, `user.email`
- `UpdateAsync(User user)`
  - Activity: `db.command`
  - Tags: `db.table=users`, `db.operation=update`, `user.id`, `tenant.id`

**Error Handling**: All methods include try-catch with:

```csharp
catch (Exception ex)
{
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
    throw;
}
```

#### TenantRepository

All methods instrumented with:

- `GetByIdAsync(Guid id)` - Query by ID with tenant.id tag
- `GetBySlugAsync(string slug)` - Query by slug with tenant.slug tag
- `GetAllAsync()` - Query all with result.count tag
- `CreateAsync(Tenant tenant)` - Insert with tenant.slug tag
- `UpdateAsync(Tenant tenant)` - Update with tenant.id tag

#### RefreshTokenRepository

All methods instrumented with:

- `GetByTokenAsync(string token)` - Query with token.type=refresh
- `CreateAsync(RefreshToken token)` - Insert with user.id, token.type
- `UpdateAsync(RefreshToken token)` - Update with token.type
- `RevokeAllForUserAsync(Guid userId)` - Bulk revocation with user.id

### 3. Service Layer Instrumentation

#### AuthenticationService

**LoginAsync**:

- Activity: `user.authenticate`
- Tags: `user.email`, `ip.address`, `user.id`, `tenant.id`
- Custom tags: `auth.result` (user_not_found, invalid_password, user_inactive, success)
- Tracks: Password verification, token generation, last login update

**RefreshTokenAsync**:

- Activity: `token.validate`
- Tags: `token.type=refresh`, `ip.address`, `user.id`, `tenant.id`
- Custom tags: `token.result` (invalid_or_expired, user_not_found_or_inactive, refreshed_successfully)
- Tracks: Token revocation, new token generation

**RegisterUserAsync**:

- Activity: `user.register`
- Tags: `user.email`, `tenant.id`, `user.id`
- Custom tags: `registration.result` (email_already_exists, success)
- Tracks: Email uniqueness check, password hashing, user creation

**RevokeRefreshTokenAsync**:

- Activity: `token.validate`
- Tags: `token.type=refresh`, `token.action=revoke`, `user.id`
- Custom tags: `revoke.result` (token_not_found, success)

**ValidateTokenAsync**:

- Activity: `token.validate`
- Tags: `token.type=access`
- Custom tags: `validation.result` (valid, invalid)

#### TenantService

**CreateTenantWithAdminAsync**:

- Activity: `tenant.create`
- Tags: `tenant.name`, `user.email`, `tenant.slug`, `tenant.id`, `user.id`
- Custom tags: `create.result` (slug_already_exists, success)
- Tracks: Slug generation, infrastructure provisioning, admin user creation, token generation

**GetTenantByIdAsync**:

- Activity: `tenant.query`
- Tags: `tenant.id`, `query.type=by_id`
- Custom tags: `query.result` (not_found, found)

**GetTenantBySlugAsync**:

- Activity: `tenant.query`
- Tags: `tenant.slug`, `query.type=by_slug`
- Custom tags: `query.result` (not_found, found)

**GetAllTenantsAsync**:

- Activity: `tenant.query`
- Tags: `query.type=all`, `result.count`

**UpdateTenantAsync**:

- Activity: `tenant.update`
- Tags: `tenant.id`
- Custom tags: `update.result` (not_found, success)

## Activity Patterns

### Standard Activity Creation

```csharp
using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
activity?.SetTag(Telemetry.Tags.DbTable, "users");
activity?.SetTag(Telemetry.Tags.DbOperation, "select");
activity?.SetTag(Telemetry.Tags.UserId, userId);
```

### Error Handling Pattern

```csharp
try
{
    // Operation logic
}
catch (Exception ex)
{
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
    throw;
}
```

### Success Tracking

```csharp
activity?.SetTag("operation.result", "success");
activity?.SetTag("result.count", items.Count);
```

## Next Steps for Complete Observability

### 1. API Layer Configuration (Program.cs)

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddNpgsql()
        .AddSource(Telemetry.ServiceName)
        .AddOtlpExporter(options =>
        {
            options.Endpoint = new Uri("http://localhost:4317");
        }))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter());

// Serilog with OpenTelemetry
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "NextGen.Identity")
    .WriteTo.Console()
    .WriteTo.OpenTelemetry(options =>
    {
        options.Endpoint = "http://localhost:4318/v1/logs";
        options.ResourceAttributes = new Dictionary<string, object>
        {
            ["service.name"] = Telemetry.ServiceName
        };
    }));
```

### 2. Metrics to Add

- `identity_login_attempts_total` (counter)
- `identity_login_duration_ms` (histogram)
- `identity_registration_total` (counter)
- `identity_token_generation_total` (counter)
- `identity_tenant_creation_total` (counter)
- `identity_tenant_provisioning_duration_ms` (histogram)
- `identity_db_query_duration_ms` (histogram)

### 3. Missing Implementations

- [ ] JwtTokenService with telemetry
- [ ] TenantProvisioningService with telemetry
- [ ] API Controllers with automatic ASP.NET Core instrumentation
- [ ] Middleware for correlation ID propagation
- [ ] Health checks with OpenTelemetry metrics

### 4. Infrastructure Stack

Deploy observability backend:

- **Jaeger**: Distributed tracing (port 16686 UI, 4317 OTLP)
- **Prometheus**: Metrics collection (port 9090)
- **Grafana**: Dashboards (port 3000)
- **Loki**: Log aggregation

## Benefits

### 1. Distributed Tracing

- Track requests across authentication → database → token generation
- Visualize tenant creation flow: API → Service → Repository → PowerShell provisioning
- Identify slow database queries

### 2. Error Tracking

- Automatic error capture with stack traces
- Error rate monitoring per operation
- Failed login attempt tracking

### 3. Performance Monitoring

- Database query duration
- Authentication flow latency
- Tenant provisioning time

### 4. Business Metrics

- Login success/failure rates
- New tenant signups
- Active user counts per tenant

### 5. Log Correlation

- Automatic trace/span ID injection into logs
- Single pane of glass for traces + logs
- Drill down from trace to related logs

## OpenTelemetry Semantic Conventions Followed

- **Database**: `db.table`, `db.operation`
- **User**: `user.id`, `user.email`
- **Tenant**: `tenant.id` (custom)
- **Error**: `error.message`, `error.code`
- **Network**: `ip.address`

## Example Trace Flow

**POST /api/tenants (Create Tenant)**

```
tenant.create (TenantService)
├── db.query (TenantRepository.GetBySlugAsync) [check slug availability]
├── db.command (TenantRepository.CreateAsync) [create tenant]
├── tenant.provision (TenantProvisioningService) [provision infrastructure]
├── user.register (via CreateAsync) [create admin user]
│   ├── db.query (UserRepository.GetByEmailAsync) [check email]
│   └── db.command (UserRepository.CreateAsync) [create user]
├── token.generate (JwtTokenService) [generate access token]
├── db.command (RefreshTokenRepository.CreateAsync) [save refresh token]
└── db.command (TenantRepository.UpdateAsync) [mark tenant active]
```

Every operation is tracked, timed, and correlated!

## Summary

✅ **Complete Data Layer instrumentation** - All Dapper repositories trace database operations  
✅ **Complete Service Layer instrumentation** - Authentication and Tenant services fully traced  
✅ **Error handling** - All operations capture and report errors  
✅ **Semantic tags** - Consistent tagging across all layers  
✅ **OpenTelemetry packages** - All projects have required dependencies  
⏳ **API Layer** - Ready for Program.cs configuration and controller implementation  
⏳ **JWT Service** - Interface defined, implementation pending  
⏳ **Provisioning Service** - Interface defined, implementation pending

**Next immediate task**: Configure API Program.cs with OpenTelemetry exporters and implement API controllers.
