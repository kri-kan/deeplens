# DeepLens - Image Similarity Search Engine

## Project Overview

**Vision**: Build a comprehensive image similarity search engine that can find visually similar images across multiple storage locations (network shares, cloud storage, blob storage) and help optimize storage by identifying duplicates.

**Core Functionality**:

- Accept an image input (API/user upload)
- Find similar/duplicate images from indexed storage locations
- Return ranked similarity results with image IDs/locations
- Enable storage optimization through duplicate detection and management

## Architecture Overview

### Design Principles

- **Unified .NET Backend**: .NET Core for all backend services (APIs & orchestration) with Python for specialized AI/ML tasks
- **Platform Agnostic**: Deploy on any cloud provider, on-premises, or hybrid environments
- **Horizontal Scaling**: Add more nodes to handle increased load
- **Load Balancing**: Distribute workload across multiple instances
- **Fault Tolerance**: System continues operating despite component failures
- **Service Decoupling**: Independent services communicating via APIs and message queues
- **Observable by Design**: Built-in telemetry, metrics, logging, and tracing
- **Cloud-Native**: Microservices architecture with container orchestration

### Simplified Single-Service .NET Architecture

```
                           ┌─────────────────────────────────────────┐
                           │         Load Balancer + WAF             │
                           │    (HAProxy/NGINX/Cloud LB/Traefik)     │
                           └──────────────────┬──────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         API Gateway (.NET Core)         │
                           │  • Authentication & Authorization       │
                           │  • Rate Limiting & Circuit Breakers     │
                           │  • Request Routing & Load Balancing     │
                           │  • Telemetry Collection & Correlation   │
                           └──────────────────┬──────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   .NET Core APIs │                │    .NET Core    │                │    Python AI/ML │
│                  │                │   Orchestration │                │    Services     │
│ • Search API     │◄──────────────►│                 │◄──────────────►│                 │
│ • Admin API      │                │ • Workflow Mgmt │                │ • Feature       │
│ • Upload API     │                │ • Event Routing │                │   Extraction    │
│ • Health API     │                │ • Task Queue    │                │ • Model         │
│ • Metadata API   │                │ • Job Scheduler │                │   Inference     │
│                  │                │ • File Watcher  │                │ • Training      │
└──────────────────┘                │ • Storage Mgmt  │                │ • Vector Ops    │
        │                           └─────────────────┘                └─────────────────┘
        │                                     │                                     │
        └─────────────────────────────────────┼─────────────────────────────────────┘
                                              │
                                   ┌─────────────────┐
                                   │   Message Bus   │
                                   │                 │
                                   │ • RabbitMQ      │
                                   │ • Apache Kafka  │
                                   │ • Azure Service │
                                   │   Bus/AWS SQS   │
                                   └─────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │         Data & Storage Layer            │
                           │                                         │
                           │  ┌─────────────┐   ┌─────────────────┐  │
                           │  │ Vector DBs  │   │ Metadata Store  │  │
                           │  │ • Qdrant    │   │ • PostgreSQL    │  │
                           │  │ • Weaviate  │   │ • MongoDB       │  │
                           │  │ • Pinecone  │   │ • Redis Cache   │  │
                           │  └─────────────┘   └─────────────────┘  │
                           │                                         │
                           │  ┌─────────────────────────────────┐    │
                           │  │        Object Storage           │    │
                           │  │ • AWS S3 / Azure Blob / GCS     │    │
                           │  │ • MinIO (on-premises)           │    │
                           │  │ • Local/Network File Systems    │    │
                           │  └─────────────────────────────────┘    │
                           └─────────────────────────────────────────┘
                                              │
                           ┌─────────────────────────────────────────┐
                           │      Observability & Telemetry          │
                           │                                         │
                           │  ┌─────────────┐   ┌─────────────────┐  │
                           │  │   Metrics   │   │     Logging     │  │
                           │  │ • Prometheus│   │ • ELK/EFK Stack │  │
                           │  │ • Grafana   │   │ • Fluentd       │  │
                           │  │ • Custom    │   │ • Loki          │  │
                           │  └─────────────┘   └─────────────────┘  │
                           │                                         │
                           │  ┌─────────────────────────────────┐    │
                           │  │        Tracing & APM            │    │
                           │  │ • Jaeger / Zipkin               │    │
                           │  │ • OpenTelemetry                 │    │
                           │  │ • Application Insights          │    │
                           │  └─────────────────────────────────┘    │
                           └─────────────────────────────────────────┘
```

### Simplified Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DeepLens Core Service (.NET)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   API Layer     │    │  Orchestration  │    │ Background  │  │
│  │                 │    │     Layer       │    │  Services   │  │
│  │ • Search API    │    │ • Workflow Mgmt │    │ • Indexer   │  │
│  │ • Upload API    │    │ • Job Queue     │    │ • Scanner   │  │
│  │ • Admin API     │    │ • Event Router  │    │ • Processor │  │
│  │ • Health API    │    │ • Storage Mgmt  │    │ • Cleanup   │  │
│  │ • SignalR Hubs  │    │ • Task Scheduler│    │ • Monitor   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Data Layer    │    │  Cross-Cutting  │    │Integration  │  │
│  │                 │    │    Services     │    │   Layer     │  │
│  │ • EF Core       │    │ • Logging       │    │ • Cloud SDK │  │
│  │ • Caching       │    │ • Monitoring    │    │ • Message   │  │
│  │ • Vector Store  │    │ • Config Mgmt   │    │   Queue     │  │
│  │ • File Storage  │    │ • Health Checks │    │ • AI/ML     │  │
│  │ • Metadata DB   │    │ • Metrics       │    │   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │    Python AI/ML │
                         │    Services     │
                         │                 │
                         │ • Feature       │
                         │   Extraction    │
                         │ • Model         │
                         │   Inference     │
                         │ • Vector Ops    │
                         └─────────────────┘
