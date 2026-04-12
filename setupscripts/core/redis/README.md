# Redis (Tuned Cache)
 
Primary caching service and SignalR backplane for the DeepLens ecosystem.
 
## Configuration
 
- **Port**: 6379
- **Container Name**: `redis`
- **Memory Limit**: 2GB (`allkeys-lru` eviction)
- **Persistence**: Hybrid (RDB Snapshots + AOF Every Second)
- **Data Path**: `/data/redis` on host
 
## Security
 
- **Standard Credentials**: Use the global infrastructure password (`Krikank1$`).
 
## Database Allocation
 
The Redis instance is logically partitioned into 16 databases:
 
| DB Index | Purpose |
| :--- | :--- |
| **DB 0** | Session cache (Identity Service) |
| **DB 1** | API response cache |
| **DB 2** | Vector search results cache |
| **DB 3** | Image processing queue |
| **DB 4** | User preferences cache |
| **DB 5** | System metrics cache |
| **DB 6-15** | Reserved for future use |
 
## Advanced Tuning
 
This instance uses a custom `redis.conf` with:
- `tcp-keepalive 300`
- `maxclients 10000`
- `lazy-expire` enabled for performance
- Custom filenames: `deeplens-dump.rdb` and `deeplens-appendonly.aof`
 
## Management
 
Use the master orchestrator to manage:
```powershell
.\manage-stack.ps1 Start -Service redis
```
