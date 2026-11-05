# BEF Acceptance Criteria Verification & Classification

This document maps all 18 Acceptance Tests (AT-01 through AT-18) from `business/BEF-IMPLEMENTATION-BRIEF.md` to their concrete implementation and verification mechanisms.

### Verification Levels Defined:
1. **Automated Behavioral Validation:** Formally verified by executable test code in `tests/bef_validation_tests.py` and `scripts/validate-bef.py`.
2. **Demonstrated by Reference Artifacts:** Illustrated by concrete, consistent, and validated reference files in `business/examples/`.
3. **Instruction-Level Specification:** Explicitly defined as operational protocols or contracts in `business/INSTRUCTIONS.md` and integration guides.
4. **Model-Dependent Advisor Reasoning:** Described as conversational guidelines for AI agents; their real-world outcome depends on the runtime model and host tool environment.

---

### AT-01: User provides an incomplete business idea
- **Trigger:** "We should probably add video reviews to the store."
- **Expected Advisor Behavior:** Advisor enters the **Discover** phase. Rather than drafting an initiative, it asks targeted discovery questions (e.g., who produces the reviews, what problem it solves, how it maps to customer friction) and identifies key assumptions.
- **Verification:** Codified in `business/INSTRUCTIONS.md` Section 2.1 ("Discover").

---

### AT-02: User proposes an opportunity
- **Trigger:** "Customers on Instagram want to order directly by DMing product screenshots."
- **Expected Advisor Behavior:** Evaluates problem statement, affected personas, potential commercial upside, current evidence, and viable alternatives. Synthesizes into `business/opportunities/OPP-xxx.md`.
- **Verification:** Template `business/templates/opportunity.md` and reference example `business/examples/OPP-LENS-001.md`.

---

### AT-03: Opportunity is not worth pursuing
- **Trigger:** Opportunity assessment reveals exorbitant operational cost with negligible retention upside.
- **Expected Advisor Behavior:** Recommends marking opportunity as `rejected` or `deferred`. Does NOT create an initiative or decision to build.
- **Verification:** Codified in `business/INSTRUCTIONS.md` Section 2.2 ("Decide") and status schema (`rejected`, `deferred`).

---

### AT-04: Initiative is approved
- **Trigger:** Human explicitly confirms approval of proposed initiative.
- **Expected Advisor Behavior:** Marks initiative `status: approved`. Links `related.goals`, `related.opportunities`, and `related.decisions`.
- **Verification:** Codified in `business/templates/initiative.md`, `business/INSTRUCTIONS.md` Section 4, and demonstrated in `business/examples/INI-LENS-001.md`.

---

### AT-05: Technical feasibility is unknown
- **Trigger:** Opportunity requires sub-100ms vector search across 100k items, but current DB index performance is unknown.
- **Expected Advisor Behavior:** Advisor delegates investigation via the Generic Technical Investigation Contract (or optionally via Squad/MCP if available), captures concrete findings, and embeds them into the opportunity's evidence.
- **Verification:** Contract specified in `business/INSTRUCTIONS.md` Section 5 and `business/integrations/generic-agent.md`.

---

### AT-06: MCP is unavailable
- **Trigger:** Serena or Postgres MCP server is offline or unreachable.
- **Expected Advisor Behavior:** Discloses the limitation transparently. Never hallucinates symbols or query results. Continues with available local file and migration context.
- **Verification:** Contract specified in `business/integrations/mcp.md` Section 2.

---

### AT-07: Accepted decision changes
- **Trigger:** In-process vector caching causes memory exhaustion during delivery.
- **Expected Advisor Behavior:** Never edits accepted decision in place. Drafts successor `DEC-002` (`supersedes: [DEC-001]`), updates old decision `DEC-001` to `superseded` (`superseded_by: [DEC-002]`).
- **Verification:** Validated by `scripts/validate-bef.py` and demonstrated in `business/examples/DEC-LENS-001.md` $\to$ `business/examples/DEC-LENS-002.md`.

---

