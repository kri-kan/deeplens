# DeepLens - Code Examples & Pseudo Code

This file contains all implementation code samples, pseudo code, and configuration examples for the DeepLens project, organized by technology stack and functional area.

**Note:** For system architecture diagrams and design details, see [PROJECT_PLAN.md](PROJECT_PLAN.md).

---

## Table of Contents

- [⚡ Rate Limiting & Tenant Management](#-rate-limiting--tenant-management)
- [🏛️ Database Integration](#️-database-integration)
- [🏢 Multi-Tenant Architecture](#-multi-tenant-architecture)
- [🤖 AI/ML Services](#-aiml-services)
- [🔐 Authentication & Security](#-authentication--security)
- [🐳 Docker & Infrastructure](#-docker--infrastructure)
- [📊 Observability & Telemetry](#-observability--telemetry)

---

## ⚡ Rate Limiting & Tenant Management

### Overview

DeepLens implements a **multi-level, database-backed rate limiting system** that supports:

- Dynamic per-tenant rate limits
- Multiple pricing tiers (free, basic, pro, enterprise)
- Runtime configuration updates without service restart
- Endpoint-specific limits
- Redis caching for performance

**Related ADR:** See [ARCHITECTURE_DECISIONS.md#adr-004](ARCHITECTURE_DECISIONS.md#adr-004) and [ADR-005](ARCHITECTURE_DECISIONS.md#adr-005)

For complete implementation details including database schema, service layer, and API endpoints, see the dedicated [Rate Limiting Implementation Guide](docs/RATE_LIMITING_IMPLEMENTATION.md).

**Key Components:**

- PostgreSQL tables for tenant limits and tier configurations
- Redis caching with 5-minute TTL for fast lookups
- Dynamic rate limiter policy for API Gateway
- Endpoint-specific rate checks in individual services
- Admin API for runtime configuration updates

**Example Tiers:**

| Tier       | Requests/Min | Searches/Min | Uploads/Min | Monthly Price |
| ---------- | ------------ | ------------ | ----------- | ------------- |
| Free       | 100          | 50           | 5           | $0            |
| Basic      | 1,000        | 500          | 50          | $29           |
| Pro        | 5,000        | 2,500        | 200         | $99           |
| Enterprise | 50,000       | 25,000       | 1,000       | $499          |

---

## 🏛️ Database Integration

### Duende IdentityServer Integration

```csharp
// Program.cs - Duende IdentityServer Integration
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = "https://deeplens-auth.yourdomain.com";
        options.Audience = "deeplens-api";
        options.RequireHttpsMetadata = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Scope-based authorization policies
    options.AddPolicy("SearchImages", policy =>
        policy.RequireScope("deeplens.search"));

    options.AddPolicy("ManageStorage", policy =>
        policy.RequireScope("deeplens.admin"));

    options.AddPolicy("UploadImages", policy =>
        policy.RequireScope("deeplens.upload"));

    options.AddPolicy("ViewMetrics", policy =>
        policy.RequireScope("deeplens.metrics"));
});

// Add HTTP client for IdentityServer admin API
builder.Services.AddHttpClient<IIdentityServerAdminClient, IdentityServerAdminClient>(client =>
{
    client.BaseAddress = new Uri("https://deeplens-auth.yourdomain.com/admin/api/");
});
```

### IdentityServer Configuration

```csharp
// IdentityServer Configuration (Host Application)
public static class Config
{
    public static IEnumerable<IdentityResource> IdentityResources =>
        new IdentityResource[]
        {
            new IdentityResources.OpenId(),
            new IdentityResources.Profile(),
            new IdentityResources.Email()
        };

    public static IEnumerable<ApiScope> ApiScopes =>
        new ApiScope[]
        {
            new ApiScope("deeplens.search", "Image Search Access"),
            new ApiScope("deeplens.upload", "Image Upload Access"),
            new ApiScope("deeplens.admin", "Administrative Access"),
            new ApiScope("deeplens.metrics", "Metrics and Analytics Access")
        };

    public static IEnumerable<ApiResource> ApiResources =>
        new ApiResource[]
        {
            new ApiResource("deeplens-api", "DeepLens API")
            {
                Scopes = { "deeplens.search", "deeplens.upload", "deeplens.admin", "deeplens.metrics" },
                UserClaims = { "role", "email", "name" }
            }
        };

    public static IEnumerable<Client> Clients =>
        new Client[]
        {
            // Web Application Client
            new Client
            {
                ClientId = "deeplens-web",
                ClientSecrets = { new Secret("your-client-secret".Sha256()) },
                AllowedGrantTypes = GrantTypes.Code,
                RedirectUris = { "https://deeplens.yourdomain.com/signin-oidc" },
                PostLogoutRedirectUris = { "https://deeplens.yourdomain.com/signout-callback-oidc" },
                AllowedScopes = { "openid", "profile", "email", "deeplens.search", "deeplens.upload" },
                RequirePkce = true,
                AllowOfflineAccess = true
            },
            // API Client (Machine-to-Machine)
            new Client
            {
                ClientId = "deeplens-api-client",
                ClientSecrets = { new Secret("api-client-secret".Sha256()) },
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                AllowedScopes = { "deeplens.admin", "deeplens.metrics" }
            },
            // Mobile/SPA Client
            new Client
            {
                ClientId = "deeplens-spa",
                AllowedGrantTypes = GrantTypes.Code,
                RequirePkce = true,
                RequireClientSecret = false,
                RedirectUris = { "https://deeplens-app.yourdomain.com/callback" },
                PostLogoutRedirectUris = { "https://deeplens-app.yourdomain.com/" },
                AllowedCorsOrigins = { "https://deeplens-app.yourdomain.com" },
                AllowedScopes = { "openid", "profile", "email", "deeplens.search", "deeplens.upload" }
            }
        };
}
```

### Docker Compose Configuration

```yaml
# docker-compose.auth.yml
version: "3.8"
services:
  deeplens-identityserver:
    image: deeplens/identityserver:latest
    build:
      context: ./auth-service
      dockerfile: Dockerfile
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Server=auth-db;Database=IdentityServer;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true
      - IdentityServer__IssuerUri=https://deeplens-auth.yourdomain.com
      - IdentityServer__PublicOrigin=https://deeplens-auth.yourdomain.com
    ports:
      - "5000:80"
      - "5001:443"
    depends_on:
      - auth-db
    volumes:
      - ./certs:/app/certs:ro
    networks:
      - deeplens-network

  auth-db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Passw0rd
    volumes:
      - auth-db-data:/var/opt/mssql
    networks:
      - deeplens-network

volumes:
  auth-db-data:

networks:
  deeplens-network:
    external: true
```

### API Authentication Examples

```bash
# Get access token
curl -X POST https://deeplens-auth.yourdomain.com/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=deeplens-api-client&client_secret=api-client-secret&scope=deeplens.search"

# Use token for API calls
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
     -X POST https://api.deeplens.com/v1/search/similarity \
     -F "image=@photo.jpg"
```

### Authentication Flow with Duende IdentityServer

```mermaid
sequenceDiagram
    participant User
    participant DeepLens Web App
    participant Duende IdentityServer
    participant DeepLens API

    User->>DeepLens Web App: 1. Access protected resource
    DeepLens Web App->>Duende IdentityServer: 2. Redirect to /authorize
    Duende IdentityServer->>User: 3. Login page
    User->>Duende IdentityServer: 4. Enter credentials
    Duende IdentityServer->>User: 5. Consent screen (if needed)
    User->>Duende IdentityServer: 6. Grant consent
    Duende IdentityServer->>DeepLens Web App: 7. Authorization code
    DeepLens Web App->>Duende IdentityServer: 8. Exchange code for tokens
    Duende IdentityServer->>DeepLens Web App: 9. ID token + Access token
    DeepLens Web App->>DeepLens API: 10. API call with access token
    DeepLens API->>Duende IdentityServer: 11. Validate token (introspection)
    Duende IdentityServer->>DeepLens API: 12. Token validation response
    DeepLens API->>DeepLens Web App: 13. API response
    DeepLens Web App->>User: 14. Protected resource
```

### User Management Features

```csharp
// Custom User Store Implementation
public class DeepLensUserStore : IUserStore<DeepLensUser>
{
    private readonly DeepLensDbContext _context;

    public async Task<DeepLensUser> FindByNameAsync(string normalizedUserName)
    {
        return await _context.Users
            .Include(u => u.Roles)
            .Include(u => u.Claims)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedUserName);
    }

    public async Task<DeepLensUser> FindByEmailAsync(string normalizedEmail)
    {
        return await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);
    }

    // Additional user management methods...
}

// Profile Service for Custom Claims
public class DeepLensProfileService : IProfileService
{
    private readonly UserManager<DeepLensUser> _userManager;

    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var user = await _userManager.GetUserAsync(context.Subject);
        if (user != null)
        {
            var claims = new List<Claim>
            {
                new Claim("email", user.Email),
                new Claim("name", user.UserName),
                new Claim("role", user.Role),
                new Claim("organization", user.Organization ?? ""),
                new Claim("storage_quota", user.StorageQuotaGB.ToString())
            };

            context.IssuedClaims.AddRange(claims);
        }
    }

    public async Task IsActiveAsync(IsActiveContext context)
    {
        var user = await _userManager.GetUserAsync(context.Subject);
        context.IsActive = user?.IsActive == true;
    }
}
```

### Role-Based Access Control (RBAC)

```csharp
// User roles and permissions
public enum DeepLensRole
{
    Viewer,      // Can search and view images
    Uploader,    // Can upload and search images
    Admin,       // Can manage storage and users
    SystemAdmin  // Full system access
}

public static class DeepLensScopes
{
    public const string SearchImages = "deeplens.search";
    public const string UploadImages = "deeplens.upload";
    public const string ManageStorage = "deeplens.storage";
    public const string ViewMetrics = "deeplens.metrics";
    public const string SystemAdmin = "deeplens.admin";
}

// Role-based authorization
services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole(nameof(DeepLensRole.Admin), nameof(DeepLensRole.SystemAdmin)));

    options.AddPolicy("UploaderOrAdmin", policy =>
        policy.RequireRole(
            nameof(DeepLensRole.Uploader),
            nameof(DeepLensRole.Admin),
            nameof(DeepLensRole.SystemAdmin)));
});
```

---

## 📊 Observability & Telemetry

### .NET Core Services Instrumentation

```csharp
// Program.cs - Comprehensive telemetry setup
var builder = WebApplication.CreateBuilder(args);

// OpenTelemetry configuration
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddRedisInstrumentation()
        .AddJaegerExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter());

// Modern observability: Serilog + OpenTelemetry integration
builder.Host.UseSerilog((context, configuration) =>
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithCorrelationId()
        .Enrich.WithEnvironmentName()
        .WriteTo.Console(new JsonFormatter())
        .WriteTo.OpenTelemetry(options =>  // ← Serilog sends to OpenTelemetry
        {
            options.Endpoint = "http://otel-collector:4317";
            options.Protocol = OtlpProtocol.Grpc;
            options.ResourceAttributes.Add("service.name", "deeplens-core");
        }));

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContext<DeepLensDbContext>()
    .AddRedis(builder.Configuration.GetConnectionString("Redis"))
    .AddRabbitMQ(builder.Configuration.GetConnectionString("RabbitMQ"))
    .AddCheck<FeatureExtractionHealthCheck>("feature-extraction")
    .AddCheck<VectorDbHealthCheck>("vector-database");

// Custom metrics
builder.Services.AddSingleton<IMetrics, CustomMetrics>();

var app = builder.Build();

// Correlation ID middleware
app.UseCorrelationId();

// Request/response logging
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("UserId", httpContext.User.FindFirst("sub")?.Value);
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"]);
        diagnosticContext.Set("RequestId", httpContext.TraceIdentifier);
    };
});

// Health check endpoints
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

### Node.js Service Instrumentation

```typescript
// app.ts - NestJS with comprehensive telemetry
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { trace, metrics } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/auto-instrumentations-node";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || "http://jaeger:14268/api/traces",
  }),
  metricExporter: new PrometheusExporter({
    port: 9090,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

sdk.start();

// Custom metrics collection
class CustomMetrics {
  private readonly httpRequestsTotal = metrics.createCounter(
    "http_requests_total",
    {
      description: "Total number of HTTP requests",
    }
  );

  private readonly imageProcessingDuration = metrics.createHistogram(
    "image_processing_duration_seconds",
    {
      description: "Duration of image processing operations",
    }
  );

  recordHttpRequest(method: string, route: string, statusCode: number) {
    this.httpRequestsTotal.add(1, {
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  recordImageProcessing(duration: number, operation: string) {
    this.imageProcessingDuration.record(duration, { operation });
  }
}
```

### Python AI Service Instrumentation

```python
# main.py - FastAPI with comprehensive telemetry
from fastapi import FastAPI, Request
from opentelemetry import trace, metrics
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentator
from opentelemetry.instrumentation.requests import RequestsInstrumentator
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.prometheus import PrometheusMetricExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
import structlog
import uvicorn
import time
import uuid

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# OpenTelemetry setup
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Custom metrics
feature_extraction_counter = meter.create_counter(
    "feature_extraction_total",
    description="Total number of feature extractions"
)

model_inference_histogram = meter.create_histogram(
    "model_inference_duration_seconds",
    description="Duration of model inference operations"
)

app = FastAPI(title="DeepLens AI Service")

# Instrument FastAPI
FastAPIInstrumentator.instrument_app(app)
RequestsInstrumentator().instrument()

@app.post("/extract-features")
async def extract_features(image_data: bytes):
    with tracer.start_as_current_span("extract_features") as span:
        start_time = time.time()

        try:
            # Feature extraction logic here
            features = await perform_feature_extraction(image_data)

            # Record metrics
            feature_extraction_counter.add(1, {"status": "success"})
            model_inference_histogram.record(
                time.time() - start_time,
                {"model": "resnet50", "status": "success"}
            )

            span.set_attribute("features.count", len(features))
            span.set_attribute("image.size", len(image_data))

            logger.info("Feature extraction completed", features_count=len(features))

            return {"features": features}

        except Exception as e:
            feature_extraction_counter.add(1, {"status": "error"})
            span.record_exception(e)
            logger.error("Feature extraction failed", error=str(e))
            raise
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: "deeplens-api"
    static_configs:
      - targets: ["api:8080"]
    metrics_path: "/metrics"
    scrape_interval: 5s

  - job_name: "deeplens-worker"
    static_configs:
      - targets: ["worker:9090"]
    metrics_path: "/metrics"
    scrape_interval: 5s

  - job_name: "deeplens-ai-service"
    static_configs:
      - targets: ["ai-service:8000"]
    metrics_path: "/metrics"
    scrape_interval: 5s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: deeplens.rules
    rules:
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
```

---

## 🚀 Core Engine Components (Pseudo Code)

### Image Ingestion Pipeline

```python
# Pseudo-code structure
class ImageIngestionPipeline:
    - scan_storage_locations()
    - validate_image_files()
    - extract_metadata()
    - generate_thumbnails()
    - queue_for_processing()
```

### Feature Extraction Engine

```python
class FeatureExtractor:
    - load_models() # Multiple model support
    - preprocess_image()
    - extract_visual_features()
    - extract_semantic_features()
    - normalize_features()
```

### Similarity Matching Engine

```python
class SimilarityMatcher:
    - compute_similarity_scores()
    - rank_results()
    - apply_filters()
    - deduplicate_results()
```

### Storage Connectors

```python
class StorageConnector:
    - list_files()
    - read_file()
    - get_metadata()
    - check_accessibility()
```

### Scalable Image Processor

```python
# Scalable processing pipeline
class ScalableImageProcessor:
    def __init__(self):
        self.worker_pool_size = os.cpu_count() * 2
        self.gpu_workers = self.detect_gpu_workers()
        self.task_queue = self.setup_distributed_queue()

    async def process_batch(self, images):
        # Distribute across available workers
        tasks = [self.process_single(img) for img in images]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
```

### Scaling Metrics

```python
# Metrics collection for scaling decisions
class ScalingMetrics:
    metrics = {
        'api_response_time_p95': 500,  # milliseconds
        'search_throughput_rps': 1000,  # requests per second
        'indexing_rate_ips': 100,      # images per second
        'cpu_utilization_avg': 70,     # percentage
        'memory_utilization_avg': 80,  # percentage
        'queue_depth_max': 1000,       # pending tasks
        'error_rate_max': 0.01,        # 1% error rate
        'availability_min': 99.9       # uptime percentage
    }
```

---

## 🗄️ Database Schema Design

### Vector Storage

```sql
-- Vector embeddings table
CREATE TABLE image_vectors (
    id UUID PRIMARY KEY,
    image_id UUID REFERENCES images(id),
    model_name VARCHAR(50),
    vector_data VECTOR(512), -- Depends on model output size
    created_at TIMESTAMP
);
```

### Metadata Storage

```sql
-- Main images table
CREATE TABLE images (
    id UUID PRIMARY KEY,
    file_path TEXT,
    storage_location VARCHAR(100),
    storage_type VARCHAR(20),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    format VARCHAR(10),
    hash_md5 VARCHAR(32),
    hash_perceptual VARCHAR(64),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    indexed_at TIMESTAMP
);

-- Similarity results cache
CREATE TABLE similarity_cache (
    query_hash VARCHAR(64) PRIMARY KEY,
    results JSONB,
    created_at TIMESTAMP,
    expires_at TIMESTAMP
);
```

---

## 🌐 API Design

### REST Endpoints

```yaml
POST /api/v1/search/similarity
- Upload image or provide image URL
- Returns ranked similar images

POST /api/v1/search/duplicates
- Find exact or near-duplicate images
- Returns grouped duplicates with confidence scores

GET /api/v1/images/{id}
- Get image metadata and thumbnail

POST /api/v1/index/scan
- Trigger scanning of storage locations
- Returns job ID for progress tracking

GET /api/v1/index/status/{job_id}
- Get indexing job status and progress

POST /api/v1/storage/add
- Add new storage location for indexing

GET /api/v1/stats/overview
- Get system statistics and health metrics
```

### Request/Response Examples

```json
// Similarity Search Request
{
  "image": "base64_encoded_image_data",
  "similarity_threshold": 0.8,
  "max_results": 50,
  "include_metadata": true,
  "storage_locations": ["location1", "location2"]
}

// Response
{
  "query_id": "uuid",
  "results": [
    {
      "image_id": "uuid",
      "similarity_score": 0.95,
      "file_path": "/path/to/image.jpg",
      "storage_location": "aws-s3-bucket",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "file_size": 2048576,
        "format": "JPEG"
      },
      "thumbnail_url": "/api/v1/thumbnails/uuid"
    }
  ],
  "total_results": 25,
  "processing_time_ms": 150
}
```

---

## 🐳 Deployment Configuration

### Kubernetes HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: deeplens-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: deeplens-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Redis Cluster Configuration

```yaml
# Redis Cluster Configuration
cluster:
  enabled: true
  nodes: 6
  replicas: 1
  shards: 3
  persistence:
    enabled: true
    storageClass: fast-ssd
```

### Kubernetes Deployment

```yaml
# Kubernetes deployment with platform abstraction
apiVersion: v1
kind: ConfigMap
metadata:
  name: deeplens-config
data:
  STORAGE_BACKEND: "${CLOUD_PROVIDER}_storage"
  VECTOR_DB_ENDPOINT: "${CLOUD_PROVIDER}_vector_service"
  MESSAGE_QUEUE: "${CLOUD_PROVIDER}_queue_service"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deeplens-core
spec:
  replicas: 2
  selector:
    matchLabels:
      app: deeplens-core
  template:
    spec:
      containers:
        - name: deeplens-core
          image: deeplens/core:latest
          ports:
            - containerPort: 80 # HTTP API
            - containerPort: 443 # HTTPS API
            - containerPort: 8080 # Hangfire Dashboard
          env:
            - name: CLOUD_PROVIDER
              value: "aws" # or "azure", "gcp", "local"
            - name: ASPNETCORE_ENVIRONMENT
              value: "Production"
          resources:
            requests:
              cpu: 1
              memory: 2Gi
            limits:
              cpu: 4
              memory: 4Gi
```

---

## 📊 Database Integration & Analytics

### InfluxDB Business Metrics Service

```csharp
// .NET Service writing business metrics to InfluxDB
public class BusinessMetricsService
{
    private readonly IInfluxDBClient _influxClient;

    public async Task RecordTenantUsage(string tenantId, int apiCalls, long storageUsed)
    {
        var point = PointData
            .Measurement("tenant_usage")
            .Tag("tenant_id", tenantId)
            .Field("api_calls", apiCalls)
            .Field("storage_bytes", storageUsed)
            .Timestamp(DateTime.UtcNow);

        await _influxClient.GetWriteApiAsync().WritePointAsync(point);
    }

    public async Task RecordSearchOperation(string tenantId, TimeSpan duration, int resultsCount)
    {
        var point = PointData
            .Measurement("search_operations")
            .Tag("tenant_id", tenantId)
            .Field("duration_ms", (int)duration.TotalMilliseconds)
            .Field("results_count", resultsCount)
            .Timestamp(DateTime.UtcNow);

        await _influxClient.GetWriteApiAsync().WritePointAsync(point);
    }

    public async Task RecordImageProcessing(string tenantId, string operation, TimeSpan duration, bool success)
    {
        var point = PointData
            .Measurement("image_processing")
            .Tag("tenant_id", tenantId)
            .Tag("operation", operation)
            .Tag("status", success ? "success" : "error")
            .Field("duration_ms", (int)duration.TotalMilliseconds)
            .Timestamp(DateTime.UtcNow);

        await _influxClient.GetWriteApiAsync().WritePointAsync(point);
    }
}
```

### Kubernetes Metadata Queries (PostgreSQL)

```sql
-- Find all pods for a tenant across clusters
SELECT p.name, p.namespace, n.name as node, c.name as cluster
FROM k8s_pods p
JOIN k8s_nodes n ON p.node_id = n.id
JOIN k8s_clusters c ON n.cluster_id = c.id
WHERE p.labels ->> 'tenant' = 'acme-corp';

-- Capacity planning: nodes with high resource utilization
SELECT c.name as cluster, n.name as node,
       n.cpu_capacity, n.memory_capacity,
       COUNT(p.id) as pod_count
FROM k8s_nodes n
JOIN k8s_clusters c ON n.cluster_id = c.id
LEFT JOIN k8s_pods p ON p.node_id = n.id
WHERE n.cpu_utilization > 0.8
GROUP BY c.id, n.id;

-- Multi-tenant resource usage analysis
SELECT
    p.labels ->> 'tenant' as tenant_id,
    COUNT(*) as pod_count,
    SUM(p.cpu_request) as total_cpu_request,
    SUM(p.memory_request) as total_memory_request,
    AVG(p.cpu_utilization) as avg_cpu_utilization
FROM k8s_pods p
WHERE p.labels ? 'tenant'
GROUP BY p.labels ->> 'tenant'
ORDER BY total_cpu_request DESC;
```

### Infisical Secret Management Integration

```csharp
// .NET Integration with Infisical
services.AddInfisical(options =>
{
    options.ClientId = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_ID");
    options.ClientSecret = Environment.GetEnvironmentVariable("INFISICAL_CLIENT_SECRET");
    options.ProjectId = "deeplens-production";
    options.Environment = "prod";
});

// Retrieve secrets at runtime
var dbConnectionString = await _infisical.GetSecretAsync("DATABASE_CONNECTION_STRING");
var jwtSecret = await _infisical.GetSecretAsync("JWT_SECRET_KEY");
var storageAccountKey = await _infisical.GetSecretAsync("AZURE_STORAGE_ACCOUNT_KEY");

// Service configuration with secrets
public class SecretService
{
    private readonly IInfisicalClient _infisical;

    public async Task<StorageConfiguration> GetStorageConfigAsync(string tenantId)
    {
        var config = new StorageConfiguration
        {
            ConnectionString = await _infisical.GetSecretAsync($"STORAGE_CONNECTION_{tenantId}"),
            EncryptionKey = await _infisical.GetSecretAsync($"ENCRYPTION_KEY_{tenantId}"),
            AccessKey = await _infisical.GetSecretAsync($"STORAGE_ACCESS_KEY_{tenantId}")
        };

        return config;
    }
}
```

---

## 🏢 Multi-Tenant Architecture Examples

### Tenant Context Service

```csharp
// Tenant Context Service
public class TenantContext : ITenantContext
{
    public string TenantId { get; set; }
    public string DatabaseName => $"tenant_{TenantId}_metadata";
    public string QdrantCollection => $"tenant_{TenantId}_vectors";
    public int RedisDatabase => GetTenantRedisDb(TenantId);
    public StorageConfiguration Storage { get; set; }
}

// Multi-tenant DbContext
public class TenantDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        var connectionString = $"Host=localhost;Database={_tenantContext.DatabaseName};Username=tenant_user;Password=***";
        optionsBuilder.UseNpgsql(connectionString);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Add tenant ID as global query filter
        modelBuilder.Entity<Image>().HasQueryFilter(e => e.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Collection>().HasQueryFilter(e => e.TenantId == _tenantContext.TenantId);
    }
}
```

### BYOS Storage Factory Pattern

```csharp
public interface IStorageService
{
    Task<string> UploadImageAsync(string tenantId, Stream imageStream, string fileName);
    Task<Stream> DownloadImageAsync(string tenantId, string imagePath);
    Task<bool> DeleteImageAsync(string tenantId, string imagePath);
    Task<StorageMetadata> GetMetadataAsync(string tenantId, string imagePath);
}

public class StorageServiceFactory : IStorageServiceFactory
{
    private readonly ITenantStorageConfigService _configService;
    private readonly IServiceProvider _serviceProvider;

    public async Task<IStorageService> CreateStorageServiceAsync(string tenantId)
    {
        var config = await _configService.GetStorageConfigAsync(tenantId);

        return config.Provider switch
        {
            StorageProvider.AzureBlob => _serviceProvider.GetRequiredService<AzureBlobStorageService>(),
            StorageProvider.AmazonS3 => _serviceProvider.GetRequiredService<S3StorageService>(),
            StorageProvider.GoogleCloudStorage => _serviceProvider.GetRequiredService<GcsStorageService>(),
            StorageProvider.MinIO => _serviceProvider.GetRequiredService<MinIOStorageService>(),
            _ => throw new NotSupportedException($"Storage provider {config.Provider} is not supported")
        };
    }
}

// Azure Blob Implementation
public class AzureBlobStorageService : IStorageService
{
    private readonly BlobServiceClient _blobServiceClient;

    public async Task<string> UploadImageAsync(string tenantId, Stream imageStream, string fileName)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient($"tenant-{tenantId}");
        await containerClient.CreateIfNotExistsAsync();

        var blobClient = containerClient.GetBlobClient(fileName);
        await blobClient.UploadAsync(imageStream, overwrite: true);

        return blobClient.Uri.ToString();
    }

    // Additional methods...
}
```

### Tenant Management API

```csharp
[ApiController]
[Route("api/v1/admin/tenants")]
[Authorize(Policy = "SystemAdmin")]
public class TenantManagementController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<TenantResponse>> CreateTenant(
        [FromBody] CreateTenantRequest request)
    {
        // 1. Create tenant database from template
        await _databaseService.CreateTenantDatabaseAsync(request.TenantId);

        // 2. Create Qdrant collection
        await _vectorService.CreateTenantCollectionAsync(request.TenantId);

        // 3. Setup storage configuration
        await _storageService.ConfigureTenantStorageAsync(request.TenantId, request.StorageConfig);

        // 4. Initialize tenant settings
        var tenant = new Tenant
        {
            Id = request.TenantId,
            Name = request.Name,
            Plan = request.Plan,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        await _tenantService.CreateTenantAsync(tenant);

        return Ok(new TenantResponse { TenantId = tenant.Id, Status = "Created" });
    }
}
```

---

## 🤖 AI/ML Service Integration

### High-Performance .NET API with AI Service Integration

```csharp
// Example: High-performance .NET API with AI service integration
[ApiController]
[Route("api/v1/[controller]")]
public class SearchController : ControllerBase
{
    private readonly IFeatureExtractionService _featureService;
    private readonly ISimilarityMatcher _similarityMatcher;

    [HttpPost("similarity")]
    public async Task<ActionResult<SimilarityResponse>> SearchSimilar(
        [FromForm] IFormFile image,
        [FromQuery] SimilarityRequest request)
    {
        // Use ML.NET for basic image processing
        var processedImage = await _imageProcessor.ProcessAsync(image);

        // Extract features using ONNX Runtime
        var features = await _featureService.ExtractFeaturesAsync(processedImage);

        // Find similar images using vector search
        var results = await _similarityMatcher.FindSimilarAsync(features, request.Threshold);

        return Ok(new SimilarityResponse { Results = results });
    }
}
```

### AI Microservice in Node.js/TypeScript

```typescript
// Specialized AI service for complex ML operations
import * as tf from "@tensorflow/tfjs-node";
import { createCanvas, loadImage } from "canvas";

class FeatureExtractionService {
  private model: tf.LayersModel;

  async extractFeatures(imageBuffer: Buffer): Promise<number[]> {
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(224, 224);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, 224, 224);

    const tensor = tf.browser
      .fromPixels(canvas)
      .expandDims(0)
      .cast("float32")
      .div(255.0);

    const features = (await this.model.predict(tensor)) as tf.Tensor;
    return Array.from(await features.data());
  }

  async loadModel(modelPath: string): Promise<void> {
    this.model = await tf.loadLayersModel(modelPath);
  }

  async preprocessImage(imageBuffer: Buffer): Promise<tf.Tensor> {
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(224, 224);
    const ctx = canvas.getContext("2d");

    // Resize and normalize
    ctx.drawImage(image, 0, 0, 224, 224);

    return tf.browser
      .fromPixels(canvas)
      .expandDims(0)
      .cast("float32")
      .div(255.0);
  }
}
```

### Python FastAPI AI Service

```python
# FastAPI Python AI Service
from fastapi import FastAPI, UploadFile, File
import torch
import torchvision.transforms as transforms
from PIL import Image
import io

app = FastAPI()

class FeatureExtractor:
    def __init__(self, model_path: str):
        self.model = torch.load(model_path)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])

    def extract_features(self, image_bytes: bytes) -> list:
        image = Image.open(io.BytesIO(image_bytes))
        tensor = self.transform(image).unsqueeze(0)

        with torch.no_grad():
            features = self.model(tensor)

        return features.squeeze().tolist()

@app.post("/extract-features")
async def extract_features(file: UploadFile = File(...)):
    contents = await file.read()
    features = extractor.extract_features(contents)
    return {"features": features}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0"
    }
```

---

## 🔐 Authentication & Security Examples

### Duende IdentityServer Integration

```csharp
// Program.cs - Duende IdentityServer Integration
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = "https://deeplens-auth.yourdomain.com";
        options.Audience = "deeplens-api";
        options.RequireHttpsMetadata = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Scope-based authorization policies
    options.AddPolicy("SearchImages", policy =>
        policy.RequireScope("deeplens.search"));

    options.AddPolicy("ManageStorage", policy =>
        policy.RequireScope("deeplens.admin"));

    options.AddPolicy("UploadImages", policy =>
        policy.RequireScope("deeplens.upload"));

    options.AddPolicy("ViewMetrics", policy =>
        policy.RequireScope("deeplens.metrics"));
});

// Add HTTP client for IdentityServer admin API
builder.Services.AddHttpClient<IIdentityServerAdminClient, IdentityServerAdminClient>(client =>
{
    client.BaseAddress = new Uri("https://deeplens-auth.yourdomain.com/admin/api/");
});
```

### JWT Token Validation & Custom Authorization

```csharp
// JWT Token Validation & Refresh
[ApiController]
[Authorize(Policy = "SearchImages")]
public class SearchController : ControllerBase
{
    [HttpPost("similarity")]
    [RequiredScope("search:images")]
    public async Task<ActionResult<SimilarityResponse>> SearchSimilar(
        [FromForm] IFormFile image)
    {
        var userId = User.FindFirst("sub")?.Value;
        var scopes = User.FindAll("scope").Select(c => c.Value);

        // Rate limiting per user
        await _rateLimiter.CheckLimitAsync(userId, "search", TimeSpan.FromMinutes(1), 100);

        // Audit logging
        _logger.LogInformation("Image search requested by user {UserId} with scopes {Scopes}",
            userId, string.Join(", ", scopes));

        // Implementation...
    }
}

// Custom Authorization Attributes
public class RequiredScopeAttribute : AuthorizeAttribute, IAuthorizationFilter
{
    private readonly string _scope;

    public RequiredScopeAttribute(string scope)
    {
        _scope = scope;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (!user.HasClaim("scope", _scope))
        {
            context.Result = new ForbidResult();
        }
    }
}
```

### Role-Based Access Control (RBAC)

```csharp
// User roles and permissions
public enum DeepLensRole
{
    Viewer,      // Can search and view images
    Uploader,    // Can upload and search images
    Admin,       // Can manage storage and users
    SystemAdmin  // Full system access
}

public static class DeepLensScopes
{
    public const string SearchImages = "deeplens:search";
    public const string UploadImages = "deeplens:upload";
    public const string ManageStorage = "deeplens:storage";
    public const string ViewMetrics = "deeplens:metrics";
    public const string SystemAdmin = "deeplens:admin";
}

// Role-based authorization
services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole(nameof(DeepLensRole.Admin), nameof(DeepLensRole.SystemAdmin)));

    options.AddPolicy("UploaderOrAdmin", policy =>
        policy.RequireRole(
            nameof(DeepLensRole.Uploader),
            nameof(DeepLensRole.Admin),
            nameof(DeepLensRole.SystemAdmin)));
});
```

### Custom User Store & Profile Service

```csharp
// Custom User Store Implementation
public class DeepLensUserStore : IUserStore<DeepLensUser>
{
    private readonly DeepLensDbContext _context;

