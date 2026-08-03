# Decision / Assessment: Observability & Monitoring Audit

**Date:** 2026-08-03  
**Author:** Sanjaya (Observability & Intelligence Specialist) via Squad Coordinator  
**Status:** Gap Identified / Action Required  

## Summary
An audit of the DeepLens codebase revealed that **no production-grade observability or distributed tracing setup currently exists**.

## Key Gaps Identified
1. **Dashboards**: Zero Grafana or ASP.NET/Aspire dashboards configured.
2. **OpenTelemetry (OTEL)**: Missing OTEL SDK setup, tracer providers, and W3C `traceparent` context propagation across HTTP, gRPC, and Kafka.
3. **Metrics & Logging**: No Prometheus target configurations or trace-correlated log forwarders (Loki/FluentBit).
4. **Validation Scripts**: `setupscripts/core/validate-stack.sh` and deployment scripts are non-functional stubs.

## Recommended Action Plan
1. **OTEL Collector**: Deploy OTLP collector configuration (`infrastructure/observability/otel-collector-config.yaml`).
2. **Instrumentation**: Add OTEL SDK tracing across services & API calls.
3. **Dashboards & Metrics**: Provision Grafana dashboards for RED/USE metrics, API call tracing, Kafka lag, and AI inference latency.
4. **Stack Validation**: Upgrade `setupscripts/core/validate-stack.sh` to perform runtime health and OTEL endpoint verification.
