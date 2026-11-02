# Business Evolution Framework (BEF)
## Implementation Brief for Gemini CLI

**Document purpose:** Authoritative implementation brief  
**Framework version:** BEF v1.0  
**Implementation mode:** Repository-aware, incremental implementation  
**Primary interface:** GitHub Copilot / VS Code skill  
**Persistence:** Git-backed Markdown and YAML  
**Future direction:** Reusable framework operations and optional application UI

---

# 1. Your Mission

Implement the Business Evolution Framework (BEF) in this existing product monorepo.

BEF is a lightweight, Git-first business reasoning and evolution framework. It helps users understand business direction, discover opportunities, evaluate alternatives, make traceable decisions, guide initiatives, and learn from actual outcomes.

Your task is to turn the framework definition in this document into a working repository implementation.

This is not a request to build a standalone application, a project-management tool, or an autonomous business agent.

The initial deliverable is a **usable framework foundation with a Copilot skill, structured business records, validation, and integration with existing development-agent workflows**.

You must preserve the intent and constraints in this document. Do not simplify away essential capabilities such as decision evolution, iterations, evidence, traceability, or outcome feedback. Equally, do not introduce unnecessary abstractions or infrastructure.

## 1.1 How to approach this assignment

Work in this order:

1. Inspect the existing repository and understand its conventions.
2. Identify the appropriate location and integration points for BEF.
3. Inspect existing agent, skill, Squad, and MCP configurations.
4. Propose an implementation plan based on the actual repository.
5. Identify conflicts, gaps, or architectural concerns.
6. Implement incrementally.
7. Validate the implementation against the acceptance criteria.
8. Document what was implemented, what was deferred, and any remaining decisions.

Do not start by generating files based only on assumed repository structure.

Do not replace existing systems or conventions without establishing a clear need.

If the repository contains existing functionality that can satisfy a requirement, reuse it rather than creating a duplicate.

---

# 2. Product Context and Existing Environment

The target is an existing product monorepo, not a new repository.

The repository may contain multiple solutions and technologies, including:

- C# and .NET
- SQL and database-related projects
- JavaScript and TypeScript
- React and Angular
- HTML, CSS, and SCSS
- Python
- Multiple applications, services, and supporting tools

There is already an existing **Squad agent setup** in the repository.

The existing development environment also uses or is intended to use:

- Codebase Memory MCP — codebase knowledge and contextual retrieval.
- Serena MCP — code navigation, symbols, references, and implementation exploration.
- PostgreSQL MCP (`crystaldba/postgres-mcp`) — database schema and data investigation.

These are existing architectural decisions. Do not replace them or introduce alternatives without a concrete technical justification.

BEF should leverage this environment selectively.

## 2.1 Important boundaries

- Do not replace Squad or build another agent orchestration system.
- Do not duplicate existing codebase analysis capabilities.
- Do not make BEF dependent on MCP availability.
- Do not make OpenSpec mandatory.
- Do not introduce a database for BEF in the initial implementation.
- Do not build a dedicated BEF application or web UI in this phase.
- Do not introduce a new technology stack merely for BEF.
- Do not modify unrelated product functionality.

First establish how the existing repository organizes agent instructions, skills, scripts, documentation, and configuration.

---

# 3. BEF: Functional Definition

BEF is a continuous business reasoning framework.

Its purpose is to help a user answer:

- What are we trying to achieve?
- Why does it matter?
- What is the current business and product situation?
- What problems or opportunities exist?
- Which opportunities deserve investment?
- What alternatives are available?
- What assumptions and evidence support a decision?
- What should we do next?
- What did we actually achieve?
- What should change based on what we learned?

The framework must preserve the reasoning behind business evolution, not just the current status of work.

## 3.1 Core principles