    public async Task<DeepLensUser> FindByNameAsync(string normalizedUserName)
    {
        return await _context.Users
            .Include(u => u.Roles)
            .Include(u => u.Claims)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedUserName);
    }

    public async Task<DeepLensUser> FindByEmailAsync(string normalizedEmail)
    {
        return await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);
    }

    // Additional user management methods...
}

// Profile Service for Custom Claims
public class DeepLensProfileService : IProfileService
{
    private readonly UserManager<DeepLensUser> _userManager;

    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var user = await _userManager.GetUserAsync(context.Subject);
        if (user != null)
        {
            var claims = new List<Claim>
            {
                new Claim("email", user.Email),
                new Claim("name", user.UserName),
                new Claim("role", user.Role),
                new Claim("organization", user.Organization ?? ""),
                new Claim("storage_quota", user.StorageQuotaGB.ToString())
            };

            context.IssuedClaims.AddRange(claims);
        }
    }

    public async Task IsActiveAsync(IsActiveContext context)
    {
        var user = await _userManager.GetUserAsync(context.Subject);
        context.IsActive = user?.IsActive == true;
    }
}
```

---

## 🐳 Docker & Infrastructure Configurations

### Prometheus Configuration

```yaml
# prometheus.yml - Infrastructure Monitoring (30-day retention)
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: "deeplens"
    environment: "production"