```

## Technical Stack Recommendations

### Unified .NET + Python Technology Stack

#### Service Layer Distribution

**🔵 DeepLens Core Service (.NET) - Unified APIs & Orchestration**

- **API Gateway**: ASP.NET Core with YARP (Yet Another Reverse Proxy)
- **Core APIs**: Minimal APIs for search, upload, admin, health endpoints
- **Authentication**: IdentityServer/Duende, Azure AD, OAuth 2.0/OpenID Connect
- **Data Access**: Entity Framework Core with PostgreSQL/SQL Server
- **Caching**: StackExchange.Redis for distributed caching
- **HTTP Client**: HttpClientFactory with Polly for resilience
- **Image Processing**: ImageSharp for basic operations, OpenCvSharp for advanced
- **ONNX Integration**: Microsoft.ML.OnnxRuntime for model inference

**� Additional Unified Service Features**

- **Framework**: ASP.NET Core with Minimal APIs and Worker Services
- **Workflow Engine**: Elsa Workflows or Hangfire for job orchestration
- **File Processing**: ImageSharp for image manipulation, custom upload handlers
- **Event Streaming**: MassTransit with RabbitMQ/Azure Service Bus integration
- **Task Scheduling**: Hangfire, Quartz.NET, or NCrontab for background jobs
- **Storage Connectors**: Azure SDK, AWS SDK for .NET, Google Cloud SDK
- **Real-time Communication**: SignalR for WebSocket connections and real-time updates
- **Background Services**: IHostedService and BackgroundService for long-running tasks
- **Process Management**: Built-in Kestrel server with IIS/Docker deployment

**🔴 Python Services (AI/ML Specialized)**

- **Framework**: FastAPI for APIs, Ray for distributed computing
- **Computer Vision**: OpenCV, PIL/Pillow, scikit-image
- **Deep Learning**: PyTorch, TensorFlow, Hugging Face Transformers
- **Vector Operations**: NumPy, SciPy, Faiss for similarity search
- **Model Serving**: TorchServe, TensorFlow Serving, Triton Inference Server
- **Feature Extraction**: CLIP, ResNet, EfficientNet, custom CNN models
- **Vector Databases**: Qdrant Python client, Weaviate client
- **Async Processing**: Celery with Redis/RabbitMQ, asyncio

#### Cross-Service Communication

**🔀 Simplified Communication Architecture**

- **Internal**: Direct method calls within .NET service (no network overhead)
- **External Python AI/ML**: HTTP/REST APIs with OpenAPI/Swagger documentation
- **Async Processing**: MassTransit with RabbitMQ/Azure Service Bus for background tasks
- **Real-time Updates**: SignalR for WebSocket communications
- **Optional Load Balancing**: NGINX/HAProxy for multi-instance deployments
- **Service Discovery**: Simple DNS-based discovery or Kubernetes services

**📊 Observability & Telemetry (Built-in)**

- **Distributed Tracing**: OpenTelemetry with Jaeger/Zipkin backend
- **Metrics Collection**: OpenTelemetry metrics with Prometheus export
- **Structured Logging**: Serilog (.NET) → OpenTelemetry → OTLP/Elasticsearch
- **Log Correlation**: Automatic trace-log correlation via OpenTelemetry
- **APM**: Application Insights, New Relic, or Datadog via OTLP
- **Health Checks**: Built-in health endpoints with OpenTelemetry metrics
- **Unified Export**: Single OTLP endpoint for all telemetry data

## Comprehensive Instrumentation & Telemetry Strategy

### Observable Architecture Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Service     │    │ Services    │    │ Components   │    │ Services    │  │
│  │ • Serilog→  │    │ • structlog │    │ • Prometheus │    │ • Load Bal. │  │
│  │   OpenTel   │    │ • OpenTel   │    │ • OpenTel    │    │ • Node Exp  │  │
│  │ • OTel      │    │ • FastAPI   │    │ • OTLP       │    │ • cAdvisor  │  │
│  └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘  │
│           │                 │                 │                 │           │
└───────────┼─────────────────┼─────────────────┼─────────────────┼───────────┘
            │                 │                 │                 │
            ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY AGGREGATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    METRICS      │  │    LOGGING      │  │        TRACING              │   │
│ │                 │  │                 │  │                             │   │
│ │ • Prometheus    │  │ • Elasticsearch │  │ • Jaeger                    │   │
│ │ • Victoria      │  │ • Loki          │  │ • Zipkin                    │   │
│ │   Metrics       │  │ • Fluentd       │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │ • Vector        │  │ • Tempo                     │   │
│ │   Dashboards    │  │ • Logstash      │  │ • AWS X-Ray                 │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
            │                 │                               │
            ▼                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUALIZATION & ALERTING                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│ │    DASHBOARDS   │  │     ALERTS      │  │         ANALYSIS            │   │
│ │                 │  │                 │  │                             │   │
│ │ • Grafana       │  │ • AlertManager  │  │ • Kibana                    │   │
│ │ • Custom UI     │  │ • PagerDuty     │  │ • Jaeger UI                 │   │
│ │ • DataDog       │  │ • Slack/Teams   │  │ • Custom Analytics          │   │
│ │ • New Relic     │  │ • Email/SMS     │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service-Specific Telemetry Implementation

#### .NET Core Services Instrumentation

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

#### Node.js Service Instrumentation

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false, // Use Pino instead
  });

  // Structured logging
  app.useLogger(app.get(Logger));

  // Correlation ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers["x-correlation-id"] || uuidv4();
    req.correlationId = correlationId;
    res.setHeader("x-correlation-id", correlationId);
    next();
  });

  // Custom metrics middleware
  app.use(metricsMiddleware);

  // Health checks
  app.use("/health", healthCheckRouter);

  await app.listen(3000);
}

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

#### Python AI Service Instrumentation

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

jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger",
    agent_port=6831,
)

# Metrics setup
metrics.set_meter_provider(MeterProvider())
meter = metrics.get_meter(__name__)

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

@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id", str(uuid.uuid4()))

    # Add to structured log context
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        correlation_id=correlation_id,
        request_path=request.url.path,
        request_method=request.method
    )

    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    # Log request completion
    logger.info(
        "Request completed",
        status_code=response.status_code,
        duration=duration
    )

    response.headers["x-correlation-id"] = correlation_id
    return response

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

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "timestamp": time.time()
    }
```

### Monitoring & Alerting Configuration

#### Prometheus Configuration

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

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "postgres-exporter"
    static_configs:
      - targets: ["postgres-exporter:9187"]

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

