---
name: "docs-standards"
description: "Microsoft Style Guide + Squad-specific documentation patterns"
domain: "documentation"
confidence: "high"
source: "earned (PAO charter, multiple doc PR reviews)"
---

## Context

Squad documentation follows the Microsoft Style Guide with Squad-specific conventions. Consistency across docs builds trust and improves discoverability.

## Patterns

### Microsoft Style Guide Rules
- **Sentence-case headings:** "Getting started" not "Getting Started"
- **Active voice:** "Run the command" not "The command should be run"
- **Second person:** "You can configure..." not "Users can configure..."
- **Present tense:** "The system routes..." not "The system will route..."
- **No ampersands in prose:** "and" not "&" (except in code, brand names, or UI elements)

### Squad Formatting Patterns
- **Scannability first:** Paragraphs for narrative (3-4 sentences max), bullets for scannable lists, tables for structured data
- **"Try this" prompts at top:** Start feature/scenario pages with practical prompts users can copy
- **Experimental warnings:** Features in preview get callout at top
- **Cross-references at bottom:** Related pages linked after main content

### Structure
- **Title (H1)** → **Warning/callout** → **Try this code** → **Overview** → **HR** → **Content (H2 sections)**

### Test Sync Rule
- **Always update test assertions:** When adding docs pages to `features/`, `scenarios/`, `guides/`, update corresponding `EXPECTED_*` arrays in `test/docs-build.test.ts` in the same commit

## Examples

✓ **Correct:**
```markdown
# Getting started with Squad

> ⚠️ **Experimental:** This feature is in preview.

Try this:
\`\`\`bash
squad init
\`\`\`

Squad helps you build AI teams...

---

## Install Squad

Run the following command...
```

✗ **Incorrect:**
```markdown
# Getting Started With Squad  // Title case

Squad is a tool which will help users... // Third person, future tense

You can install Squad with npm & configure it... // Ampersand in prose
```

## Anti-Patterns

- Title-casing headings because "it looks nicer"
- Writing in passive voice or third person
- Long paragraphs of dense text (breaks scannability)
- Adding doc pages without updating test assertions
- Using ampersands outside code blocks

## Agent Documentation Responsibilities

Agents that create, update, or maintain documentation must follow these conventions so the squad stays synchronized:

- Read locations (where agents SHOULD look first):
  - `docs/` (root docs and subfolders), `DEEPLENS_GUIDE.md`, `docs/technical/` for design-level material
  - `infrastructure/` and `setupscripts/` for infra/runbooks and provisioning
  - `.squad/templates/` for canonical templates and skills (use these when authoring)
  - `src/*/README.md` and `src/*/SKILL.md` for service-specific docs
  - `infrastructure/.env.example` and `infrastructure/README.md` for credentials/ports guidance (read-only unless explicitly instructed)

- Write locations (where to persist changes):
  - Add or update pages under `docs/` or `docs/technical/` for user-facing and technical docs
  - Service-level READMEs under `src/<service>/README.md` for per-service runbooks
  - `.squad/decisions.md` for changes to documentation policy or conventions
  - Update agent-specific history (`.squad/agents/<agent>/history.md`) describing the change and rationale

- Process & guardrails:
  - Use the `templates/` content (especially `templates/skills/docs-standards/SKILL.md`) as the canonical style reference when authoring
  - Add frontmatter metadata to new docs: `title`, `author`, `date`, `tags` (include `docs` and area tags such as `observability`)
  - Run documentation tests / lint (if present) and update any `test/docs-build.*` expectations in the same commit
  - Create a Pull Request for non-trivial edits; small typos may be direct commits only with a short changelog entry
  - When updating infrastructure or credentials docs, mark them `DEVELOPMENT ONLY` if they contain secrets/credentials and never commit secrets
  - Record why the change was made in `.squad/agents/<agent>/history.md` and, if policy-level, add an entry to `.squad/decisions.md`

- Agent behavior on conflict:
  - If the target file has changed upstream, rebase and resolve conflicts locally, then open a PR
  - Notify `scribe` agent via the inbox if documentation edits affect cross-team workflows or SLAs

- Maintenance cadence:
  - Each agent should run a weekly check to verify links in the docs they own (or a monthly check if the agent is low-traffic)
  - Report broken links or outdated examples to the squad issue tracker and tag them `docs`

Following these rules makes documentation edits discoverable, reviewable, and auditable by the squad.