1. Business-first: business goals and outcomes drive decisions.
2. Evidence-aware: facts, assumptions, hypotheses, recommendations, and results must be distinguishable.
3. Adaptive: users can revisit earlier reasoning without restarting everything.
4. Traceable: important decisions retain their history and rationale.
5. Incremental: create or update records only when meaningful.
6. Git-native: records are portable, reviewable, and version-controlled.
7. Tool-independent: Copilot, Squad, MCP, and OpenSpec are integrations, not the framework itself.
8. Human-authorized: the advisor can recommend but cannot independently authorize consequential commitments.

---

# 4. Four Flexible Lifecycle Phases

Implement the following four phases.

## 4.1 Discover

Purpose: Understand the business situation and identify opportunities.

Activities:
- Understand the business vision and goals.
- Understand the current product and repository state when relevant.
- Identify problems, unmet needs, constraints, and opportunities.
- Gather evidence.
- Identify assumptions and knowledge gaps.

Typical outputs:
- Vision and Goal updates.
- Opportunity records.
- Supporting evidence.

## 4.2 Decide

Purpose: Evaluate alternatives and determine what deserves investment.

Activities:
- Evaluate opportunities.
- Challenge assumptions.
- Assess business value, feasibility, risk, cost, and dependencies.
- Compare alternatives.
- Establish expected outcomes.
- Record consequential decisions.
- Recommend whether to proceed, investigate, defer, or reject.

Typical outputs:
- Decision records.
- Prioritized initiatives.
- Expected outcomes and success criteria.

## 4.3 Deliver

Purpose: Translate commitments into specifications, implementation, and release.

Activities:
- Detail initiatives.
- Define scope and requirements.
- Investigate technical feasibility.
- Link relevant architecture and technical specifications.
- Use existing development workflows.
- Track meaningful changes in scope and understanding.
- Record material decisions.

Typical outputs:
- Initiative specifications.
- Linked technical specifications.
- Implementation references.
- Updated decisions.

## 4.4 Learn

Purpose: Evaluate actual results and feed learning into future decisions.

Activities:
- Compare expected and actual outcomes.
- Evaluate evidence and deviations.
- Identify unexpected effects.
- Reassess assumptions and decisions.
- Recommend whether to continue, adjust, pause, or stop.
- Identify new opportunities.

Typical outputs:
- Outcome records.
- Updated goals or decisions.
- New opportunities.

## 4.5 Phase behavior

These are flexible navigation concepts, not mandatory workflow gates.

A user may:
- Start in any phase.
- Move backward when new information requires it.
- Revisit a previous decision.
- Discover an opportunity while delivering an initiative.
- Create new initiatives from outcome reviews.

Do not implement a rigid state machine that forces users through every phase.

Do not automatically invalidate downstream work when an earlier phase is revisited.

---

# 5. Six Primary Artifact Types

Implement exactly these six primary BEF artifact types for v1.

| Artifact | ID prefix | Purpose |
|---|---|---|
| Vision | VIS | Business direction and intent |
| Goal | GOL | Desired measurable result |
| Opportunity | OPP | Problem, need, risk, or improvement |
| Initiative | INI | Selected investment or body of change |
| Decision | DEC | Consequential choice and rationale |
| Outcome | OUT | Actual results and learning |

Do not introduce additional first-class artifact types in v1.

Requirements, assumptions, hypotheses, evidence, risks, dependencies, reviews, and technical decisions should be embedded in the relevant primary record or linked to existing documents.

## 5.1 Vision

One authoritative vision document per business or product context.

Suggested sections:
- Purpose and mission.
- Target customers or stakeholders.
- Value proposition.
- Long-term direction.
- Business boundaries and constraints.
- Current strategic context.

## 5.2 Goal

Suggested sections:
- Desired result.
- Why it matters.
- Measurement or success criteria.
- Baseline, if known.
- Target and target date, if appropriate.
- Related vision and initiatives.
- Current confidence and understanding.

Goals should describe results rather than implementation activities.

## 5.3 Opportunity

Suggested sections:
- Problem or opportunity statement.
- Who experiences it.
- Current evidence.
- Potential business value.
- Known constraints.
- Assumptions and hypotheses.
- Alternatives considered.
- Related goals.
- Recommended next step.

