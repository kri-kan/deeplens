# Grafana Configuration Guide

**Last Updated:** 2025-12-29

## Overview

Grafana is pre-configured with data sources for the complete DeepLens observability stack, enabling seamless correlation between metrics, logs, and traces.

## Pre-configured Data Sources

### 1. Prometheus (Default)
- **Type:** Metrics
- **URL:** `http://deeplens-prometheus:9090`
- **Purpose:** Time-series metrics from all services
- **Status:** ✅ Default data source
- **Features:**
  - 5-second scrape interval
  - 60-second query timeout
  - POST method for large queries

### 2. Loki
- **Type:** Logs
- **URL:** `http://deeplens-loki:3100`
- **Purpose:** Centralized log aggregation
- **Status:** ✅ Configured
- **Features:**
  - Automatic trace correlation (TraceID extraction)
  - Links to Jaeger for distributed tracing
  - Max 1000 lines per query

### 3. Jaeger
- **Type:** Traces
- **URL:** `http://deeplens-jaeger:16686`
- **Purpose:** Distributed tracing
- **Status:** ✅ Configured
- **Features:**
  - Trace-to-logs correlation
  - Service dependency graph (Node Graph)
  - Tag-based filtering

## Data Source Correlation

### Traces → Logs
When viewing a trace in Jaeger, you can:
1. Click on any span
2. See "Logs for this span" link
3. Jump directly to related logs in Loki

**Configuration:**
```yaml
tracesToLogs:
  datasourceUid: loki
  tags: ['service.name', 'service.namespace']
  filterByTraceID: true
```

### Logs → Traces
When viewing logs in Loki, you can:
1. Look for `traceID=<id>` in log messages
2. Click the extracted TraceID
3. Jump directly to the trace in Jaeger

**Configuration:**
```yaml
derivedFields:
  - datasourceUid: jaeger
    matcherRegex: "traceID=(\\w+)"
    name: TraceID
```

## Accessing Grafana

### Web Interface
```
URL: http://localhost:3000
Username: admin
Password: DeepLens123!
```

### First Login
1. Navigate to http://localhost:3000
2. Login with credentials above
3. **Important:** Change the default password on first login

### Verify Data Sources
1. Go to **Configuration** → **Data Sources**
2. You should see:
   - ✅ Prometheus (default)
   - ✅ Loki
   - ✅ Jaeger

## Creating Dashboards

### Quick Start
1. Click **+** → **Dashboard**
2. Click **Add new panel**
3. Select data source (Prometheus, Loki, or Jaeger)
4. Build your query
5. Save dashboard

### Pre-built Dashboards
DeepLens includes dashboard templates in:
```
infrastructure/config/grafana/provisioning/dashboards/
```

To add more dashboards:
1. Create JSON file in the dashboards directory
2. Restart Grafana: `podman restart deeplens-grafana`

## Example Queries

### Prometheus (Metrics)
```promql
# CPU usage by container
rate(container_cpu_usage_seconds_total[5m])

# Memory usage
container_memory_usage_bytes

# HTTP request rate
rate(http_requests_total[5m])

# API response time (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Loki (Logs)
```logql
# All logs from whatsapp-processor
{service_name="whatsapp-processor"}

# Error logs only
{service_name="whatsapp-processor"} |= "error"

# Logs with specific trace ID
{service_name="whatsapp-processor"} | json | traceID="abc123"

# Count errors per minute
sum(count_over_time({service_name="whatsapp-processor"} |= "error" [1m]))
```

### Jaeger (Traces)
- Use the Jaeger UI directly at http://localhost:16686
- Or use Grafana's Explore view with Jaeger data source

## Configuration Files

### Data Sources
Location: `infrastructure/config/grafana/provisioning/datasources/datasources.yml`

This file is automatically loaded when Grafana starts.

### Dashboards
Location: `infrastructure/config/grafana/provisioning/dashboards/`

Add `.json` dashboard files here for automatic provisioning.

## Persistent Storage

Grafana data is stored in the `deeplens-grafana-data` volume:
- User settings
- Custom dashboards
- Annotations
- Alerts

**Note:** Provisioned data sources are read-only and defined in configuration files.

## Troubleshooting

### Data Source Connection Failed

**Prometheus:**
```powershell
# Test Prometheus connectivity
Invoke-RestMethod -Uri "http://localhost:9090/-/healthy"

