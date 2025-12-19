# DeepLens Unified Tenant Provisioning Script
# Provisions all tenant-specific resources in a single operation

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantName,
    
    [string]$DataBasePath = "C:\productivity\deeplensData",
    
    [int]$QdrantHttpPort = 0,  # Auto-assign if 0
    
    [int]$QdrantGrpcPort = 0,  # Auto-assign if 0
    
    [string]$BackupSchedule = "0 2 * * *",  # Daily at 2 AM
    
    [int]$BackupRetentionDays = 30,
    
    [ValidateSet("BYOS", "DeepLens", "None", "")]
    [string]$StorageType = "",  # Empty = prompt, BYOS = tenant provides, DeepLens = we provision MinIO
    
    [int]$MinioPort = 0,  # Auto-assign if StorageType=DeepLens
    
    [int]$MinioConsolePort = 0,  # Auto-assign if StorageType=DeepLens
    
    [switch]$TestBackup,
    
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

$TenantDBName = "tenant_${TenantName}_metadata"
$TenantPath = "$DataBasePath/tenants/$TenantName"
$BackupsPath = "$TenantPath/backups"

function Get-NextAvailablePort {
    param([int]$StartPort)
    
    $usedPorts = podman ps --format "{{.Ports}}" | Select-String -Pattern "(\d+):" -AllMatches | 
        ForEach-Object { $_.Matches.Groups[1].Value } | Sort-Object -Unique
    
    $port = $StartPort
    while ($usedPorts -contains $port) {
        $port++
    }
    return $port
}

function Remove-Tenant {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " Removing Tenant: $TenantName" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    
    # Stop and remove Qdrant
    Write-Host "[QDRANT] Removing Qdrant container..." -ForegroundColor Yellow
    $qdrantContainer = podman ps -a --filter "name=^deeplens-qdrant-$TenantName$" --format "{{.Names}}"
    if ($qdrantContainer) {
        podman stop "deeplens-qdrant-$TenantName" 2>&1 | Out-Null
        podman rm "deeplens-qdrant-$TenantName" 2>&1 | Out-Null
    }
    $qdrantVolume = podman volume ls --filter "name=^deeplens_qdrant_${TenantName}_data$" --format "{{.Name}}"
    if ($qdrantVolume) {
        podman volume rm "deeplens_qdrant_${TenantName}_data" 2>&1 | Out-Null
    }
    Write-Host "[OK] Qdrant removed" -ForegroundColor Green
    
    # Stop and remove MinIO (if exists)
    Write-Host "`n[MINIO] Removing MinIO container..." -ForegroundColor Yellow
    $minioContainer = podman ps -a --filter "name=^deeplens-minio-$TenantName$" --format "{{.Names}}"
    if ($minioContainer) {
        podman stop "deeplens-minio-$TenantName" 2>&1 | Out-Null
        podman rm "deeplens-minio-$TenantName" 2>&1 | Out-Null
    }
    $minioVolume = podman volume ls --filter "name=^deeplens_minio_${TenantName}_data$" --format "{{.Name}}"
    if ($minioVolume) {
        podman volume rm "deeplens_minio_${TenantName}_data" 2>&1 | Out-Null
    }
    Write-Host "[OK] MinIO removed" -ForegroundColor Green
    
    # Stop and remove Backup
    Write-Host "`n[BACKUP] Removing backup container..." -ForegroundColor Yellow
    $backupContainer = podman ps -a --filter "name=^deeplens-backup-$TenantName$" --format "{{.Names}}"
    if ($backupContainer) {
        podman stop "deeplens-backup-$TenantName" 2>&1 | Out-Null
        podman rm "deeplens-backup-$TenantName" 2>&1 | Out-Null
    }
    Write-Host "[OK] Backup container removed" -ForegroundColor Green
    
    # Drop database
    Write-Host "`n[DATABASE] Dropping tenant database..." -ForegroundColor Yellow
    $dropCmd = "DROP DATABASE IF EXISTS $TenantDBName;"
    podman exec -i deeplens-postgres psql -U postgres -c $dropCmd 2>&1 | Out-Null
    Write-Host "[OK] Database dropped" -ForegroundColor Green
    
    # Remove data directories
    Write-Host "`n[DATA] Removing tenant data..." -ForegroundColor Yellow
    Remove-Item -Path $TenantPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Tenant data removed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[SUCCESS] Tenant '$TenantName' completely removed" -ForegroundColor Green
    Write-Host ""
}