An opportunity does not automatically become an initiative.

## 5.4 Initiative

Suggested sections:
- Problem being addressed.
- Intended business value.
- Originating opportunities.
- Related goals.
- Scope and boundaries.
- Expected outcomes and success criteria.
- Proposed approach.
- Feasibility and dependencies.
- Risks and assumptions.
- Relevant decisions.
- Linked technical specifications and implementation references.
- Current phase and iteration.

Statuses:

- `proposed`
- `approved`
- `in_progress`
- `paused`
- `completed`
- `cancelled`

The initiative status represents commitment or execution state, not lifecycle phase.

An initiative is a business investment. It is not necessarily equivalent to a project, task, release, or OpenSpec change. One initiative may involve multiple technical changes.

## 5.5 Decision

Suggested sections:
- Decision statement.
- Context and problem.
- Alternatives considered.
- Selected option.
- Rationale.
- Supporting and conflicting evidence.
- Consequences and trade-offs.
- Related goals, opportunities, and initiatives.
- Decision status.
- Supersession references.

Statuses:

- `proposed`
- `under_review`
- `accepted`
- `rejected`
- `deferred`
- `superseded`
- `revoked`

Only consequential decisions need formal BEF records.

Do not create a BEF Decision for every minor coding or implementation choice. Existing technical ADRs remain appropriate for detailed architecture decisions.

## 5.6 Outcome

Suggested sections:
- Related initiative and goals.
- Expected result.
- Actual result.
- Measurement period.
- Evidence and data sources.
- Difference between expectation and reality.
- Unexpected effects.
- Lessons learned.
- Recommendation: continue, expand, adjust, pause, stop, or investigate.

Do not assume an initiative succeeded simply because implementation was completed.

---

# 6. Record Format and Metadata

Use Markdown with YAML frontmatter.

Adapt the exact folder structure to repository conventions, but maintain stable IDs and consistent metadata.

Example:

```yaml
---
id: INI-001
type: initiative
title: Improve product discovery
status: proposed
phase: decide
iteration: 1
created: 2026-10-31
updated: 2026-10-31
related:
  goals:
    - GOL-001
  opportunities:
    - OPP-002
  decisions:
    - DEC-003
---
```

The date is illustrative.

Required common metadata:
- `id`
- `type`
- `title`
- `status`
- `created`
- `updated`

Where applicable:
- `phase`
- `iteration`
- `related`

Rules:
- IDs are unique, stable, and never reused.
- Status values must be valid for the artifact type.
- References must point to existing artifacts.
- Do not create large universal schemas with many unused fields.
- Keep metadata minimal and readable.
- Add fields only when an actual workflow requires them.

---

# 7. Decision Evolution

This is a mandatory framework capability.

Accepted decisions must never be silently overwritten.

When an accepted decision changes:

1. Create a new Decision record.
2. Explain the new context or evidence.
3. Reference the previous decision.
4. Explain what changed and why.
5. Mark the old decision as `superseded` or `revoked`.
6. Assess affected initiatives and linked records.

Example old decision:

```yaml
id: DEC-004
status: superseded
superseded_by:
  - DEC-009
```

Replacement:

```yaml
id: DEC-009
status: accepted
supersedes:
  - DEC-004
```

Distinguish:

- `rejected`: considered but not selected.
- `deferred`: not decided yet.
- `superseded`: previously accepted, subsequently replaced.
- `revoked`: withdrawn without replacement.

Historical decisions remain accessible.

A separate Decision Thread entity is not required.

Use references and a shared subject/context to group related decisions when needed.

---

# 8. Initiative Iterations and Backward Transitions

Iterations represent meaningful rounds of changed understanding or work.

Examples:
- Iteration 1: Initial opportunity assessment.
- Iteration 2: Customer research changes the proposed scope.
- Iteration 3: Technical investigation reveals a dependency.

Track the current iteration number on the Initiative.