# Storage configuration
storage:
  tsdb:
    retention_time: 30d
    retention_size: 10GB

rule_files:
  - "alerts.yml"

scrape_configs:
  # Application Services
  - job_name: "deeplens-api"
    static_configs:
      - targets: ["api:8080"]
    metrics_path: "/metrics"
    scrape_interval: 5s

  - job_name: "deeplens-ai-service"
    static_configs:
      - targets: ["ai-service:8000"]
    metrics_path: "/metrics"
    scrape_interval: 5s

  # Infrastructure Metrics
  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]
    scrape_interval: 10s

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
    scrape_interval: 10s

  # Database Metrics
  - job_name: "postgres-exporter"
    static_configs:
      - targets: ["postgres-exporter:9187"]
    scrape_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Alert Rules Configuration

```yaml
# alerts.yml
groups:
  - name: deeplens.rules
    rules:
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: FeatureExtractionBacklog
        expr: rabbitmq_queue_messages{queue="feature_extraction"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Feature extraction queue backlog"
          description: "Queue has {{ $value }} pending messages"

      - alert: VectorDatabaseDown
        expr: up{job="vector-db"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vector database is down"
          description: "Vector database has been down for more than 1 minute"
```

### Kafka Processing Queue Configuration

```yaml
# Kafka Topics for DeepLens Processing Pipeline
Kafka Topics:
  images.uploaded:
    partitions: 3
    replication-factor: 1
    retention.ms: 604800000 # 7 days
    cleanup.policy: delete

  images.validated:
    partitions: 3
    replication-factor: 1
    retention.ms: 604800000 # 7 days

  images.processed:
    partitions: 3
    replication-factor: 1
    retention.ms: 604800000 # 7 days

  images.indexed:
    partitions: 3
    replication-factor: 1
    retention.ms: 604800000 # 7 days

  duplicates.found:
    partitions: 1
    replication-factor: 1
    retention.ms: 2592000000 # 30 days

  tenant.usage:
    partitions: 6 # Partition by tenant_id
    replication-factor: 1
    retention.ms: 7776000000 # 90 days

  images.failed:
    partitions: 1
    replication-factor: 1
    retention.ms: 2592000000 # 30 days

Consumer Groups:
  - deeplens-validation-group: Validation workers
  - deeplens-feature-extraction-group: AI/ML Python workers
  - deeplens-indexing-group: Vector database workers
  - deeplens-duplicate-detection-group: Duplicate analysis workers
  - deeplens-analytics-group: Usage analytics workers

Worker Configuration:
  - Validation workers: 2-4 parallel (.NET)
  - Feature extraction workers: 4-8 parallel (Python + GPU)
  - Vector indexing workers: 2-4 parallel (.NET + Qdrant)
  - Duplicate detection: 2-4 parallel (.NET)
  - Analytics workers: 1-2 parallel (.NET)
```

