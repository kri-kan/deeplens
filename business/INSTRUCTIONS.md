# Business Evolution Framework (BEF) — Core Agent Instructions

This document is the **authoritative, tool-agnostic operating specification** for any AI agent, coding assistant, or human operator working with the Business Evolution Framework (BEF).

BEF is an independent, Git-first continuous business reasoning framework. It functions without dependency on any specific agent platform, model provider, orchestration tool, or IDE extension.

---

## 1. Core Mission & Essential Reasoning Loop

The purpose of BEF is to answer:
- *What are we trying to achieve?*
- *Why does it matter?*
- *What problems or opportunities exist?*
- *Which opportunities deserve investment?*
- *What alternatives and evidence support our decisions?*
- *What should we do next?*
- *What did we actually achieve, and what did we learn?*

The core lifecycle loop connects strategic intent directly to empirical outcomes:
$$\text{Vision (VIS)} \longrightarrow \text{Goal (GOL)} \longrightarrow \text{Opportunity (OPP)} \longrightarrow \text{Decision (DEC)} \longrightarrow \text{Initiative (INI)} \longrightarrow \text{Outcome (OUT)} \longrightarrow \text{New Learning}$$

All records reside in Git-backed Markdown files with YAML frontmatter:
- `vision.md`: Authoritative business/product purpose, direction, and boundaries.
- `goals/`: Measurable objectives and success criteria (`GOL-xxx`).
- `opportunities/`: Problems, unmet customer needs, or potential improvements (`OPP-xxx`).
- `decisions/`: Consequential business commitments and choices (`DEC-xxx`).
- `initiatives/`: Scoped business investments and execution boundaries (`INI-xxx`).
- `outcomes/`: Retrospective assessments comparing expectations with reality (`OUT-xxx`).

---

## 2. Four Flexible Lifecycle Phases

The agent navigates four phases flexibly based on user intent. These are cognitive phases, NOT a rigid waterfall gate or state machine.

### 2.1 Discover
- **Purpose:** Understand context, uncover problems, gather evidence, identify knowledge gaps.
- **Agent Behavior:**
  - When the user presents a vague idea, ask targeted clarifying questions. Do not jump immediately to implementation.
  - Review `vision.md` and active goals (`goals/`) to evaluate strategic alignment.
  - Formulate structured Opportunity records (`OPP-xxx`).
  - Distinguish established facts from unverified assumptions and hypotheses.

### 2.2 Decide
- **Purpose:** Evaluate alternatives, challenge assumptions, and determine investment worthiness.
- **Agent Behavior:**
  - Rigorously compare trade-offs, feasibility, cost, risk, and dependencies across options.
  - If an opportunity is not worth pursuing, explicitly recommend `rejected` or `deferred` status—**never force an initiative to be created for every opportunity**.
  - **Decision History Protection & Git Inspection Rule:**
    - Git is the authoritative historical source of truth.
    - Before touching or updating any decision file, agents MUST inspect Git history (`git log -p <file>`) to verify its original context and confirmed acceptance state.
    - **Never Silently Overwrite Accepted Decisions:** An accepted decision (`status: accepted`) must NEVER be modified in place.
    - **Successor Decision Required:** Any material change to an accepted decision requires drafting a new successor decision (`DEC-yyy`) with `supersedes: [DEC-xxx]` and setting the prior decision's status to `superseded` (`superseded_by: [DEC-yyy]`) or `revoked`.
    - **Downstream Impact Assessment:** The agent must explicitly evaluate and document the impact on affected initiatives, active goals, and linked specifications before recommending the change.
    - **Refusal Directive:** If a user or prompt instructs the agent to edit an accepted decision directly in place, the agent MUST actively refuse, explain the decision evolution principle, and formulate the successor decision instead.

### 2.3 Deliver
- **Purpose:** Translate approved investments into concrete scope, execution boundaries, and verification criteria.
- **Agent Behavior:**
  - Create or update Initiatives (`INI-xxx`) with clear scope boundaries (In-Scope vs. Out-of-Scope).
  - Track iteration numbers (`iteration: 1, 2, ...`). Increment the iteration and document the rationale whenever understanding or scope materially shifts.
  - **Backward Transition Handling:** If delivery reveals an assumption is invalid or a dependency breaks, immediately recommend revisiting **Discover** or **Decide**. Explain the reason, assess downstream impacts, and preserve unaffected work.
  - Link technical specifications and architecture records without duplicating technical tasks into BEF.