When a new meaningful iteration begins:
- Increment the iteration.
- Explain why it began.
- Record what changed.
- Link new evidence and decisions.
- Preserve previous conclusions through Git history and explicit decision records.

Do not create a separate Iteration artifact.

## 8.1 Backward transition behavior

When a Deliver activity reveals that an earlier assumption is wrong:

- Identify the affected assumption or decision.
- Recommend revisiting Discover or Decide.
- Explain the reason.
- Assess downstream impact.
- Identify affected records.
- Preserve unaffected work.

Do not reset the initiative or invalidate all downstream artifacts automatically.

---

# 9. Evidence and Confidence

Evidence should be embedded in the relevant primary artifact, not maintained in a separate evidence management system.

Capture, where relevant:
- Description.
- Source or provenance.
- Observation date or period.
- What it supports or challenges.
- Limitations and possible bias.

Distinguish:

- Fact: directly established information.
- Assumption: treated as true without sufficient validation.
- Hypothesis: proposition that can be investigated.
- Recommendation: proposed course of action.
- Evidence: information supporting or challenging a proposition.
- Outcome: observed result.

Confidence may use:

- Very low
- Low
- Medium
- High
- Very high

Explain the reasoning behind confidence and disclose contradictory evidence.

Do not implement numerical confidence scores, weighted evidence algorithms, or an evidence-quality engine.

---

# 10. Git-First Persistence

Git is the persistence and history mechanism. BEF defines the meaning of the information.

Suggested logical structure:

```text
business/
├── vision.md
├── index.md
├── goals/
├── opportunities/
├── initiatives/
├── decisions/
└── outcomes/

specs/
└── ... existing technical specifications ...

architecture/
└── ... existing architecture documentation ...
```

This is a suggested structure, not a mandatory layout. Inspect the repository and choose an appropriate location.

Do not duplicate existing documentation.

## 10.1 Source-of-truth boundaries

| Information | Source of truth |
|---|---|
| Vision and goals | BEF |
| Opportunities and initiatives | BEF |
| Business decisions | BEF |
| Technical specifications | Existing technical specification workflow |
| Code and implementation | Source repository |
| Historical revisions | Git |
| Task execution | Existing task-management system |
| Evidence | Original source or recorded observation |
| Outcomes | BEF |

The index is navigational and may be generated. It is not an independent source of truth.

## 10.2 Validation

Implement a lightweight validation mechanism.

It must check:
- Required frontmatter.
- Valid artifact types and statuses.
- Unique IDs.
- Broken references.
- Valid decision supersession references.
- Supersession cycles.
- Valid initiative phase and iteration metadata.

Use existing repository tooling if suitable. Otherwise choose a minimal implementation compatible with existing conventions.

Do not introduce a database or framework service for validation.

---

# 11. Copilot Skill — Primary User Interface

Implement BEF as a Copilot skill using the repository's existing supported skill conventions.

First inspect existing skills and agent instructions. Reuse their structure and conventions.

The skill should be self-contained enough to guide an agent without requiring the user to repeatedly explain BEF.

## 11.1 Advisor responsibilities

The advisor must:

1. Understand user intent and current business context.
2. Read relevant BEF records before making recommendations.
3. Identify missing information and material assumptions.
4. Inspect the repository when technical feasibility or current capabilities matter.
5. Challenge weak assumptions and unrealistic proposals.
6. Explore alternatives and explain trade-offs.
7. Recommend the next useful action.
8. Create or update records only when justified.
9. Preserve decision history.
10. Revisit previous conclusions when new evidence appears.
11. Evaluate actual outcomes against expectations.

## 11.2 Conversational behavior

The advisor must not force every conversation through a fixed sequence.

Examples:

- User presents a vague idea: begin discovery and ask targeted questions.
- User asks about an existing opportunity: retrieve its record and continue from the existing context.
- User proposes a feature: determine whether it relates to an existing opportunity or goal.
- User asks about feasibility: investigate the repository and delegate where useful.
- User changes a previous decision: assess the impact and preserve history.
- User asks an unrelated technical question: answer without creating unnecessary BEF artifacts.

