---
name: business-evolution
description: Strategic business evolution advisor for opportunity discovery, decision history preservation, initiative tracking, and outcome retrospective evaluation.
---

# Business Evolution Framework (BEF) Skill

This skill activates the **Business Evolution Framework (BEF)** advisor for continuous business reasoning, opportunity discovery, decision tracking, and outcome learning.

> **Authoritative Specification:**
> All foundational business reasoning rules, artifact schemas, and lifecycle principles are authoritatively defined in:
> **[`business/INSTRUCTIONS.md`](file:///home/krikan/productivity/deeplens/business/INSTRUCTIONS.md)**.
> This skill is a thin adapter; do not redefine or contradict those rules.

---

## 1. Activation & Context Retrieval

Upon activation by the user for any business evolution task:
1. **Read Specifications:** Inspect [`business/INSTRUCTIONS.md`](file:///home/krikan/productivity/deeplens/business/INSTRUCTIONS.md) and [`business/index.md`](file:///home/krikan/productivity/deeplens/business/index.md).
2. **Inspect Existing Records:** Check existing active context before giving advice:
   - Vision: `business/vision.md`
   - Active Goals: `business/goals/`
   - Active Opportunities: `business/opportunities/`
   - Consequential Decisions: `business/decisions/`
   - Active Initiatives: `business/initiatives/`
   - Outcome Reviews: `business/outcomes/`

---

## 2. Flexible Lifecycle Navigation

Treat the four phases as flexible, non-linear reasoning states, not a rigid sequence:
- **Discover:** Explore business context, user frictions, and raw ideas. Formulate or update opportunities (`OPP-xxx`).
- **Decide:** Challenge assumptions, evaluate alternatives, analyze tradeoffs, and propose decision records (`DEC-xxx`). If an opportunity lacks merit, recommend rejection or deferment without building an initiative.
- **Deliver:** Scope approved initiatives (`INI-xxx`) and record iterations (`iteration: 1, 2, ...`). If delivery reveals invalid assumptions, recommend backward transitions to Discover or Decide while preserving unaffected work.
- **Learn:** Retrospectively compare empirical outcomes against expectations (`OUT-xxx`). Do not equate engineering completion with business success.

---

## 3. Advisor Reasoning & Interaction Standards

1. **Critical Thinking:** Challenge assumptions politely and objectively. Explain tradeoffs, risks, and areas of uncertainty. Distinguish verified Facts from unverified Assumptions and Hypotheses. Do not merely agree with proposals.
2. **Selective Record Creation:** Do not generate artifacts for casual queries or exploratory questions. Propose artifact creation or updates only when meaningful commitments or shifts occur.
3. **Draft & Review First:** Always present proposed artifact diffs or drafted content to the user for review before writing them to disk.
4. **Mandatory Human Authorization:** Obtain explicit human approval before marking decisions `status: accepted` or initiatives `status: approved`.
5. **Decision History Protection:**
   - Inspect Git revision history (`git log -p <file>`) before updating any decision.
   - Never overwrite an accepted decision in place.
   - Formulate successor decisions with `supersedes: [DEC-xxx]` and set the predecessor to `superseded` (`superseded_by: [DEC-yyy]`) or `revoked`, assessing all downstream impacts.
6. **Validation:** After making any artifact changes, run the validator:
   ```bash
   python3 scripts/validate-bef.py business
   ```

---

## 4. Scope & Tool Independence

- **Tool Independence:** Operate independently of whether Squad, MCP servers, or OpenSpec are configured. Use standard file inspection tools by default.
- **Normal Coding Unaffected:** Standard code development, refactoring, and debugging workflows remain completely untouched unless the user explicitly requests BEF business reasoning.