function Provision-Tenant {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Provisioning Tenant: $TenantName" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check prerequisites
    Write-Host "[CHECK] Verifying prerequisites..." -ForegroundColor Cyan
    $pgRunning = podman ps --filter "name=^deeplens-postgres$" --format "{{.Names}}"
    if (-not $pgRunning) {
        Write-Host "[ERROR] PostgreSQL is not running. Start infrastructure first" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] PostgreSQL is running" -ForegroundColor Green
    
    # Prompt for storage type if not specified
    if ([string]::IsNullOrEmpty($StorageType)) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host " Storage Configuration" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Choose storage option for tenant '$TenantName':" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  [1] BYOS (Bring Your Own Storage)" -ForegroundColor White
        Write-Host "      Tenant provides Azure/AWS/GCS credentials" -ForegroundColor Gray
        Write-Host "      No DeepLens infrastructure provisioned" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  [2] DeepLens-Provisioned Storage" -ForegroundColor White
        Write-Host "      Dedicated MinIO instance for this tenant" -ForegroundColor Gray
        Write-Host "      Fully isolated, managed by DeepLens" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  [3] None (Skip storage provisioning)" -ForegroundColor White
        Write-Host "      Configure storage later manually" -ForegroundColor Gray
        Write-Host ""
        
        do {
            $choice = Read-Host "Enter choice (1-3)"
            switch ($choice) {
                "1" { $StorageType = "BYOS"; $validChoice = $true }
                "2" { $StorageType = "DeepLens"; $validChoice = $true }
                "3" { $StorageType = "None"; $validChoice = $true }
                default { 
                    Write-Host "[ERROR] Invalid choice. Please enter 1, 2, or 3" -ForegroundColor Red
                    $validChoice = $false
                }
            }
        } while (-not $validChoice)
        
        Write-Host ""
    }
    
    # Create tenant directories
    Write-Host "`n[DIRECTORIES] Creating tenant directories..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $BackupsPath -Force | Out-Null
    Write-Host "[OK] Directories created at: $TenantPath" -ForegroundColor Green
    
    # Create tenant database
    Write-Host "`n[DATABASE] Creating tenant database..." -ForegroundColor Cyan
    $createDBCmd = "CREATE DATABASE $TenantDBName WITH ENCODING='UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8';"
    try {
        podman exec -i deeplens-postgres psql -U postgres -c $createDBCmd 2>&1 | Out-Null
        Write-Host "[OK] Database created: $TenantDBName" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Database might already exist" -ForegroundColor Yellow
    }
    
    # Create tenant entry in nextgen_identity database
    Write-Host "`n[TENANT] Creating tenant entry in identity database..." -ForegroundColor Cyan
    
    $createTenantSQL = @"