### Kafka Producer/Consumer Examples

#### .NET Kafka Producer (Image Upload API)

```csharp
// Services/KafkaImageEventProducer.cs
public class KafkaImageEventProducer : IImageEventProducer
{
    private readonly IProducer<string, ImageUploadedEvent> _producer;
    private readonly ILogger<KafkaImageEventProducer> _logger;

    public KafkaImageEventProducer(IProducer<string, ImageUploadedEvent> producer, ILogger<KafkaImageEventProducer> logger)
    {
        _producer = producer;
        _logger = logger;
    }

    public async Task PublishImageUploadedAsync(ImageUploadedEvent imageEvent)
    {
        try
        {
            var result = await _producer.ProduceAsync("images.uploaded", new Message<string, ImageUploadedEvent>
            {
                Key = imageEvent.TenantId.ToString(), // Partition by tenant
                Value = imageEvent,
                Headers = new Headers
                {
                    { "tenant-id", Encoding.UTF8.GetBytes(imageEvent.TenantId.ToString()) },
                    { "event-type", Encoding.UTF8.GetBytes("ImageUploaded") },
                    { "timestamp", Encoding.UTF8.GetBytes(DateTimeOffset.UtcNow.ToString()) }
                }
            });

            _logger.LogInformation($"Image uploaded event published: {result.TopicPartitionOffset}");
        }
        catch (ProduceException<string, ImageUploadedEvent> ex)
        {
            _logger.LogError(ex, $"Failed to publish image uploaded event for {imageEvent.ImageId}");
            throw;
        }
    }
}

// Models/Events/ImageUploadedEvent.cs
public class ImageUploadedEvent
{
    public Guid TenantId { get; set; }
    public Guid ImageId { get; set; }
    public string OriginalFileName { get; set; }
    public string StorageProvider { get; set; }
    public string StoragePath { get; set; }
    public long FileSize { get; set; }
    public string MimeType { get; set; }
    public string Checksum { get; set; }
    public DateTime UploadedAt { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}
```

