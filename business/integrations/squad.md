# Squad Orchestration Integration (Optional)

This integration guide explains how BEF can optionally integrate with a multi-agent **Squad** setup (such as `@bradygaster/squad-cli`) when present in a repository.

Squad is an **optional orchestration enhancement**, not a framework dependency. BEF functions identically with or without Squad.

---

## 1. Role Division

| Responsibility | Handled By | Location |
|---|---|---|
| Business reasoning, investment decisions, outcomes | **BEF Advisor** | `business/` |
| Specialist execution, code implementation, test suites | **Squad Specialists** (e.g. architects, database engineers, UI designers) | `.squad/` & codebase |
| Persistent technical ADRs | **Squad Decisions** | `.squad/decisions/` |

---

## 2. Using Squad for Technical Investigations

When BEF requires deep technical feasibility assessments, the Advisor can delegate targeted tasks to Squad specialists using the Generic Technical Investigation Contract (Section 5 of `business/INSTRUCTIONS.md`).

### Example Delegation via Squad CLI or Subagent Script:
```bash
python3 scripts/invoke-subagent.py --agent bhishma-architect --task "Investigate caching layer impact for Opportunity OPP-001. Assess SearchApi memory usage."
```

### Synthesis:
The specialist agent returns technical findings, file references, and performance benchmarks. The BEF Advisor imports these findings into the appropriate `Evidence` and `Technical Feasibility` sections in BEF records.

---

## 3. Coexistence of Decisions

- **BEF Decisions (`business/decisions/`):** Consequential business, strategic, pricing, or product commitment decisions.
- **Squad Decisions (`.squad/decisions/inbox/`):** Implementation-level Architecture Decision Records (ADRs).
- **Linkage:** BEF initiatives link to technical ADRs via the `related.technical_adrs` frontmatter field. Neither replaces the other.