INSERT INTO tenants (
    id,
    name,
    description,
    slug,
    database_name,
    connection_string,
    qdrant_container_name,
    qdrant_http_port,
    qdrant_grpc_port,
    minio_endpoint,
    minio_bucket_name,
    status,
    tier,
    max_storage_bytes,
    max_users,
    max_api_calls_per_day,
    created_at,
    created_by
) VALUES (
    gen_random_uuid(),
    '$TenantName',
    'Tenant: $TenantName',
    '$TenantName',
    '$TenantDBName',
    'Host=deeplens-postgres;Port=5432;Database=$TenantDBName;Username=postgres;Password=DeepLens123!',
    'deeplens-qdrant-$TenantName',
    0,  -- Will be updated with actual port
    0,  -- Will be updated with actual port
    'localhost:9000',
    '$TenantName',
    1,  -- Status: Active
    1,  -- Tier: Free
    10737418240,  -- 10 GB default storage
    100,
    100000,
    CURRENT_TIMESTAMP,
    '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (slug) DO NOTHING;
"@
    
    try {
        podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity -c $createTenantSQL 2>&1 | Out-Null
        Write-Host "[OK] Tenant entry created in identity database" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Tenant entry might already exist" -ForegroundColor Yellow
    }
    
    # Create default tenant admin user
    Write-Host "`n[USER] Creating default tenant admin user..." -ForegroundColor Cyan
    
    # Generate credentials
    $tenantAdminEmail = "admin@${TenantName}.local"
    $tenantAdminPassword = "DeepLens@${TenantName}123!"
    
    # Generate BCrypt hash for the password
    Write-Host "[INFO] Generating password hash..." -ForegroundColor Yellow
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $hashGeneratorPath = Join-Path (Split-Path -Parent $scriptDir) "tools\HashGenerator"
    
    try {
        $hashOutput = & dotnet run --project "$hashGeneratorPath\HashGenerator.csproj" $tenantAdminPassword 2>&1 | Where-Object { $_ -match "^Hash:" }
        if ($hashOutput -match "Hash: (.+)$") {
            $passwordHash = $Matches[1]
        }
        else {
            throw "Failed to generate password hash"
        }
    }
    catch {
        Write-Host "[ERROR] Failed to generate password hash: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "[INFO] Falling back to pre-computed generic hash" -ForegroundColor Yellow
        # This is a generic hash that won't work - tenant will need to reset password
        $passwordHash = "`$2a`$11`$3yQ0wZ5K8Vx4YvH2MpNwXuJ.K7L9R5T6W8Y2A4C6E8F1H3J5K7L9"
    }
    
    $createUserSQL = @"
DO `$`$
DECLARE
    tenant_uuid UUID;
    user_uuid UUID := gen_random_uuid();
BEGIN
    -- Get tenant ID from nextgen_identity database
    SELECT id INTO tenant_uuid FROM tenants WHERE slug = '$TenantName';
    
    -- Only create user if tenant exists and user doesn't already exist
    IF tenant_uuid IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE tenant_id = tenant_uuid AND email = '$tenantAdminEmail') THEN
            -- Insert tenant admin user
            -- Note: Password hash is generic. User should change password on first login.
            INSERT INTO users (
                id,
                tenant_id,
                email,
                password_hash,
                first_name,
                last_name,
                email_confirmed,
                role,
                is_active,
                created_at
            ) VALUES (
                user_uuid,
                tenant_uuid,
                '$tenantAdminEmail',
                '$passwordHash',
                '$TenantName',
                'Admin',
                TRUE,
                3,  -- Role: 3 = TenantOwner (full tenant access)
                TRUE,
                CURRENT_TIMESTAMP
            );
            RAISE NOTICE 'Tenant admin user created: %', '$tenantAdminEmail';
        ELSE
            RAISE NOTICE 'Tenant admin user already exists: %', '$tenantAdminEmail';
        END IF;
    ELSE
        RAISE NOTICE 'Tenant not found in database, skipping user creation';
    END IF;
