# Model Context Protocol (MCP) Integration (Optional)

This integration guide explains how Model Context Protocol (MCP) servers can optionally provide technical evidence to the BEF Advisor.

MCP servers are **optional capability providers**. BEF has zero mandatory MCP dependencies and remains 100% operational when no MCP servers are configured or when configured servers are offline.

---

## 1. How MCP Enhances the Advisor

When available in the host environment, MCP servers provide grounded technical context during the **Discover** and **Decide** phases:

- **Codebase Memory / Semantic Indexing MCP:** Provides high-level architecture maps and service topology to help define initiative scope.
- **Language Server Protocol (LSP) MCP (e.g. Serena):** Provides compiler-grade symbol references and type signatures to determine if existing endpoints or data structures satisfy a new business requirement.
- **Database Introspection MCP (e.g. PostgreSQL MCP):** Allows querying schema definitions, row counts, and existing indexes to ground feasibility estimates in real database facts.

---

## 2. Resiliency & Offline Protocol (Zero Dependency)

If any or all MCP servers are unavailable or fail to start:
1. **Graceful Fallback:** The Advisor proceeds using standard file system inspection (grepping code, reading migration files, examining documentation).
2. **Transparent Disclosure:** The Advisor informs the user:
   > *"Note: MCP servers are currently offline. Technical feasibility assessment is grounded in static repository files and migration scripts."*
3. **No Hallucination:** The Advisor must NEVER fabricate or invent technical details or query results when tools are offline.
