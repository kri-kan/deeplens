param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("Create", "Delete", "Recreate", "List")]
    [string]$Action = "List",

    [Parameter(Mandatory=$false)]
    [string]$TopicName = "whatsapp-ready-messages",

    [Parameter(Mandatory=$false)]
    [int]$Partitions = 3,

    [Parameter(Mandatory=$false)]
    [int]$ReplicationFactor = 1,

    [Parameter(Mandatory=$false)]
    [string]$BootstrapServer = "localhost:9092",

    [Parameter(Mandatory=$false)]
    [string]$ContainerName = "deeplens-kafka"
)

$ErrorActionPreference = "Continue"

function Run-Kafka-Cmd {
    param($Arguments)
    $cmd = "kafka-topics --bootstrap-server $BootstrapServer $Arguments"
    # Write-Host "DEBUG: Running $cmd" -ForegroundColor DarkGray
    podman exec $ContainerName sh -c "$cmd" 2>&1
}

function Topic-Exists {
    param($Topic)
    $output = Run-Kafka-Cmd "--list"
    if ($LASTEXITCODE -ne 0) { throw "Failed to list topics" }
    return ($output -split "\r?\n" | Where-Object { $_ -eq $Topic })
}

Write-Host "Kafka Manager: $Action topic '$TopicName'..." -ForegroundColor Cyan

try {
    switch ($Action) {
        "List" {
            $topics = Run-Kafka-Cmd "--list"
            Write-Host "Topics found:" -ForegroundColor Gray
            Write-Host $topics -ForegroundColor White
        }

        "Delete" {
            if (Topic-Exists $TopicName) {
                Write-Host "  Deleting topic '$TopicName'..." -ForegroundColor Yellow
                Run-Kafka-Cmd "--delete --topic $TopicName" | Out-Null
                Write-Host "  [OK] Topic deleted." -ForegroundColor Green
            } else {
                Write-Host "  [INFO] Topic '$TopicName' does not exist." -ForegroundColor Gray
            }
        }

        "Create" {
            if (Topic-Exists $TopicName) {
                Write-Host "  [INFO] Topic '$TopicName' already exists." -ForegroundColor Gray
            } else {
                Write-Host "  Creating topic '$TopicName' (P=$Partitions, R=$ReplicationFactor)..." -ForegroundColor Yellow
                $res = Run-Kafka-Cmd "--create --topic $TopicName --partitions $Partitions --replication-factor $ReplicationFactor"
                
                if ($LASTEXITCODE -ne 0) {
                    if ($res -match "already exists") {
                        Write-Host "  [INFO] Topic '$TopicName' already exists (handled error)." -ForegroundColor Gray
                    } else {
                        throw "Failed to create topic '$TopicName': $res"
                    }
                } else {
                    Write-Host "  [OK] Topic created." -ForegroundColor Green
                }
            }
        }

        "Recreate" {
            if (Topic-Exists $TopicName) {
                Write-Host "  Deleting topic '$TopicName'..." -ForegroundColor Yellow
                Run-Kafka-Cmd "--delete --topic $TopicName" | Out-Null
                Start-Sleep -Seconds 2 # Give Kafka a moment to cleanup
            }
            Write-Host "  Creating topic '$TopicName' (P=$Partitions, R=$ReplicationFactor)..." -ForegroundColor Yellow
            Run-Kafka-Cmd "--create --topic $TopicName --partitions $Partitions --replication-factor $ReplicationFactor" | Out-Null
            Write-Host "  [OK] Topic recreated." -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
