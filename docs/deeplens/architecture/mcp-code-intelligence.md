# Model Context Protocol (MCP) Code Intelligence Architecture

**Document Version:** 1.0.0  
**Target Audience:** AI Coding Agents, Squad Orchestrators, Platform Engineers  
**Target System:** DeepLens Monorepo (`/home/krikan/productivity/deeplens`) & Squad Hub (`/home/krikan/productivity/deeplensSquad`)  
**Last Updated:** August 2026

---

## 1. Executive Overview

Modern AI development within complex multi-language monorepos requires structured context retrieval rather than brute-force file scanning. DeepLens implements a three-tier **Model Context Protocol (MCP)** capability layer designed to deliver deterministic, high-precision code and schema intelligence:

1. **Repository Intelligence (DeusData Codebase Memory)**: Structural indexing, file clustering, and cross-project knowledge navigation.
2. **Semantic Code Intelligence (Serena MCP)**: Language Server Protocol (LSP) backed symbol definition, cross-file reference tracking, and type hierarchy traversal across C#, TypeScript, and Python.
3. **Database Intelligence (CrystalDBA Postgres MCP)**: Schema introspection, foreign key mapping, and constrained query execution under strict read-only security boundaries.
4. **Squad Governance & Orchestration (`squad_state` & `azure-devops`)**: Stateful agent coordination, ADO work item management, and session auditing.

```mermaid
graph TD
    User([Developer / AI Agent Prompt]) --> Router{MCP Router / Tool Selector}

    subgraph Capability_Profiles ["MCP Capability Layer"]
        subgraph Profile_Repo ["Profile 1: Repository Intelligence"]
            CBM["DeusData Codebase Memory<br/>(codebase-memory-mcp)"]
            CBM_Config[".codebase-memory.json<br/>.cbmignore"]
        end

        subgraph Profile_Semantic ["Profile 2: Semantic Code Intelligence"]
            Serena["Serena MCP<br/>(oraios/serena)"]
            LSP_CS["csharp-ls (.NET 9)"]
            LSP_TS["typescript-language-server"]
            LSP_PY["pyright (FastAPI)"]
        end

        subgraph Profile_DB ["Profile 3: Database Intelligence"]
            PGMCP["Postgres MCP<br/>(crystaldba/postgres-mcp)"]
            RestrictedMode["--access-mode=restricted<br/>PostgreSQL 18 :5432"]
        end
    end

    Router -->|Structural queries / File discovery| CBM
    Router -->|Symbol definitions / Callers / Types| Serena
    Router -->|Schema introspection / Column types| PGMCP

    Serena --> LSP_CS
    Serena --> LSP_TS
    Serena --> LSP_PY
```

---

## 2. Server Configurations & Manifest Reference

