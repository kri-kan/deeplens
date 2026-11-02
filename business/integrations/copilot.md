# GitHub Copilot & VS Code Integration (Optional)

This integration guide explains how BEF exposes its capabilities inside GitHub Copilot and VS Code environments.

GitHub Copilot is an **optional user interface adapter**, not a core BEF requirement.

---

## 1. Skill Wrapper Pattern

To expose BEF to GitHub Copilot or VS Code chat agents:
1. Create a skill definition file at `.squad/skills/business-evolution/SKILL.md` (or `.github/copilot-instructions.md`).
2. Keep the skill wrapper thin: delegate directly to the authoritative instructions in `business/INSTRUCTIONS.md`.

### Example Wrapper:
```markdown
---
name: business-evolution
description: Advisor for the Business Evolution Framework (BEF). Guides continuous business reasoning across Discover, Decide, Deliver, and Learn.
user-invocable: true
---

# Business Evolution Framework (BEF) Copilot Adapter

You are acting as the BEF Advisor.
The authoritative operating rules, phase protocols, artifact schemas, and decision evolution standards are documented in:
[business/INSTRUCTIONS.md](file:///home/krikan/productivity/deeplens/business/INSTRUCTIONS.md)

Follow all rules in `business/INSTRUCTIONS.md` strictly:
1. Read existing records in `business/` before proposing recommendations.
2. Maintain clean separation between Facts, Assumptions, Hypotheses, Recommendations, Evidence, and Outcomes.
3. Require explicit human authorization for accepting decisions or approving initiatives.
4. Evolve decisions using `supersedes` / `superseded_by` rather than in-place overwrites.
5. Validate records using `python3 scripts/validate-bef.py business`.
```
