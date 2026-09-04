# ADR-001: Hybrid .NET + Python Microservices architecture

**Status**: Accepted

## Context
DeepLens requires high-performance web APIs and orchestration, which .NET provides. However, it also requires state-of-the-art AI and ML capabilities for video/image feature extraction, where Python has the richest ecosystem.

## Decision
We will use a hybrid architecture:
- **.NET 9** for core identity, search API, orchestration, and long-running background workers.
- **Python (FastAPI)** for stateless AI services (feature extraction, metadata enrichment).
- Communication between services will be via REST for synchronous calls and **Kafka** for asynchronous processing.

## Consequences
- **Pros**: Best of both worlds (performance + AI richness).
- **Cons**: Increased operational complexity (two runtimes, language environments). Needs robust cross-language telemetry (OpenTelemetry).