#### .NET Kafka Consumer (Validation Service)

```csharp
// Workers/ImageValidationWorker.cs
public class ImageValidationWorker : BackgroundService
{
    private readonly IConsumer<string, ImageUploadedEvent> _consumer;
    private readonly IImageValidationService _validationService;
    private readonly IImageEventProducer _eventProducer;
    private readonly ILogger<ImageValidationWorker> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _consumer.Subscribe("images.uploaded");

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = _consumer.Consume(stoppingToken);

                    if (consumeResult.IsPartitionEOF)
                        continue;

                    var imageEvent = consumeResult.Message.Value;
                    _logger.LogInformation($"Processing validation for image {imageEvent.ImageId}");

                    // Validate the image
                    var validationResult = await _validationService.ValidateAsync(imageEvent);

                    if (validationResult.IsValid)
                    {
                        // Extract EXIF metadata
                        var metadata = await _validationService.ExtractMetadataAsync(imageEvent.StoragePath);

                        // Generate thumbnails
                        var thumbnails = await _validationService.GenerateThumbnailsAsync(imageEvent.StoragePath);

                        var validatedEvent = new ImageValidatedEvent
                        {
                            TenantId = imageEvent.TenantId,
                            ImageId = imageEvent.ImageId,
                            OriginalFileName = imageEvent.OriginalFileName,
                            StoragePath = imageEvent.StoragePath,
                            FileSize = imageEvent.FileSize,
                            MimeType = imageEvent.MimeType,
                            Checksum = imageEvent.Checksum,
                            UploadedAt = imageEvent.UploadedAt,
                            ValidatedAt = DateTime.UtcNow,
                            ExifMetadata = metadata,
                            ThumbnailPaths = thumbnails,
                            ImageDimensions = validationResult.Dimensions
                        };

                        await _eventProducer.PublishImageValidatedAsync(validatedEvent);
                    }
                    else
                    {
                        var failedEvent = new ImageFailedEvent
                        {
                            OriginalEvent = imageEvent,
                            ErrorMessage = validationResult.ErrorMessage,
                            FailedAt = DateTime.UtcNow,
                            FailureStage = "Validation",
                            Retryable = validationResult.IsRetryable
                        };

                        await _eventProducer.PublishImageFailedAsync(failedEvent);
                    }

                    // Commit the message
                    _consumer.Commit(consumeResult);
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming message from images.uploaded topic");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in image validation worker");
                }
            }
        }
        finally
        {
            _consumer.Close();
        }
    }
}
```

