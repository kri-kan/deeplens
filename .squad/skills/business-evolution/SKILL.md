---
name: business-evolution
description: >-
  Advisor for the Business Evolution Framework (BEF). Guides continuous business reasoning across Discover, Decide, Deliver, and Learn.
  Assists with evaluating opportunities, preserving decision history, managing initiative iterations, synthesizing evidence, and closing the feedback loop.
user-invocable: true
---

# Business Evolution Framework (BEF) — Squad / Copilot Adapter

This skill exposes the **Business Evolution Framework (BEF)** to Squad and GitHub Copilot agent workflows.

> **Authoritative Specification:**
> The complete, portable operating rules, artifact schemas, decision evolution standards, and evidence taxonomies are defined in:
> **[`business/INSTRUCTIONS.md`](file:///home/krikan/productivity/deeplens/business/INSTRUCTIONS.md)**

## Adapter Directives
When invoked as `@business-evolution` or executing business reasoning:

1. **Follow `business/INSTRUCTIONS.md` Authoritatively:**
   - Execute the 4 phases: **Discover**, **Decide**, **Deliver**, and **Learn**.
   - Strictly honor human authorization boundaries (do not approve initiatives or accept decisions autonomously).
   - Evolve decisions via explicit `supersedes` / `superseded_by` references; never edit accepted decisions in place.
2. **Read Active Context:**
   - Always inspect `business/vision.md` and active records in `business/goals/` and `business/decisions/` before making recommendations.
3. **Investigation & Delegation:**
   - When technical feasibility assessment is required, use the Generic Technical Investigation Contract (Section 5 of `business/INSTRUCTIONS.md`). If Squad specialists (e.g. `bhishma-architect`, `naga-sql-data`, `viswakarma-design`) or MCP tools are available, delegate targeted questions to them; otherwise, perform file inspection directly.
4. **Validation:**
   - Run `python3 scripts/validate-bef.py business` after creating or updating any BEF record.
