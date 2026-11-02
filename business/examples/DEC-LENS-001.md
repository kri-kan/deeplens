---
id: DEC-LENS-001
type: decision
title: Adopt Pure In-Memory Full Vector Table for Visual Search
status: superseded
superseded_by:
  - DEC-LENS-002
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

# Decision: Adopt Pure In-Memory Full Vector Table for Visual Search

## 1. Decision Statement
Preload all 100,000 product image vectors into RAM inside SearchApi microservice memory space at startup.

## 2. Context & Problem
We need sub-150ms visual similarity query response to hit our mobile conversion goal.

## 3. Alternatives Considered
- **Option A (Chosen originally):** In-memory process cache on each API instance.
- **Option B:** External Redis Vector Similarity Search.

## 4. Rationale & Selection
Process memory offers zero network round-trip overhead.

## 5. Supporting & Conflicting Evidence
- Initial benchmark demonstrated 25ms similarity calculation.
- Conflicting evidence: High memory footprint (exceeding 8GB per pod).

## 6. Consequences & Trade-offs
High memory cost and long cold-start warmup times.

## 7. Evolution & Supersession Notes
**Superseded by DEC-LENS-002:** During Iteration 1 delivery, performance profiling revealed pod OOM crashes and 90-second container restart times, prompting backward transition to Decide.
