# DeepLens Infrastructure & Application Stack

A modular, configuration-driven ecosystem for orchestrating DeepLens services. This repository is organized into distinct layers for infrastructure (core) and application-specific components.

## 📂 Project Structure

- **`core/`**: Infrastructure, databases, AI compute (Ollama), and observability stack.
- **`application/`**: Application-specific logic and specialized workers.
- **`server/`**: Documentation and setup guides for the host environment.
- **`tests/`**: Located inside `core/tests/`, these validate infrastructure stability.
- **`.env`**: Centralized configuration and secrets for the entire stack.

---

## 🚀 Core Infrastructure Management

All infrastructure services (Postgres, Kafka, Grafana, etc.) are managed via the orchestrator scripts located in the `core/` directory.

### Global Commands
Run these from the project root:

| Command | Action |
| :--- | :--- |
| `bash setupscripts/core/orchestrate-linux.sh start` | Initializes network and starts all core services |
| `bash setupscripts/core/orchestrate-linux.sh status` | Checks health of the core infrastructure |
| `bash setupscripts/core/orchestrate-linux.sh validate` | Performs deep health checks (ports, HTTP, logs) |
| `bash setupscripts/core/orchestrate-linux.sh stop` | Shuts down the core stack safely |
| `bash setupscripts/core/orchestrate-linux.sh clean` | Prunes unused Docker objects |

### Single Service Operations
Target specific core services:

- **Start Kafka ONLY**: `bash setupscripts/core/orchestrate-linux.sh start kafka-prod`
- **Follow Redis Logs**: `bash setupscripts/core/orchestrate-linux.sh logs redis`
- **Reset Postgres DB**: `bash setupscripts/core/postgres/manage-db.sh Reset`

---

## 🤖 Application Layer

Application services are hosted in the `application/` folder. These can be managed independently using the local `docker-compose.yaml`.

- **Start App Layer**: `cd setupscripts/application && docker compose up -d`
- **Sub-Services**:
    - **`services/`**: Core AI reasoning, feature extraction, and competitor workers.
    - **`whatsapp/`**: Multi-tenant WhatsApp processing instances.

---

## 🧪 Testing & Validation

To ensure the core infrastructure is stable and all dependencies (networking, volumes, auth) are correct, run the automated test suite:

```bash
bash setupscripts/core/tests/test-orchestrator.sh
```

---

## 🛡️ Standards & Governance

- **Networking**: All services (Core & App) connect via the `deeplens-network`.
- **Configuration**: All paths and credentials are centrally managed in the root `.env` file.
- **Persistence**: Host-based bind mounts are used for all database and logging data.

For detailed setup instructions, see [server/basicSetup.md](./server/basicSetup.md).
For troubleshooting, see [TROUBLESHOOT.md](./TROUBLESHOOT.md).
