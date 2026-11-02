---
id: INI-LENS-001
type: initiative
title: Vayyari Mobile Visual Swatch Search Acceleration
status: completed
phase: learn
iteration: 2
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-LENS-001
  opportunities:
    - OPP-LENS-001
  decisions:
    - DEC-LENS-001
    - DEC-LENS-002
  openspec: []
  technical_adrs:
    - ".squad/decisions/inbox/2026-10-29-ephemeral-in-memory-visual-lens-search.md"
---

# Initiative: Vayyari Mobile Visual Swatch Search Acceleration

## 1. Problem & Business Objective
Accelerate visual swatch similarity query performance in the Vayyari mobile app to achieve sub-150ms p95 latency, driving mobile shopper conversions.

## 2. Scope & Boundaries
- **In Scope:**
  - Vayyari mobile UI swatch tap & crop overlay.
  - SearchApi tiered caching (Redis top-10k embeddings + PostgreSQL IVFFlat fallback).
  - OpenTelemetry latency instrumentation on visual search endpoints.
- **Out of Scope:**
  - Complete rewriting of image feature extraction pipeline.
  - Offline on-device vector inference.

## 3. Expected Outcomes & Success Criteria
- Sub-150ms p95 latency on search endpoint.
- Zero container OOM restarts under 200 concurrent requests/sec.
- >20% increase in mobile visual search engagement.

## 4. Proposed Approach & Delivery Strategy
- Phase 1: Prototype in-process cache (superseded).
- Phase 2: Deploy shared Redis cache layer and update SearchApi client.

## 5. Technical Feasibility & Dependencies
- Verified with Bhishma (.NET architect) and Naga (PostgreSQL specialist).
- DTO contracts preserve camelCase attributes.

## 6. Risks, Assumptions & Mitigation
- High concurrency risk mitigated by Redis cluster read replicas.

## 7. Iteration Log
### Iteration 1 (2026-10-31)
- Initial attempt utilizing DEC-LENS-001 (in-process cache).
- Outcome: Encountered pod OOM and container restart latency. Triggered backward transition to Decide phase.

### Iteration 2 (2026-10-31)
- Re-scoped to implement DEC-LENS-002 (tiered Redis cache with partial GIN/IVFFlat fallback).
- Re-architected caching layer, verified stability in staging, deployed to production. Status moved to `completed`.
