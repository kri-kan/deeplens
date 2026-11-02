# Business Evolution Framework (BEF) Index

Welcome to the Business Evolution Framework catalog for DeepLens.

BEF is a standalone, Git-first business reasoning and evolution framework. It operates independently of any specific agent framework, AI tooling, orchestration system, or IDE extension.

## Documentation & Core Instructions

- **[INSTRUCTIONS.md](file:///home/krikan/productivity/deeplens/business/INSTRUCTIONS.md)**: **Authoritative agent-agnostic operating instructions**, reasoning loops, lifecycle phases, and evidence taxonomy.
- **[BEF-IMPLEMENTATION-BRIEF.md](file:///home/krikan/productivity/deeplens/business/BEF-IMPLEMENTATION-BRIEF.md)**: Original product brief and architectural requirements.
- **[BEF_ACCEPTANCE_VERIFICATION.md](file:///home/krikan/productivity/deeplens/business/BEF_ACCEPTANCE_VERIFICATION.md)**: Acceptance test compliance report (AT-01 through AT-18).

---

## Active Business Records

| Section | Description | Active Directory | ID Prefix |
|---|---|---|---|
| **Vision** | Authoritative long-term product vision | [vision.md](file:///home/krikan/productivity/deeplens/business/vision.md) | `VIS` |
| **Goals** | Measurable strategic results | [goals/](file:///home/krikan/productivity/deeplens/business/goals) | `GOL` |
| **Opportunities** | Problems, unmet needs, or improvements | [opportunities/](file:///home/krikan/productivity/deeplens/business/opportunities) | `OPP` |
| **Decisions** | Consequential business & investment choices | [decisions/](file:///home/krikan/productivity/deeplens/business/decisions) | `DEC` |
| **Initiatives** | Selected investment packages & scope | [initiatives/](file:///home/krikan/productivity/deeplens/business/initiatives) | `INI` |
| **Outcomes** | Empirical retrospective findings & metrics | [outcomes/](file:///home/krikan/productivity/deeplens/business/outcomes) | `OUT` |

---

## Standard Templates

Canonical YAML + Markdown templates reside in [templates/](file:///home/krikan/productivity/deeplens/business/templates):
- [vision.md](file:///home/krikan/productivity/deeplens/business/templates/vision.md)
- [goal.md](file:///home/krikan/productivity/deeplens/business/templates/goal.md)
- [opportunity.md](file:///home/krikan/productivity/deeplens/business/templates/opportunity.md)
- [decision.md](file:///home/krikan/productivity/deeplens/business/templates/decision.md)
- [initiative.md](file:///home/krikan/productivity/deeplens/business/templates/initiative.md)
- [outcome.md](file:///home/krikan/productivity/deeplens/business/templates/outcome.md)

---

## Reference Examples

A complete, self-contained illustrative lifecycle is available in [examples/](file:///home/krikan/productivity/deeplens/business/examples):
- [GOL-LENS-001.md](file:///home/krikan/productivity/deeplens/business/examples/GOL-LENS-001.md)
- [OPP-LENS-001.md](file:///home/krikan/productivity/deeplens/business/examples/OPP-LENS-001.md)
- [DEC-LENS-001.md](file:///home/krikan/productivity/deeplens/business/examples/DEC-LENS-001.md) (superseded)
- [DEC-LENS-002.md](file:///home/krikan/productivity/deeplens/business/examples/DEC-LENS-002.md) (successor)
- [INI-LENS-001.md](file:///home/krikan/productivity/deeplens/business/examples/INI-LENS-001.md) (iterations 1 & 2)
- [OUT-LENS-001.md](file:///home/krikan/productivity/deeplens/business/examples/OUT-LENS-001.md) (outcome & learnings)

---

## Optional Integrations (Pluggable)

BEF includes guides for connecting with optional tools without creating core dependencies:
- [generic-agent.md](file:///home/krikan/productivity/deeplens/business/integrations/generic-agent.md): Operating BEF with any LLM, CLI, or coding assistant.
- [copilot.md](file:///home/krikan/productivity/deeplens/business/integrations/copilot.md): Exposing BEF inside GitHub Copilot and VS Code.
- [squad.md](file:///home/krikan/productivity/deeplens/business/integrations/squad.md): Delegating technical investigations to Squad multi-agent teams.
- [mcp.md](file:///home/krikan/productivity/deeplens/business/integrations/mcp.md): Grounding evidence with optional Model Context Protocol servers.
- [openspec.md](file:///home/krikan/productivity/deeplens/business/integrations/openspec.md): Linking technical change proposals without synchronization engines.

---

## Tooling & Validation

To validate repository consistency, broken references, duplicate IDs, and decision evolution:
```bash
python3 scripts/validate-bef.py business
```
