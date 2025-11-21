# DeepLens Observability & Monitoring Plan

**Last Updated**: November 20, 2025  
**Version**: 1.0  
**Status**: Production Ready

---

## 📋 Table of Contents

- [🎯 Executive Summary](#-executive-summary)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [🔧 Service Components](#-service-components)
- [📊 Data Flow & Processing](#-data-flow--processing)
- [🚀 Implementation Strategy](#-implementation-strategy)
- [⚙️ Configuration Management](#️-configuration-management)
- [🔍 Monitoring & Alerting](#-monitoring--alerting)
- [📈 Performance & Scalability](#-performance--scalability)
- [🛠️ Operations & Maintenance](#️-operations--maintenance)
- [🔄 Integration Patterns](#-integration-patterns)

---

## 🎯 Executive Summary

DeepLens implements a **comprehensive, production-ready observability stack** that provides complete visibility into application performance, infrastructure health, and business metrics. Our observability strategy follows the **three pillars of observability**: Metrics, Logs, and Traces, with **OpenTelemetry** as the unified telemetry standard.

### Key Capabilities

- **📊 Full-Stack Monitoring**: Application, infrastructure, and business metrics
- **🔍 Distributed Tracing**: End-to-end request tracing across microservices
- **📝 Centralized Logging**: Structured logs with correlation IDs
- **🚨 Intelligent Alerting**: Rule-based alerts with escalation policies
- **📈 Real-Time Dashboards**: Custom Grafana dashboards for all stakeholders
- **🔄 Auto-Discovery**: Dynamic service discovery and metric collection

---

## 🏗️ Architecture Overview

### Observable Architecture Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEMETRY COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ .NET Core   │    │ Python AI   │    │Infrastructure│    │ External    │  │
│  │ Services    │    │ Services    │    │ Components   │    │ Services    │  │
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
│ │ • Prometheus    │  │ • Loki          │  │ • Jaeger                    │   │
│ │ • InfluxDB      │  │ • Structured    │  │ • OpenTelemetry Collector   │   │
│ │ • Custom        │  │   Logs          │  │ • Distributed Context       │   │
│ │   Dashboards    │  │ • Correlation   │  │ • Span Analysis             │   │
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
│ │ • Grafana       │  │ • AlertManager  │  │ • Jaeger UI                 │   │
│ │ • Custom UI     │  │ • Escalation    │  │ • Custom Analytics          │   │
│ │ • Real-time     │  │ • Slack/Email   │  │ • Performance Analysis      │   │
│ │   Monitoring    │  │ • Webhook       │  │ • Business Intelligence     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Telemetry Data Flow

```
┌─ APPLICATION LAYER ─────────────────────────────────────────────────────────┐
│                                                                             │
│  .NET Core APIs          Python AI Services         Infrastructure         │
│  ┌─────────────┐         ┌─────────────┐            ┌─────────────┐         │
│  │ • HTTP APIs │ OTLP    │ • FastAPI   │ OTLP       │ • PostgreSQL│ /metrics│
│  │ • Serilog   │ ────┐   │ • structlog │ ────┐      │ • Redis     │ ────┐   │
│  │ • Custom    │     │   │ • OpenTel   │     │      │ • Containers│     │   │
│  │   Metrics   │     │   │ • Uvicorn   │     │      │ • System    │     │   │
│  └─────────────┘     │   └─────────────┘     │      └─────────────┘     │   │
│                      │                       │                          │   │
└──────────────────────┼───────────────────────┼──────────────────────────┼───┘
                       │                       │                          │
                       ▼                       ▼                          ▼
┌─ COLLECTION LAYER ──────────────────────────────────────────────────────────┐
│                                                                             │
│               OpenTelemetry Collector (Port 4317/4318)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      RECEIVERS                                      │   │
│  │  • OTLP (gRPC/HTTP)  • Prometheus  • Filelog  • Jaeger             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PROCESSORS                                      │   │
│  │  • Batch  • Filter  • Transform  • Enrich  • Sample               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      EXPORTERS                                      │   │
│  │  • Prometheus  • Jaeger  • Loki  • OTLP  • Logging                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                       │               │               │
                       ▼               ▼               ▼
┌─ STORAGE LAYER ─────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │ Prometheus  │    │   Jaeger    │    │    Loki     │                     │
│  │             │    │             │    │             │                     │
│  │ • Metrics   │    │ • Traces    │    │ • Logs      │                     │
│  │ • 30d retain│    │ • Spans     │    │ • Structured│                     │
│  │ • PromQL    │    │ • Dependencies    │ • LogQL     │                     │
│  │ • Alerts    │    │ • Performance│    │ • Retention │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─ VISUALIZATION LAYER ──────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           Grafana                                   │   │
│  │  • Unified dashboards from all data sources                        │   │
│  │  • Real-time monitoring and alerting                               │   │
│  │  • Custom business metrics visualization                           │   │
│  │  • SLA/SLO tracking and reporting                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Management                                  │   │
│  │  • Portainer for container management                              │   │
│  │  • AlertManager for notification routing                           │   │
│  │  • Health check dashboards                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Service Components

### Core Monitoring Services

| Service                     | Version | Purpose                          | Port      | Resource Limit      |
| --------------------------- | ------- | -------------------------------- | --------- | ------------------- |
| **Prometheus**              | v2.47.0 | Metrics collection and alerting  | 9090      | 1GB RAM, 1 CPU      |
| **Grafana**                 | 10.1.0  | Visualization dashboards         | 3000      | 512MB RAM, 0.5 CPU  |
| **OpenTelemetry Collector** | v0.88.0 | Centralized telemetry collection | 4317/4318 | 512MB RAM, 0.5 CPU  |
| **Jaeger**                  | v1.49   | Distributed tracing              | 16686     | 512MB RAM, 0.5 CPU  |
| **Loki**                    | v2.9.0  | Log aggregation                  | 3100      | 512MB RAM, 0.5 CPU  |
| **AlertManager**            | v0.25.0 | Alert routing                    | 9093      | 256MB RAM, 0.25 CPU |

### System Metrics & Exporters

| Service                 | Version | Purpose              | Port | Resource Limit      |
| ----------------------- | ------- | -------------------- | ---- | ------------------- |
| **cAdvisor**            | v0.47.0 | Container metrics    | 8081 | 512MB RAM, 0.5 CPU  |
| **Node Exporter**       | v1.6.1  | System metrics       | 9100 | 256MB RAM, 0.25 CPU |
| **Redis Exporter**      | v1.55.0 | Redis metrics        | 9121 | 128MB RAM, 0.1 CPU  |
| **PostgreSQL Exporter** | v0.15.0 | Database metrics     | 9187 | 128MB RAM, 0.1 CPU  |
| **Promtail**            | v2.9.0  | Log collection agent | -    | 256MB RAM, 0.25 CPU |

### Management Tools

| Service       | Version | Purpose                 | Port | Resource Limit      |
| ------------- | ------- | ----------------------- | ---- | ------------------- |
| **Portainer** | v2.19.1 | Container management UI | 9443 | 256MB RAM, 0.25 CPU |

---

## 📊 Data Flow & Processing

### Metrics Collection Strategy

#### **1. Application Metrics**

- **Custom Business Metrics**: Search requests, processing times, error rates
- **Framework Metrics**: ASP.NET Core, FastAPI, Node.js runtime metrics
- **Database Metrics**: Connection pools, query performance, cache hit rates

#### **2. Infrastructure Metrics**

- **Container Metrics**: CPU, memory, network, disk I/O per container
- **System Metrics**: Host CPU, memory, disk usage, network stats
- **Service Health**: Health checks, uptime, response times

#### **3. OpenTelemetry Integration**

```yaml
# Key OpenTelemetry Configuration
Receivers:
  - OTLP (gRPC/HTTP): Application telemetry
  - Prometheus: Infrastructure metrics scraping
  - Filelog: Application log files
  - Jaeger: Legacy trace formats

Processors:
  - Batch: Efficient data transmission
  - Filter: Metric/trace filtering
  - Transform: Data enrichment
  - Sample: Trace sampling for performance

Exporters:
  - Prometheus: Metrics storage
  - Jaeger: Trace storage
  - Loki: Log storage
  - OTLP: Chain to other collectors
```

### Log Processing Pipeline

#### **Structured Logging Standards**

```json
{
  "timestamp": "2025-11-20T10:30:45.123Z",
  "level": "INFO",
  "service": "deeplens-api",
  "traceId": "abc123def456",
  "spanId": "789ghi012jkl",
  "userId": "user-123",
  "tenantId": "tenant-456",
  "message": "Image similarity search completed",
  "duration": 245,
  "metadata": {
    "searchQuery": "similar_images",
    "resultsCount": 15,
    "vectorSimilarity": 0.87
  }
}
```

#### **Log Aggregation Flow**

1. **Applications** → Structured logs via Serilog/structlog
2. **Promtail** → Collects container logs and application files
3. **Loki** → Stores logs with labels and indexes
4. **Grafana** → Visualizes logs with correlation to metrics/traces

---

## 🚀 Implementation Strategy

### Service-Specific Instrumentation

#### **.NET Core Services**

```csharp
// Complete telemetry setup
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

// Serilog with OpenTelemetry integration
builder.Host.UseSerilog((context, configuration) =>
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithCorrelationId()
        .WriteTo.OpenTelemetry(options => {
            options.Endpoint = "http://otel-collector:4318/v1/logs";
            options.IncludedData = IncludedData.TraceIdField | IncludedData.SpanIdField;
        }));
```

#### **Python AI Services**

```python
# FastAPI with comprehensive telemetry
from opentelemetry import trace, metrics
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentator
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Initialize OpenTelemetry
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# OTLP configuration
otlp_exporter = OTLPSpanExporter(
    endpoint="http://otel-collector:4317",
    insecure=True
)

# FastAPI instrumentation
FastAPIInstrumentator.instrument_app(app)

# Custom metrics
meter = metrics.get_meter(__name__)
request_counter = meter.create_counter(
    "ai_service_requests_total",
    description="Total AI service requests"
)
```

#### **Node.js Services**

```typescript
// NestJS with OpenTelemetry
import { NodeSDK } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-otlp-grpc";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "http://otel-collector:4317",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

---

## ⚙️ Configuration Management

### Prometheus Configuration

```yaml
# prometheus.yml - Key scrape configurations
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Application services
  - job_name: "deeplens-api"
    static_configs:
      - targets: ["deeplens-api:80"]
    scrape_interval: 15s
    metrics_path: "/metrics"

  # Infrastructure services
  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]
    scrape_interval: 30s

  - job_name: "redis"
    static_configs:
      - targets: ["redis-exporter:9121"]
    scrape_interval: 30s

  # System metrics
  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]
    scrape_interval: 10s

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
    scrape_interval: 10s
```

### Grafana Datasources

```yaml
# datasources.yml - Multi-source configuration
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Jaeger
    type: jaeger
    url: http://jaeger:16686

  - name: Loki
    type: loki
    url: http://loki:3100

  - name: InfluxDB-Business
    type: influxdb
    url: http://influxdb:8086
    database: deeplens
```

---

## 🔍 Monitoring & Alerting

### Critical Alert Rules

#### **Infrastructure Alerts**

```yaml
# infrastructure.yml - Critical system alerts
groups:
  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for 5 minutes"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85%"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} service has been down for more than 1 minute"
```

#### **Application Alerts**

```yaml
# application.yml - Business logic alerts
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for 2 minutes"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times"
          description: "95th percentile response time is above 1 second"
```

### AlertManager Configuration

```yaml
# alertmanager.yml - Notification routing
global:
  smtp_from: "alerts@deeplens.local"

route:
  group_by: ["alertname", "cluster", "service"]
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: "default-receiver"

  routes:
    - match:
        severity: critical
      receiver: "critical-alerts"

    - match:
        severity: warning
      receiver: "warning-alerts"

receivers:
  - name: "critical-alerts"
    email_configs:
      - to: "oncall@deeplens.local"
        subject: "[CRITICAL] DeepLens Alert"
    slack_configs:
      - api_url: "{{ .SlackWebhookURL }}"
        channel: "#alerts-critical"

  - name: "warning-alerts"
    email_configs:
      - to: "admin@deeplens.local"
        subject: "[WARNING] DeepLens Alert"
```

---

## 📈 Performance & Scalability

### Resource Allocation

#### **Production Resource Recommendations**

| Service       | CPU Cores | Memory | Storage   | Scaling Strategy                   |
| ------------- | --------- | ------ | --------- | ---------------------------------- |
| Prometheus    | 2-4       | 4-8GB  | 100GB SSD | Vertical, Federation               |
| Grafana       | 1-2       | 2-4GB  | 10GB      | Horizontal (Load Balanced)         |
| OpenTelemetry | 2-4       | 2-4GB  | -         | Horizontal (Multiple Collectors)   |
| Jaeger        | 2-4       | 4-8GB  | 50GB SSD  | Horizontal (Elasticsearch backend) |
| Loki          | 2-4       | 4-8GB  | 100GB SSD | Horizontal (Object Storage)        |

#### **Data Retention Strategy**

- **Prometheus**: 30 days (configurable)
- **Jaeger**: 7 days (memory), unlimited (persistent storage)
- **Loki**: 30 days (configurable)
- **Long-term Storage**: InfluxDB for business metrics (1 year+)

#### **Performance Optimization**

1. **Metric Sampling**: Reduce high-cardinality metrics
2. **Trace Sampling**: Intelligent sampling based on error rates
3. **Log Filtering**: Filter noisy logs at collection time
4. **Dashboard Optimization**: Efficient PromQL queries
5. **Storage Compression**: Enable compression for time-series data

---

## 🛠️ Operations & Maintenance

### Deployment & Startup

#### **Quick Start Commands**

```bash
# Start complete monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Health check all services
curl -f http://localhost:9090/-/healthy    # Prometheus
curl -f http://localhost:3000/api/health   # Grafana
curl -f http://localhost:16686/api/services # Jaeger
curl -f http://localhost:3100/ready        # Loki
```

#### **PowerShell Management Module**

```powershell
# Import DeepLens management functions
Import-Module .\infrastructure\DeepLensInfrastructure.psm1

# Start complete environment
Start-DeepLensComplete

# Check service health
Test-DeepLensMonitoring

# Open monitoring dashboards
Open-GrafanaUI
Open-PrometheusUI
Open-JaegerUI
```

### Backup & Recovery

#### **Critical Data Backup**

```bash
# Prometheus data backup
docker exec deeplens-prometheus promtool tsdb snapshot /prometheus
docker cp deeplens-prometheus:/prometheus/snapshots/latest ./backups/

# Grafana configuration backup
docker exec deeplens-grafana grafana-cli admin export-dashboard --path /var/lib/grafana/backups
```

#### **Configuration Management**

- **Infrastructure as Code**: All configurations in Git
- **Version Control**: Tagged releases for configuration changes
- **Environment Parity**: Dev/staging/prod configuration consistency
- **Secret Management**: Infisical integration for sensitive data

---

## 🔄 Integration Patterns

### OpenTelemetry Integration

#### **Collector Configuration**

```yaml
# otel-collector.yaml - Complete configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  prometheus:
    config:
      scrape_configs:
        - job_name: "otel-collector"
          static_configs:
            - targets: ["localhost:8888"]

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

  memory_limiter:
    limit_mib: 512

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger]

    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [prometheus]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

### Business Intelligence Integration

#### **InfluxDB Business Metrics**

```csharp
// Custom business metrics to InfluxDB
public class BusinessMetricsService
{
    private readonly InfluxDBClient _influxClient;

    public async Task RecordSearchMetric(SearchMetric metric)
    {
        var point = PointData
            .Measurement("image_searches")
            .Tag("tenant_id", metric.TenantId)
            .Tag("user_id", metric.UserId)
            .Field("search_duration_ms", metric.Duration)
            .Field("results_count", metric.ResultsCount)
            .Field("similarity_score", metric.AverageScore)
            .Timestamp(DateTime.UtcNow, WritePrecision.Ns);

        await _influxClient.GetWriteApiAsync().WritePointAsync(point);
    }
}
```

### Dashboard Templates

#### **Key Performance Indicators (KPIs)**

1. **System Health Dashboard**

   - Service uptime and availability
   - Resource utilization (CPU, memory, disk)
   - Container health status

2. **Application Performance Dashboard**

   - Request/response times
   - Error rates and types
   - Database query performance

3. **Business Metrics Dashboard**

   - Search request volume
   - User engagement metrics
   - Tenant usage statistics

4. **Security & Compliance Dashboard**
   - Authentication success/failure rates
   - API rate limiting stats
   - Audit trail metrics

---

## 🎯 Monitoring Maturity Roadmap

### Current State (Phase 1) ✅

- [x] Complete infrastructure monitoring
- [x] Application performance monitoring
- [x] Distributed tracing implementation
- [x] Centralized logging
- [x] Basic alerting rules

### Phase 2 (Planned)

- [ ] Machine learning-based anomaly detection
- [ ] Advanced SLI/SLO tracking
- [ ] Custom business metrics dashboards
- [ ] Automated remediation workflows
- [ ] Cost optimization insights

### Phase 3 (Future)

- [ ] Predictive scaling based on metrics
- [ ] Advanced root cause analysis
- [ ] Cross-service dependency mapping
- [ ] Performance regression detection
- [ ] Business intelligence integration

---

## 📞 Contact & Support

**Observability Team**: observability@deeplens.local  
**Documentation**: [Internal Wiki](http://wiki.deeplens.local/observability)  
**Runbooks**: [Operational Procedures](http://runbooks.deeplens.local)

---

_This document is maintained by the DeepLens Platform Team and updated with each infrastructure release._
