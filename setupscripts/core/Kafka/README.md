# Kafka Service
 
This folder contains the Docker Compose setup for running a Kafka production broker, a test broker, and a Management UI.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for Kafka services.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The Management UI will be available at `http://localhost:8080`.
 
## Topic Management
 
For easier topic management, use the provided PowerShell script:
 
- `manage-topics.ps1` - Automates the creation, deletion, and listing of topics.
 
**Example: Create a new topic**
```powershell
.\manage-topics.ps1 -Action Create -TopicName "my-new-topic"
```
 
**Example: List all topics**
```powershell
.\manage-topics.ps1 -Action List
```
 
## Configuration
 
- **Production Broker**: Port 9092 (Intranet), 29092 (Local).
- **Test Broker**: Port 9094 (Intranet), 29096 (Local).
- **Shared Network**: All services join the `deeplens-network`.