### AT-08: Initiative scope changes materially
- **Trigger:** Customer feedback reveals need to support multi-saree cropping before release.
- **Expected Advisor Behavior:** Increments `iteration: 2` on the initiative, records the reason in the iteration log, and assesses downstream impacts.
- **Verification:** Demonstrated in `business/examples/INI-LENS-001.md` (Iteration 1 $\to$ Iteration 2).

---

### AT-09: Delivery invalidates an earlier assumption
- **Trigger:** Caching entire vector dataset in RAM crashes microservice containers.
- **Expected Advisor Behavior:** Flags broken assumption, recommends backward transition to **Decide**, reviews affected decisions, preserves unaffected work.
- **Verification:** Codified in `business/INSTRUCTIONS.md` Section 2.3 & 2.4.

---

### AT-10: Only part of an initiative is affected
- **Trigger:** Back-end vector query layer must change, but mobile swatch crop UI remains valid.
- **Expected Advisor Behavior:** Mobile UI scope is preserved; only the vector caching decision and back-end tasks are revised.
- **Verification:** Exemplified in `business/examples/INI-LENS-001.md`.

---

### AT-11: Initiative uses OpenSpec
- **Trigger:** Team adopts OpenSpec for technical change management.
- **Expected Advisor Behavior:** Initiative links `related.openspec: ["specs/..."]` without duplicating implementation tasks into BEF.
- **Verification:** Specified in `business/integrations/openspec.md` and template `business/templates/initiative.md`.

---

### AT-12: OpenSpec is unavailable or unused
- **Trigger:** Repository has no OpenSpec tooling installed.
- **Expected Advisor Behavior:** BEF functions normally with zero degradation or warnings.
- **Verification:** Verified by clean execution of `python3 scripts/validate-bef.py business`.

---

### AT-13: Initiative is completed
- **Trigger:** Engineering merges PR and deploys service to production.
- **Expected Advisor Behavior:** Advisor marks initiative `completed`, but explicitly does NOT assume business success until real outcome metrics are measured in `OUT-xxx`.
- **Verification:** Codified in `business/INSTRUCTIONS.md` Section 2.4 and `business/integrations/openspec.md` Section 3.

---

### AT-14: Actual results differ from expectations
- **Trigger:** Real p95 latency is 118ms (target 150ms), but users encounter multi-saree crop confusion.
- **Expected Advisor Behavior:** Outcome record documents delta, unexpected side-effects, and recommends opening a new opportunity (`OPP-LENS-002`).
- **Verification:** Exemplified in `business/examples/OUT-LENS-001.md` Sections 2, 4, 5, and 6.

---

### AT-15: Artifact reference is missing
- **Trigger:** Initiative references a non-existent goal `GOL-NONEXISTENT`.
- **Expected Result:** Validation flags broken reference with error.
- **Verification:** Tested programmatically by `tests/bef_validation_tests.py` (`test_broken_reference_at_15`) — Passed.

---

### AT-16: Two artifacts have the same ID
- **Trigger:** Two files define `id: DEC-001`.
- **Expected Result:** Validation halts and flags duplicate ID error.
- **Verification:** Tested programmatically by `tests/bef_validation_tests.py` (`test_duplicate_id_at_16`) — Passed.

---

### AT-17: Accepted decision is edited in place or circular supersession occurs
- **Trigger:** Decision marked superseded without backlink, or circular supersession chain.
- **Expected Result:** Validation halts and flags cycle or missing backlink.
- **Verification:** Tested programmatically by `tests/bef_validation_tests.py` (`test_decision_supersession_and_cycle_at_17` and `test_superseded_target_wrong_status`) — Passed.

---

### AT-18: User asks an unrelated technical question
- **Trigger:** "How do I restart the vayyari expo service?"
- **Expected Advisor Behavior:** Directly answers with `tmux send-keys -t expo r C-m` or service instructions without creating any unnecessary BEF artifacts.
- **Verification:** Codified in `business/INSTRUCTIONS.md` Section 7 & `business/BEF-IMPLEMENTATION-BRIEF.md` Section 11.2.