#### Alert Rules

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

#### Technical Capabilities Comparison

| Capability               | .NET Core                               | Node.js/TypeScript               | Python                               | Advantage                                                    |
| ------------------------ | --------------------------------------- | -------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| **API Performance**      | ✅ Excellent (AOT, minimal APIs)        | ✅ Very Good (V8 engine)         | ⚠️ Good (async frameworks)           | **.NET Core** - Superior throughput and memory efficiency    |
| **Image Processing**     | ✅ ImageSharp, OpenCvSharp              | ✅ Sharp, Jimp, Canvas           | ✅ PIL, OpenCV, scikit-image         | **Equal** - All have excellent libraries                     |
| **ML Model Integration** | ✅ ML.NET, ONNX Runtime, TensorFlow.NET | ✅ TensorFlow.js, ONNX.js        | ✅ Native PyTorch/TF                 | **Python** slight edge for training, **Equal** for inference |
| **Vector Operations**    | ✅ System.Numerics.Tensors, ML.NET      | ✅ ml-matrix, TensorFlow.js      | ✅ NumPy, SciPy                      | **Equal** - All support efficient vector ops                 |
| **Concurrency/Scaling**  | ✅ Async/await, channels, TPL           | ✅ Event loop, workers, clusters | ⚠️ Async/await, threading challenges | **.NET/Node.js** - Better concurrent performance             |
| **Container Size**       | ✅ Minimal (50-100MB with AOT)          | ✅ Small (100-200MB Alpine)      | ⚠️ Larger (200-500MB)                | **.NET/Node.js** - Smaller containers                        |
| **Cold Start**           | ✅ Fast (especially AOT)                | ✅ Very Fast                     | ⚠️ Slower                            | **.NET/Node.js** - Faster serverless starts                  |
| **Memory Usage**         | ✅ Efficient GC, AOT options            | ✅ V8 optimization               | ⚠️ Higher memory usage               | **.NET/Node.js** - More memory efficient                     |
| **Development Speed**    | ✅ Strong typing, IntelliSense          | ✅ TypeScript, great tooling     | ✅ Dynamic, REPL                     | **Equal** - All have excellent DX                            |
| **Ecosystem Maturity**   | ✅ Enterprise-ready                     | ✅ Vast NPM ecosystem            | ✅ Rich ML/AI ecosystem              | **Context-dependent**                                        |
| **Cross-Platform**       | ✅ True cross-platform                  | ✅ True cross-platform           | ✅ True cross-platform               | **Equal**                                                    |
| **Cloud Integration**    | ✅ Native Azure, good AWS/GCP           | ✅ Excellent all clouds          | ✅ Excellent all clouds              | **Equal**                                                    |

#### Recommended Architecture Decision

**For your .NET/JS background: .NET Core Primary with Node.js AI Services**

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

**AI Microservice in Node.js/TypeScript**:

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
}
```

### Storage & Database

- **Vector Database**:
  - Pinecone (cloud-native)
  - Weaviate (open-source)
  - Chroma (lightweight)
  - Qdrant (high-performance)
- **Metadata Database**: PostgreSQL or MongoDB
- **Caching**: Redis for frequently accessed results
- **File Storage**: Support for multiple backends

### Platform-Agnostic Infrastructure

#### Container & Orchestration

- **Containerization**: Docker with multi-arch support (AMD64, ARM64)
  - **.NET Images**: Use official Microsoft .NET runtime images (mcr.microsoft.com/dotnet/aspnet)
  - **Node.js Images**: Use official Node.js Alpine images for smaller footprint
- **Container Registry**: Support for any registry (Docker Hub, AWS ECR, Azure ACR, Harbor)
- **Orchestration Options**:
  - **Kubernetes**: Primary choice for cloud-native deployments
  - **Docker Swarm**: Lightweight alternative for smaller deployments
  - **Cloud Native**:
    - **Azure**: Container Apps, AKS, App Service for Containers
    - **AWS**: ECS, EKS, Lambda (with container support)
    - **GCP**: Cloud Run, GKE, App Engine flexible
  - **Bare Metal**: Docker Compose for simple deployments

#### Load Balancing & Service Discovery

- **External Load Balancers**:
  - Cloud: AWS ALB, Azure Load Balancer, GCP Load Balancer
  - On-premises: HAProxy, NGINX, Traefik
- **Internal Load Balancing**: Kubernetes Services, Consul Connect
- **Service Discovery**: Kubernetes DNS, Consul, etcd
- **API Gateway**: Kong, Ambassador, Istio Gateway

#### Message Queue & Event Streaming

- **Message Brokers**:
  - RabbitMQ (AMQP protocol)
  - Apache Kafka (high-throughput streaming)
  - Redis Streams (lightweight option)
  - Cloud options: AWS SQS, Azure Service Bus, Google Pub/Sub
- **Event Processing**: Apache Pulsar, NATS

#### Storage Abstraction

- **Object Storage**: S3-compatible APIs (AWS S3, MinIO, Azure Blob, GCS)
- **Block Storage**: Kubernetes Persistent Volumes with CSI drivers
- **Database Options**:
  - Vector DB: Qdrant, Weaviate, Pinecone (cloud), Milvus
  - Metadata: PostgreSQL, MongoDB, CockroachDB (distributed)
  - Cache: Redis Cluster, KeyDB, Hazelcast

#### Monitoring & Observability

- **Metrics**: Prometheus + Grafana (standard), OpenTelemetry
- **Logging**: ELK Stack, Fluentd, Loki, or cloud-native solutions
- **Tracing**: Jaeger, Zipkin, AWS X-Ray, Azure Application Insights
- **Health Checks**: Kubernetes probes, custom health endpoints

#### Configuration Management

- **Config Sources**: Environment variables, ConfigMaps, Secrets, Consul KV
- **Feature Flags**: LaunchDarkly, Flagr, custom implementation
- **Service Mesh**: Istio, Linkerd for advanced traffic management

## Core Engine Components

### 1. Image Ingestion Pipeline

```python
# Pseudo-code structure
class ImageIngestionPipeline:
    - scan_storage_locations()
    - validate_image_files()
    - extract_metadata()
    - generate_thumbnails()
    - queue_for_processing()
