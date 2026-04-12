# Infrastructure Design Standards
 
This document defines the architectural and organizational standards for all service-related entities in the `setupscripts` repository. Adherence to these rules is mandatory for any future service or container creation.
 
## 1. Directory Structure and Naming
All services must reside in their own dedicated directory at the repository root.
 
-   **Folder Name**: Must be lowercase and descriptive. Use kebab-case for multi-word names (e.g., `kafka`, `open-webui`).
-   **Internal Structure**:
    -   `docker-compose.yaml` (Required)
    -   `README.md` (Required)
    -   `setup.sh` (Optional: Host-side preparation script)
    -   `init.sh` (Optional: Container-side initialization script)
 
## 2. Docker Compose Standards
Every service folder must contain a `docker-compose.yaml` file to ensure standardized orchestration.
 
-   **Filename**: Always use `docker-compose.yaml` (not `.yml`).
-   **Network Isolation**: All services must join the shared `deeplens-network` to enable inter-communication.
-   **External Network Definition**: The network should be defined as external in each compose file:
    ```yaml
    networks:
      deeplens-network:
        external: true
    ```
-   **Container Naming**: Always provide a unique `container_name` for easy identification and internal DNS resolution.
 
## 3. Documentation Standards (README.md)
Every service folder must include a `README.md` following this hierarchy:
1.  **Service Title** (h1)
2.  **Overview**: Brief description of what the service does.
3.  **Files**: List of key files in the folder.
4.  **Running the Setup**: Clear `docker compose` instructions.
5.  **Configuration**: Ports, volumes, and critical environment variables.
6.  **Notes**: Any hardware requirements (e.g., GPU support) or special networking considerations.
 
## 4. Configuration and Secrets
-   **Shared Env**: Use the root `settings.env` for infrastructure-wide variables (data paths, server IPs).
-   **Local Env**: Use folder-specific `.env` files for secrets or service-specific configurations. Do not commit sensitive credentials to the repository.
 
## 5. Network Setup
The `deeplens-network` is a pre-requisite for all services.
-   **Creation**: Use the root `network_setup.sh` script to ensure the network exists before starting services.
-   **Discovery**: Once on the same network, services should communicate via their `container_name`.
 
## 6. Orchestration Layer
To manage the complexity of multiple service stacks, the repository uses a **Unified Orchestration** approach:
1.  **Root Compose**: A `docker-compose.yaml` in the root directory uses the `include` directive to link all modular service files.
2.  **Master CLI**: The `manage-stack.ps1` script provides a single-entry point for lifecycle management (Start, Stop, Status).
3.  **Project Naming**: All services must be part of the `deeplens-stack` project to ensure consistent naming and management.
 
---
**Note**: To ensure consistency, always refer to existing services (`kafka/`, `ollama/`, `postgres/`) as templates when creating new entities.
