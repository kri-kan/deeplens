# Docs Routing & Ownership

This file tells squad agents where to read, write and maintain documentation. Agents should consult `templates/skills/docs-standards/SKILL.md` for style rules before writing.

Read first:
- `docs/` and `docs/technical/` — canonical user and technical docs
- `DEEPLENS_GUIDE.md`, `infrastructure/README.md`, `infrastructure/.env.example` — infra runbooks and port/credential references
- `setupscripts/` and `setupscripts/core/` — provisioning, compose files, and runtime configs
- `src/<service>/README.md` and `src/*/SKILL.md` — per-service docs and operating notes
- `.squad/templates/` — templates and policy guides

Write locations and ownership:
- Docs: `docs/` and `docs/technical/` (Docs owners and Docs agents)
- Service READMEs: `src/<service>/README.md` (service owners)
- Infra runbooks: `infrastructure/` and `setupscripts/core/` (platform/infra agents only)
- Squad policy: `.squad/decisions.md`, `.squad/agents/<agent>/history.md` (Scribe coordinates merges)

Guardrails:
- Never commit secrets. If a file appears to contain secrets, stop and notify the user.
- Add frontmatter (title, author, date, tags) to new docs.
- Run doc lint/tests if present and update expectations in the same commit.
- For policy-level changes, append an entry to `.squad/decisions.md` and notify Scribe.

Example agent action (doc update):
1. Read `templates/skills/docs-standards/SKILL.md` and `templates/docs-routing.md`.
2. Edit or create `docs/technical/OBSERVABILITY.md` with frontmatter.
3. Run doc checks (`npm run docs:lint` or repository test if available).
4. Commit and open PR, or create a direct commit for tiny typo fixes.
5. Append change summary to `.squad/agents/<agent>/history.md` and notify Scribe.

This file is authoritative for agent doc routing. Update via a PR to change agent behavior.