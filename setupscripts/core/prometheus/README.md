# Prometheus Service
 
This folder contains the Docker Compose setup for Prometheus, a metrics collection and alerting server.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for Prometheus.
- `prometheus.yml` - Main configuration file for scrape jobs and targets.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The Prometheus UI will be available at `http://localhost:9090`.
 
## Configuration
 
- **Port**: 9090
- **Container Name**: `prometheus`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Data Persistence**: Metrics are stored in `/data/prometheus` on the host. Ensure this directory exists and has appropriate permissions.
- **Custom Targets**: Edit `prometheus.yml` to add more scrape jobs for your internal services.