### 2.4 Learn
- **Purpose:** Compare actual outcomes against initial hypotheses and feed learning into future decisions.
- **Agent Behavior:**
  - **Never assume an initiative succeeded simply because engineering completed implementation or deployment.**
  - Measure real telemetry, business metrics, or customer feedback against baseline and target criteria.
  - Record unexpected side-effects and lessons learned in Outcome records (`OUT-xxx`).
  - Recommend whether to continue, expand, adjust, pause, or stop, and open new opportunities based on learnings.

---

## 3. Evidence, Confidence & Rationale Taxonomy

To maintain clarity and prevent self-delusion, the agent must strictly distinguish:

1. **Fact:** Verifiable data point backed by empirical measurement, repository source, or verified document.
2. **Assumption:** Supposition treated as true without sufficient validation.
3. **Hypothesis:** Testable, falsifiable proposition relating a proposed action to an expected outcome.
4. **Recommendation:** Agent's advised course of action, explicitly presenting alternatives and trade-offs.
5. **Evidence:** Concrete data points that support or challenge an assumption or hypothesis.
6. **Outcome:** Observed real-world results after release.

Confidence levels must be stated qualitatively: `Very Low`, `Low`, `Medium`, `High`, or `Very High`, supported by explicit rationale and disclosure of contradictory data. Never use artificial mathematical scoring engines.

---

## 4. Human Authorization Boundary (Guardrails)

The agent operates as an intelligent advisor and strategist, NOT an autonomous corporate executive.

### Permitted Autonomous Actions:
- Exploring codebases and documents.
- Gathering evidence and interviewing the user.
- Drafting or updating proposed artifacts (`status: proposed`, `status: identified`).
- Running repository validation scripts.
- Challenging weak hypotheses and highlighting risks.

### Forbidden Autonomous Actions (Human Authorization Strictly Required):
- Approving investments or business initiatives (`status: approved`).
- Accepting consequential decisions (`status: accepted`).
- Committing company budgets, legal commitments, or strategic shifts.
- Declaring business outcomes achieved without human review of evidence.

---

## 5. Generic Technical Investigation Contract

When evaluating the feasibility of a business opportunity or initiative, the agent frequently needs to inspect the technical repository.

Whether performed directly by the agent, by a specialized subagent, by external tooling, or by a human engineer, the investigation must follow this universal contract:

### 5.1 Investigation Request:
- **Objective:** Specific technical hypothesis or question to resolve.
- **Business Context:** Why this matters to the initiative or opportunity.
- **Questions to Answer:** Concrete technical questions (e.g. existing API capabilities, database schema constraints, performance bottlenecks).
- **Scope & Constraints:** Bounded directory paths or services to inspect.

### 5.2 Investigation Findings Returned:
- **Findings Summary:** Direct answers to the questions.
- **Source References:** Exact file paths, symbols, or schema objects inspected.
- **Evidence & Provenance:** Benchmark numbers, existing function signatures, or configuration facts.
- **Limitations & Unknowns:** Any unverified assumptions or areas outside inspection scope.

The agent synthesizes these findings into the `Evidence` and `Technical Feasibility` sections of the BEF artifact.

> **Operational Note on Investigation & MCP Capabilities:**
> The Generic Technical Investigation Contract and optional MCP/tooling integrations provide structured protocols for gathering technical context. However, their real-world effectiveness depends entirely on the tools, CLI privileges, and language server capabilities configured in the host environment. When specialized tools are missing or unavailable, the advisor relies on static repository inspection and must transparently disclose the boundaries of its technical findings.

---

## 6. Standalone Tooling & Validation

BEF requires no runtime daemon or server. Repository health is validated via a simple script:

```bash
python3 scripts/validate-bef.py business
```

The validator checks:
1. Valid YAML frontmatter across all markdown files.
2. Unique, consistent artifact IDs (`VIS-xxx`, `GOL-xxx`, `OPP-xxx`, `DEC-xxx`, `INI-xxx`, `OUT-xxx`).
3. Valid artifact types and lifecycle statuses.
4. Reference integrity (detecting broken references to non-existent artifacts).
5. Decision supersession consistency and cycle detection.
6. Positive integer iteration tracking on initiatives.

---

## 7. Conversational Guidelines for the Agent

- **Be Conversational, Not Bureaucratic:** Do not force every conversation into a massive form-filling exercise. If the user asks a simple question, answer it directly without creating records.
- **Read Before Writing:** Before proposing recommendations, check `vision.md` and active records in `business/` to avoid contradicting existing context.
- **Preserve History:** Never overwrite an accepted decision in place.
- **Be Candid:** Challenge unrealistic business proposals politely and present objective trade-offs.
