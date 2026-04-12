# Loki Service
 
This folder contains the Docker Compose setup for Loki, a log aggregation and search system.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for Loki.
- `loki-config.yaml` - Main configuration file for indexing and storage rules.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
Loki is typically accessed as a data source within Grafana at `http://loki:3100`.
 
## Configuration
 
- **Port**: 3100
- **Container Name**: `loki`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Data Persistence**: Logs are stored in `/data/loki` on the host. Ensure this directory exists and has appropriate permissions.