```

**Features**:

- Multi-threaded scanning of storage locations
- Image format validation and conversion
- Metadata extraction (EXIF, file info)
- Thumbnail generation for quick preview
- Progress tracking and error handling

### 2. Feature Extraction Engine

```python
class FeatureExtractor:
    - load_models() # Multiple model support
    - preprocess_image()
    - extract_visual_features()
    - extract_semantic_features()
    - normalize_features()
```

**Models to Implement**:

- **Perceptual Hash**: For exact/near-duplicate detection
- **Deep Features**: CNN-based features for semantic similarity
- **Color Histograms**: For color-based matching
- **Edge Features**: For structural similarity
- **CLIP Features**: For text-to-image and semantic search

### 3. Similarity Matching Engine

```python
class SimilarityMatcher:
    - compute_similarity_scores()
    - rank_results()
    - apply_filters()
    - deduplicate_results()
```

**Similarity Metrics**:

- Cosine similarity for deep features
- Hamming distance for perceptual hashes
- Euclidean distance for color features
- Weighted combination of multiple metrics

### 4. Storage Connectors

```python
class StorageConnector:
    - list_files()
    - read_file()
    - get_metadata()
    - check_accessibility()
```

**Supported Storage Types**:

- Local file systems
- Network file shares (SMB/CIFS)
- Cloud storage (AWS S3, Azure Blob, Google Cloud)
- FTP/SFTP servers
- Database BLOBs

## Database Schema Design

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

## API Design

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

## Performance Considerations

### Optimization Strategies

1. **Indexing Optimization**:

   - Batch processing for large datasets
   - Incremental indexing for new files
   - Parallel processing across multiple workers

2. **Search Optimization**:

   - Vector index optimization (HNSW, IVF)
   - Result caching for common queries
   - Approximate nearest neighbor search

3. **Storage Optimization**:
   - Thumbnail generation and caching
   - Metadata precomputation
   - Connection pooling for storage backends

### Scalability Targets

- Handle 1M+ images in index
- Sub-second search response times
- Support for distributed processing
- Horizontal scaling capabilities

## Horizontal Scaling & Load Balancing Strategy

### Scaling Architecture Patterns

#### 1. Stateless Service Design

```python
# All services designed to be stateless
class StatelessService:
    def __init__(self, config_source, cache_client, db_client):
        self.config = config_source.get_config()
        self.cache = cache_client
        self.db = db_client

    # No instance state, all data from external sources
    def process_request(self, request):
        # Fetch state from cache/DB, process, return result
        pass