#### Python Kafka Consumer (Feature Extraction Service)

```python
# services/feature_extraction_service.py
from kafka import KafkaConsumer, KafkaProducer
import json
import logging
import traceback
from datetime import datetime
from typing import Dict, Any
import numpy as np
from .models import ResNet50FeatureExtractor, CLIPFeatureExtractor

class FeatureExtractionService:
    def __init__(self, kafka_config: Dict[str, Any]):
        self.consumer = KafkaConsumer(
            'images.validated',
            bootstrap_servers=kafka_config['bootstrap_servers'],
            group_id='deeplens-feature-extraction-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=False
        )

        self.producer = KafkaProducer(
            bootstrap_servers=kafka_config['bootstrap_servers'],
            value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8')
        )

        self.resnet_extractor = ResNet50FeatureExtractor()
        self.clip_extractor = CLIPFeatureExtractor()
        self.logger = logging.getLogger(__name__)

    async def start_processing(self):
        """Start consuming messages and processing images"""
        self.logger.info("Starting feature extraction service...")

        try:
            for message in self.consumer:
                try:
                    image_event = message.value
                    self.logger.info(f"Processing features for image {image_event['image_id']}")

                    # Extract features using both models
                    resnet_features = await self.resnet_extractor.extract(
                        image_event['storage_path']
                    )

                    clip_features = await self.clip_extractor.extract(
                        image_event['storage_path']
                    )

                    # Create processed event
                    processed_event = {
                        **image_event,
                        'features': {
                            'resnet50': {
                                'vector': resnet_features.tolist(),
                                'dimension': len(resnet_features),
                                'model_version': '1.0'
                            },
                            'clip': {
                                'vector': clip_features.tolist(),
                                'dimension': len(clip_features),
                                'model_version': '1.0'
                            }
                        },
                        'processed_at': datetime.utcnow().isoformat(),
                        'processing_time_ms': 0,  # Calculate actual time
                        'gpu_used': True
                    }

                    # Publish to processed topic
                    self.producer.send('images.processed', processed_event)
                    self.producer.flush()

                    # Commit the message
                    self.consumer.commit()

                    self.logger.info(f"Successfully processed image {image_event['image_id']}")

                except Exception as e:
                    self.logger.error(f"Error processing image: {str(e)}")
                    self.logger.error(traceback.format_exc())

                    # Send to failed topic
                    failed_event = {
                        'original_event': image_event,
                        'error_message': str(e),
                        'error_traceback': traceback.format_exc(),
                        'failed_at': datetime.utcnow().isoformat(),
                        'service': 'feature-extraction',
                        'retryable': self._is_retryable_error(e)
                    }

                    self.producer.send('images.failed', failed_event)
                    self.producer.flush()

        except KeyboardInterrupt:
            self.logger.info("Shutting down feature extraction service...")
        finally:
            self.consumer.close()
            self.producer.close()

    def _is_retryable_error(self, error: Exception) -> bool:
        """Determine if an error is retryable"""
        retryable_errors = [
            'ConnectionError',
            'TimeoutError',
            'TemporaryFailure'
        ]
        return any(err in str(type(error)) for err in retryable_errors)
```

