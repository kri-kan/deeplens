# MinIO Service
 
This folder contains the Docker Compose setup for MinIO, an S3-compatible object storage server.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for MinIO.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
The MinIO Console will be available at `http://localhost:9001`.
 
## Bucket Management
 
For easier bucket management, use the provided PowerShell script:
 
- `manage-storage.ps1` - Automates common tasks like listing and cleaning buckets.
 
**Example: List bucket contents**
```powershell
.\manage-storage.ps1 -Action List -BucketName "my-bucket"
```
 
**Example: Clean (Recreate) a bucket**
```powershell
.\manage-storage.ps1 -Action Clean -BucketName "my-bucket"
```
 
## Configuration
 
- **API Port**: 9000
- **Console Port**: 9001
- **Default Credentials**: `krikan` / `Krikank1$`
- **Container Name**: `minio`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Data Persistence**: Data is stored in `/data/minio` on the host. Ensure this directory exists and has appropriate permissions.