```

#### 2. Load Balancing Strategies

**API Layer Load Balancing**:

- **Round Robin**: Equal distribution across healthy instances
- **Least Connections**: Route to instance with fewest active connections
- **Weighted Round Robin**: Different capacities for different instance types
- **IP Hash**: Session affinity when needed
- **Health Check Based**: Automatic failover for unhealthy instances

**Processing Layer Load Balancing**:

- **Task Queue Distribution**: Work distributed via message queues
- **Resource-Aware Routing**: CPU/Memory based task assignment
- **Specialty Routing**: GPU tasks to GPU-enabled nodes
- **Priority Queues**: Critical tasks processed first

#### 3. Auto-Scaling Policies

**Horizontal Pod Autoscaler (HPA) Configuration**:

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

**Vertical Pod Autoscaler (VPA)** for resource optimization:

- Automatic CPU/memory limit adjustment
- Right-sizing based on actual usage patterns
- Cost optimization through resource efficiency

#### 4. Data Layer Scaling

**Vector Database Scaling**:

- **Sharding**: Distribute vectors across multiple nodes
- **Replication**: Read replicas for query load distribution
- **Partitioning**: Time-based or feature-based partitioning
- **Federation**: Multiple vector DB clusters for different domains

**Metadata Database Scaling**:

- **Master-Slave Replication**: Read scaling with consistency
- **Sharding**: Horizontal partitioning by image ID ranges
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries and materialized views

**Cache Layer Scaling**:

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

#### 5. Storage Scaling Strategies

**Object Storage Scaling**:

- **Multi-Region Distribution**: Geo-distributed storage
- **CDN Integration**: Fast global image delivery
- **Tiered Storage**: Hot/warm/cold data lifecycle management
- **Compression**: Reduce storage costs and transfer time

**Processing Pipeline Scaling**:

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

### Platform Deployment Patterns

#### 1. Cloud-Native Deployment

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

#### 2. Multi-Cloud Strategy

- **Abstraction Layer**: Cloud-agnostic APIs for storage, compute, databases
- **Deployment Templates**: Terraform/Pulumi modules for each cloud provider
- **Migration Support**: Data portability between cloud providers
- **Disaster Recovery**: Cross-cloud backup and failover capabilities

#### 3. Edge Deployment Support

- **Lightweight Containers**: Optimized images for edge devices
- **Local Processing**: On-premises feature extraction capabilities
- **Sync Mechanisms**: Periodic synchronization with central systems
- **Offline Mode**: Continued operation during network outages

### Performance Monitoring & Scaling Metrics

#### Key Performance Indicators (KPIs)

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

#### Alerting & Auto-Remediation

- **Prometheus Alerts**: Threshold-based scaling triggers
- **Custom Metrics**: Application-specific performance indicators
- **Automated Scaling**: Scale out/in based on demand patterns
- **Circuit Breakers**: Prevent cascade failures during high load

## Implementation Phases (Simplified Unified Approach)

### Phase 1: Foundation & MVP (Unified Single-Service)

**🔵 .NET Core Components:**

- [ ] **API Gateway**: YARP-based gateway with authentication
- [ ] **Search API**: Basic image similarity search endpoints
- [ ] **Core Domain**: Business logic and data models
- [ ] **Infrastructure**: EF Core with PostgreSQL, Redis caching
- [ ] **Basic Telemetry**: Serilog structured logging, health checks

**� .NET Core Orchestration Components:**

- [ ] **Storage Connector**: Local file system scanner using System.IO
- [ ] **Workflow Service**: Background job processing with Hangfire
- [ ] **File Processing**: Image metadata extraction with ImageSharp

**🔴 Python Components:**

- [ ] **Feature Extraction**: ResNet-50 with ONNX Runtime
- [ ] **Similarity Service**: Cosine similarity with NumPy
- [ ] **Basic API**: FastAPI with single model endpoint

**Cross-Service Integration:**

- [ ] gRPC contracts and client generation
- [ ] Docker Compose for local development
- [ ] Basic end-to-end image search workflow

**Estimated Time**: 4-5 weeks

### Phase 2: Enhanced AI & Scalability

**🔵 .NET Core Enhancements:**

- [ ] **Admin API**: Storage management and system configuration
- [ ] **Advanced Caching**: Distributed caching strategies
- [ ] **ONNX Integration**: Direct model inference in .NET
- [ ] **Performance Optimization**: Async patterns and connection pooling

**� .NET Core Advanced Features:**

- [ ] **Multi-Cloud Connectors**: AWS SDK, Azure SDK, Google Cloud SDK integration
- [ ] **Advanced Workflows**: Elsa Workflows for complex orchestration processes
- [ ] **Real-time API**: SignalR WebSocket support for live updates
- [ ] **Batch Processing**: Large-scale file processing with BackgroundService

**🔴 Python AI Enhancements:**

- [ ] **Multiple Models**: CLIP, EfficientNet, custom CNNs
- [ ] **Vector Databases**: Qdrant, Weaviate integration
- [ ] **Advanced Algorithms**: Perceptual hashing, ensemble methods
- [ ] **GPU Acceleration**: CUDA support for model inference

**Observability & Monitoring:**

- [ ] **OpenTelemetry**: Distributed tracing across all services
- [ ] **Prometheus Metrics**: Custom metrics from all languages
- [ ] **Grafana Dashboards**: Service health and performance monitoring

**Estimated Time**: 5-7 weeks

### Phase 3: Platform-Agnostic & Scalable Production

- [ ] **Container Orchestration**:
  - [ ] Kubernetes manifests with Helm charts
  - [ ] Multi-architecture Docker images (AMD64/ARM64)
  - [ ] Health checks and readiness probes
- [ ] **Load Balancing & Service Discovery**:
  - [ ] External load balancer configuration
  - [ ] Service mesh implementation (Istio/Linkerd)
  - [ ] Auto-scaling policies (HPA/VPA)
- [ ] **Platform Abstraction**:
  - [ ] Cloud provider adapters (AWS/Azure/GCP)
  - [ ] Storage backend abstraction layer
  - [ ] Configuration management for multi-environment
- [ ] **Monitoring & Observability**:
  - [ ] Prometheus metrics collection
  - [ ] Distributed tracing with Jaeger
  - [ ] Centralized logging with ELK stack
  - [ ] Custom dashboards and alerting
- [ ] **Security & Compliance**:
  - [ ] Authentication and authorization
  - [ ] API rate limiting and throttling
  - [ ] Network policies and encryption
  - [ ] Audit logging and compliance

**Estimated Time**: 5-6 weeks

### Phase 4: Advanced Scaling & Distribution

- [ ] **Multi-Region Deployment**:
  - [ ] Geo-distributed deployments
  - [ ] Cross-region data replication
  - [ ] Regional failover capabilities
  - [ ] CDN integration for global access
- [ ] **Advanced Auto-Scaling**:
  - [ ] Predictive scaling based on usage patterns
  - [ ] Cost-optimized scaling strategies
  - [ ] Multi-cloud deployment support
  - [ ] Edge computing integration
- [ ] **Performance Optimization**:
  - [ ] Advanced caching strategies
  - [ ] Query optimization and indexing
  - [ ] Batch processing optimization
  - [ ] Resource usage analytics

**Estimated Time**: 4-5 weeks

### Phase 5: Advanced AI Features

- [ ] **Enhanced AI Capabilities**:
  - [ ] Text-to-image search (CLIP integration)
  - [ ] Custom model training pipeline
  - [ ] A/B testing for model performance
  - [ ] Continuous learning and model updates
- [ ] **Analytics & Intelligence**:
  - [ ] Usage analytics and reporting
  - [ ] Storage optimization recommendations
  - [ ] Automated duplicate cleanup workflows
  - [ ] Business intelligence dashboards
- [ ] **Enterprise Features**:
  - [ ] Multi-tenancy support
  - [ ] Role-based access control
  - [ ] Data governance and lineage
  - [ ] Compliance reporting

**Estimated Time**: 4-6 weeks

## Development Environment Setup

### Prerequisites

#### .NET Core Development Environment

```powershell
# .NET 8 SDK (latest LTS)
winget install Microsoft.DotNet.SDK.8

# Verify installation
dotnet --version

# Global tools
dotnet tool install -g dotnet-ef          # Entity Framework CLI
dotnet tool install -g dotnet-outdated    # Package update checker
```

#### Node.js Development Environment (for AI services)

```powershell
# Node.js 20 LTS
winget install OpenJS.NodeJS.LTS

# Package managers
npm install -g pnpm                       # Fast package manager
npm install -g @nestjs/cli                # If using NestJS
```

#### System Dependencies

```powershell
# Windows (using vcpkg for C++ libraries)
vcpkg install opencv:x64-windows          # OpenCV for advanced image processing

# Docker Desktop (for containerization)
winget install Docker.DockerDesktop

# Optional: GPU support for ML workloads
# NVIDIA CUDA Toolkit (if using GPU acceleration)
# https://developer.nvidia.com/cuda-downloads
```

#### IDE/Editor Setup

```powershell
# Visual Studio 2022 (recommended for .NET)
winget install Microsoft.VisualStudio.2022.Professional

# OR Visual Studio Code with extensions
winget install Microsoft.VisualStudioCode
# Install C# Dev Kit, REST Client, Docker extensions
```

#### Cloud CLI Tools (choose your platform)

```powershell
# Azure CLI
winget install Microsoft.AzureCLI

# AWS CLI
winget install Amazon.AWSCLI

