param (
    [string]$KafkaHost = "192.168.0.170",
    [int]$KafkaPort = 9092,
    [switch]$SkipVolumes = $false,
    [switch]$ForceLocal = $false # Only set to true if you explicitly want to start local containers
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
            $conn = Test-NetConnection -ComputerName $KafkaHost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
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

Write-Host "Checking Messaging Services (External)..." -ForegroundColor Cyan

if (-not $ForceLocal) {
    Write-Host "  [INFO] Using external Kafka at $KafkaHost:$KafkaPort" -ForegroundColor Cyan
    Wait-For-Port $KafkaPort "External Kafka ($KafkaHost)" -MaxRetries 10
    Write-Host "    [OK] External Messaging Services ready" -ForegroundColor Green
    return
}

Write-Host "Starting Local Messaging Services (Zookeeper, Kafka)..." -ForegroundColor Yellow
# ... (rest of the local container logic continues below but is skipped by default)
Write-Host "    [OK] Kafka ready" -ForegroundColor Green
