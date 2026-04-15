# DeepLens Unified Tenant Provisioning Script
# Provisions all tenant-specific resources in a single operation

param(
    [Parameter(Mandatory = $true)]
    [string]$TenantName,
    
    [string]$DataBasePath = "C:\productivity\deeplensData",
    
    [int]$QdrantHttpPort = 0,  
    [int]$QdrantGrpcPort = 0, 
    
    [string]$BackupSchedule = "0 2 * * *", 
    [int]$BackupRetentionDays = 30,
    
    [ValidateSet("BYOS", "DeepLens", "None", "")]
    [string]$StorageType = "",  
    
    [int]$MinioPort = 0,  
    [int]$MinioConsolePort = 0,  
    
    [switch]$TestBackup,
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

$TenantDBName = "tenant_${TenantName}_metadata"
$TenantPath = "$DataBasePath/tenants/$TenantName"
$BackupsPath = "$TenantPath/backups"

# Core Infrastructure Ports
$CORE_PORTS = @(5432, 5433, 6379, 6333, 6334, 9000, 9001, 8080, 8082, 9092)

# Load environment variables
. "$PSScriptRoot/scripts/helpers/LoadEnv.ps1"
Load-Env -EnvFile "$PSScriptRoot/.env"

# Use variables from .env
$DB_HOST = $env:INFRA_HOST ?? "192.168.0.170"
$DB_PORT = $env:POSTGRES_PORT ?? 5432
$DB_PASS = $env:POSTGRES_PASSWORD ?? "Krikank1$"
$DB_USER = $env:POSTGRES_USER ?? "postgres"

$MINIO_HOST = $env:INFRA_HOST ?? "192.168.0.170"
$MINIO_PORT = $env:MINIO_PORT ?? 9000
$MINIO_CONSOLE_PORT = $env:MINIO_CONSOLE_PORT ?? 9001
$MINIO_ROOT_USER = $env:MINIO_ROOT_USER ?? "krikan"
$MINIO_ROOT_PASS = $env:MINIO_ROOT_PASSWORD ?? "Krikank1$"

function Run-Remote-Sql {
    param([string]$Sql, [string]$TargetDb = "postgres")
    docker run --rm -e PGPASSWORD=$DB_PASS --network host postgres:15-alpine psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $TargetDb -c "$Sql" 2>&1
}

function Get-NextAvailablePort {
    param([int]$StartPort)
    $usedPorts = [System.Collections.Generic.HashSet[int]]::new()
    foreach ($p in $CORE_PORTS) { $null = $usedPorts.Add($p) }
    $portsFromDocker = docker ps -a --format "{{.Ports}}"
    foreach ($line in $portsFromDocker) {
        $foundMatches = [regex]::Matches($line, '0\.0\.0\.0:(\d+)')
        foreach ($m in $foundMatches) { $null = $usedPorts.Add([int]$m.Groups[1].Value) }
    }
    $port = $StartPort
    while ($usedPorts.Contains($port)) { $port += 1 }
    return $port
}

function Remove-Tenant {
    Write-Host "Removing Tenant: $TenantName" -ForegroundColor Red
    $qdrantContainer = docker ps -a --filter "name=^deeplens-qdrant-$TenantName$" --format "{{.Names}}"
    if ($qdrantContainer) {
        docker stop "deeplens-qdrant-$TenantName" | Out-Null
        docker rm "deeplens-qdrant-$TenantName" | Out-Null
    }
    Run-Remote-Sql "DROP DATABASE IF EXISTS $TenantDBName;" | Out-Null
    Remove-Item -Path $TenantPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] Tenant '$TenantName' removed" -ForegroundColor Green
}

function Provision-Tenant {
    Write-Host "Provisioning Tenant: $TenantName" -ForegroundColor Cyan
    
    # 1. Check PostgreSQL
    $conn = Test-NetConnection -ComputerName $DB_HOST -Port $DB_PORT -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if (-not $conn.TcpTestSucceeded) { Write-Host "[ERROR] PostgreSQL unreachable" -ForegroundColor Red; exit 1 }

    # 2. Network
    if (-not (docker network ls --format "{{.Name}}" | Select-String -Pattern "^deeplens-network$")) {
        docker network create deeplens-network | Out-Null
    }

    # 3. Create database
    Run-Remote-Sql "CREATE DATABASE $TenantDBName WITH TEMPLATE tenant_metadata_template OWNER tenant_service;" | Out-Null

    # 4. Identity API Entry
    $tenantAdminEmail = "admin@${TenantName}.local"
    $tenantAdminPassword = "Krikank1$"
    $apiBody = @{
        tenantName     = $TenantName
        databaseName   = $TenantDBName
        adminEmail     = $tenantAdminEmail
        adminPassword  = $tenantAdminPassword
        minioEndpoint  = "$($DB_HOST):$($MINIO_PORT)"
        minioBucket    = $TenantName
    } | ConvertTo-Json
    
    try {
        $apiResponse = Invoke-RestMethod -Uri "http://localhost:5198/api/tenant/provision" -Method Post -Body $apiBody -ContentType "application/json"
        Write-Host "[OK] Tenant created via API (ID: $($apiResponse.tenantId))" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] API call failed: $_" -ForegroundColor Red
    }

    # 5. Qdrant
    if ($QdrantHttpPort -eq 0) { $QdrantHttpPort = Get-NextAvailablePort -StartPort 6433 }
    $storageRoot = "$TenantPath/qdrant"
    New-Item -ItemType Directory -Path $storageRoot -Force | Out-Null
    docker run -d --name "deeplens-qdrant-$TenantName" --restart unless-stopped --network deeplens-network -p "${QdrantHttpPort}:6333" -v "${storageRoot}:/qdrant/storage" qdrant/qdrant:v1.7.0 | Out-Null

    # 6. Summary
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Tenant Provisioning Complete" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Tenant:  $TenantName"
    Write-Host "  Email:   $tenantAdminEmail"
    Write-Host "  Qdrant:  http://$($DB_HOST):$QdrantHttpPort"
}

if ($Remove) { Remove-Tenant } else { Provision-Tenant }