#### Kafka Startup Configuration

```csharp
// Program.cs - .NET Service Configuration
builder.Services.Configure<KafkaConfig>(builder.Configuration.GetSection("Kafka"));

// Producer configuration
builder.Services.AddSingleton<IProducer<string, ImageUploadedEvent>>(provider =>
{
    var config = provider.GetRequiredService<IOptions<KafkaConfig>>().Value;
    return new ProducerBuilder<string, ImageUploadedEvent>(config.ProducerConfig)
        .SetValueSerializer(new JsonSerializer<ImageUploadedEvent>())
        .SetErrorHandler((_, e) => Console.WriteLine($"Error: {e.Reason}"))
        .Build();
});

// Consumer configuration
builder.Services.AddSingleton<IConsumer<string, ImageUploadedEvent>>(provider =>
{
    var config = provider.GetRequiredService<IOptions<KafkaConfig>>().Value;
    return new ConsumerBuilder<string, ImageUploadedEvent>(config.ConsumerConfig)
        .SetValueDeserializer(new JsonDeserializer<ImageUploadedEvent>())
        .SetErrorHandler((_, e) => Console.WriteLine($"Error: {e.Reason}"))
        .Build();
});

// Register background services
builder.Services.AddHostedService<ImageValidationWorker>();
builder.Services.AddHostedService<VectorIndexingWorker>();
builder.Services.AddHostedService<DuplicateDetectionWorker>();
```

