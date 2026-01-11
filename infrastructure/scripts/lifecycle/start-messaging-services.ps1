param (
    [switch]$SkipVolumes = $false
)

$ErrorActionPreference = "Stop"

function Confirm-Step {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $StepName failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}

function Wait-For-Port {
    param($Port, $Name, $MaxRetries=60)
    Write-Host "    Waiting for $Name (Port $Port)..." -NoNewline -ForegroundColor Gray
    for ($i=0; $i -lt $MaxRetries; $i++) {
        try {
            $conn = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
            if ($conn.TcpTestSucceeded) {
                Write-Host " [OK]" -ForegroundColor Green
                return
            }
        } catch {}
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
    Write-Host " [TIMEOUT]" -ForegroundColor Red
    throw "$Name failed to start (Port $Port not reachable)"
}

Write-Host "Starting Messaging Services (Zookeeper, Kafka)..." -ForegroundColor Cyan

if (-not $SkipVolumes) {
    $volumes = @(
        "deeplens-kafka-data",
        "deeplens-kafka-secrets",
        "deeplens-zookeeper-data",
        "deeplens-zookeeper-secrets",
        "deeplens-zookeeper-logs"
    )
    foreach ($volume in $volumes) {
        $exists = podman volume ls --format "{{.Name}}" | Select-String -Pattern "^$volume$"
        if (-not $exists) {
            podman volume create $volume | Out-Null
        }
    }
}

# 1. Zookeeper
$zkRunning = podman ps --format "{{.Names}}" | Select-String -Pattern "^deeplens-zookeeper$"
$zkExists = podman ps -a --format "{{.Names}}" | Select-String -Pattern "^deeplens-zookeeper$"

if ($zkRunning) {
    Write-Host "  Zookeeper already running" -ForegroundColor Gray
} elseif ($zkExists) {
    Write-Host "  Starting existing Zookeeper..." -ForegroundColor Yellow
    podman start deeplens-zookeeper | Out-Null
} else {
    Write-Host "  Creating Zookeeper..." -ForegroundColor Yellow
    podman run -d `
        --name deeplens-zookeeper `
        --network deeplens-network `
        -e ZOOKEEPER_CLIENT_PORT=2181 `
        -e ZOOKEEPER_TICK_TIME=2000 `
        -v deeplens-zookeeper-data:/var/lib/zookeeper/data `
        -v deeplens-zookeeper-secrets:/etc/zookeeper/secrets `
        -v deeplens-zookeeper-logs:/var/lib/zookeeper/log `
        -p 2181:2181 `
        confluentinc/cp-zookeeper:7.4.0 | Out-Null
}
Wait-For-Port 2181 "Zookeeper"
Write-Host "    [OK] Zookeeper ready" -ForegroundColor Green
Write-Host "    Waiting for Zookeeper initialization..." -NoNewline -ForegroundColor Gray
Start-Sleep -Seconds 5
Write-Host " [OK]" -ForegroundColor Green

# 2. Kafka
$kafkaRunning = podman ps --format "{{.Names}}" | Select-String -Pattern "^deeplens-kafka$"
$kafkaExists = podman ps -a --format "{{.Names}}" | Select-String -Pattern "^deeplens-kafka$"

if ($kafkaRunning) {
    Write-Host "  Kafka already running" -ForegroundColor Gray
} elseif ($kafkaExists) {
    Write-Host "  Starting existing Kafka..." -ForegroundColor Yellow
    podman start deeplens-kafka | Out-Null
} else {
    Write-Host "  Creating Kafka..." -ForegroundColor Yellow
    $kafkaEnv = "PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
    podman run -d `
        --name deeplens-kafka `
        --network deeplens-network `
        -e KAFKA_BROKER_ID=1 `
        -e KAFKA_ZOOKEEPER_CONNECT=deeplens-zookeeper:2181 `
        -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 `
        -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 `
        -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=$kafkaEnv `
        -e KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT `
        -v deeplens-kafka-data:/var/lib/kafka/data `
        -v deeplens-kafka-secrets:/etc/kafka/secrets `
        -p 9092:9092 `
        confluentinc/cp-kafka:7.4.0 | Out-Null
}
Wait-For-Port 9092 "Kafka"
Write-Host "    [OK] Kafka ready" -ForegroundColor Green
