# PostgreSQL 18 Service
 
This folder contains the Docker Compose setup for running PostgreSQL 18.
 
## Files
 
- `docker-compose.yaml` - Primary orchestration file for the Postgres database.
 
## Running the Setup
 
From this folder, use:
 
```bash
docker compose up -d
```
 
## Configuration
 
- **Port**: 5432
- **Default Username**: `krikan`
- **Container Name**: `krikanpg`
- **Data Mount**: `/var/lib/postgresql/18/docker`
- **Backups**: Mounted to `/backups` inside the container.
 
## Database Management (pgAdmin)
 
A web-based management UI is included in the stack for easier administration.
 
- **URL**: `http://<Host-IP>/pgadmin/`
- **Login Email**: `krikan@deeplens.local`
- **Login Password**: `Krikank1$`
 
### Connecting to the Database in pgAdmin:
1.  Add a **New Server**.
2.  In the **Connection** tab:
    - **Host**: `postgres` (Internal Docker DNS)
    - **Port**: `5432`
    - **Username**: `krikan`
    - **Password**: `Krikank1$`
 
### Manual Backups
You can trigger a manual backup using:
```bash
docker exec krikanpg pg_dump -U postgres my_database_name -f /backups/manual_backup.sql
```
 
## Maintenance
 
### Changing Authentication Method
To change the authentication method (e.g., to `scram-sha-256`):
1. Shell into the container: `docker exec -it krikanpg bash`
2. Modify `pg_hba.conf` (usually in `/var/lib/postgresql/18/docker/`).
3. Reload config: `docker exec -it krikanpg psql -U postgres -c "SELECT pg_reload_conf();"`
 
## Notes
 
- **Shared Network**: Attaches to the `deeplens-network`.
- **Healthchecks**: Built-in healthcheck using `pg_isready`.
 
## Database Management
 
For easier database management, use the provided PowerShell script:
 
- `manage-db.ps1` - Automates schema resets, initialization, and drops.
 
**Example: Reset database (Drop & Re-apply setup.sql)**
```powershell
.\manage-db.ps1 -Action Reset -DatabaseName "my_db"
```
 
**Example: Initialize database**
```powershell
.\manage-db.ps1 -Action Init -DatabaseName "my_db"
```
