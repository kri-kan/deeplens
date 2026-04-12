# InfluxDB Service
 
This folder contains the Docker Compose setup for InfluxDB, a time-series database.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for InfluxDB.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The InfluxDB UI will be available at `http://localhost:8086`.
 
## Configuration
 
- **Port**: 8086
- **Container Name**: `influxdb`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Data Persistence**: Data is stored in `/data/influxdb` on the host. Ensure this directory exists and has appropriate permissions.
- **Initialization**: On first run, you will be prompted to set up an initial user, organization, and bucket through the web interface.
