param (
    [string]$PostgresPassword = "DeepLens123!",
    [switch]$SkipVolumes = $false
)

$ErrorActionPreference = "Continue"

# Resolve Config Path
$ConfigRoot = Resolve-Path "$PSScriptRoot\..\..\config"
if (-not (Test-Path $ConfigRoot)) {
    Write-Host "[WARN] Config path not found at $ConfigRoot. Checking current dir..." -ForegroundColor Yellow
    # Fallback if running from root
    if (Test-Path "infrastructure\config") { $ConfigRoot = Resolve-Path "infrastructure\config" }
}

function Confirm-Step {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $StepName failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting Observability Stack..." -ForegroundColor Cyan

if (-not $SkipVolumes) {
    $volumes = @(
        "deeplens-prometheus-data",
        "deeplens-grafana-data",
        "deeplens-loki-data",
        "deeplens-jaeger-data"
    )
    foreach ($volume in $volumes) {
        podman volume create $volume 2>&1 | Out-Null
    }
}

# 1. Jaeger
podman run -d `
    --name deeplens-jaeger `
    --network deeplens-network `
    -e COLLECTOR_OTLP_ENABLED=true `
    -e SPAN_STORAGE_TYPE=badger `
    -e BADGER_EPHEMERAL=false `
    -e BADGER_DIRECTORY_VALUE=/badger/data `
    -e BADGER_DIRECTORY_KEY=/badger/key `
    -v deeplens-jaeger-data:/badger `
    -p 16686:16686 `
    -p 14250:14250 `
    -p 14268:14268 `
    -p 4317:4317 `
    -p 4318:4318 `
    jaegertracing/all-in-one:1.49 | Out-Null
Confirm-Step "Jaeger Start"

# 2. Prometheus
podman run -d `
    --name deeplens-prometheus `
    --network deeplens-network `
    -v "$ConfigRoot/prometheus:/etc/prometheus" `
    -v deeplens-prometheus-data:/prometheus `
    -p 9090:9090 `
    prom/prometheus:v2.47.0 --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus | Out-Null
Confirm-Step "Prometheus Start"

# 3. Grafana
podman run -d `
    --name deeplens-grafana `
    --network deeplens-network `
    -e GF_SECURITY_ADMIN_PASSWORD=$PostgresPassword `
    -v deeplens-grafana-data:/var/lib/grafana `
    -v "$ConfigRoot/grafana/provisioning:/etc/grafana/provisioning" `
    -p 3000:3000 `
    grafana/grafana:10.1.0 | Out-Null
Confirm-Step "Grafana Start"

# 4. Loki
podman run -d `
    --name deeplens-loki `
    --network deeplens-network `
    -v deeplens-loki-data:/loki `
    -p 3100:3100 `
    grafana/loki:2.9.0 | Out-Null
Confirm-Step "Loki Start"

# 5. OTel
podman run -d `
    --name deeplens-otel-collector `
    --network deeplens-network `
    -v "$ConfigRoot/otel-collector:/etc/otelcol-contrib" `
    -p 8888:8888 `
    -p 8889:8889 `
    otel/opentelemetry-collector-contrib:0.88.0 --config=/etc/otelcol-contrib/otel-collector.yaml | Out-Null
Confirm-Step "OTel Collector Start"

Write-Host "    [OK] Observability stack started locally" -ForegroundColor Green
