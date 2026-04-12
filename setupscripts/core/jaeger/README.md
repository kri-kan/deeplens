# Jaeger Service
 
This folder contains the Docker Compose setup for Jaeger, a distributed tracing system.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for Jaeger.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The Jaeger UI will be available at `http://localhost:16686`.
 
## Configuration
 
- **Web UI Port**: 16686
- **OTLP gRPC Port**: 4317
- **OTLP HTTP Port**: 4318
- **Container Name**: `jaeger`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **In-Memory Storage**: This setup uses the `all-in-one` image with in-memory storage, meaning traces are lost on container restart. For production persistence, an Elasticsearch or Cassandra backend is required.
