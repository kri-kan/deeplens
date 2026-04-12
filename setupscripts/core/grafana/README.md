# Grafana Service
 
This folder contains the Docker Compose setup for Grafana, the main visualization dashboard.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for Grafana.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The Grafana UI will be available at `http://localhost:3000`.
 
## Configuration
 
- **Port**: 3000
- **Container Name**: `grafana`
- **Default Credentials**: `krikan` / `Krikank1$`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Data Persistence**: Dashboards and configurations are stored in `/data/grafana` on the host. Ensure this directory exists and has appropriate permissions (UID 472).