# Google Cloud CLI
winget install Google.CloudSDK
```

### Hybrid Multi-Language Project Structure

```
deeplens/
├── 🔵 dotnet-services/                  # .NET Core Services (High-Performance APIs)
│   ├── src/
│   │   ├── DeepLens.ApiGateway/          # YARP-based API Gateway
│   │   │   ├── Configuration/
│   │   │   │   ├── routes.json           # Route configuration
│   │   │   │   └── clusters.json         # Backend clusters
│   │   │   ├── Middleware/
│   │   │   │   ├── AuthenticationMiddleware.cs
│   │   │   │   ├── RateLimitingMiddleware.cs
│   │   │   │   ├── CorrelationIdMiddleware.cs
│   │   │   │   └── TelemetryMiddleware.cs
│   │   │   ├── Program.cs
│   │   │   └── DeepLens.ApiGateway.csproj
│   │   │
│   │   ├── DeepLens.SearchApi/           # Search & Query API
│   │   │   ├── Controllers/
│   │   │   │   ├── SearchController.cs   # Image similarity search
│   │   │   │   ├── UploadController.cs   # Image upload
│   │   │   │   └── HealthController.cs   # Health checks
│   │   │   ├── Services/
│   │   │   │   ├── SearchService.cs
│   │   │   │   └── VectorSearchService.cs
│   │   │   └── DeepLens.SearchApi.csproj
│   │   │
│   │   ├── DeepLens.AdminApi/            # Administration API
│   │   │   ├── Controllers/
│   │   │   │   ├── IndexingController.cs # Manage indexing
│   │   │   │   ├── StorageController.cs  # Storage management
│   │   │   │   └── MetricsController.cs  # System metrics
│   │   │   └── DeepLens.AdminApi.csproj
│   │   │
│   │   ├── DeepLens.Core/                # Shared business logic
│   │   │   ├── Interfaces/
│   │   │   │   ├── IImageProcessor.cs
│   │   │   │   ├── ISimilarityMatcher.cs
│   │   │   │   ├── IVectorStore.cs
│   │   │   │   └── IStorageConnector.cs
│   │   │   ├── Services/
│   │   │   │   ├── ImageProcessingService.cs
│   │   │   │   ├── MetadataService.cs
│   │   │   │   └── DeduplicationService.cs
│   │   │   ├── Models/
│   │   │   │   ├── Domain/               # Domain entities
│   │   │   │   ├── DTOs/                 # Data transfer objects
│   │   │   │   └── Configuration/        # Configuration models
│   │   │   └── DeepLens.Core.csproj
│   │   │
│   │   ├── DeepLens.Infrastructure/      # Infrastructure layer
│   │   │   ├── Data/
│   │   │   │   ├── Repositories/         # Repository implementations
│   │   │   │   ├── Entities/             # EF Core entities
│   │   │   │   └── DeepLensDbContext.cs
│   │   │   ├── Storage/
│   │   │   │   ├── Connectors/           # Storage connectors
│   │   │   │   └── Adapters/             # Cloud provider adapters
│   │   │   ├── AI/
│   │   │   │   ├── OnnxModelRunner.cs    # ONNX Runtime integration
│   │   │   │   └── FeatureExtractorClient.cs # AI service client
│   │   │   ├── Messaging/
│   │   │   │   ├── RabbitMQClient.cs
│   │   │   │   └── ServiceBusClient.cs
│   │   │   ├── Telemetry/
│   │   │   │   ├── MetricsCollector.cs
│   │   │   │   ├── TracingService.cs
│   │   │   │   └── HealthCheckExtensions.cs
│   │   │   └── DeepLens.Infrastructure.csproj
│   │   │
│   │   └── DeepLens.Tests/               # .NET Test projects
│   │       ├── Unit/
│   │       ├── Integration/
│   │       └── Performance/
│   │
│   ├── DeepLens.sln                      # Visual Studio solution
│   ├── Directory.Build.props             # MSBuild global properties
│   ├── global.json                       # .NET SDK version
│   └── nuget.config                      # NuGet package sources
│
├── � # Orchestration integrated into DeepLens.Api (unified architecture)           # .NET Core Orchestration & Workflow Services
│   ├── src/
│   │   ├── DeepLens.Orchestration.Api/   # Workflow & Orchestration API
│   │   │   ├── Controllers/
│   │   │   │   ├── WorkflowController.cs
│   │   │   │   └── JobController.cs
│   │   │   ├── Services/
│   │   │   │   ├── IWorkflowService.cs
│   │   │   │   ├── WorkflowService.cs
│   │   │   │   ├── IJobQueueService.cs
│   │   │   │   └── HangfireJobService.cs
│   │   │   ├── BackgroundServices/
│   │   │   │   ├── ImageIngestionService.cs
│   │   │   │   └── StorageScannerService.cs
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── correlation-id.middleware.ts
│   │   │   │   │   ├── logging.middleware.ts
│   │   │   │   │   └── metrics.middleware.ts
│   │   │   │   ├── app.module.ts
│   │   │   │   └── main.ts
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   ├── Dockerfile
│   │   │   └── .env.example
│   │   │
│   │   ├── storage-connector/            # Storage Integration Service
│   │   │   ├── src/
│   │   │   │   ├── connectors/
│   │   │   │   │   ├── aws-s3.connector.ts
│   │   │   │   │   ├── azure-blob.connector.ts
│   │   │   │   │   ├── gcp-storage.connector.ts
│   │   │   │   │   └── file-system.connector.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── file-scanner.service.ts
│   │   │   │   │   ├── metadata-extractor.service.ts
│   │   │   │   │   └── thumbnail-generator.service.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── image-utils.ts
│   │   │   │   │   └── hash-utils.ts
│   │   │   │   └── app.ts
│   │   │   ├── package.json
│   │   │   └── Dockerfile
│   │   │
│   │   └── real-time-api/                # WebSocket & Real-time Updates
│   │       ├── src/
│   │       │   ├── gateways/
│   │       │   │   ├── search.gateway.ts
│   │       │   │   └── indexing.gateway.ts
│   │       │   ├── services/
│   │       │   │   └── notification.service.ts
│   │       │   └── app.ts
│   │       ├── package.json
│   │       └── Dockerfile
│   │
│   ├── libs/                             # Shared Node.js libraries
│   │   ├── common/
│   │   │   ├── src/
│   │   │   │   ├── telemetry/
│   │   │   │   │   ├── metrics.ts
│   │   │   │   │   ├── tracing.ts
│   │   │   │   │   └── logging.ts
│   │   │   │   ├── interfaces/
│   │   │   │   ├── constants/
│   │   │   │   └── utils/
│   │   │   └── package.json
│   │   └── grpc-clients/
│   │       ├── src/
│   │       │   ├── ai-service.client.ts
│   │       │   └── vector-db.client.ts
│   │       └── package.json
│   │
│   ├── package.json                      # Root package.json (workspace)
│   ├── nx.json                          # Nx monorepo configuration
│   ├── tsconfig.base.json               # Base TypeScript config
│   └── .eslintrc.json                   # ESLint configuration
│
├── 🔴 python-services/                  # Python AI/ML Services
│   ├── feature-extraction-service/       # Deep Learning Feature Extraction
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── features.py
│   │   │   │   │   ├── models.py
│   │   │   │   │   └── health.py
│   │   │   │   └── main.py              # FastAPI app
│   │   │   ├── models/
│   │   │   │   ├── feature_extractors/
│   │   │   │   │   ├── resnet_extractor.py
│   │   │   │   │   ├── clip_extractor.py
│   │   │   │   │   ├── efficientnet_extractor.py
│   │   │   │   │   └── custom_cnn_extractor.py
│   │   │   │   ├── model_manager.py
│   │   │   │   └── onnx_runner.py
│   │   │   ├── services/
│   │   │   │   ├── image_processor.py
│   │   │   │   ├── feature_service.py
│   │   │   │   └── batch_processor.py
│   │   │   ├── utils/
│   │   │   │   ├── image_utils.py
│   │   │   │   ├── tensor_utils.py
│   │   │   │   └── validation.py
│   │   │   └── telemetry/
│   │   │       ├── metrics.py
│   │   │       ├── tracing.py
│   │   │       └── logging_config.py
│   │   ├── models/                      # Pre-trained models
│   │   │   ├── resnet50.onnx
│   │   │   ├── clip-vit-base.onnx
│   │   │   └── efficientnet-b0.onnx
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── vector-similarity-service/        # Vector Operations & Similarity
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── similarity.py
│   │   │   │   │   ├── vectors.py
│   │   │   │   │   └── deduplication.py
│   │   │   │   └── main.py
│   │   │   ├── services/
│   │   │   │   ├── similarity_service.py
│   │   │   │   ├── vector_store_service.py
│   │   │   │   ├── deduplication_service.py
│   │   │   │   └── indexing_service.py
│   │   │   ├── algorithms/
│   │   │   │   ├── cosine_similarity.py
│   │   │   │   ├── hamming_distance.py
│   │   │   │   ├── perceptual_hash.py
│   │   │   │   └── ensemble_matching.py
│   │   │   └── vector_stores/
│   │   │       ├── qdrant_client.py
│   │   │       ├── weaviate_client.py
│   │   │       └── pinecone_client.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── model-training-service/           # Custom Model Training (Optional)
│   │   ├── src/
│   │   │   ├── training/
│   │   │   │   ├── trainers/
│   │   │   │   ├── datasets/
│   │   │   │   └── experiments/
│   │   │   ├── evaluation/
│   │   │   └── deployment/
│   │   ├── notebooks/                   # Jupyter notebooks for experimentation
│   │   ├── requirements.txt
│   │   └── Dockerfile.gpu              # GPU-enabled container
│   │
│   └── shared/                          # Shared Python utilities
│       ├── telemetry/
│       │   ├── __init__.py
│       │   ├── metrics.py
│       │   ├── tracing.py
│       │   └── logging_config.py
│       ├── grpc_services/
│       │   ├── __init__.py
│       │   ├── feature_service_pb2.py
│       │   └── similarity_service_pb2.py
│       └── utils/
│           ├── __init__.py
│           ├── image_processing.py
│           └── validation.py
│
├── deployment/                          # Deployment configurations
│   ├── kubernetes/
│   │   ├── base/
│   │   │   ├── api-deployment.yaml
│   │   │   ├── worker-deployment.yaml
│   │   │   ├── configmap.yaml
│   │   │   └── service.yaml
│   │   ├── overlays/
│   │   │   ├── development/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── helm/
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       └── templates/
│   ├── docker/
│   │   ├── api.Dockerfile
│   │   ├── worker.Dockerfile
│   │   └── docker-compose.yml
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── azure/
│   │   │   ├── aws/
│   │   │   └── gcp/
│   │   └── environments/
│   └── github-actions/
│       ├── build-and-test.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── docs/                                # Documentation
│   ├── api/                             # OpenAPI/Swagger docs
│   ├── architecture/                    # Architecture diagrams
│   ├── deployment/                      # Deployment guides
│   └── development/                     # Development setup
│
├── scripts/                             # Utility scripts
│   ├── build/
│   │   ├── build.ps1                    # PowerShell build script
│   │   └── build.sh                     # Bash build script
│   ├── deploy/
│   └── migration/
│       └── database-migrations/
│
├── monitoring/                          # Monitoring configurations
│   ├── prometheus/
│   ├── grafana/
│   └── alerts/
│
├── .gitignore
├── .editorconfig
├── Directory.Build.props                # MSBuild properties for all projects
├── DeepLens.sln                        # Visual Studio solution file
├── global.json                         # .NET SDK version
├── nuget.config                        # NuGet package sources
├── docker-compose.yml                  # Local development
├── docker-compose.override.yml         # Development overrides
└── README.md
```

### Alternative: Node.js/TypeScript Structure

```
deeplens/
├── apps/                               # Monorepo structure with Nx/Lerna
│   ├── api/                            # Express.js/Fastify API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── app.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── worker/                         # Background processing
│   │   ├── src/
│   │   │   ├── processors/
│   │   │   └── worker.ts
│   │   └── package.json
│   └── ai-service/                     # TensorFlow.js/ONNX.js
│       ├── src/
│       │   ├── models/
│       │   └── inference.ts
│       └── package.json
├── libs/                               # Shared libraries
│   ├── core/
│   ├── storage/
│   └── ai/
├── tools/
├── deployment/
├── package.json                        # Root package.json
└── nx.json                            # Nx configuration
```

│ │ ├── crypto/ # Cryptographic functions
│ │ └── validation/ # Input validation
│ └── config/ # Configuration management
│ ├── environments/ # Environment-specific configs
│ ├── providers/ # Cloud provider configurations
│ └── settings.py # Global settings
├── deployment/ # Deployment configurations
│ ├── kubernetes/ # K8s manifests
│ │ ├── base/ # Base configurations
│ │ ├── overlays/ # Environment overlays
│ │ │ ├── development/
│ │ │ ├── staging/
│ │ │ └── production/
│ │ └── helm/ # Helm charts
│ ├── docker/ # Docker configurations
│ │ ├── api/ # API service Dockerfile
│ │ ├── worker/ # Worker service Dockerfile
│ │ └── docker-compose/ # Local development
│ ├── terraform/ # Infrastructure as Code
│ │ ├── modules/ # Reusable modules
│ │ ├── environments/ # Environment-specific
│ │ └── providers/ # Cloud provider configs
│ └── ansible/ # Configuration management
├── tests/ # Test suites
│ ├── unit/ # Unit tests
│ ├── integration/ # Integration tests
│ ├── performance/ # Load testing
│ └── e2e/ # End-to-end tests
├── docs/ # Documentation
│ ├── api/ # API documentation
│ ├── architecture/ # Architecture diagrams
│ ├── deployment/ # Deployment guides
│ └── user/ # User guides
├── scripts/ # Utility scripts
│ ├── build/ # Build scripts
│ ├── deploy/ # Deployment scripts
│ ├── migration/ # Database migration scripts
│ └── monitoring/ # Monitoring setup scripts
├── monitoring/ # Monitoring configurations
│ ├── prometheus/ # Prometheus configs
│ ├── grafana/ # Grafana dashboards
│ └── alerts/ # Alert rules
├── .github/ # GitHub workflows
│ └── workflows/ # CI/CD pipelines
├── requirements/ # Python dependencies
│ ├── base.txt # Base requirements
│ ├── development.txt # Development dependencies
│ ├── production.txt # Production requirements
│ └── testing.txt # Testing dependencies
├── Dockerfile.api # API service container
├── Dockerfile.worker # Worker service container
├── docker-compose.yml # Local development setup
├── pyproject.toml # Python project configuration
└── README.md # Project documentation

```

