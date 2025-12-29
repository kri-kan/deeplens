# DeepLens Observability Storage Configuration

**Last Updated:** 2025-12-29

## Overview

The DeepLens observability stack uses persistent storage to ensure that monitoring data, traces, and logs are preserved across container restarts.

## Storage Volumes

### Prometheus (Metrics)
- **Volume Name:** `deeplens-prometheus-data`
- **Mount Point:** `/prometheus`
- **Purpose:** Time-series metrics database
- **Retention:** Configurable via Prometheus config (default: 15 days)
- **Size Estimate:** ~1-5GB for typical development usage

### Grafana (Dashboards)
- **Volume Name:** `deeplens-grafana-data`
- **Mount Point:** `/var/lib/grafana`
- **Purpose:** Dashboard configurations, user settings, data sources
- **Retention:** Permanent until manually deleted
- **Size Estimate:** ~100-500MB

### Loki (Logs)
- **Volume Name:** `deeplens-loki-data`
- **Mount Point:** `/loki`
- **Purpose:** Log aggregation and storage
- **Retention:** Configurable (default: 30 days)
- **Size Estimate:** Varies based on log volume (typically 1-10GB)

### Jaeger (Traces)
- **Volume Name:** `deeplens-jaeger-data`
- **Mount Point:** `/badger`
- **Storage Backend:** Badger (embedded key-value store)
- **Purpose:** Distributed trace storage
- **Retention:** Configurable via TTL (default: 72 hours)
- **Size Estimate:** ~500MB-2GB for development

## Storage Backend Details

### Jaeger Storage Options

We use **Badger** as the storage backend for Jaeger:

**Why Badger?**
- Embedded storage (no external database needed)
- Good performance for development/small-scale deployments
- Persistent across restarts
- Configurable TTL for automatic trace cleanup

**Configuration:**
```bash
SPAN_STORAGE_TYPE=badger
BADGER_EPHEMERAL=false
BADGER_DIRECTORY_VALUE=/badger/data
BADGER_DIRECTORY_KEY=/badger/key
```

**Production Alternatives:**
For production deployments, consider:
- **Elasticsearch** - Better for large-scale trace storage and querying
- **Cassandra** - Highly scalable distributed storage
- **PostgreSQL** - Simpler setup, good for medium-scale deployments

## Volume Management

### List All Observability Volumes
```powershell
podman volume ls | Select-String "deeplens-"
```

### Inspect Volume Details
```powershell
podman volume inspect deeplens-jaeger-data
```

### Backup Volumes
```powershell
# Create backup directory
New-Item -ItemType Directory -Path "C:\productivity\deeplens-backups\observability" -Force

# Backup Prometheus data
podman run --rm -v deeplens-prometheus-data:/data -v C:\productivity\deeplens-backups\observability:/backup alpine tar czf /backup/prometheus-data.tar.gz -C /data .

# Backup Grafana data
podman run --rm -v deeplens-grafana-data:/data -v C:\productivity\deeplens-backups\observability:/backup alpine tar czf /backup/grafana-data.tar.gz -C /data .

# Backup Jaeger data
podman run --rm -v deeplens-jaeger-data:/data -v C:\productivity\deeplens-backups\observability:/backup alpine tar czf /backup/jaeger-data.tar.gz -C /data .
```

### Restore Volumes
```powershell
# Restore Prometheus data
podman run --rm -v deeplens-prometheus-data:/data -v C:\productivity\deeplens-backups\observability:/backup alpine tar xzf /backup/prometheus-data.tar.gz -C /data

# Restore Grafana data
podman run --rm -v deeplens-grafana-data:/data -v C:\productivity\deeplens-backups\observability:/backup alpine tar xzf /backup/grafana-data.tar.gz -C /data

# Restore Jaeger data
podman run --rm -v deeplens-jaeger-data:/data -v C:\productivity\deeplens-backups\observability:/backup alpine tar xzf /backup/jaeger-data.tar.gz -C /data
```

### Clean Up Old Data
```powershell
# Remove all observability volumes (WARNING: Deletes all monitoring data!)
podman volume rm deeplens-prometheus-data deeplens-grafana-data deeplens-loki-data deeplens-jaeger-data
```

## Data Retention Policies

### Prometheus
Edit `infrastructure/config/prometheus/prometheus.yml`:
```yaml
storage:
  tsdb:
    retention.time: 15d  # Keep metrics for 15 days
    retention.size: 10GB # Or until 10GB is reached
```

### Jaeger (Badger)
Traces are automatically cleaned up based on TTL (default: 72 hours).

To modify, set environment variable:
```bash
BADGER_TTL=168h  # Keep traces for 7 days
```

### Loki
Configure in Loki config (future enhancement):
```yaml
limits_config:
  retention_period: 720h  # 30 days
```

## Monitoring Storage Usage

### Check Volume Sizes
```powershell
podman system df -v | Select-String "deeplens-"
```

### Monitor Container Disk Usage
```powershell
podman exec deeplens-prometheus du -sh /prometheus
podman exec deeplens-grafana du -sh /var/lib/grafana
podman exec deeplens-jaeger du -sh /badger
```

## Best Practices

1. **Regular Backups**: Schedule weekly backups of Grafana dashboards and Prometheus data
2. **Monitor Disk Usage**: Set up alerts when volumes exceed 80% capacity
3. **Retention Tuning**: Adjust retention periods based on your needs and available storage
4. **Production Migration**: For production, migrate Jaeger to Elasticsearch or Cassandra
5. **Volume Cleanup**: Periodically clean up old data to prevent disk exhaustion

## Troubleshooting

### Volume Permission Issues
If containers can't write to volumes:
```powershell
# Check volume permissions
podman volume inspect deeplens-jaeger-data

# Recreate volume if needed
podman volume rm deeplens-jaeger-data
podman volume create deeplens-jaeger-data
```

### Jaeger Storage Errors
Check Jaeger logs:
```powershell
podman logs deeplens-jaeger | Select-String "badger"
```

### Prometheus Storage Full
If Prometheus runs out of space:
```powershell
# Reduce retention time
# Edit prometheus.yml and restart container
podman restart deeplens-prometheus
```

## Related Documentation
- [OBSERVABILITY.md](../docs/OBSERVABILITY.md) - Observability overview
- [infrastructure/README.md](README.md) - Infrastructure setup guide
