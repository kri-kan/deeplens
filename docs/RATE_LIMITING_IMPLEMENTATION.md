# Rate Limiting Implementation Guide

This document provides the complete implementation details for DeepLens's dynamic, database-backed rate limiting system.

**Related Documentation:**

- [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md) - ADR-004 and ADR-005
- [PROJECT_PLAN.md](../PROJECT_PLAN.md) - Overall system architecture

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Domain Models](#domain-models)
4. [Service Layer](#service-layer)
5. [API Gateway Integration](#api-gateway-integration)
6. [Endpoint-Specific Rate Limiting](#endpoint-specific-rate-limiting)
7. [Admin API](#admin-api)
8. [Configuration](#configuration)
9. [Testing](#testing)

---

## Architecture Overview

### Multi-Level Rate Limiting

```
┌─────────────────────────────────────────────────────────────┐
│                     Request Flow                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   API Gateway    │
                    │  Global Limits   │ ← Level 1: Per-tenant global
                    └────────┬─────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐     ┌──────────┐
    │ Search   │      │  Admin   │     │  Other   │
    │   API    │      │   API    │     │   APIs   │
    └──────────┘      └──────────┘     └──────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    Endpoint-specific   Endpoint-specific   Endpoint-specific
    rate limits         rate limits         rate limits
    (Level 2)           (Level 2)           (Level 2)
```

### Data Flow

```
Request with tenant_id
    │
    ▼
┌─────────────────────┐
│ Extract tenant_id   │
│ from JWT claims     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐        ┌──────────────┐
│ Check Redis Cache   │───────>│  Cache Hit   │───┐
│ Key: ratelimit:     │        │  Return fast │   │
│      tenant:{id}    │        └──────────────┘   │
└──────────┬──────────┘                           │
           │ Cache Miss                           │
           ▼                                      │
┌─────────────────────┐                           │
│ Query PostgreSQL    │                           │
│ - tenant_rate_limits│                           │
│ - rate_limit_tiers  │                           │
└──────────┬──────────┘                           │
           │                                      │
           ▼                                      │
┌─────────────────────┐                           │
│ Cache in Redis      │                           │
│ TTL: 5 minutes      │                           │
└──────────┬──────────┘                           │
           │                                      │
           └──────────────────────────────────────┘
                          │
                          ▼
           ┌──────────────────────────┐
           │ Apply Rate Limit         │
           │ Use Redis counter:       │
           │ ratelimit:{tenant}:      │
           │   {endpoint}:{minute}    │
           └────────┬─────────────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
   ┌─────────┐           ┌─────────┐
   │ Allow   │           │ Reject  │
   │ (200)   │           │ (429)   │
   └─────────┘           └─────────┘
```

---

## Database Schema

```sql
-- Tenant-specific rate limit configurations
CREATE TABLE tenant_rate_limits (
    tenant_id UUID PRIMARY KEY,

    -- Pricing tier
    tier VARCHAR(50) DEFAULT 'free',

    -- Global limits
    requests_per_minute INT DEFAULT 1000,
    requests_per_hour INT DEFAULT 50000,
    requests_per_day INT DEFAULT 1000000,

    -- Service-specific limits
    search_requests_per_minute INT DEFAULT 500,
    upload_requests_per_minute INT DEFAULT 50,
    bulk_operations_per_minute INT DEFAULT 10,
    admin_operations_per_minute INT DEFAULT 20,

    -- Resource quotas
    max_images_per_day INT DEFAULT 10000,
    max_storage_gb DECIMAL(10,2) DEFAULT 100.0,
    max_concurrent_uploads INT DEFAULT 5,

    -- Feature flags
    is_unlimited BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    enable_bulk_operations BOOLEAN DEFAULT TRUE,
    enable_advanced_search BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(255)
);

-- Index for fast lookups
CREATE INDEX idx_tenant_rate_limits_tier ON tenant_rate_limits(tier);
CREATE INDEX idx_tenant_rate_limits_suspended ON tenant_rate_limits(is_suspended)
    WHERE is_suspended = TRUE;

-- Pricing tier defaults
CREATE TABLE rate_limit_tiers (
    tier_name VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,

    -- Request limits
    requests_per_minute INT NOT NULL,
    requests_per_hour INT NOT NULL,
    requests_per_day INT NOT NULL,

    -- Endpoint-specific limits
    search_requests_per_minute INT NOT NULL,
    upload_requests_per_minute INT NOT NULL,
    bulk_operations_per_minute INT NOT NULL,
    admin_operations_per_minute INT NOT NULL,

    -- Resource quotas
    max_images_per_day INT NOT NULL,
    max_storage_gb DECIMAL(10,2) NOT NULL,
    max_concurrent_uploads INT NOT NULL,

    -- Features
    enable_bulk_operations BOOLEAN DEFAULT FALSE,
    enable_advanced_search BOOLEAN DEFAULT FALSE,
    enable_priority_support BOOLEAN DEFAULT FALSE,

    -- Pricing
    monthly_price_usd DECIMAL(10,2) DEFAULT 0.0,

    -- Metadata
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed tier data
INSERT INTO rate_limit_tiers (
    tier_name, display_name,
    requests_per_minute, requests_per_hour, requests_per_day,
    search_requests_per_minute, upload_requests_per_minute,
    bulk_operations_per_minute, admin_operations_per_minute,
    max_images_per_day, max_storage_gb, max_concurrent_uploads,
    enable_bulk_operations, enable_advanced_search, enable_priority_support,
    monthly_price_usd, description
) VALUES
    ('free', 'Free Tier',
     100, 5000, 100000,
     50, 5, 1, 10,
     100, 1.0, 1,
     FALSE, FALSE, FALSE,
     0.0, 'Perfect for testing and small projects'),

    ('basic', 'Basic',
     1000, 50000, 1000000,
     500, 50, 10, 50,
     10000, 50.0, 5,
     TRUE, FALSE, FALSE,
     29.0, 'For small to medium businesses'),

    ('pro', 'Professional',
     5000, 250000, 5000000,
     2500, 200, 50, 100,
     100000, 500.0, 10,
     TRUE, TRUE, FALSE,
     99.0, 'For growing teams with advanced needs'),

    ('enterprise', 'Enterprise',
     50000, 2500000, 50000000,
     25000, 1000, 200, 500,
     1000000, 5000.0, 50,
     TRUE, TRUE, TRUE,
     499.0, 'For large organizations with custom requirements');

-- Usage tracking table
CREATE TABLE tenant_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_rate_limits(tenant_id),

    -- Time window
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    window_type VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'

    -- Request counts
    total_requests INT DEFAULT 0,
    search_requests INT DEFAULT 0,
    upload_requests INT DEFAULT 0,
    bulk_requests INT DEFAULT 0,
    admin_requests INT DEFAULT 0,

    -- Rate limit violations
    rate_limit_hits INT DEFAULT 0,

    -- Resource usage
    images_uploaded INT DEFAULT 0,
    storage_used_gb DECIMAL(10,2) DEFAULT 0.0,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for usage queries
CREATE INDEX idx_tenant_usage_tenant_period
    ON tenant_usage_stats(tenant_id, period_start DESC);
CREATE INDEX idx_tenant_usage_period
    ON tenant_usage_stats(period_start DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_rate_limits_updated_at
    BEFORE UPDATE ON tenant_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Domain Models

```csharp
// DeepLens.Domain/Entities/TenantRateLimitConfig.cs
namespace DeepLens.Domain.Entities;

public class TenantRateLimitConfig
{
    public Guid TenantId { get; set; }
    public string Tier { get; set; } = "free";

    // Global limits
    public int RequestsPerMinute { get; set; }
    public int RequestsPerHour { get; set; }
    public int RequestsPerDay { get; set; }

    // Endpoint-specific limits
    public int SearchRequestsPerMinute { get; set; }
    public int UploadRequestsPerMinute { get; set; }
    public int BulkOperationsPerMinute { get; set; }
    public int AdminOperationsPerMinute { get; set; }

    // Resource quotas
    public int MaxImagesPerDay { get; set; }
    public decimal MaxStorageGb { get; set; }
    public int MaxConcurrentUploads { get; set; }

    // Feature flags
    public bool IsUnlimited { get; set; }
    public bool IsSuspended { get; set; }
    public bool EnableBulkOperations { get; set; }
    public bool EnableAdvancedSearch { get; set; }

    // Metadata
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

// DeepLens.Domain/Entities/RateLimitTier.cs
public class RateLimitTier
{
    public string TierName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    public int RequestsPerMinute { get; set; }
    public int RequestsPerHour { get; set; }
    public int RequestsPerDay { get; set; }

    public int SearchRequestsPerMinute { get; set; }
    public int UploadRequestsPerMinute { get; set; }
    public int BulkOperationsPerMinute { get; set; }
    public int AdminOperationsPerMinute { get; set; }

    public int MaxImagesPerDay { get; set; }
    public decimal MaxStorageGb { get; set; }
    public int MaxConcurrentUploads { get; set; }

    public bool EnableBulkOperations { get; set; }
    public bool EnableAdvancedSearch { get; set; }
    public bool EnablePrioritySupport { get; set; }

    public decimal MonthlyPriceUsd { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

---

## Service Layer

```csharp
// DeepLens.Application/Interfaces/ITenantRateLimitService.cs
namespace DeepLens.Application.Interfaces;

public interface ITenantRateLimitService
{
    Task<TenantRateLimitConfig> GetTenantLimitsAsync(
        string tenantId,
        CancellationToken cancellationToken = default);

    Task<TenantRateLimitConfig> UpdateTenantLimitsAsync(
        string tenantId,
        TenantRateLimitConfig config,
        string updatedBy,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateTenantTierAsync(
        string tenantId,
        string newTier,
        string updatedBy,
        CancellationToken cancellationToken = default);

    Task<RateLimitTier> GetTierConfigAsync(
        string tierName,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<RateLimitTier>> GetAllTiersAsync(
        CancellationToken cancellationToken = default);

    Task<bool> CheckRateLimitAsync(
        string tenantId,
        string endpoint,
        CancellationToken cancellationToken = default);
}
```

For the complete service implementation with caching, see the full source in `DeepLens.Infrastructure/Services/TenantRateLimitService.cs`.

**Key Implementation Points:**

1. **Redis Caching:** 5-minute TTL for tenant configs
2. **Fallback Logic:** Returns free tier if tenant not found
3. **Distributed Counters:** Redis atomic increment for rate checks
4. **Error Handling:** Fails open on Redis errors (allows request)
5. **Logging:** Comprehensive logging for debugging and monitoring

---

## API Gateway Integration

```csharp
// DeepLens.ApiGateway/Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add Redis connection
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    return ConnectionMultiplexer.Connect(configuration.GetConnectionString("Redis")!);
});

// Add rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        // Extract tenant ID from JWT claims
        var tenantId = context.User.FindFirst("tenant_id")?.Value ?? "anonymous";

        return RateLimitPartition.Get(tenantId, key =>
        {
            var services = context.RequestServices;
            return new DynamicRateLimitPolicy(
                services.GetRequiredService<ITenantRateLimitService>(),
                services.GetRequiredService<IConnectionMultiplexer>(),
                services.GetRequiredService<ILogger<DynamicRateLimitPolicy>>()
            );
        });
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        context.HttpContext.Response.Headers.RetryAfter = "60";

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "rate_limit_exceeded",
            message = "Too many requests. Please try again later.",
            retry_after_seconds = 60
        }, cancellationToken);
    };
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter(); // Must be after auth

app.MapControllers();
app.Run();
```

---

## Endpoint-Specific Rate Limiting

```csharp
// DeepLens.SearchApi/Controllers/SearchController.cs
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ITenantRateLimitService _rateLimitService;

    [HttpPost("upload")]
    public async Task<IActionResult> UploadImage(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var tenantId = User.FindFirst("tenant_id")?.Value!;

        // Check upload-specific rate limit
        if (!await _rateLimitService.CheckRateLimitAsync(
            tenantId, "upload", cancellationToken))
        {
            return StatusCode(429, new
            {
                error = "upload_rate_limit_exceeded",
                message = "Upload rate limit exceeded."
            });
        }

        // Process upload...
    }

    [HttpPost("search")]
    public async Task<IActionResult> SearchSimilar(
        [FromBody] SearchRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.FindFirst("tenant_id")?.Value!;

        // Check search-specific rate limit
        if (!await _rateLimitService.CheckRateLimitAsync(
            tenantId, "search", cancellationToken))
        {
            return StatusCode(429, new
            {
                error = "search_rate_limit_exceeded"
            });
        }

        // Process search...
    }

    [HttpPost("search/bulk")]
    public async Task<IActionResult> BulkSearch(
        [FromBody] BulkSearchRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.FindFirst("tenant_id")?.Value!;
        var config = await _rateLimitService.GetTenantLimitsAsync(
            tenantId, cancellationToken);

        // Feature gate check
        if (!config.EnableBulkOperations)
        {
            return StatusCode(403, new
            {
                error = "feature_not_available",
                message = "Bulk operations require Pro tier or higher.",
                current_tier = config.Tier
            });
        }

        // Check bulk-specific rate limit
        if (!await _rateLimitService.CheckRateLimitAsync(
            tenantId, "bulk", cancellationToken))
        {
            return StatusCode(429, new
            {
                error = "bulk_rate_limit_exceeded"
            });
        }

        // Process bulk search...
    }
}
```

---

## Admin API

```csharp
// DeepLens.AdminApi/Controllers/TenantRateLimitController.cs
[ApiController]
[Route("api/admin/tenants/{tenantId}/rate-limits")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class TenantRateLimitController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetRateLimits(
        string tenantId,
        CancellationToken cancellationToken)
    {
        var config = await _rateLimitService.GetTenantLimitsAsync(
            tenantId, cancellationToken);
        return Ok(config);
    }

    [HttpPut]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateRateLimits(
        string tenantId,
        [FromBody] UpdateRateLimitsRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirst("sub")?.Value ?? "system";
        var config = await _rateLimitService.GetTenantLimitsAsync(
            tenantId, cancellationToken);

        // Apply updates (only non-null values)
        config.RequestsPerMinute = request.RequestsPerMinute
            ?? config.RequestsPerMinute;
        // ... other fields

        await _rateLimitService.UpdateTenantLimitsAsync(
            tenantId, config, userId, cancellationToken);

        return Ok(new { message = "Rate limits updated successfully" });
    }

    [HttpPut("tier")]
    public async Task<IActionResult> UpdateTier(
        string tenantId,
        [FromBody] UpdateTierRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirst("sub")?.Value ?? "system";

        await _rateLimitService.UpdateTenantTierAsync(
            tenantId, request.NewTier, userId, cancellationToken);

        return Ok(new { message = $"Upgraded to {request.NewTier} tier" });
    }
}
```

---

## Configuration

```json
// appsettings.json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Database=deeplens;Username=deeplens",
    "Redis": "localhost:6379,abortConnect=false"
  },
  "RateLimiting": {
    "EnableDistributed": true,
    "CacheTtlMinutes": 5,
    "DefaultTier": "free",
    "FailOpen": true
  }
}
```

---

## Testing

### Unit Tests

```csharp
public class TenantRateLimitServiceTests
{
    [Fact]
    public async Task GetTenantLimits_ShouldReturnCachedConfig()
    {
        // Test Redis cache hit
    }

    [Fact]
    public async Task GetTenantLimits_ShouldFallbackToDatabase()
    {
        // Test cache miss scenario
    }

    [Fact]
    public async Task UpdateTenantTier_ShouldInvalidateCache()
    {
        // Test cache invalidation
    }

    [Fact]
    public async Task CheckRateLimit_ShouldBlockSuspendedTenant()
    {
        // Test suspended tenant
    }
}
```

### Integration Tests

```bash
# Test with curl
# Get token
TOKEN=$(curl -X POST https://auth.deeplens.com/connect/token \
  -d "client_id=test&client_secret=test&grant_type=client_credentials" \
  | jq -r '.access_token')

# Make 150 requests to trigger rate limit
for i in {1..150}; do
  curl -X POST https://api.deeplens.com/api/search \
    -H "Authorization: Bearer $TOKEN" \
    -w "\nStatus: %{http_code}\n"
done

# Expected: First 100 succeed, then 429 errors
```

---

## Monitoring

### Key Metrics

```csharp
// Metrics to track
- rate_limit_checks_total
- rate_limit_exceeded_total
- rate_limit_cache_hits_total
- rate_limit_cache_misses_total
- rate_limit_config_updates_total
- tenant_tier_upgrades_total
```

### Grafana Dashboard

Create dashboards for:

- Rate limit hits per tenant
- Cache hit rates
- Most rate-limited endpoints
- Tier distribution
- Revenue by tier

---

## Troubleshooting

### Issue: Rate limits not applied

**Solution:** Check JWT contains `tenant_id` claim

### Issue: All requests return 429

**Solution:** Check Redis connection and counter keys

### Issue: Config changes not reflected

**Solution:** Wait up to 5 minutes for cache expiration or manually clear cache

### Issue: Unlimited tenant still rate limited

**Solution:** Verify `is_unlimited` flag in database

---

## Performance Considerations

1. **Cache Hit Rate:** Target >95% to minimize database load
2. **Redis Latency:** Keep <5ms for rate checks
3. **Database Queries:** Use connection pooling, prepared statements
4. **Monitoring:** Track P99 latency for rate limit checks

---

## Security Notes

1. **Admin Operations:** Require `SuperAdmin` role for custom limits
2. **Audit Logging:** Log all rate limit configuration changes
3. **DDoS Protection:** API Gateway provides first line of defense
4. **Tenant Isolation:** Redis keys include tenant_id to prevent leakage