#### Kafka Health Checks

```csharp
// Health/KafkaHealthCheck.cs
public class KafkaHealthCheck : IHealthCheck
{
    private readonly IAdminClient _adminClient;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var metadata = _adminClient.GetMetadata(TimeSpan.FromSeconds(10));

            if (metadata.Brokers.Count == 0)
                return HealthCheckResult.Unhealthy("No Kafka brokers available");

            // Check specific topics exist
            var requiredTopics = new[] { "images.uploaded", "images.validated", "images.processed" };
            var existingTopics = metadata.Topics.Select(t => t.Topic).ToHashSet();

            var missingTopics = requiredTopics.Where(topic => !existingTopics.Contains(topic)).ToList();

            if (missingTopics.Any())
                return HealthCheckResult.Degraded($"Missing topics: {string.Join(", ", missingTopics)}");

            return HealthCheckResult.Healthy($"Kafka is healthy with {metadata.Brokers.Count} brokers");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Kafka connection failed", ex);
        }
    }
}
```

### Kubernetes Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: deeplens-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: deeplens-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000m"
```

### Redis Cluster Configuration

```yaml
# Redis Cluster Configuration
cluster:
  enabled: true
  nodes: 6
  replicas: 1
  shards: 3
  persistence:
    enabled: true
    storageClass: fast-ssd
```

### Cloud-Native Kubernetes Deployment

```yaml
# Kubernetes deployment with platform abstraction
apiVersion: v1
kind: ConfigMap
metadata:
  name: deeplens-config
data:
  STORAGE_BACKEND: "${CLOUD_PROVIDER}_storage"
  VECTOR_DB_ENDPOINT: "${CLOUD_PROVIDER}_vector_service"
  MESSAGE_QUEUE: "${CLOUD_PROVIDER}_queue_service"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deeplens-core
spec:
  replicas: 2
  selector:
    matchLabels:
      app: deeplens-core
  template:
    spec:
      containers:
        - name: deeplens-core
          image: deeplens/core:latest
          ports:
            - containerPort: 80 # HTTP API
            - containerPort: 443 # HTTPS API
            - containerPort: 8080 # Hangfire Dashboard
          env:
            - name: CLOUD_PROVIDER
              value: "aws" # or "azure", "gcp", "local"
            - name: ASPNETCORE_ENVIRONMENT
              value: "Production"
          resources:
            requests:
              cpu: 1
              memory: 2Gi
            limits:
              cpu: 4
              memory: 4Gi
```

---

## 💻 Development Environment Setup

### .NET Core Development

```powershell
# .NET 8 SDK (latest LTS)
winget install Microsoft.DotNet.SDK.8

# Verify installation
dotnet --version

# Global tools
dotnet tool install -g dotnet-ef          # Entity Framework CLI
dotnet tool install -g dotnet-outdated    # Package update checker
```

### Node.js Development

```powershell
# Node.js 20 LTS
winget install OpenJS.NodeJS.LTS

# Package managers
npm install -g pnpm                       # Fast package manager
npm install -g @nestjs/cli                # If using NestJS
```

### System Dependencies

```powershell
# Windows (using vcpkg for C++ libraries)
vcpkg install opencv:x64-windows          # OpenCV for advanced image processing

# Docker Desktop (for containerization)
winget install Docker.DockerDesktop
```

---

## 📁 Project Structure

The complete project structure is defined in PROJECT_PLAN.md under "Hybrid Multi-Language Project Structure" section, including:

- **dotnet-services/**: .NET Core services (APIs, IdentityServer, Core, Infrastructure)
- **python-services/**: Python AI/ML services (feature extraction, similarity matching)
- **deployment/**: Kubernetes, Docker, Terraform configurations
- **docs/**: API documentation and guides
- **scripts/**: Build and deployment scripts
- **monitoring/**: Prometheus, Grafana configurations

---

**Note**: This file contains extracted pseudo code and examples for reference during development. Actual implementation should follow the detailed specifications in PROJECT_PLAN.md and to_define.md.
