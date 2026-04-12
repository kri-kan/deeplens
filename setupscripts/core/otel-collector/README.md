# OpenTelemetry Collector Service
 
This folder contains the Docker Compose setup for the OpenTelemetry Collector, used for telemetry processing and routing.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for the Collector.
- `otel-config.yaml` - Main configuration for receivers, processors, and exporters.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
## Configuration
 
- **Metrics Port**: 8888 (Internal metrics)
- **Prometheus Exporter Port**: 8889
- **OTLP gRPC Port**: 4317
- **OTLP HTTP Port**: 4318
- **Container Name**: `otel-collector`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Exporters**: Configured to export traces to `jaeger:4317` and metrics to a Prometheus-compatible endpoint.
