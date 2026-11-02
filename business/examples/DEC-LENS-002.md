---
id: DEC-LENS-002
type: decision
title: Adopt Two-Tier Ephemeral Redis Vector Cache with Partial GIN Index
status: accepted
supersedes:
  - DEC-LENS-001
superseded_by: []
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-LENS-001
  opportunities:
    - OPP-LENS-001
  initiatives:
    - INI-LENS-001
---

# Decision: Adopt Two-Tier Ephemeral Redis Vector Cache with Partial GIN Index

## 1. Decision Statement
Supersede DEC-LENS-001. Store top 10,000 active catalog embeddings in shared Redis with fallback to PostgreSQL partial GIN/IVFFlat index for cold items.

## 2. Context & Problem
DEC-LENS-001 caused unacceptable process memory exhaustion (>8GB per pod). We need a tiered architecture that maintains <150ms p95 latency while keeping pod RAM under 1.2GB.

## 3. Alternatives Considered
- **Option A (Chosen):** Redis tiered cache + Postgres partial index fallback.
- **Option B:** Upgrade Kubernetes worker node RAM to 64GB instances (rejected due to 4x hosting cost increase).

## 4. Rationale & Selection
Hits the p95 latency target (measured 85ms on cache hit, 160ms on cache miss) while reducing infrastructure footprint by 75%.

## 5. Supporting & Conflicting Evidence
- Benchmarks on staging environment confirmed 94% cache hit rate for active inventory.
- Postgres fallback query executes in 110ms with partial indexing.

## 6. Consequences & Trade-offs
Adds Redis network latency overhead (avg 4ms), which is well within our 150ms budget.

## 7. Evolution & Supersession Notes
Directly supersedes DEC-LENS-001 following Deliver phase findings and Squad lead review.