## Risk Assessment & Mitigation

### Technical Risks

1. **Scalability Challenges**

   - _Risk_: Performance degradation with large datasets
   - _Mitigation_: Implement efficient indexing and caching strategies

2. **Storage Connectivity Issues**

   - _Risk_: Network failures, authentication issues
   - _Mitigation_: Robust error handling, retry mechanisms, health checks

3. **Model Accuracy**
   - _Risk_: False positives/negatives in similarity matching
   - _Mitigation_: Multiple model ensemble, tunable thresholds

### Operational Risks

1. **Resource Consumption**

   - _Risk_: High CPU/memory usage during indexing
   - _Mitigation_: Resource monitoring, throttling, distributed processing

2. **Data Privacy**
   - _Risk_: Sensitive images in corporate environments
   - _Mitigation_: Encryption, access controls, audit logging

## Success Metrics

### Performance Metrics

- Search latency: < 500ms for 95th percentile
- Indexing throughput: > 1000 images/minute
- Accuracy: > 90% for duplicate detection
- System uptime: > 99.5%

### Business Metrics

- Storage space optimization: 10-30% reduction through deduplication
- User satisfaction: Search relevance score > 4.0/5.0
- API adoption: Growing usage patterns

## Next Steps

1. **Environment Setup**: Set up development environment and project structure
2. **Proof of Concept**: Build basic image similarity search with local files
3. **MVP Development**: Implement core components from Phase 1
4. **Testing & Validation**: Create comprehensive test suites
5. **Documentation**: API documentation and user guides
6. **Deployment**: Containerization and deployment strategies

