# Contributing to DeepLens

Thank you for contributing to DeepLens! To maintain a high-quality codebase and documentation, please follow these guidelines.

## 🤝 Code of Conduct
Be respectful and professional in all interactions.

## 🛠️ Development Standards

### 1. Code Quality
- Follow the Clean Architecture patterns established in the project.
- Ensure all new features are covered by basic integration tests.
- Use meaningful variable and function names.

### 2. Documentation (Crucial)
Documentation is as important as code. When you add or change a feature:
1. **Update the technical docs** in `docs/technical/` (e.g., API reference, Database standards).
2. **Add/Update ADRs** in `docs/architecture/adr/` if you make a significant design decision.
3. **Keep the READMEs current**. If you add a new service, update the root `README.md` and `docs/README.md`.

### 3. AI Assistant Optimization
Since many developers use AI assistants (Copilots, Agents), please:
- Add descriptive comments to complex logic.
- Keep `.cursorrules` updated with any new global patterns or infrastructure changes.
- Ensure `docs/README.md` remains the "Source of Truth" for system context.

### 4. Git Workflow
- Create a feature branch for your changes: `feature/your-feature-name`.
- Use descriptive commit messages.
- Open a Pull Request (PR) and link any related issues.

## 🏗️ Architecture Decision Records (ADRs)
If you propose a change to the core architecture (e.g., switching from Kafka to RabbitMQ, or changing the multi-tenancy model), you MUST create a new ADR in `docs/architecture/adr/`.
Follow the template:
- **Title**: brief description.
- **Status**: Proposed / Accepted / Superseded.
- **Context**: Why are we doing this?
- **Decision**: What did we decide?
- **Consequences**: What are the trade-offs?

## 🚀 Sustainable Documentation Plan
To prevent documentation rot:
- Always run a `find . -name "*.md"` occasionally to check for stray/duplicate docs.
- Consolidate new findings into the `docs/` hierarchy rather than creating root-level files.
- If a document is no longer accurate, move it to `docs/archive/` instead of deleting it, unless it's completely redundant.