# Check if Prometheus is running
podman ps | Select-String "prometheus"
```

**Loki:**
```powershell
# Test Loki connectivity
Invoke-RestMethod -Uri "http://localhost:3100/ready"

# Check if Loki is running
podman ps | Select-String "loki"
```

**Jaeger:**
```powershell
# Test Jaeger connectivity
Invoke-RestMethod -Uri "http://localhost:16686/api/services"

# Check if Jaeger is running
podman ps | Select-String "jaeger"
```

### Data Sources Not Appearing

1. Check if provisioning directory is mounted:
```powershell
podman inspect deeplens-grafana --format "{{.Mounts}}"
```

2. Verify configuration file exists:
```powershell
Test-Path "infrastructure/config/grafana/provisioning/datasources/datasources.yml"
```

3. Check Grafana logs:
```powershell
podman logs deeplens-grafana | Select-String "datasource"
```

4. Restart Grafana:
```powershell
podman restart deeplens-grafana
```

### Cannot Login

**Reset Admin Password:**
```powershell
# Stop Grafana
podman stop deeplens-grafana

# Start with new password
podman run -d `
    --name deeplens-grafana `
    --network deeplens-network `
    -e GF_SECURITY_ADMIN_PASSWORD=NewPassword123! `
    -v deeplens-grafana-data:/var/lib/grafana `
    -v "${PWD}/infrastructure/config/grafana/provisioning:/etc/grafana/provisioning" `
    -p 3000:3000 `
    grafana/grafana:10.1.0
```

## API Access

### Get All Data Sources
```powershell
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('admin:DeepLens123!'))
Invoke-RestMethod -Uri "http://localhost:3000/api/datasources" `
    -Method Get `
    -Headers @{Authorization="Basic $auth"}
```

### Test Data Source
```powershell
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('admin:DeepLens123!'))
Invoke-RestMethod -Uri "http://localhost:3000/api/datasources/1" `
    -Method Get `
    -Headers @{Authorization="Basic $auth"}
```

## Best Practices

1. **Change Default Password**: Always change the admin password after first login
2. **Create Service Accounts**: Use service accounts for API access instead of admin
3. **Organize Dashboards**: Use folders to organize dashboards by service/team
4. **Use Variables**: Create dashboard variables for dynamic filtering
5. **Set Alerts**: Configure alerts for critical metrics
6. **Regular Backups**: Export important dashboards regularly

## Advanced Configuration

### Custom Plugins
To install Grafana plugins:
```powershell
podman exec deeplens-grafana grafana-cli plugins install <plugin-name>
podman restart deeplens-grafana
```

### SMTP Configuration
To enable email alerts, add to Grafana environment:
```powershell
-e GF_SMTP_ENABLED=true `
-e GF_SMTP_HOST=smtp.gmail.com:587 `
-e GF_SMTP_USER=your-email@gmail.com `
-e GF_SMTP_PASSWORD=your-password
```

### LDAP/OAuth
For enterprise authentication, mount custom `grafana.ini`:
```powershell
-v "${PWD}/infrastructure/config/grafana/grafana.ini:/etc/grafana/grafana.ini"
```

## Related Documentation
- [OBSERVABILITY.md](../docs/OBSERVABILITY.md) - Observability overview
- [OBSERVABILITY_STORAGE.md](OBSERVABILITY_STORAGE.md) - Storage configuration
- [Official Grafana Docs](https://grafana.com/docs/grafana/latest/)