Do not ask for information already available in BEF records or repository context.

Do not create a record for every conversation.

## 11.3 Recommendation format

For consequential recommendations, communicate:

- Current understanding.
- Problem or opportunity.
- Evidence and assumptions.
- Options considered.
- Recommended option.
- Benefits and trade-offs.
- Risks and uncertainty.
- Related records.
- Proposed next action.

Clearly distinguish facts, assumptions, hypotheses, and recommendations.

## 11.4 Human authorization

The advisor may investigate, analyze, draft, and recommend.

It must not silently:
- Approve business investments.
- Commit budgets.
- Accept consequential decisions.
- Mark initiatives approved.
- Claim outcomes have been achieved without evidence.

Human authorization is required for consequential commitments.

---

# 12. Squad and MCP Integration

Integrate with the existing Squad setup. Do not create another orchestration layer.

## 12.1 Responsibility boundaries

| Component | Responsibility |
|---|---|
| BEF Advisor | Business reasoning, recommendations, lifecycle, and decisions |
| Squad | Agent orchestration and delegated investigations |
| Serena MCP | Code symbols, references, and implementation exploration |
| Codebase Memory MCP | Codebase knowledge and architectural context |
| PostgreSQL MCP | Database schema and data investigation |
| Git | Persistence, history, and review |
| OpenSpec | Optional technical change specification workflow |

## 12.2 Delegation contract

When delegating an investigation, provide:

- Objective.
- Relevant business context.
- Questions to answer.
- Repository/system scope.
- Constraints.
- Expected evidence and output.

Delegated agents must return:

- Findings.
- Relevant file paths, symbols, or database objects.
- Evidence and provenance.
- Assumptions and limitations.
- Technical implications.
- Unresolved questions.

The BEF Advisor synthesizes the findings into recommendations.

MCP results are evidence, not business authorization.

Agents must not independently approve strategic decisions or modify BEF records unless explicitly delegated to do so.

## 12.3 Selective MCP usage

Do not call every MCP server for every request.

Examples:
- Business idea exploration: usually no MCP needed.
- Existing capability investigation: Serena and Codebase Memory may help.
- Database impact investigation: PostgreSQL MCP may help.
- Broad architecture assessment: delegate targeted investigations through Squad.

BEF must continue to operate when MCP servers are unavailable. The advisor must disclose relevant limitations and must never fabricate investigation results.

---

# 13. OpenSpec Integration Boundary

OpenSpec is optional and is used for technical change specification and management.

BEF owns business intent and investment reasoning.

OpenSpec owns its technical change workflow.

Responsibility split:

| Concern | Owner |
|---|---|
| Why the business needs a change | BEF |
| Whether the opportunity deserves investment | BEF |
| Business goals and expected outcomes | BEF |
| Strategic and business decisions | BEF |
| Initiative scope and business requirements | BEF |
| Technical change proposal/specification | OpenSpec, when adopted |
| Code implementation | Existing development workflow |
| Actual business results | BEF |

Recommended workflow:

1. Discover and evaluate an opportunity in BEF.
2. Record the relevant decision.
3. Create or update the Initiative.
4. Use OpenSpec when structured technical change management is useful.
5. Link the OpenSpec change from the Initiative.
6. Implement through the existing development workflow.
7. Record the actual business outcome in BEF.

Rules:
- OpenSpec is not mandatory.
- One initiative may involve multiple OpenSpec changes.
- Do not copy OpenSpec tasks or specifications into BEF.
- Store links or paths to relevant OpenSpec artifacts.
- OpenSpec completion does not prove business success.
- BEF phase transitions must not depend on OpenSpec status.

For v1, implement only the conventions and links necessary to support this boundary. Do not build a synchronization engine.

---

# 14. MVP Scope

Implement only the following in this phase.

## Required