END `$`$;
"@
    
    try {
        # Execute in nextgen_identity database
        $result = podman exec -i deeplens-postgres psql -U postgres -d nextgen_identity -c $createUserSQL 2>&1
        
        if ($result -match "Tenant admin user created") {
            Write-Host "[OK] Tenant admin user created: $tenantAdminEmail" -ForegroundColor Green
            
            # Save credentials to tenant directory
            $credentialsFile = "$TenantPath/admin-credentials.txt"
            @"
Tenant Admin Credentials for: $TenantName
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Email: $tenantAdminEmail
Default Password: $tenantAdminPassword

Role: TenantOwner (Full tenant access)

⚠️  IMPORTANT SECURITY NOTES:
  - Change this password IMMEDIATELY after first login
  - The default password follows the pattern: DeepLens@{TenantName}123!
  - This user has full access to the tenant's resources
  - Store these credentials securely
  - Delete this file after noting the credentials

Login URL: http://localhost:3000
"@ | Out-File -FilePath $credentialsFile -Encoding UTF8
            
            Write-Host "[INFO] Credentials saved to: $credentialsFile" -ForegroundColor Yellow
        }
        elseif ($result -match "already exists") {
            Write-Host "[WARNING] Tenant admin user already exists" -ForegroundColor Yellow
        }
        else {
            Write-Host "[WARNING] Could not determine user creation status" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[ERROR] Failed to create tenant admin user: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "[INFO] You can create the user manually via the Admin Portal" -ForegroundColor Yellow
    }
    
    # Provision Qdrant
    Write-Host "`n[QDRANT] Provisioning Qdrant instance..." -ForegroundColor Cyan
    
    # Check if already exists
    $qdrantExists = podman ps -a --filter "name=^deeplens-qdrant-$TenantName$" --format "{{.Names}}"
    if ($qdrantExists) {
        Write-Host "[WARNING] Qdrant container already exists, skipping..." -ForegroundColor Yellow
    }
    else {
        # Auto-assign ports if not specified
        if ($QdrantHttpPort -eq 0) {
            $QdrantHttpPort = Get-NextAvailablePort -StartPort 6333
            Write-Host "[INFO] Auto-assigned HTTP port: $QdrantHttpPort" -ForegroundColor Yellow
        }
        
        if ($QdrantGrpcPort -eq 0) {
            $QdrantGrpcPort = Get-NextAvailablePort -StartPort 6334
            Write-Host "[INFO] Auto-assigned gRPC port: $QdrantGrpcPort" -ForegroundColor Yellow
        }
        
        $qdrantVolume = "deeplens_qdrant_${TenantName}_data"
        $volumeExists = podman volume ls --filter "name=^${qdrantVolume}$" --format "{{.Name}}"
        if (-not $volumeExists) {
            podman volume create $qdrantVolume | Out-Null
        }
        
        podman run -d `
            --name "deeplens-qdrant-$TenantName" `
            --restart unless-stopped `
            --network deeplens-network `
            -p "${QdrantHttpPort}:6333" `
            -p "${QdrantGrpcPort}:6334" `
            -v "${qdrantVolume}:/qdrant/storage" `
            --label "tenant=$TenantName" `
            --label "service=qdrant" `
            qdrant/qdrant:v1.7.0 | Out-Null
        
        Write-Host "[OK] Qdrant started on ports $QdrantHttpPort (HTTP) and $QdrantGrpcPort (gRPC)" -ForegroundColor Green
    }
    
    # Provision Storage based on type
    if ($StorageType -eq "DeepLens") {
        Write-Host "`n[STORAGE] Provisioning dedicated MinIO instance..." -ForegroundColor Cyan
        
        # Check if already exists
        $minioExists = podman ps -a --filter "name=^deeplens-minio-$TenantName$" --format "{{.Names}}"
        if ($minioExists) {
            Write-Host "[WARNING] MinIO container already exists, skipping..." -ForegroundColor Yellow
        }
        else {
            # Auto-assign ports if not specified
            if ($MinioPort -eq 0) {
                $MinioPort = Get-NextAvailablePort -StartPort 9000
                Write-Host "[INFO] Auto-assigned MinIO API port: $MinioPort" -ForegroundColor Yellow
            }
            
            if ($MinioConsolePort -eq 0) {
                $MinioConsolePort = Get-NextAvailablePort -StartPort 9001
                Write-Host "[INFO] Auto-assigned MinIO Console port: $MinioConsolePort" -ForegroundColor Yellow
            }
            
            # Generate secure credentials
            $minioRootUser = "${TenantName}-admin"
            $minioRootPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object {[char]$_})
            
            # Save credentials to tenant directory
            $credentialsFile = "$TenantPath/minio-credentials.txt"
            @"
MinIO Credentials for Tenant: $TenantName
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Root User: $minioRootUser
Root Password: $minioRootPassword

API Endpoint: http://localhost:$MinioPort
Console URL: http://localhost:$MinioConsolePort

⚠️  IMPORTANT: Store these credentials securely!
"@ | Out-File -FilePath $credentialsFile -Encoding UTF8
            
            $minioVolume = "deeplens_minio_${TenantName}_data"
            $volumeExists = podman volume ls --filter "name=^${minioVolume}$" --format "{{.Name}}"
            if (-not $volumeExists) {
                podman volume create $minioVolume | Out-Null
            }
            
            podman run -d `
                --name "deeplens-minio-$TenantName" `
                --restart unless-stopped `
                --network deeplens-network `
                -p "${MinioPort}:9000" `
                -p "${MinioConsolePort}:9001" `
                -e "MINIO_ROOT_USER=$minioRootUser" `
                -e "MINIO_ROOT_PASSWORD=$minioRootPassword" `
                -v "${minioVolume}:/data" `
                --label "tenant=$TenantName" `
                --label "service=minio" `
                minio/minio:RELEASE.2023-10-16T04-13-43Z server /data --console-address ":9001" | Out-Null
            
            Write-Host "[OK] MinIO started on ports $MinioPort (API) and $MinioConsolePort (Console)" -ForegroundColor Green
            Write-Host "[INFO] Credentials saved to: $credentialsFile" -ForegroundColor Yellow
        }
    }
    elseif ($StorageType -eq "BYOS") {
        Write-Host "`n[STORAGE] Tenant will use BYOS (Bring Your Own Storage)" -ForegroundColor Cyan
        Write-Host "[INFO] Configure storage credentials in the DeepLens Admin Portal" -ForegroundColor Yellow
    }
    else {
        Write-Host "`n[STORAGE] Storage provisioning skipped" -ForegroundColor Yellow
    }
    
    # Provision Backup Container
    Write-Host "`n[BACKUP] Provisioning backup container..." -ForegroundColor Cyan
    
    # Check if already exists
    $backupExists = podman ps -a --filter "name=^deeplens-backup-$TenantName$" --format "{{.Names}}"
    if ($backupExists) {
        Write-Host "[WARNING] Backup container already exists, skipping..." -ForegroundColor Yellow
        $backupConfigured = $true
    }
    else {
        # Create backup container
        podman run -d `
            --name "deeplens-backup-$TenantName" `
            --restart unless-stopped `
            --network deeplens-network `
            -v "${BackupsPath}:/backups" `
            --label "tenant=$TenantName" `
            --label "service=backup" `
            postgres:16-alpine crond -f -l 2 | Out-Null
        
        # Wait for container to be ready
        Start-Sleep -Seconds 3
        
        # Create backup script inside container
        $backupScript = "#!/bin/sh`n" +
            "TIMESTAMP=`$(date +%Y%m%d_%H%M%S)`n" +
            "BACKUP_FILE=""/backups/backup_`${TIMESTAMP}.sql""`n" +
            "PGPASSWORD='DeepLens123!' pg_dump -h deeplens-postgres -U deeplens -d $TenantDBName > ""`$BACKUP_FILE""`n" +
            "echo ""`$(date): Backup completed - `$BACKUP_FILE"" >> /backups/backup.log`n" +
            "find /backups -name ""backup_*.sql"" -type f -mtime +$BackupRetentionDays -exec rm -f {} +`n"
        
        $backupScript | podman exec -i "deeplens-backup-$TenantName" sh -c "cat > /usr/local/bin/backup.sh"
        podman exec "deeplens-backup-$TenantName" chmod +x /usr/local/bin/backup.sh | Out-Null
        
        # Install cron job
        $cronEntry = "$BackupSchedule /usr/local/bin/backup.sh"
        echo $cronEntry | podman exec -i "deeplens-backup-$TenantName" sh -c "cat > /etc/crontabs/root"
        
        Write-Host "[OK] Backup container configured (Schedule: $BackupSchedule, Retention: $BackupRetentionDays days)" -ForegroundColor Green
        $backupConfigured = $true
    }
    
    # Test backup if requested
    if ($TestBackup -and $backupConfigured) {
        Write-Host "`n[TEST] Running test backup..." -ForegroundColor Cyan
        Start-Sleep -Seconds 3  # Ensure container is ready
        try {
            podman exec "deeplens-backup-$TenantName" sh /usr/local/bin/backup.sh 2>&1 | Out-Null
            Start-Sleep -Seconds 2
            
            $backupFiles = Get-ChildItem -Path $BackupsPath -Filter "backup_*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
            if ($backupFiles) {
                $latestBackup = $backupFiles[0]
                $sizeKB = [math]::Round($latestBackup.Length / 1KB, 2)
                Write-Host "[OK] Test backup successful: $($latestBackup.Name) ($sizeKB KB)" -ForegroundColor Green
            }
            else {
                Write-Host "[WARNING] Test backup file not found" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "[ERROR] Test backup failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Display summary
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Tenant Provisioning Complete" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Tenant Name:       $TenantName" -ForegroundColor Cyan
    Write-Host "  Database:          $TenantDBName" -ForegroundColor Cyan
    Write-Host "  Data Path:         $TenantPath" -ForegroundColor Cyan
    Write-Host "  Storage Type:      $StorageType" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Admin User:        admin@${TenantName}.local" -ForegroundColor Magenta
    Write-Host "  Admin Password:    DeepLens@${TenantName}123!" -ForegroundColor Magenta
    Write-Host "  Admin Role:        TenantOwner" -ForegroundColor Magenta
    Write-Host "  Credentials File:  $TenantPath/admin-credentials.txt" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  Qdrant HTTP:       http://localhost:$QdrantHttpPort" -ForegroundColor Yellow
    Write-Host "  Qdrant Dashboard:  http://localhost:$QdrantHttpPort/dashboard" -ForegroundColor Yellow
    Write-Host "  Qdrant gRPC:       localhost:$QdrantGrpcPort" -ForegroundColor Yellow
    Write-Host ""
    
    if ($StorageType -eq "DeepLens") {
        Write-Host "  MinIO API:         http://localhost:$MinioPort" -ForegroundColor Yellow
        Write-Host "  MinIO Console:     http://localhost:$MinioConsolePort" -ForegroundColor Yellow
        Write-Host "  MinIO Credentials: $TenantPath/minio-credentials.txt" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "  Backup Schedule:   $BackupSchedule" -ForegroundColor Cyan
    Write-Host "  Backup Retention:  $BackupRetentionDays days" -ForegroundColor Cyan
    Write-Host "  Backups Location:  $BackupsPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[IMPORTANT]" -ForegroundColor Red
    Write-Host "  🔐 Change the default admin password after first login!" -ForegroundColor Red
    Write-Host ""
    Write-Host "[NEXT STEPS]" -ForegroundColor Yellow
    Write-Host "  1. Login to WebUI at http://localhost:3000 with admin credentials" -ForegroundColor White
    Write-Host "  2. Configure application to use database: $TenantDBName" -ForegroundColor White
    Write-Host "  3. Configure Qdrant endpoint: http://localhost:$QdrantHttpPort" -ForegroundColor White
    if ($StorageType -eq "DeepLens") {
        Write-Host "  4. Configure MinIO endpoint: http://localhost:$MinioPort" -ForegroundColor White
        Write-Host "  5. Create MinIO buckets and access policies" -ForegroundColor White
    }
    elseif ($StorageType -eq "BYOS") {
        Write-Host "  4. Configure tenant storage credentials in Admin Portal" -ForegroundColor White
    }
    Write-Host ""
}

# Main execution
if ($Remove) {
    Remove-Tenant
}
else {
    Provision-Tenant
}
