Read `BEF-IMPLEMENTATION-BRIEF.md` completely. Treat it as the authoritative product and implementation brief for the Business Evolution Framework.

Follow an inspect-first, implement-incrementally approach.

**Phase 1 — Inspect and assess (do not modify files yet)**

Inspect the actual monorepo, including:
- Repository structure and conventions.
- Existing Copilot skills and agent instructions.
- Squad setup and agent definitions.
- MCP configuration.
- Existing OpenSpec usage, if any.
- Existing scripts, validation tooling, and technical specification conventions.

Then present:
1. Your understanding of BEF and its intended role.
2. Existing components and conventions that can be reused.
3. Recommended BEF location and integration architecture.
4. Phased MVP implementation plan.
5. Conflicts, risks, and necessary corrections to the brief.

**Phase 2 — Implement incrementally**

After presenting the assessment, proceed with implementation unless a genuine architectural decision or destructive change requires my input.

Implement in this order:

1. **Framework foundation:** Four phases, six artifact templates, metadata, statuses, relationships, decision evolution, iterations, evidence, and outcome conventions.
2. **Repository validation:** Validation script, reference integrity, duplicate IDs, decision supersession checks, and tests.
3. **Copilot skill:** Complete advisor instructions, artifact management, reasoning behavior, human authorization, and lifecycle handling.
4. **Squad and MCP integration:** Selective delegation contracts that reuse existing configuration without replacing orchestration.
5. **OpenSpec integration:** Optional linking conventions and documentation, without building a synchronization engine.
6. **End-to-end validation:** Sample lifecycle and acceptance tests covering the complete business reasoning loop.

After each major step:
- Summarize what was implemented.
- Identify files created or modified.
- Run relevant checks and tests.
- Report issues before proceeding if they affect the architecture or previously implemented functionality.

**Constraints:**
- Keep implementation within the MVP scope.
- Do not build a dedicated UI, database, API, SDK, or additional orchestration framework.
- Do not duplicate existing repository capabilities.
- Preserve existing functionality and conventions.
- Do not invent existing configurations or claim tests passed without executing them.
- Challenge the brief when repository evidence reveals a genuine architectural problem, but do not expand scope unnecessarily.

**Final deliverable:** A working, documented BEF MVP in the existing monorepo, with a complete implementation report mapping actual results to the acceptance criteria in `BEF-IMPLEMENTATION-BRIEF.md`.