DeepLens defines its MCP servers inside [`file:///home/krikan/productivity/deeplens/.mcp.json`](file:///home/krikan/productivity/deeplens/.mcp.json).

```json
{
  "mcpServers": {
    "squad_state": {
      "command": "npx",
      "args": [
        "-y",
        "@bradygaster/squad-cli@0.11.0",
        "state-mcp"
      ],
      "env": {},
      "tools": ["*"]
    },
    "codebase_memory": {
      "command": "npx",
      "args": [
        "-y",
        "codebase-memory-mcp"
      ],
      "env": {
        "CBM_PROJECT_DIR": "${DEEPLENS_ROOT:-/home/krikan/productivity/deeplens}"
      },
      "tools": ["*"]
    },
    "serena": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--project",
        "${DEEPLENS_ROOT:-/home/krikan/productivity/deeplens}"
      ],
      "env": {},
      "tools": ["*"]
    },
    "postgres": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--network=deeplens-network",
        "-e",
        "DATABASE_URI",
        "crystaldba/postgres-mcp",
        "--access-mode=restricted"
      ],
      "env": {
        "DATABASE_URI": "${DATABASE_URI:-postgresql://postgres:postgres@localhost:5432/deeplens}"
      },
      "tools": ["*"]
    }
  }
}
```

---

## 3. Capability Profiles & Server Specifications

### 3.1 Profile 1: Repository Intelligence (`codebase_memory`)
- **Underlying Engine:** DeusData `codebase-memory-mcp`.
- **Configuration Manifest:** [`.codebase-memory.json`](file:///home/krikan/productivity/deeplens/.codebase-memory.json)
- **Exclusion Manifest:** [`.cbmignore`](file:///home/krikan/productivity/deeplens/.cbmignore)
- **Primary Capabilities:**
  - Fast indexing and natural language symbol/topic querying across 11+ supported languages (C#, TypeScript, JavaScript, Python, SQL, JSON, YAML, Markdown, Bash).
  - Graph-based file relationships and contextual clustering.
  - Automatic detection of project boundaries (`.sln`, `package.json`, `pyproject.toml`).
- **Configuration Spec:**
```json
{
  "$schema": "https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/schema.json",
  "project_name": "deeplens",
  "languages": ["csharp", "typescript", "javascript", "python", "sql", "json", "yaml", "markdown", "html", "css", "bash"],
  "extra_extensions": {
    ".props": "xml", ".targets": "xml", ".csproj": "xml", ".sln": "plaintext", ".proto": "protobuf", ".sql": "sql", ".sh": "bash"
  },
  "index": {
    "auto_index": true,
    "max_file_size_kb": 2048,
    "follow_symlinks": false
  }
}
```

### 3.2 Profile 2: Semantic Code Intelligence (`serena`)
- **Underlying Engine:** `oraios/serena` Language Server Protocol bridge.
- **Configuration Manifest:** [`.serena/project.yml`](file:///home/krikan/productivity/deeplens/.serena/project.yml)
- **Supported Language Servers:**
  - **C# (.NET 9):** `csharp-ls` targeting `src/DeepLens.Service/DeepLens.sln` and `src/NextGen.Identity/NextGen.Identity.sln`.
  - **TypeScript:** `typescript-language-server` targeting `src/vayyari/tsconfig.json`, `src/store/tsconfig.json`, and root `tsconfig.json`.
  - **Python:** `pyright` targeting `src/DeepLens.ReasoningService` and `src/DeepLens.FeatureExtractionService`.
- **Primary Capabilities:**
  - Exact symbol definition resolution (`Go to Definition`).
  - Cross-project symbol reference tracking (`Find All References`).
  - Type hierarchy inspection (Derived classes, Interface implementations).
  - Method caller and callee graph resolution.
  - Refactoring and symbol rename validation across project boundaries.

### 3.3 Profile 3: Database Intelligence (`postgres`)
- **Underlying Engine:** `crystaldba/postgres-mcp` running in isolated Docker container.
- **Network Access:** Connected directly to `deeplens-network` targeting PostgreSQL 18 (`krikanpg:5432`).
- **Security Constraint:** Enforces `--access-mode=restricted` (Blocks all `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, and `TRUNCATE` operations; allows only read-only introspection and bounded `SELECT` statements).
- **Primary Capabilities:**
  - `describe_table`: Returns precise column names, PostgreSQL data types, nullability, defaults, and foreign key constraints.
  - `list_tables`: Enumerates public, `wa`, and custom schemas.
  - `explain_query`: Provides query plan cost estimates for performance optimization.
  - `execute_query`: Runs bounded read-only analytical queries against `deeplens_platform` and `nextgen_identity`.

---

## 4. Anti-Patterns vs Recommended Investigation Workflows

### 4.1 Anti-Patterns (The "Context Sprawl" Pitfall)

| Anti-Pattern | Description | Why It Fails / Damages Context |
| :--- | :--- | :--- |
| **Broad Grep Sprawl** | Running unbounded regex searches (`grep_search` with generic queries like `Product` or `status`) across the entire monorepo. | Floods context window with 50+ irrelevant hits across build artifacts (`bin/`, `obj/`, `node_modules/`, SQL dumps). Consumes tokens and causes hallucination. |
| **Recursive Directory Flooding** | Calling `list_dir` on root or `src/` without depth boundaries. | Generates thousands of lines of file listings that provide zero semantic understanding of how code executes. |
| **Blind Guessing / Trial-and-Error Editing** | Modifying DTOs or database columns without verifying backend and frontend bindings. | Violates DTO camelCase standards and introduces runtime JSON serialization mismatch bugs. |
| **Direct Production Mutation via MCP** | Attempting DDL or DML mutations through database tools without running formal SQL migration scripts. | Causes schema drift and breaks synchronization with `setupscripts/migrations/`. |

### 4.2 Recommended Multi-Tier Investigation Workflow

To minimize token usage and maximize response accuracy, agents MUST follow the **Targeted Investigation Funnel**:

```mermaid
graph TD
    Step1["Step 1: Broad Discovery<br/>(DeusData Codebase Memory)"] -->|Locate relevant projects & modules| Step2["Step 2: Semantic Symbol Traversal<br/>(Serena LSP)"]
    Step2 -->|Resolve interfaces, implementations & references| Step3["Step 3: Schema Verification<br/>(Postgres MCP)"]
    Step3 -->|Verify table structures & column constraints| Step4["Step 4: Surgical File Inspection<br/>(view_file / replace_file_content)"]
    
    style Step1 fill:#2d3748,stroke:#4a5568,color:#fff
    style Step2 fill:#2b6cb0,stroke:#3182ce,color:#fff
    style Step3 fill:#2f855a,stroke:#38a169,color:#fff
    style Step4 fill:#975a16,stroke:#d69e2e,color:#fff
```

1. **Step 1: Structural Discovery (Codebase Memory)**
   - Query topic or feature to locate the specific solution, project, or file cluster.
   - *Example:* "Where are WhatsApp incoming media attachments stored and queued?"
2. **Step 2: Semantic Traversal (Serena LSP)**
   - Jump directly to the symbol definition, interface contract, or caller graph without reading whole directories.
   - *Example:* Jump from `IProductRepository` to `ProductRepository.cs` and find references in `DeepLens.SearchApi`.
3. **Step 3: Schema Validation (Postgres MCP)**
   - Introspect the database schema to check data types, nullability, and foreign key relations before writing queries or DTOs.
   - *Example:* Run `describe_table("seller_listings")` to confirm whether `price` is `numeric` or `integer`.
4. **Step 4: Surgical Inspection & Edit (Native Tools)**
   - View only the specific line range needed (`view_file` with `StartLine`/`EndLine`) and apply contiguous diffs using `replace_file_content`.

---

## 5. Tool Selection Decision Matrix

Use this matrix to determine the optimal tool for any software engineering task:

| Developer / Agent Intent | Primary Tool | Secondary / Verification Tool | Inefficient / Banned Approach |
| :--- | :--- | :--- | :--- |
| **Locating unfamiliar feature implementation** | `codebase_memory` search | `find_by_name` (filtered by dir) | Unfiltered monorepo `grep_search` |
| **Finding all callers of a C# method** | `serena` (`find_references`) | `DeepLens.ArchitectureTests` | Regex search across `.cs` files |
| **Checking TypeScript interface definition** | `serena` (`get_definition`) | `view_file` (specific slice) | Reading entire `types.ts` (1000+ lines) |
| **Inspecting PostgreSQL table columns** | `postgres` (`describe_table`) | `setupscripts/migrations/*.sql` | Guessing column names from code |
| **Validating SQL query syntax/plan** | `postgres` (`explain_query`) | None | Running raw SQL blindly |
| **Managing ADO User Stories/Bugs** | `azure-devops` MCP | ADO Web UI | Creating orphaned Git commits |
| **Building/Deploying backend service** | [`infrastructure/deploy.sh`](file:///home/krikan/productivity/deeplens/infrastructure/deploy.sh) | `docker compose ps` | Manual `dotnet publish` & manual copy |

---

## 6. Memory Portability Model (Committed vs Rebuildable)

To maintain clean Git repositories while ensuring instant agent productivity across machines, DeepLens enforces strict boundaries between committed metadata and rebuildable artifacts:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMMITTED TO GIT (Permanent)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  • .mcp.json                         (Universal MCP server definitions)     │
│  • .codebase-memory.json             (Indexing rules, language extensions)   │
│  • .cbmignore                        (Exclusion patterns for indexing)      │
│  • .serena/project.yml               (LSP solution and tsconfig paths)      │
│  • setupscripts/migrations/*.sql     (Permanent schema migration ledgers)   │
│  • docs/architecture/*.md            (Authoritative architectural documentation)│
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EPHEMERAL / REBUILDABLE (Gitignored)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  • .codebase-memory/                 (Local SQLite index database)          │
│  • .serena/cache/                    (LSP AST & symbol cache)               │
│  • .ts-graph-mcp/                    (Temporary dependency graph dumps)     │
│  • obj/ , bin/ , dist/ , node_modules/ (Build artifacts)                    │
│  • data/whatsapp/                    (Local WhatsApp session auth keys)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Portability Guarantees
- Any developer or AI agent cloning the repository can immediately launch all MCP servers using standard commands (`npx`, `uvx`, `docker`).
- If `.codebase-memory/` or Serena caches become stale or corrupt, deleting them triggers an automatic, idempotent re-index without losing repository state.

---

## 7. Security and Secret Handling Rules

All MCP servers and interacting agents MUST adhere to enterprise security protocols:

### 7.1 Database Security Rules
1. **Restricted Mode Mandate:** The `postgres` MCP server must always execute with `--access-mode=restricted`. Agents are prohibited from modifying server arguments to bypass this restriction.
2. **Migration Discipline:** All schema modifications must occur via versioned SQL files in [`setupscripts/migrations/`](file:///home/krikan/productivity/deeplens/setupscripts/migrations) and executed through deployment runbooks, never via direct agent SQL manipulation.
3. **No PII Exposure:** Never query or log plain-text passwords, session cookies, or customer phone numbers in tool responses.

### 7.2 Secret & Credential Handling
1. **Zero Secret Commits:** Real production secrets, Meta Graph API tokens, Infisical tokens, and MinIO root credentials must never be committed to Git or embedded in MCP configuration manifests.
2. **Environment Variable References:** All sensitive configuration values in `.mcp.json` and Docker Compose manifests must use environment variable expansions (`${VAR_NAME:-default}`).
3. **Log Sanitization:** When reporting output from `deploy.sh` or Docker logs, redact database passwords (`Krikank1$`) and JWT private signing keys.

---

## 8. Related Architectural Specifications

- [**DeepLens AI Monorepo Architecture**](file:///home/krikan/productivity/deeplens/docs/architecture/ai-monorepo-architecture.md) - Complete system and microservices layout.
- [**Squad Agent MCP Guide**](file:///home/krikan/productivity/deeplensSquad/.squad/docs/mcp-code-intelligence-guide.md) - Squad agent operational playbook and query recipes.
- [**ADO Work Item & MCP Protocol Reference**](file:///home/krikan/productivity/deeplensSquad/.squad/docs/ado-work-item-and-mcp-reference.md) - Azure DevOps MCP tool documentation.
- [**DTO Standards Guide**](file:///home/krikan/productivity/deeplens/docs/architecture/dto_standards.md) - Contract serialization requirements.