### Framework
- Four flexible phases.
- Six primary artifact types.
- Stable IDs and lightweight metadata.
- Simple artifact references.
- Decision evolution.
- Initiative iterations.
- Backward transition handling.
- Embedded evidence and assumptions.
- Outcome feedback.

### Repository foundation
- Markdown/YAML templates.
- Appropriate repository structure.
- Index/navigation.
- Validation script.
- Sample records demonstrating the lifecycle.

### Copilot
- Self-contained BEF skill.
- Discovery and opportunity assessment behavior.
- Decision support and history preservation.
- Initiative creation and revision.
- Evidence-aware reasoning.
- Outcome review.
- Repository inspection when relevant.
- Human authorization boundaries.

### Integration
- Existing Squad delegation conventions.
- Selective MCP usage.
- Optional OpenSpec references.

## Explicitly excluded from MVP

Do not implement:

- Dedicated BEF web application.
- Interactive dashboards.
- Visual dependency graphs.
- Timeline visualization.
- Multi-user approval workflows.
- Database-backed persistence.
- Framework API or SDK.
- Event sourcing.
- Graph database.
- Numerical evidence scoring.
- Autonomous business decision-making.
- Automatic OpenSpec synchronization.
- Portfolio analytics.
- Cross-project orchestration.

These are deferred until real usage demonstrates a need.

---

# 15. Acceptance Tests

The implementation must demonstrate the following behaviors.

| ID | Scenario | Expected result |
|---|---|---|
| AT-01 | User provides an incomplete business idea | Advisor begins discovery and asks relevant questions |
| AT-02 | User proposes an opportunity | Advisor evaluates problem, value, evidence, assumptions, and alternatives |
| AT-03 | Opportunity is not worth pursuing | Advisor can recommend rejection or deferral without creating an initiative |
| AT-04 | Initiative is approved | Initiative references relevant goals, opportunity, and decisions |
| AT-05 | Technical feasibility is unknown | Advisor delegates targeted investigation and synthesizes findings |
| AT-06 | MCP is unavailable | Advisor discloses the limitation and continues with available context |
| AT-07 | Accepted decision changes | New Decision supersedes the old one without losing history |
| AT-08 | Initiative scope changes materially | New meaningful iteration is recorded |
| AT-09 | Delivery invalidates an earlier assumption | Advisor recommends revisiting the appropriate phase |
| AT-10 | Only part of an initiative is affected | Unaffected records and work remain valid |
| AT-11 | Initiative uses OpenSpec | BEF links to technical change artifacts without duplication |
| AT-12 | OpenSpec is unavailable or unused | BEF continues operating normally |
| AT-13 | Initiative is completed | Advisor does not assume the business outcome succeeded |
| AT-14 | Actual results differ from expectations | Outcome records the deviation and informs future recommendations |
| AT-15 | Artifact reference is missing | Validation identifies the broken reference |
| AT-16 | Two artifacts have the same ID | Validation reports a duplicate ID |
| AT-17 | Accepted decision is edited in place | Advisor flags the violation and recommends explicit evolution |
| AT-18 | User asks an unrelated technical question | Advisor answers without creating unnecessary records |

Provide executable validation tests where practical. For advisor behaviors, provide repeatable test scenarios or documented manual test procedures.

---

# 16. Implementation Quality Requirements

- Follow existing repository conventions.
- Keep implementation modular but avoid unnecessary abstraction.
- Prefer simple, readable Markdown and YAML.
- Make templates understandable to both humans and agents.
- Make validation errors actionable.
- Avoid hardcoded absolute paths.
- Avoid unnecessary dependencies.
- Keep the framework portable across repositories.
- Do not assume a specific product domain.
- Do not create artificial sample business data that could be mistaken for real business information.
- Use clearly labeled illustrative examples.
- Preserve existing files and agent configurations.
- Do not silently change existing Squad or MCP behavior.
- Document any configuration changes.

The implementation should be usable by a developer who has never read the original BEF design discussion.

---

# 17. Required Deliverables

At completion, provide:

