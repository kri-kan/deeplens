# DeepLens Port Allocation Map

**Last Updated:** 2025-12-29

## Port Allocation Overview

This document provides a complete mapping of all ports used by DeepLens services to prevent conflicts and aid in troubleshooting.

## Port Allocation Table

| Port  | Service                  | Protocol | Type           | Purpose                        | Conflict Risk |
| ----- | ------------------------ | -------- | -------------- | ------------------------------ | ------------- |
| 2181  | Zookeeper                | TCP      | Infrastructure | Kafka coordination             | ✅ None        |
| 3000  | Grafana                  | HTTP     | Observability  | Monitoring dashboards          | ⚠️ Common      |
| 3005  | WhatsApp Processor       | HTTP     | Application    | WhatsApp message processing    | ✅ None        |
| 3100  | Loki                     | HTTP     | Observability  | Log aggregation                | ✅ None        |
| 4317  | Jaeger (OTLP gRPC)       | gRPC     | Observability  | Trace collection (gRPC)        | ✅ None        |
| 4318  | Jaeger (OTLP HTTP)       | HTTP     | Observability  | Trace collection (HTTP)        | ✅ None        |
| 5000  | Search API               | HTTP     | Application    | Image search & ingestion       | ⚠️ Common      |
| 5198  | Identity API             | HTTP     | Application    | Authentication & authorization | ✅ None        |
| 5433  | PostgreSQL               | TCP      | Infrastructure | Database (custom port)         | ✅ None        |
| 6333  | Qdrant (HTTP)            | HTTP     | Infrastructure | Vector database API            | ✅ None        |
| 6334  | Qdrant (gRPC)            | gRPC     | Infrastructure | Vector database gRPC           | ✅ None        |
| 6379  | Redis                    | TCP      | Infrastructure | Cache & session storage        | ⚠️ Common      |
| 8001  | Feature Extraction       | HTTP     | Application    | AI/ML feature extraction       | ✅ None        |
| 8888  | OTel Collector (metrics) | HTTP     | Observability  | Collector internal metrics     | ✅ None        |
| 8889  | OTel Collector (Prom)    | HTTP     | Observability  | Prometheus exporter            | ✅ None        |
| 9000  | MinIO (API)              | HTTP     | Infrastructure | Object storage API             | ⚠️ Common      |
| 9001  | MinIO (Console)          | HTTP     | Infrastructure | Object storage web UI          | ✅ None        |
| 9090  | Prometheus               | HTTP     | Observability  | Metrics database & query       | ⚠️ Common      |
| 9092  | Kafka                    | TCP      | Infrastructure | Message broker                 | ⚠️ Common      |
| 14250 | Jaeger (Collector gRPC)  | gRPC     | Observability  | Jaeger native gRPC collector   | ✅ None        |
| 14268 | Jaeger (Collector HTTP)  | HTTP     | Observability  | Jaeger native HTTP collector   | ✅ None        |
| 16686 | Jaeger (UI)              | HTTP     | Observability  | Jaeger web interface           | ✅ None        |

## Port Conflict Analysis

### ✅ No Known Conflicts (Safe)
These ports are unlikely to conflict with common services:
- **5198** - Identity API
- **5433** - PostgreSQL (custom, avoids default 5432)
- **3005** - WhatsApp Processor
- **3100** - Loki
- **4317/4318** - OTLP endpoints
- **6333/6334** - Qdrant
- **8001** - Feature Extraction
- **8888/8889** - OTel Collector
- **9001** - MinIO Console
- **14250/14268** - Jaeger Collectors
- **16686** - Jaeger UI

### ⚠️ Potential Conflicts (Common Ports)
These ports may conflict with other common services:

**Port 3000 (Grafana)**
- Commonly used by: React dev servers, Rails, Node.js apps
- **Mitigation**: Change Grafana port if needed
- **Alternative**: Use port 3001 or 3030

**Port 5000 (Search API)**
- Commonly used by: Flask apps, ASP.NET Core default
- **Mitigation**: Already configured in launchSettings.json
- **Alternative**: Use port 5001 or 5002

**Port 6379 (Redis)**
- Commonly used by: Local Redis installations
- **Mitigation**: DeepLens uses containerized Redis
- **Note**: Conflicts only if running Redis outside containers

**Port 9000 (MinIO)**
- Commonly used by: PHP-FPM, SonarQube
- **Mitigation**: MinIO is containerized
- **Alternative**: Use port 9002 if needed

**Port 9090 (Prometheus)**
- Commonly used by: Cockpit, other monitoring tools
- **Mitigation**: Prometheus is containerized
- **Alternative**: Use port 9091 if needed

