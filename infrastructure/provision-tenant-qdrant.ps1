# DeepLens Tenant Qdrant Provisioning Script
# Provisions a dedicated Qdrant vector database instance for a tenant

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantName,
    
    [int]$QdrantPort = 0,  # Auto-assign if 0
    
    [int]$GrpcPort = 0,  # Auto-assign if 0
    
    [string]$StorageSize = "10G",
    
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

# Load environment variables
. "$PSScriptRoot/scripts/helpers/LoadEnv.ps1"
Load-Env -EnvFile "$PSScriptRoot/.env"

$RemoteHost = $env:INFRA_HOST ?? "192.168.0.170"

$ContainerName = "deeplens-qdrant-$TenantName"
$StorageRoot = "$PSScriptRoot/data/tenants/$TenantName/qdrant"

function Get-NextAvailablePort {
    param([int]$StartPort)
    
    $usedPorts = docker ps --format "{{.Ports}}" | Select-String -Pattern "(\d+):" -AllMatches | 
        ForEach-Object { $_.Matches.Groups[1].Value } | Sort-Object -Unique
    
    $port = $StartPort
    while ($usedPorts -contains $port) {
        $port++
    }
    return $port
}

function Remove-TenantQdrant {
    Write-Host "`n[REMOVE] Removing Qdrant for tenant: $TenantName" -ForegroundColor Yellow
    
    # Stop and remove container
    Write-Host "[INFO] Stopping container..." -ForegroundColor Cyan
    docker stop $ContainerName 2>&1 | Out-Null
    docker rm $ContainerName 2>&1 | Out-Null
    
    # Remove volume
    Write-Host "[INFO] Removing volume..." -ForegroundColor Cyan
    docker volume rm $VolumeName 2>&1 | Out-Null
    
    Write-Host "[OK] Qdrant removed for tenant: $TenantName" -ForegroundColor Green
}

function Provision-TenantQdrant {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Provisioning Qdrant for: $TenantName" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if container already exists
    $existing = docker ps -a --filter "name=^${ContainerName}$" --format "{{.Names}}"
    if ($existing) {
        Write-Host "[ERROR] Qdrant container already exists for tenant: $TenantName" -ForegroundColor Red
        Write-Host "[INFO] Use -Remove to delete the existing container first" -ForegroundColor Yellow
        exit 1
    }
    
    # Auto-assign ports if not specified
    if ($QdrantPort -eq 0) {
        $QdrantPort = Get-NextAvailablePort -StartPort 6333
        Write-Host "[INFO] Auto-assigned HTTP port: $QdrantPort" -ForegroundColor Yellow
    }
    
    if ($GrpcPort -eq 0) {
        $GrpcPort = Get-NextAvailablePort -StartPort 6334
        Write-Host "[INFO] Auto-assigned gRPC port: $GrpcPort" -ForegroundColor Yellow
    }
    
    # Ensure storage folder exists
    Write-Host "`n[STORAGE] Ensuring folder: $StorageRoot" -ForegroundColor Cyan
    if (!(Test-Path $StorageRoot)) {
        New-Item -ItemType Directory -Path $StorageRoot -Force | Out-Null
    }
    Write-Host "[OK] Storage folder ready" -ForegroundColor Green
    
    # Start Qdrant container
    Write-Host "`n[START] Starting Qdrant container..." -ForegroundColor Cyan
    docker run -d `
        --name $ContainerName `
        --restart unless-stopped `
        --network deeplens-network `
        -p "${QdrantPort}:6333" `
        -p "${GrpcPort}:6334" `
        -v "${StorageRoot}:/qdrant/storage" `
        --label "tenant=$TenantName" `
        --label "service=qdrant" `
        qdrant/qdrant:v1.7.0
    
    Write-Host "[OK] Qdrant container started" -ForegroundColor Green
    
    # Wait for Qdrant to be ready
    Write-Host "`n[HEALTH] Waiting for Qdrant to be ready..." -ForegroundColor Cyan
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    
    while (-not $ready -and $attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://$($RemoteHost):${QdrantPort}/collections" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $ready = $true
            }
        }
        catch {
            # Continue waiting
        }
        $attempt++
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    }
    
    if ($ready) {
        Write-Host "[OK] Qdrant is ready and healthy" -ForegroundColor Green
    }
    else {
        Write-Host "[WARNING] Qdrant did not become ready within timeout, but container is running" -ForegroundColor Yellow
    }
    
    # Display summary
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Qdrant Provisioning Complete" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Tenant:        $TenantName" -ForegroundColor Cyan
    Write-Host "  Container:     $ContainerName" -ForegroundColor Cyan
    Write-Host "  Volume:        $VolumeName" -ForegroundColor Cyan
    Write-Host "  HTTP Port:     $QdrantPort" -ForegroundColor Cyan
    Write-Host "  gRPC Port:     $GrpcPort" -ForegroundColor Cyan
    Write-Host "  HTTP URL:      http://localhost:${QdrantPort}" -ForegroundColor Yellow
    Write-Host "  Dashboard:     http://localhost:${QdrantPort}/dashboard" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[USAGE] Access collections at: http://localhost:${QdrantPort}/collections" -ForegroundColor Cyan
    Write-Host ""
}

# Main execution
if ($Remove) {
    Remove-TenantQdrant
}
else {
    Provision-TenantQdrant
}
