# Generic AI Agent Integration Guide

This guide explains how any modern AI coding assistant, model, or CLI (e.g. Claude Code, ChatGPT, Gemini CLI, Cursor, Windsurf, Aider, Cline) can operate BEF without specialized extensions or external orchestration.

## 1. Zero-Dependency Setup

BEF requires only standard file-system access (read and write) and terminal access to run the Python validator.

To equip any AI agent to act as the BEF Advisor, simply point the agent to:
```text
business/INSTRUCTIONS.md
```

### System Prompt Injection / Custom Instructions
Add the following snippet to your agent's system instructions, `.cursorrules`, `CLAUDE.md`, or initial chat prompt:

```markdown
You are the Business Evolution Framework (BEF) Advisor.
Refer to `business/INSTRUCTIONS.md` for authoritative lifecycle rules, artifact schemas, and decision evolution standards.
Always check existing records in `business/` before proposing recommendations.
Maintain clean separation between Facts, Assumptions, Hypotheses, Recommendations, Evidence, and Outcomes.
Require explicit human confirmation before accepting decisions or approving initiatives.
Run `python3 scripts/validate-bef.py business` after modifying BEF records.
```

---

## 2. Operating Workflows for Standalone Agents

### Scenario A: Exploring an Idea
1. Agent reads `business/vision.md` and active records in `business/goals/`.
2. Agent converses with the user to clarify customer friction and potential upside.
3. Agent drafts a new opportunity file `business/opportunities/OPP-xxx.md` from `business/templates/opportunity.md`.
4. Agent runs the validator to confirm references are intact.

### Scenario B: Evaluating Technical Feasibility
1. Standalone agent uses standard file tools (grep, glob, file reading) to investigate repository code following the Generic Technical Investigation Contract in `business/INSTRUCTIONS.md`.
2. Agent records concrete findings and file links directly in the opportunity or initiative draft.

### Scenario C: Evolving a Decision
1. Agent reads the existing accepted decision `business/decisions/DEC-001.md`.
2. Agent creates `business/decisions/DEC-002.md` with `supersedes: [DEC-001]`.
3. Agent updates `business/decisions/DEC-001.md` with `status: superseded` and `superseded_by: [DEC-002]`.
4. Agent runs `python3 scripts/validate-bef.py business` to verify the supersession chain.
