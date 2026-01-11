param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("FlushAll", "FlushDb", "Ping")]
    [string]$Action = "Ping",

    [Parameter(Mandatory=$false)]
    [string]$ContainerName = "deeplens-redis",

    [Parameter(Mandatory=$false)]
    [int]$DbIndex = 0
)

$ErrorActionPreference = "Continue"

function Run-Redis-Cmd {
    param($Args)
    # Write-Host "DEBUG: Running redis-cli $Args" -ForegroundColor DarkGray
    podman exec $ContainerName redis-cli $Args 2>&1
}

Write-Host "Redis Manager: Performing $Action..." -ForegroundColor Cyan

try {
    switch ($Action) {
        "Ping" {
            $res = Run-Redis-Cmd "ping"
            Write-Host "  Response: $res" -ForegroundColor Gray
            if ($res -match "PONG") { Write-Host "  [OK] Redis is alive." -ForegroundColor Green }
        }

        "FlushAll" {
            Write-Host "  Flushing ALL databases..." -ForegroundColor Yellow
            $res = Run-Redis-Cmd "FLUSHALL"
            Write-Host "  Output: $res" -ForegroundColor Gray
            if ($res -match "OK") { Write-Host "  [OK] All databases flushed." -ForegroundColor Green }
        }

        "FlushDb" {
            Write-Host "  Flushing database $DbIndex..." -ForegroundColor Yellow
            $res = Run-Redis-Cmd "-n $DbIndex FLUSHDB"
            Write-Host "  Output: $res" -ForegroundColor Gray
            if ($res -match "OK") { Write-Host "  [OK] Database flushed." -ForegroundColor Green }
        }
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
