# OpenSpec Technical Change Integration (Optional)

This integration guide explains how BEF coordinates with **OpenSpec** (or similar structured change specification frameworks) when adopted in a repository.

OpenSpec is an **optional technical change specification system**, not a BEF dependency.

---

## 1. Ownership & Boundary Separation

| Concern | Owner | Location |
|---|---|---|
| Business intent, strategic goals, investment justification | **BEF** | `business/` |
| Technical change specification, API diffs, engineering tasks | **OpenSpec** | `specs/` or `changes/` |
| Code changes and test execution | **Engineering** | `src/`, `tests/` |
| Empirical business results & retrospective learning | **BEF** | `business/outcomes/` |

---

## 2. Linking Conventions

BEF Initiatives cross-reference OpenSpec technical proposals via frontmatter:

```yaml
related:
  openspec:
    - "specs/changes/feat-instant-swatch-search.md"
```

---

## 3. Core Architectural Boundaries

- **No Synchronization Daemon:** BEF does NOT run background synchronizers or state mirrors.
- **OpenSpec is Purely Optional:** If OpenSpec is absent or uninstalled, BEF runs normally without warnings or missing-dependency errors.
- **Completion Does Not Equal Success:** Merging an OpenSpec change means implementation is finished; it does NOT mean the business outcome was achieved. Empirical retrospective verification in `OUT-xxx` is required.