1. **Repository assessment**
   - Existing conventions and integration points.
   - Relevant existing agent/skill/Squad configuration.
   - Recommended BEF location.
   - Conflicts or constraints discovered.

2. **BEF framework foundation**
   - Four-phase definition.
   - Six artifact templates.
   - Metadata and status conventions.
   - Decision evolution and iteration rules.
   - Evidence and outcome conventions.

3. **Copilot skill**
   - Complete operating instructions.
   - Discovery and reasoning behavior.
   - Artifact creation and revision behavior.
   - Decision and history preservation.
   - Squad/MCP delegation contract.
   - OpenSpec boundary.

4. **Validation**
   - Validation script or equivalent.
   - Duplicate ID checks.
   - Reference integrity checks.
   - Decision supersession checks.
   - Tests and execution instructions.

5. **Sample lifecycle**
   - A clearly labeled illustrative example showing:
     Vision → Goal → Opportunity → Decision → Initiative → Outcome.
   - Demonstrate a changed decision and a subsequent initiative iteration.

6. **Documentation**
   - How to use BEF.
   - How to invoke the skill.
   - How records are created and maintained.
   - How to validate the repository.
   - How Squad, MCP, and OpenSpec fit into the framework.

7. **Implementation report**
   - Files created and modified.
   - Architecture decisions made.
   - Tests executed and results.
   - Acceptance criteria satisfied.
   - Deferred work.
   - Risks and unresolved questions.

---

# 18. Execution Instructions

Start with repository inspection, not implementation.

### Step 1 — Inspect

Explore:
- Repository structure.
- Existing documentation conventions.
- Existing Copilot skills and instructions.
- Squad configuration and agent definitions.
- MCP configuration.
- Existing OpenSpec usage, if any.
- Existing scripts and validation tooling.
- Existing technical specification conventions.

Do not assume that every referenced integration is already configured. Verify actual repository state.

### Step 2 — Assess

Produce a concise implementation assessment identifying:
- Where BEF should live.
- What existing components can be reused.
- What new files are required.
- What configuration needs modification.
- Potential conflicts or risks.
- Any genuine blockers.

### Step 3 — Plan

Present a phased implementation plan with:
- Deliverables.
- Files or areas affected.
- Dependencies.
- Validation strategy.

Avoid proposing application development or deferred features.

### Step 4 — Implement

After the assessment and plan, proceed incrementally with the MVP.

Do not wait for approval for routine, reversible implementation choices that are clearly within this brief.

Ask for clarification only when:
- A consequential architectural decision is genuinely ambiguous.
- Existing repository conventions conflict with the requirements.
- An action could break or replace existing functionality.
- Required permissions or external dependencies are unavailable.

### Step 5 — Validate

Run the available validation and tests.

Check the acceptance scenarios, including decision supersession, backward transitions, missing references, and outcome feedback.

### Step 6 — Report

Provide a concise but complete implementation report.

Clearly distinguish:
- Implemented.
- Tested.
- Partially implemented.
- Deferred.
- Blocked.
- Recommended next steps.

Do not claim an acceptance criterion passed unless it was actually validated.

---

# 19. Final Instruction

Think of BEF as a **small, durable business knowledge and decision system supported by an intelligent advisor**.

Its essential loop is:

**Vision → Goal → Opportunity → Decision → Initiative → Outcome → New learning**

The four phases guide reasoning. The six artifacts preserve meaningful business knowledge. Git preserves history. Copilot provides the advisor. Squad and MCP provide delegated investigation. OpenSpec optionally supports technical change management.

Keep those responsibilities separate.

Build the smallest implementation that makes this complete loop genuinely usable in the existing monorepo.

Challenge this specification if repository inspection reveals a real architectural problem. Explain the issue and propose the simplest correction. Do not blindly follow the document when it conflicts with the actual repository, but do not expand the scope merely because additional abstractions or features are technically possible.

**The goal is a useful, maintainable BEF MVP—not a framework platform.**