**Port 9092 (Kafka)**
- Commonly used by: Local Kafka installations
- **Mitigation**: DeepLens uses containerized Kafka
- **Note**: Conflicts only if running Kafka outside containers

## Port Groups by Service Type

### Infrastructure (Core)
```
PostgreSQL:  5433
Redis:       6379
Zookeeper:   2181
Kafka:       9092
MinIO:       9000 (API), 9001 (Console)
Qdrant:      6333 (HTTP), 6334 (gRPC)
```

### Application Services
```
Identity API:         5198
Search API:           5000
Feature Extraction:   8001
WhatsApp Processor:   3005
```

### Observability Stack
```
Jaeger UI:            16686
Jaeger Collector:     14250 (gRPC), 14268 (HTTP)
Jaeger OTLP:          4317 (gRPC), 4318 (HTTP)
Prometheus:           9090
Grafana:              3000
Loki:                 3100
OTel Collector:       8888 (metrics), 8889 (prometheus)
```

## Checking for Port Conflicts

### Windows (PowerShell)
```powershell
# Check if a specific port is in use
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# Find what's using a port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# List all listening ports
Get-NetTCPConnection -State Listen | Sort-Object LocalPort | Format-Table LocalPort, OwningProcess, State

# Check all DeepLens ports at once
$ports = @(2181, 3000, 3005, 3100, 4317, 4318, 5000, 5198, 5433, 6333, 6334, 6379, 8001, 8888, 8889, 9000, 9001, 9090, 9092, 14250, 14268, 16686)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "Port $port is in use by: $($process.ProcessName)" -ForegroundColor Yellow
    } else {
        Write-Host "Port $port is available" -ForegroundColor Green
    }
}
```

### Linux/macOS
```bash
# Check if a specific port is in use
lsof -i :3000

# Check all DeepLens ports
for port in 2181 3000 3005 3100 4317 4318 5000 5198 5433 6333 6334 6379 8001 8888 8889 9000 9001 9090 9092 14250 14268 16686; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "Port $port is in use"
    else
        echo "Port $port is available"
    fi
done
```

## Resolving Port Conflicts

### Option 1: Stop Conflicting Service
```powershell
# Find and stop the process using a port
$process = Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
Stop-Process -Id $process.Id -Force
```

### Option 2: Change DeepLens Port

**For Containerized Services:**
Edit `infrastructure/setup-deeplens-dev.ps1` and change the port mapping:
```powershell
# Example: Change Grafana from 3000 to 3030
-p 3030:3000 `  # Host:Container
```

**For .NET Services:**
Edit the respective `appsettings.json` or `launchSettings.json`:
```json
{
  "urls": "http://localhost:5001"  // Change from 5000
}
```

**For WhatsApp Processor:**
Edit `src/whatsapp-processor/.env`:
```env
API_PORT=3006  # Change from 3005
```

### Option 3: Use Docker/Podman Network
Access services via container names instead of localhost (within the network):
```
http://deeplens-grafana:3000
http://deeplens-prometheus:9090
```

## Reserved Port Ranges

### System Reserved (0-1023)
DeepLens does NOT use any system reserved ports.

### User Ports (1024-49151)
DeepLens uses ports in this range for all services.

### Dynamic/Private Ports (49152-65535)
Not used by DeepLens configuration.

## Production Considerations

For production deployments:

1. **Use Reverse Proxy**: Put all HTTP services behind Nginx/Traefik
2. **Firewall Rules**: Only expose necessary ports (typically just 80/443)
3. **Internal Network**: Keep infrastructure ports (PostgreSQL, Redis, Kafka) internal
4. **Load Balancer**: Use load balancer for application services
5. **Service Mesh**: Consider Istio/Linkerd for advanced networking

## Troubleshooting

### "Address already in use" Error
```powershell
# 1. Find the conflicting process
Get-NetTCPConnection -LocalPort <PORT> | Select-Object OwningProcess
Get-Process -Id <PROCESS_ID>

# 2. Stop the process
Stop-Process -Id <PROCESS_ID> -Force

# 3. Restart DeepLens service
podman restart deeplens-<service-name>
```

### Container Won't Start Due to Port Conflict
```powershell
# Check if port is in use
Get-NetTCPConnection -LocalPort <PORT>

# If it's another DeepLens container, stop it first
podman stop <container-name>

# Then start the new one
podman start <container-name>
```

## Quick Reference Commands

```powershell
# View all DeepLens container ports
podman ps --format "table {{.Names}}\t{{.Ports}}"

# Test if a service is accessible
Test-NetConnection -ComputerName localhost -Port 3000

# Kill all processes on a specific port (Windows)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

## Related Documentation
- [DEVELOPMENT.md](../DEVELOPMENT.md) - Port reference table
- [infrastructure/README.md](README.md) - Service endpoints
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Port conflict resolution