---

**Last Updated**: November 18, 2025
**Version**: 3.1 - Unified .NET Architecture with Specialized Python AI/ML
**Status**: Planning Phase - Optimized for Single-Service .NET Architecture

### 🎯 Key Enhancements in v3.0:

- 🚀 **Simplified Architecture**: Single .NET Core service + Python AI/ML (reduced complexity)
- 🔍 **Full Observability**: OpenTelemetry, Prometheus, Grafana, Jaeger
- 📊 **Built-in Telemetry**: Structured logging, metrics, tracing from day one
- ⚡ **Unified Performance**: .NET Core for all backend services with consistent patterns
- 🔧 **Developer Experience**: Focus on your .NET expertise with consistent tooling
- 🐍 **AI/ML Excellence**: Python services for specialized ML capabilities only
- 🏗️ **Production Ready**: Enterprise-grade monitoring and instrumentation
- 🌐 **Platform Agnostic**: Deploy anywhere with simplified container orchestration
- 📈 **Auto-Scaling**: Intelligent scaling based on custom metrics
- 🔄 **Service Mesh**: Advanced traffic management and security

### 📋 Simplified Technology Stack Summary:

| **Layer** | **Technology** | **Purpose** | **Benefits** |
|-----------|----------------|-------------|--------------|
| **Backend** | .NET Core (Single Service) | APIs + Orchestration + Real-time | Unified, consistent, high-performance |
| **Background** | Hangfire + SignalR | Jobs + Real-time updates | Built-in .NET tooling, dashboard |
| **AI/ML Layer** | Python + FastAPI | Feature Extraction & ML Models | Specialized for ML workloads only |
| **Observability** | OpenTelemetry + Prometheus | Full-stack monitoring | Built-in from start |

### 🔄 **Architectural Decision: Single Service vs Microservices**

**Why we chose a unified .NET service:**
- ✅ **Simpler Development**: One codebase, one deployment, one configuration
- ✅ **Better Performance**: Direct method calls instead of HTTP/gRPC overhead
- ✅ **Easier Debugging**: All backend logic in one place with unified logging
- ✅ **Cost Effective**: Fewer resources, simpler infrastructure
- ✅ **Rapid Iteration**: Faster development cycles and testing
- ✅ **Consistent Patterns**: Single set of libraries, patterns, and practices

**When to consider splitting later:**
- High load requiring independent scaling of different components
- Team growth requiring separate ownership of different domains
- Performance bottlenecks in specific areas needing specialized optimization
```
