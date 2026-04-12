# Qdrant Service
 
This folder contains the Docker Compose setup for Qdrant, a high-performance vector database.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for Qdrant.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The Qdrant Web UI will be available at `http://localhost:6333/dashboard`.
 
## Configuration
 
- **HTTP Port**: 6333
- **gRPC Port**: 6334
- **Container Name**: `qdrant`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Data Persistence**: Data is stored in `/data/qdrant` on the host. Ensure this directory exists and has appropriate permissions.
