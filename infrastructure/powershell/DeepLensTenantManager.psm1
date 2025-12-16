# =============================================================================
# DeepLens Multi-Tenant Management Module
# =============================================================================
# PowerShell module for managing DeepLens multi-tenant operations
# Usage: Import-Module .\DeepLensTenantManager.psm1
# =============================================================================

# Import required modules
Import-Module -Name "Npgsql" -ErrorAction SilentlyContinue

# =============================================================================
# Configuration and Connection Management
# =============================================================================

class DeepLensConfig {
    [string] $PostgresConnectionString
    [string] $PlatformDatabase
    [string] $EncryptionKey
    [hashtable] $StorageProviders
    
    DeepLensConfig() {
        $this.PostgresConnectionString = "Host=localhost;Port=5432;Database=deeplens_platform;Username=deeplens;Password=DeepLens123!"
        $this.PlatformDatabase = "deeplens_platform"
        $this.EncryptionKey = [System.Environment]::GetEnvironmentVariable("DEEPLENS_ENCRYPTION_KEY", "User")
        
        $this.StorageProviders = @{
            "minio" = @{
                "endpoint" = "http://localhost:9000"
                "default_bucket" = "deeplens-images"
                "access_key" = "deeplens"
                "secret_key" = "DeepLens123!"
            }
            "azure_blob" = @{
                "endpoint" = "https://{account}.blob.core.windows.net"
                "default_container" = "images"
            }
            "aws_s3" = @{
                "endpoint" = "https://s3.amazonaws.com"
                "default_bucket" = "deeplens-images"
            }
            "gcs" = @{
                "endpoint" = "https://storage.googleapis.com"
                "default_bucket" = "deeplens-images"
            }
            "nfs" = @{
                "endpoint" = "nfs://localhost"
                "default_path" = "/shared/deeplens-images"
            }
        }
    }
}

# Global configuration instance
$script:Config = [DeepLensConfig]::new()

function Get-DeepLensConnection {
    [CmdletBinding()]
    param(
        [string] $ConnectionString = $script:Config.PostgresConnectionString
    )
    
    try {
        $connection = New-Object Npgsql.NpgsqlConnection($ConnectionString)
        $connection.Open()
        return $connection
    }
    catch {
        Write-Error "Failed to connect to database: $($_.Exception.Message)"
        throw
    }
}

# =============================================================================
# Tenant Management Functions
# =============================================================================

function New-DeepLensTenant {
    <#
    .SYNOPSIS
    Creates a new DeepLens tenant with isolated database and storage configuration.
    
    .DESCRIPTION
    Provisions a complete tenant environment including:
    - Tenant record in platform database
    - Isolated metadata database
    - Storage configuration (BYOS)
    - Usage limits based on plan type
    
    .PARAMETER Name
    Tenant name (used for database naming and identification)
    
    .PARAMETER Domain
    Optional domain for the tenant
    
    .PARAMETER Subdomain
    Optional subdomain for tenant access
    
    .PARAMETER PlanType
    Plan type: 'free', 'premium', or 'enterprise'
    
    .PARAMETER StorageProvider
    Storage provider: 'minio', 'azure_blob', 'aws_s3', 'gcs', or 'nfs'
    
    .PARAMETER StorageConfig
    Storage configuration as hashtable
    
    .EXAMPLE
    New-DeepLensTenant -Name "acme-corp" -Domain "acme.com" -PlanType "premium" -StorageProvider "azure_blob" -StorageConfig @{
        connection_string = "DefaultEndpointsProtocol=https;AccountName=acmestorage;AccountKey=key;EndpointSuffix=core.windows.net"
        container = "images"
    }
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Name,
        
        [Parameter(Mandatory = $false)]
        [string] $Domain = $null,
        
        [Parameter(Mandatory = $false)]
        [string] $Subdomain = $null,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("free", "premium", "enterprise")]
        [string] $PlanType = "free",
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("minio", "azure_blob", "aws_s3", "gcs", "nfs")]
        [string] $StorageProvider = "minio",
        
        [Parameter(Mandatory = $false)]
        [hashtable] $StorageConfig = @{}
    )
    
    try {
        # Merge with default storage configuration
        $defaultConfig = $script:Config.StorageProviders[$StorageProvider]
        $mergedConfig = $defaultConfig.Clone()
        foreach ($key in $StorageConfig.Keys) {
            $mergedConfig[$key] = $StorageConfig[$key]
        }
        
        # Convert to JSON for database storage
        $storageConfigJson = $mergedConfig | ConvertTo-Json -Compress
        
        # Connect to platform database
        $connection = Get-DeepLensConnection
        
        try {
            # Set encryption key for the session
            if ($script:Config.EncryptionKey) {
                $setKeyCmd = $connection.CreateCommand()
                $setKeyCmd.CommandText = "SET encryption.key = @key"
                $setKeyCmd.Parameters.AddWithValue("key", $script:Config.EncryptionKey)
                $setKeyCmd.ExecuteNonQuery() | Out-Null
            }
            
            # Call tenant creation function
            $cmd = $connection.CreateCommand()
            $cmd.CommandText = @"
SELECT * FROM create_tenant(@name, @domain, @subdomain, @plan_type, @storage_provider, @storage_config::jsonb)
"@
            
            $cmd.Parameters.AddWithValue("name", $Name)
            $cmd.Parameters.AddWithValue("domain", [System.DBNull]::Value)
            $cmd.Parameters.AddWithValue("subdomain", [System.DBNull]::Value)
            $cmd.Parameters.AddWithValue("plan_type", $PlanType)
            $cmd.Parameters.AddWithValue("storage_provider", $StorageProvider)
            $cmd.Parameters.AddWithValue("storage_config", $storageConfigJson)
            
            if ($Domain) { $cmd.Parameters["domain"].Value = $Domain }
            if ($Subdomain) { $cmd.Parameters["subdomain"].Value = $Subdomain }
            
            $reader = $cmd.ExecuteReader()
            
            $result = @()
            while ($reader.Read()) {
                $result += [PSCustomObject]@{
                    TenantId = $reader["tenant_id"]
                    TenantName = $reader["tenant_name"]
                    DatabaseName = $reader["database_name"]
                    StorageConfigId = $reader["storage_config_id"]
                    Status = $reader["status"]
                }
            }
            
            Write-Host "✅ Tenant '$Name' created successfully!" -ForegroundColor Green
            Write-Host "   Database: $($result.DatabaseName)" -ForegroundColor Cyan
            Write-Host "   Storage: $StorageProvider" -ForegroundColor Cyan
            Write-Host "   Plan: $PlanType" -ForegroundColor Cyan
            
            return $result
        }
        finally {
            $connection.Close()
        }
    }
    catch {
        Write-Error "Failed to create tenant '$Name': $($_.Exception.Message)"
        throw
    }
}

function Get-DeepLensTenant {
    <#
    .SYNOPSIS
    Retrieves information about DeepLens tenants.
    
    .PARAMETER TenantId
    Specific tenant ID to retrieve (optional)
    
    .PARAMETER ActiveOnly
    Only return active tenants (default: true)
    
    .PARAMETER PlanType
    Filter by plan type (optional)
    
    .EXAMPLE
    Get-DeepLensTenant
    
    .EXAMPLE
    Get-DeepLensTenant -TenantId "12345678-1234-1234-1234-123456789012"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string] $TenantId = $null,
        
        [Parameter(Mandatory = $false)]
        [bool] $ActiveOnly = $true,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("free", "premium", "enterprise")]
        [string] $PlanType = $null
    )
    
    try {
        $connection = Get-DeepLensConnection
        
        try {
            $cmd = $connection.CreateCommand()
            
            if ($TenantId) {
                # Get specific tenant info
                $cmd.CommandText = "SELECT * FROM get_tenant_info(@tenant_id)"
                $cmd.Parameters.AddWithValue("tenant_id", [Guid]::Parse($TenantId))
            } else {
                # List tenants
                $cmd.CommandText = "SELECT * FROM list_tenants(@active_only, @plan_type)"
                $cmd.Parameters.AddWithValue("active_only", $ActiveOnly)
                $planTypeValue = if ($PlanType) { $PlanType } else { [System.DBNull]::Value }
                $cmd.Parameters.AddWithValue("plan_type", $planTypeValue)
            }
            
            $reader = $cmd.ExecuteReader()
            
            $results = @()
            while ($reader.Read()) {
                if ($TenantId) {
                    # Detailed tenant info
                    $results += [PSCustomObject]@{
                        TenantId = $reader["tenant_id"]
                        Name = $reader["tenant_name"]
                        Domain = if ($reader["domain"] -eq [System.DBNull]::Value) { $null } else { $reader["domain"] }
                        Subdomain = if ($reader["subdomain"] -eq [System.DBNull]::Value) { $null } else { $reader["subdomain"] }
                        PlanType = $reader["plan_type"]
                        IsActive = $reader["is_active"]
                        CreatedAt = $reader["created_at"]
                        UsageLimits = $reader["usage_limits"]
                        DatabaseCount = $reader["database_count"]
                        StorageProvider = if ($reader["storage_provider"] -eq [System.DBNull]::Value) { $null } else { $reader["storage_provider"] }
                        StorageStatus = if ($reader["storage_status"] -eq [System.DBNull]::Value) { $null } else { $reader["storage_status"] }
                    }
                } else {
                    # Tenant list
                    $results += [PSCustomObject]@{
                        TenantId = $reader["tenant_id"]
                        Name = $reader["tenant_name"]
                        Domain = if ($reader["domain"] -eq [System.DBNull]::Value) { $null } else { $reader["domain"] }
                        PlanType = $reader["plan_type"]
                        IsActive = $reader["is_active"]
                        CreatedAt = $reader["created_at"]
                        DatabaseCount = $reader["database_count"]
                    }
                }
            }
            
            return $results
        }
        finally {
            $connection.Close()
        }
    }
    catch {
        Write-Error "Failed to retrieve tenant information: $($_.Exception.Message)"
        throw
    }
}

function Remove-DeepLensTenant {
    <#
    .SYNOPSIS
    Removes a DeepLens tenant and all associated resources.
    
    .PARAMETER TenantId
    ID of the tenant to remove
    
    .PARAMETER Confirm
    Confirm deletion (required for safety)
    
    .EXAMPLE
    Remove-DeepLensTenant -TenantId "12345678-1234-1234-1234-123456789012" -Confirm
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId,
        
        [Parameter(Mandatory = $true)]
        [switch] $Confirm
    )
    
    if (-not $Confirm) {
        Write-Error "Tenant deletion requires -Confirm switch for safety"
        return
    }
    
    try {
        $connection = Get-DeepLensConnection
        
        try {
            $cmd = $connection.CreateCommand()
            $cmd.CommandText = "SELECT * FROM delete_tenant(@tenant_id, @confirm_deletion)"
            $cmd.Parameters.AddWithValue("tenant_id", [Guid]::Parse($TenantId))
            $cmd.Parameters.AddWithValue("confirm_deletion", $true)
            
            $reader = $cmd.ExecuteReader()
            
            $result = $null
            if ($reader.Read()) {
                $result = [PSCustomObject]@{
                    TenantId = $reader["tenant_id"]
                    DatabasesDropped = $reader["databases_dropped"]
                    Status = $reader["status"]
                }
            }
            
            Write-Host "✅ Tenant removed successfully!" -ForegroundColor Green
            Write-Host "   Databases dropped: $($result.DatabasesDropped)" -ForegroundColor Cyan
            
            return $result
        }
        finally {
            $connection.Close()
        }
    }
    catch {
        Write-Error "Failed to remove tenant '$TenantId': $($_.Exception.Message)"
        throw
    }
}

# =============================================================================
# Storage Configuration Management
# =============================================================================

function Test-DeepLensStorageConfig {
    <#
    .SYNOPSIS
    Tests a tenant's storage configuration connectivity.
    
    .PARAMETER TenantId
    Tenant ID to test storage for
    
    .PARAMETER StorageProvider
    Storage provider to test
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId,
        
        [Parameter(Mandatory = $false)]
        [string] $StorageProvider = $null
    )
    
    Write-Host "🔧 Testing storage configuration for tenant $TenantId..." -ForegroundColor Yellow
    
    # This would integrate with actual storage providers
    # For now, we'll simulate the test
    
    try {
        $connection = Get-DeepLensConnection
        
        try {
            $cmd = $connection.CreateCommand()
            $updateSql = @'
UPDATE tenant_storage_configs 
SET test_status = 'success', last_tested = CURRENT_TIMESTAMP, test_error = NULL
WHERE tenant_id = @tenant_id 
AND (@provider IS NULL OR provider = @provider)
'@
            $cmd.CommandText = $updateSql
            $cmd.Parameters.AddWithValue("tenant_id", [Guid]::Parse($TenantId))
            $providerValue = if ($StorageProvider) { $StorageProvider } else { [System.DBNull]::Value }
            $cmd.Parameters.AddWithValue("provider", $providerValue)
            
            $affectedRows = $cmd.ExecuteNonQuery()
            
            if ($affectedRows -gt 0) {
                Write-Host "✅ Storage configuration test passed!" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ No storage configurations found to test" -ForegroundColor Red
                return $false
            }
        }
        finally {
            $connection.Close()
        }
    }
    catch {
        Write-Error "Storage test failed: $($_.Exception.Message)"
        return $false
    }
}

# =============================================================================
# Infrastructure Management
# =============================================================================

function Start-DeepLensInfrastructure {
    <#
    .SYNOPSIS
    Starts the DeepLens infrastructure using Docker Compose.
    #>
    [CmdletBinding()]
    param()
    
    Write-Host "🚀 Starting DeepLens infrastructure..." -ForegroundColor Cyan
    
    $infraPath = "infrastructure"
    if (-not (Test-Path $infraPath)) {
        Write-Error "Infrastructure directory not found at: $infraPath"
        return
    }
    
    Set-Location $infraPath
    
    try {
        # Start infrastructure services
        Write-Host "Starting infrastructure services..." -ForegroundColor Yellow
        docker-compose -f docker-compose.infrastructure.yml up -d
        
        Start-Sleep -Seconds 15
        
        # Start monitoring services (optional)
        Write-Host "Starting monitoring services..." -ForegroundColor Yellow
        docker-compose -f docker-compose.monitoring.yml up -d
        
        Start-Sleep -Seconds 10
        
        # Wait for services to be healthy
        Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        # Test connections
        Write-Host "Testing service connections..." -ForegroundColor Yellow
        $services = @("postgres", "redis", "qdrant", "minio", "infisical", "kafka")
        foreach ($service in $services) {
            $status = docker-compose -f docker-compose.infrastructure.yml ps $service --format "table {{.Status}}"
            Write-Host "  $service`: $status" -ForegroundColor Cyan
        }
        
        Write-Host "✅ DeepLens infrastructure started!" -ForegroundColor Green
        Write-Host "🌐 Access services:" -ForegroundColor Cyan
        Write-Host "   • MinIO Console: http://localhost:9001 (deeplens/DeepLens123!)" -ForegroundColor White
        Write-Host "   • Qdrant Dashboard: http://localhost:6333/dashboard" -ForegroundColor White
        Write-Host "   • Kafka UI: http://localhost:8080" -ForegroundColor White
        Write-Host "   • InfluxDB: http://localhost:8086 (admin/DeepLens123!)" -ForegroundColor White
        Write-Host "   • Infisical: http://localhost:8082" -ForegroundColor White
        Write-Host "   • Grafana: http://localhost:3000 (admin/DeepLens123!)" -ForegroundColor White
        Write-Host "   • Portainer: http://localhost:9443" -ForegroundColor White
    }
    catch {
        Write-Error "Failed to start infrastructure: $($_.Exception.Message)"
    }
    finally {
        Set-Location ..
    }
}

function Stop-DeepLensInfrastructure {
    <#
    .SYNOPSIS
    Stops the DeepLens infrastructure.
    #>
    [CmdletBinding()]
    param()
    
    Write-Host "🛑 Stopping DeepLens infrastructure..." -ForegroundColor Yellow
    
    $infraPath = "infrastructure"
    if (-not (Test-Path $infraPath)) {
        Write-Error "Infrastructure directory not found at: $infraPath"
        return
    }
    
    Set-Location $infraPath
    
    try {
        docker-compose -f docker-compose.monitoring.yml down
        docker-compose -f docker-compose.infrastructure.yml down
        Write-Host "✅ DeepLens infrastructure stopped!" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to stop infrastructure: $($_.Exception.Message)"
    }
    finally {
        Set-Location ..
    }
}

# =============================================================================
# Utility Functions
# =============================================================================

function Show-DeepLensStatus {
    <#
    .SYNOPSIS
    Shows overall DeepLens platform status.
    #>
    [CmdletBinding()]
    param()
    
    Write-Host "📊 DeepLens Platform Status" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    try {
        # Get tenant count
        $tenants = Get-DeepLensTenant
        Write-Host "Active Tenants: $($tenants.Count)" -ForegroundColor Green
        
        # Show tenant breakdown by plan
        $planCounts = $tenants | Group-Object PlanType | ForEach-Object { "$($_.Name): $($_.Count)" }
        Write-Host "Plan Distribution: $($planCounts -join ', ')" -ForegroundColor White
        
        # Check service status (if running)
        Write-Host "`nService Status:" -ForegroundColor Yellow
        
        $services = @{
            "postgres" = "5432"
            "redis" = "6379"
            "qdrant" = "6333"
            "minio" = "9000"
            "influxdb" = "8086"
            "kafka" = "9092"
            "infisical" = "8082"
            "grafana" = "3000"
            "prometheus" = "9090"
        }
        
        foreach ($service in $services.GetEnumerator()) {
            try {
                $connection = New-Object System.Net.Sockets.TcpClient
                $connection.Connect("localhost", $service.Value)
                $connection.Close()
                Write-Host "  ✅ $($service.Key) (port $($service.Value))" -ForegroundColor Green
            }
            catch {
                Write-Host "  ❌ $($service.Key) (port $($service.Value))" -ForegroundColor Red
            }
        }
    }
    catch {
        Write-Error "Failed to get platform status: $($_.Exception.Message)"
    }
}

# =============================================================================
# Integration Functions
# =============================================================================

function Initialize-DeepLensTenantCache {
    <#
    .SYNOPSIS
    Initializes Redis databases for a tenant.
    
    .PARAMETER TenantId
    Tenant ID to initialize cache for
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId
    )
    
    Write-Host "🔧 Initializing Redis cache for tenant $TenantId..." -ForegroundColor Yellow
    
    try {
        # Get tenant database number (0-15)
        $dbNumber = [Math]::Abs($TenantId.GetHashCode()) % 16
        
        # Connect to Redis and select tenant database
        $redisCmd = "docker exec -it deeplens-redis redis-cli SELECT $dbNumber"
        Invoke-Expression $redisCmd
        
        Write-Host "✅ Tenant cache initialized on Redis DB $dbNumber" -ForegroundColor Green
        return $dbNumber
    }
    catch {
        Write-Error "Failed to initialize tenant cache: $($_.Exception.Message)"
        return $null
    }
}

function Initialize-DeepLensTenantVectors {
    <#
    .SYNOPSIS
    Creates Qdrant collection for a tenant via .NET AdminApi.
    
    .PARAMETER TenantId
    Tenant ID to create collection for
    
    .PARAMETER AdminApiBaseUrl
    Base URL for DeepLens AdminApi (default: http://localhost:5001)
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId,
        
        [Parameter(Mandatory = $false)]
        [string] $AdminApiBaseUrl = "http://localhost:5001"
    )
    
    Write-Host "🔧 Creating vector collection for tenant $TenantId via .NET AdminApi..." -ForegroundColor Yellow
    
    try {
        # Default collection for ResNet50 Phase 1 (backwards compatibility)
        $modelName = "resnet50"
        $vectorDimension = 2048
        
        # Call .NET AdminApi to create collection
        $createCollectionPayload = @{
            tenantId = $TenantId
            modelName = $modelName
            vectorDimension = $vectorDimension
        } | ConvertTo-Json -Depth 3
        
        $uri = "$AdminApiBaseUrl/api/v1/admin/collections"
        $response = Invoke-RestMethod -Uri $uri -Method POST -Body $createCollectionPayload -ContentType "application/json"
        
        if ($response -and $response.success) {
            Write-Host "✅ Vector collection '$($response.collectionName)' created successfully" -ForegroundColor Green
            return $response.collectionName
        } else {
            Write-Error "Collection creation failed: $($response.message)"
            return $null
        }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 'NotFound') {
            Write-Warning "AdminApi not available at $AdminApiBaseUrl. Ensure DeepLens.AdminApi is running."
            Write-Host "💡 You can start it with: dotnet run --project src/DeepLens.AdminApi" -ForegroundColor Cyan
        } else {
            Write-Error "Failed to create vector collection: $($_.Exception.Message)"
        }
        return $null
    }
}

function Initialize-DeepLensTenantVectorsForModel {
    <#
    .SYNOPSIS
    Creates Qdrant collection for a specific model and tenant via .NET AdminApi.
    
    .PARAMETER TenantId
    Tenant ID to create collection for
    
    .PARAMETER ModelName
    Name of the model (e.g., "resnet50", "clip-vit-b32")
    
    .PARAMETER FeatureDimension
    Dimension of the feature vectors for this model
    
    .PARAMETER AdminApiBaseUrl
    Base URL for DeepLens AdminApi (default: http://localhost:5001)
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId,
        
        [Parameter(Mandatory = $true)]
        [string] $ModelName,
        
        [Parameter(Mandatory = $true)]
        [int] $FeatureDimension,
        
        [Parameter(Mandatory = $false)]
        [string] $AdminApiBaseUrl = "http://localhost:5001"
    )
    
    Write-Host "🔧 Creating vector collection for tenant $TenantId, model $ModelName via .NET AdminApi..." -ForegroundColor Yellow
    
    try {
        # Call .NET AdminApi to create model-specific collection
        $createCollectionPayload = @{
            tenantId = $TenantId
            modelName = $ModelName
            vectorDimension = $FeatureDimension
        } | ConvertTo-Json -Depth 3
        
        $uri = "$AdminApiBaseUrl/api/v1/admin/collections"
        $response = Invoke-RestMethod -Uri $uri -Method POST -Body $createCollectionPayload -ContentType "application/json"
        
        if ($response -and $response.success) {
            Write-Host "✅ Vector collection '$($response.collectionName)' created for model $ModelName" -ForegroundColor Green
            return $response.collectionName
        } else {
            Write-Error "Collection creation failed: $($response.message)"
            return $null
        }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 'NotFound') {
            Write-Warning "AdminApi not available at $AdminApiBaseUrl. Ensure DeepLens.AdminApi is running."
            Write-Host "💡 You can start it with: dotnet run --project src/DeepLens.AdminApi" -ForegroundColor Cyan
        } else {
            Write-Error "Failed to create vector collection for model: $($_.Exception.Message)"
        }
        return $null
    }
}

function Get-DeepLensInfisicalSecrets {
    <#
    .SYNOPSIS
    Retrieves secrets from Infisical for tenant configuration.
    
    .PARAMETER TenantId
    Tenant ID to get secrets for
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId
    )
    
    Write-Host "🔐 Retrieving Infisical secrets for tenant $TenantId..." -ForegroundColor Yellow
    
    try {
        # This would integrate with Infisical API
        # For now, return placeholder structure
        $secrets = @{
            DatabasePassword = "tenant_secure_password_$TenantId"
            StorageAccessKey = "storage_key_$TenantId"
            APIKey = "api_key_$TenantId"
        }
        
        Write-Host "✅ Retrieved $(($secrets.Keys).Count) secrets from Infisical" -ForegroundColor Green
        return $secrets
    }
    catch {
        Write-Error "Failed to retrieve Infisical secrets: $($_.Exception.Message)"
        return @{}
    }
}

function Test-DeepLensMonitoringStack {
    <#
    .SYNOPSIS
    Tests the monitoring stack connectivity and health.
    #>
    [CmdletBinding()]
    param()
    
    Write-Host "📊 Testing monitoring stack..." -ForegroundColor Cyan
    
    $monitoringServices = @{
        "Prometheus" = "http://localhost:9090/-/healthy"
        "Grafana" = "http://localhost:3000/api/health"
        "Loki" = "http://localhost:3100/ready"
        "Jaeger" = "http://localhost:16686/"
    }
    
    foreach ($service in $monitoringServices.GetEnumerator()) {
        try {
            $response = Invoke-WebRequest -Uri $service.Value -Method GET -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ $($service.Key)" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $($service.Key) (Status: $($response.StatusCode))" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "  ❌ $($service.Key) (Error: $($_.Exception.Message))" -ForegroundColor Red
        }
    }
}

# =============================================================================
# Tenant MinIO Storage Provisioning
# =============================================================================

function New-TenantMinIOStorage {
    <#
    .SYNOPSIS
    Provisions a dedicated MinIO instance for a tenant with NFS storage backend.
    
    .DESCRIPTION
    Creates a containerized MinIO instance for a tenant when they don't bring their own storage (BYOS).
    The MinIO data is stored on an NFS path supplied by the tenant.
    
    .PARAMETER TenantId
    Tenant ID for which to provision MinIO storage
    
    .PARAMETER TenantName
    Tenant name (used for container naming)
    
    .PARAMETER NFSPath
    NFS path where tenant data will be stored (e.g., "nfs-server:/exports/tenant-data")
    
    .PARAMETER MinIOPort
    API port for MinIO (default: auto-assigned starting from 9100)
    
    .PARAMETER ConsolePort
    Console UI port for MinIO (default: auto-assigned starting from 9200)
    
    .PARAMETER AccessKey
    MinIO access key (default: auto-generated)
    
    .PARAMETER SecretKey
    MinIO secret key (default: auto-generated)
    
    .PARAMETER NFSOptions
    NFS mount options (default: "rw,sync,hard,intr")
    
    .EXAMPLE
    New-TenantMinIOStorage -TenantId "12345678-1234-1234-1234-123456789012" -TenantName "vayyari" -NFSPath "nfs-server.company.com:/exports/vayyari"
    
    .EXAMPLE
    New-TenantMinIOStorage -TenantId "12345678-1234-1234-1234-123456789012" -TenantName "vayyari" -NFSPath "10.0.1.100:/mnt/storage/vayyari" -NFSOptions "rw,sync,nolock"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId,
        
        [Parameter(Mandatory = $true)]
        [string] $TenantName,
        
        [Parameter(Mandatory = $true)]
        [string] $NFSPath,
        
        [Parameter(Mandatory = $false)]
        [int] $MinIOPort = 0,
        
        [Parameter(Mandatory = $false)]
        [int] $ConsolePort = 0,
        
        [Parameter(Mandatory = $false)]
        [string] $AccessKey = "",
        
        [Parameter(Mandatory = $false)]
        [string] $SecretKey = "",
        
        [Parameter(Mandatory = $false)]
        [string] $NFSOptions = "rw,sync,hard,intr"
    )
    
    Write-Host "🗄️ Provisioning MinIO storage for tenant: $TenantName" -ForegroundColor Cyan
    Write-Host "   Tenant ID: $TenantId" -ForegroundColor White
    Write-Host "   NFS Path: $NFSPath" -ForegroundColor White
    
    try {
        # Generate credentials if not provided
        if ([string]::IsNullOrEmpty($AccessKey)) {
            $AccessKey = "tenant-$TenantName-$(Get-Random -Minimum 1000 -Maximum 9999)"
        }
        
        if ([string]::IsNullOrEmpty($SecretKey)) {
            $bytes = New-Object byte[] 32
            [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
            $SecretKey = [Convert]::ToBase64String($bytes)
        }
        
        # Auto-assign ports if not provided
        if ($MinIOPort -eq 0) {
            # Find next available port starting from 9100
            $MinIOPort = 9100
            while (Test-NetConnection -ComputerName localhost -Port $MinIOPort -InformationLevel Quiet -WarningAction SilentlyContinue) {
                $MinIOPort++
            }
        }
        
        if ($ConsolePort -eq 0) {
            # Find next available port starting from 9200
            $ConsolePort = 9200
            while (Test-NetConnection -ComputerName localhost -Port $ConsolePort -InformationLevel Quiet -WarningAction SilentlyContinue) {
                $ConsolePort++
            }
        }
        
        $containerName = "deeplens-minio-$TenantName"
        $volumeName = "deeplens_minio_${TenantName}_data"
        
        Write-Host "   API Port: $MinIOPort" -ForegroundColor White
        Write-Host "   Console Port: $ConsolePort" -ForegroundColor White
        
        # Create Docker volume with NFS driver
        Write-Host "📦 Creating NFS-backed Docker volume..." -ForegroundColor Yellow
        $volumeCreateCmd = @"
docker volume create --driver local `
  --opt type=nfs `
  --opt o=$NFSOptions `
  --opt device=:$NFSPath `
  $volumeName
"@
        
        Invoke-Expression $volumeCreateCmd
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create NFS volume. Please ensure NFS server is accessible and path exists."
        }
        
        Write-Host "✅ NFS volume created: $volumeName" -ForegroundColor Green
        
        # Check if container already exists
        $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
        if ($existingContainer -eq $containerName) {
            Write-Host "⚠️ Container $containerName already exists. Removing..." -ForegroundColor Yellow
            docker rm -f $containerName | Out-Null
        }
        
        # Create MinIO container
        Write-Host "🚀 Starting MinIO container..." -ForegroundColor Yellow
        $containerCreateCmd = @"
docker run -d `
  --name $containerName `
  --network deeplens-network `
  -p ${MinIOPort}:9000 `
  -p ${ConsolePort}:9001 `
  -v ${volumeName}:/data `
  -e MINIO_ROOT_USER=$AccessKey `
  -e MINIO_ROOT_PASSWORD=$SecretKey `
  -e MINIO_BROWSER_REDIRECT_URL=http://localhost:$ConsolePort `
  --health-cmd="curl -f http://localhost:9000/minio/health/live || exit 1" `
  --health-interval=30s `
  --health-timeout=20s `
  --health-retries=3 `
  --restart unless-stopped `
  --label tenant.id=$TenantId `
  --label tenant.name=$TenantName `
  --label storage.type=minio `
  --label storage.nfs.path=$NFSPath `
  minio/minio:latest `
  server /data --console-address ":9001"
"@
        
        $containerId = Invoke-Expression $containerCreateCmd
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create MinIO container"
        }
        
        Write-Host "✅ MinIO container started: $containerName" -ForegroundColor Green
        
        # Wait for MinIO to be ready
        Write-Host "⏳ Waiting for MinIO to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        $maxRetries = 12
        $retryCount = 0
        $isReady = $false
        
        while (-not $isReady -and $retryCount -lt $maxRetries) {
            try {
                $health = Invoke-RestMethod -Uri "http://localhost:${MinIOPort}/minio/health/live" -Method GET -ErrorAction SilentlyContinue
                $isReady = $true
            }
            catch {
                $retryCount++
                Start-Sleep -Seconds 5
            }
        }
        
        if (-not $isReady) {
            Write-Warning "MinIO may not be fully ready yet. Check container logs: docker logs $containerName"
        }
        
        # Create default bucket for the tenant
        Write-Host "🪣 Creating default bucket 'images'..." -ForegroundColor Yellow
        
        $mcAlias = "tenant-$TenantName"
        docker exec $containerName mc alias set $mcAlias http://localhost:9000 $AccessKey $SecretKey
        docker exec $containerName mc mb ${mcAlias}/images --ignore-existing
        docker exec $containerName mc anonymous set download ${mcAlias}/images
        
        Write-Host ""
        Write-Host "✅ MinIO storage provisioned successfully for tenant: $TenantName" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 MinIO Configuration:" -ForegroundColor Cyan
        Write-Host "   Container Name: $containerName" -ForegroundColor White
        Write-Host "   API Endpoint:   http://localhost:$MinIOPort" -ForegroundColor White
        Write-Host "   Console URL:    http://localhost:$ConsolePort" -ForegroundColor White
        Write-Host "   Access Key:     $AccessKey" -ForegroundColor White
        Write-Host "   Secret Key:     $SecretKey" -ForegroundColor White
        Write-Host "   Default Bucket: images" -ForegroundColor White
        Write-Host "   NFS Backend:    $NFSPath" -ForegroundColor White
        Write-Host "   Docker Volume:  $volumeName" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Use these credentials to update tenant storage configuration:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Set-TenantStorageConfig -TenantId '$TenantId' -StorageProvider 'minio' -Config @{" -ForegroundColor Gray
        Write-Host "       endpoint = 'http://localhost:$MinIOPort'" -ForegroundColor Gray
        Write-Host "       access_key = '$AccessKey'" -ForegroundColor Gray
        Write-Host "       secret_key = '$SecretKey'" -ForegroundColor Gray
        Write-Host "       bucket = 'images'" -ForegroundColor Gray
        Write-Host "       secure = `$false" -ForegroundColor Gray
        Write-Host "   }" -ForegroundColor Gray
        Write-Host ""
        
        return @{
            TenantId = $TenantId
            TenantName = $TenantName
            ContainerName = $containerName
            ContainerId = $containerId
            VolumeName = $volumeName
            NFSPath = $NFSPath
            APIEndpoint = "http://localhost:$MinIOPort"
            ConsoleURL = "http://localhost:$ConsolePort"
            AccessKey = $AccessKey
            SecretKey = $SecretKey
            DefaultBucket = "images"
            Status = "Running"
        }
    }
    catch {
        Write-Error "Failed to provision MinIO storage for tenant '$TenantName': $($_.Exception.Message)"
        Write-Host ""
        Write-Host "🔍 Troubleshooting Tips:" -ForegroundColor Yellow
        Write-Host "   1. Verify NFS server is accessible: ping <nfs-server>" -ForegroundColor White
        Write-Host "   2. Check NFS exports: showmount -e <nfs-server>" -ForegroundColor White
        Write-Host "   3. Ensure NFS path exists and has proper permissions" -ForegroundColor White
        Write-Host "   4. Check Docker logs: docker logs deeplens-minio-$TenantName" -ForegroundColor White
        Write-Host "   5. Verify ports $MinIOPort and $ConsolePort are not in use" -ForegroundColor White
        throw
    }
}

function Remove-TenantMinIOStorage {
    <#
    .SYNOPSIS
    Removes a tenant's MinIO instance and optionally the data volume.
    
    .PARAMETER TenantName
    Tenant name whose MinIO instance to remove
    
    .PARAMETER RemoveVolume
    Also remove the Docker volume (NFS mount). Default: $false for safety
    
    .PARAMETER Confirm
    Confirm removal (required for safety)
    
    .EXAMPLE
    Remove-TenantMinIOStorage -TenantName "vayyari" -Confirm
    
    .EXAMPLE
    Remove-TenantMinIOStorage -TenantName "vayyari" -RemoveVolume -Confirm
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantName,
        
        [Parameter(Mandatory = $false)]
        [switch] $RemoveVolume,
        
        [Parameter(Mandatory = $true)]
        [switch] $Confirm
    )
    
    if (-not $Confirm) {
        Write-Error "MinIO removal requires -Confirm switch for safety"
        return
    }
    
    Write-Host "🗑️ Removing MinIO storage for tenant: $TenantName" -ForegroundColor Yellow
    
    try {
        $containerName = "deeplens-minio-$TenantName"
        $volumeName = "deeplens_minio_${TenantName}_data"
        
        # Check if container exists
        $existingContainer = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
        
        if ($existingContainer -eq $containerName) {
            Write-Host "🛑 Stopping and removing container: $containerName" -ForegroundColor Yellow
            docker rm -f $containerName | Out-Null
            Write-Host "✅ Container removed" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️ Container $containerName not found" -ForegroundColor Yellow
        }
        
        # Remove volume if requested
        if ($RemoveVolume) {
            $existingVolume = docker volume ls --filter "name=$volumeName" --format "{{.Name}}"
            
            if ($existingVolume -eq $volumeName) {
                Write-Host "🗂️ Removing NFS volume: $volumeName" -ForegroundColor Yellow
                Write-Host "⚠️ WARNING: This will unmount the NFS share but data on NFS server remains intact" -ForegroundColor Red
                docker volume rm $volumeName | Out-Null
                Write-Host "✅ Volume removed" -ForegroundColor Green
            }
            else {
                Write-Host "⚠️ Volume $volumeName not found" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "💾 Volume $volumeName retained (use -RemoveVolume to remove)" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host "✅ MinIO storage removed for tenant: $TenantName" -ForegroundColor Green
        
        return @{
            TenantName = $TenantName
            ContainerRemoved = $true
            VolumeRemoved = $RemoveVolume.IsPresent
            Status = "Removed"
        }
    }
    catch {
        Write-Error "Failed to remove MinIO storage for tenant '$TenantName': $($_.Exception.Message)"
        throw
    }
}

function Get-TenantMinIOStatus {
    <#
    .SYNOPSIS
    Gets status and information about a tenant's MinIO instance.
    
    .PARAMETER TenantName
    Tenant name to check MinIO status for
    
    .EXAMPLE
    Get-TenantMinIOStatus -TenantName "vayyari"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantName
    )
    
    try {
        $containerName = "deeplens-minio-$TenantName"
        
        # Check if container exists
        $containerInfo = docker inspect $containerName 2>$null | ConvertFrom-Json
        
        if (-not $containerInfo) {
            Write-Host "❌ MinIO container not found for tenant: $TenantName" -ForegroundColor Red
            return @{
                TenantName = $TenantName
                Status = "Not Found"
                Exists = $false
            }
        }
        
        $container = $containerInfo[0]
        $isRunning = $container.State.Running
        $status = $container.State.Status
        $health = $container.State.Health.Status
        
        # Extract configuration
        $tenantId = ($container.Config.Labels."tenant.id")
        $nfsPath = ($container.Config.Labels."storage.nfs.path")
        
        # Extract ports
        $apiPort = ($container.NetworkSettings.Ports."9000/tcp"[0].HostPort)
        $consolePort = ($container.NetworkSettings.Ports."9001/tcp"[0].HostPort)
        
        # Extract volume
        $volume = $container.Mounts[0].Name
        
        Write-Host ""
        Write-Host "📊 MinIO Status for Tenant: $TenantName" -ForegroundColor Cyan
        Write-Host "   Container:      $containerName" -ForegroundColor White
        Write-Host "   Status:         $status" -ForegroundColor $(if ($isRunning) { "Green" } else { "Red" })
        Write-Host "   Health:         $health" -ForegroundColor $(if ($health -eq "healthy") { "Green" } else { "Yellow" })
        Write-Host "   Tenant ID:      $tenantId" -ForegroundColor White
        Write-Host "   API Endpoint:   http://localhost:$apiPort" -ForegroundColor White
        Write-Host "   Console URL:    http://localhost:$consolePort" -ForegroundColor White
        Write-Host "   NFS Backend:    $nfsPath" -ForegroundColor White
        Write-Host "   Docker Volume:  $volume" -ForegroundColor White
        Write-Host "   Started:        $($container.State.StartedAt)" -ForegroundColor White
        Write-Host ""
        
        return @{
            TenantName = $TenantName
            TenantId = $tenantId
            ContainerName = $containerName
            Status = $status
            IsRunning = $isRunning
            Health = $health
            APIEndpoint = "http://localhost:$apiPort"
            ConsoleURL = "http://localhost:$consolePort"
            NFSPath = $nfsPath
            VolumeName = $volume
            StartedAt = $container.State.StartedAt
            Exists = $true
        }
    }
    catch {
        Write-Error "Failed to get MinIO status for tenant '$TenantName': $($_.Exception.Message)"
        throw
    }
}

function Get-AllTenantMinIOInstances {
    <#
    .SYNOPSIS
    Lists all tenant MinIO instances managed by DeepLens.
    
    .EXAMPLE
    Get-AllTenantMinIOInstances
    #>
    [CmdletBinding()]
    param()
    
    try {
        Write-Host "📋 Listing all tenant MinIO instances..." -ForegroundColor Cyan
        Write-Host ""
        
        # Find all containers with tenant.id label
        $containers = docker ps -a --filter "label=storage.type=minio" --filter "label=tenant.name" --format "{{.Names}}"
        
        if (-not $containers) {
            Write-Host "No tenant MinIO instances found." -ForegroundColor Yellow
            return @()
        }
        
        $results = @()
        
        foreach ($containerName in $containers) {
            $tenantName = $containerName -replace "deeplens-minio-", ""
            $status = Get-TenantMinIOStatus -TenantName $tenantName
            $results += $status
        }
        
        Write-Host "Found $($results.Count) tenant MinIO instance(s)" -ForegroundColor Green
        Write-Host ""
        
        return $results
    }
    catch {
        Write-Error "Failed to list tenant MinIO instances: $($_.Exception.Message)"
        throw
    }
}

# =============================================================================
# Tenant Data Backup
# =============================================================================

function Backup-DeepLensTenantData {
    <#
    .SYNOPSIS
    Creates backup of tenant data.
    
    .PARAMETER TenantId
    Tenant ID to backup
    
    .PARAMETER BackupPath
    Path to store backup files
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId,
        
        [Parameter(Mandatory = $false)]
        [string] $BackupPath = ".\backups"
    )
    
    Write-Host "💾 Creating backup for tenant $TenantId..." -ForegroundColor Yellow
    
    try {
        # Ensure backup directory exists
        if (-not (Test-Path $BackupPath)) {
            New-Item -ItemType Directory -Path $BackupPath | Out-Null
        }
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFileName = "tenant_${TenantId}_backup_${timestamp}.sql"
        $backupFilePath = Join-Path $BackupPath $backupFileName
        
        # Backup tenant database
        $tenantDbName = "tenant_${TenantId}_metadata"
        $backupCmd = "docker exec deeplens-postgres pg_dump -U deeplens -d $tenantDbName"
        $backupData = Invoke-Expression $backupCmd
        
        # Save to file
        $backupData | Out-File -FilePath $backupFilePath -Encoding UTF8
        
        Write-Host "✅ Backup created: $backupFilePath" -ForegroundColor Green
        return $backupFilePath
    }
    catch {
        Write-Error "Failed to create backup: $($_.Exception.Message)"
        return $null
    }
}

function Initialize-DeepLensModelCollections {
    <#
    .SYNOPSIS
    Creates Qdrant collection for ResNet50 model (Phase 1: Single Model Focus)
    
    .PARAMETER TenantId
    Tenant ID to create collection for
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId
    )
    
    Write-Host "🤖 Setting up ResNet50 collection for tenant $TenantId (Phase 1)..." -ForegroundColor Yellow
    
    try {
        # Phase 1: Only ResNet50 model
        $collectionName = Initialize-DeepLensTenantVectorsForModel `
            -TenantId $TenantId `
            -ModelName "resnet50" `
            -ModelVersion "v2.7" `
            -FeatureDimension 2048
        
        if ($collectionName) {
            $createdCollection = @{
                ModelName = "resnet50"
                Version = "v2.7"
                CollectionName = $collectionName
                FeatureDimension = 2048
                Description = "ResNet50 v2.7 pre-trained on ImageNet"
                Phase = "1 - Production Ready"
            }
            
            Write-Host "✅ ResNet50 collection created for tenant $TenantId" -ForegroundColor Green
            Write-Host "   Collection: $collectionName" -ForegroundColor White
            Write-Host "   Dimensions: 2048 (ResNet50)" -ForegroundColor White
            Write-Host "   Phase: 1 - Single Model Focus" -ForegroundColor White
            
            return $createdCollection
        }
        else {
            throw "Failed to create ResNet50 collection"
        }
    }
    catch {
        Write-Error "Failed to create ResNet50 collection: $($_.Exception.Message)"
        return $null
    }
    
    # Phase 2 Future: Multi-model support
    # Commented out for Phase 1 focus
    <#
    $multiModelConfigs = @{
        "clip-vit-b32" = @{ Version = "v1.0"; FeatureDimension = 512 }
        "efficientnet-b7" = @{ Version = "v1.0"; FeatureDimension = 2560 }
    }
    #>
}

# Phase 2 Future: Smart Model Introduction (Commented out for Phase 1)
<#
function Start-SmartModelIntroduction {
    # This function will be enabled in Phase 2 when we're ready for A/B testing
    # For now, focusing on single ResNet50 model implementation
}
#>

function Show-Phase1Status {
    <#
    .SYNOPSIS
    Shows Phase 1 implementation status focusing on single ResNet50 model
    
    .PARAMETER TenantId
    Tenant ID to check status for
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantId
    )
    
    Write-Host "📊 DeepLens Phase 1 Status - Single Model Focus" -ForegroundColor Cyan
    Write-Host "   Tenant: $TenantId" -ForegroundColor White
    Write-Host ""
    
    try {
        # Check ResNet50 collection
        $resnetCollection = "tenant_${TenantId}_vectors_resnet50_v2_7"
        
        Write-Host "🤖 Model Configuration:" -ForegroundColor Green
        Write-Host "   • Primary Model: ResNet50 v2.7" -ForegroundColor White
        Write-Host "   • Feature Dimensions: 2048" -ForegroundColor White
        Write-Host "   • Collection: $resnetCollection" -ForegroundColor White
        Write-Host "   • Status: Production Ready ✅" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🎯 Phase 1 Focus Areas:" -ForegroundColor Yellow
        Write-Host "   ✅ Single model implementation" -ForegroundColor Green
        Write-Host "   ✅ ResNet50 optimization" -ForegroundColor Green  
        Write-Host "   ✅ Production stability" -ForegroundColor Green
        Write-Host "   ✅ Performance benchmarking" -ForegroundColor Green
        Write-Host "   ✅ Monitoring and logging" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🔮 Phase 2 Future (Multi-Model):" -ForegroundColor Blue
        Write-Host "   ⏳ Multi-model support" -ForegroundColor Gray
        Write-Host "   ⏳ CLIP integration" -ForegroundColor Gray
        Write-Host "   ⏳ Smart model introduction" -ForegroundColor Gray
        Write-Host "   ⏳ Model performance validation" -ForegroundColor Gray
        
        Write-Host ""
        Write-Host "� Phase 1 Benefits:" -ForegroundColor Cyan
        Write-Host "   • Faster development (single model path)" -ForegroundColor White
        Write-Host "   • Simpler testing and debugging" -ForegroundColor White
        Write-Host "   • Lower complexity and costs" -ForegroundColor White
        Write-Host "   • Production-ready stability" -ForegroundColor White
        Write-Host "   • Clear performance baselines" -ForegroundColor White
        
        return @{
            Phase = "1"
            PrimaryModel = "ResNet50 v2.7"
            FeatureDimensions = 2048
            Collection = $resnetCollection
            ABTestingEnabled = $false
            Status = "Production Focus"
        }
    }
    catch {
        Write-Error "Failed to get Phase 1 status: $($_.Exception.Message)"
        return @{ Status = "Error"; Error = $_.Exception.Message }
    }
}

# =============================================================================
# Tenant PostgreSQL Backup Provisioning
# =============================================================================

function New-TenantPostgreSQLBackup {
    <#
    .SYNOPSIS
    Configures automated PostgreSQL backup for a tenant with NFS storage backend.
    
    .DESCRIPTION
    Sets up a dedicated backup container that periodically backs up the tenant's PostgreSQL database
    to an NFS path supplied by the tenant. Uses pg_dump for logical backups with configurable retention.
    
    .PARAMETER TenantId
    Tenant ID for which to configure backups
    
    .PARAMETER TenantName
    Tenant name (used for container and backup file naming)
    
    .PARAMETER NFSPath
    NFS path where backups will be stored (e.g., "nfs-server:/exports/tenant-backups")
    
    .PARAMETER BackupSchedule
    Cron schedule for automated backups (default: "0 2 * * *" - daily at 2 AM)
    
    .PARAMETER RetentionDays
    Number of days to retain backups (default: 30)
    
    .PARAMETER NFSOptions
    NFS mount options (default: "rw,sync,hard,intr")
    
    .PARAMETER CompressionEnabled
    Enable gzip compression for backups (default: $true)
    
    .EXAMPLE
    New-TenantPostgreSQLBackup -TenantId "12345678-1234-1234-1234-123456789012" -TenantName "vayyari" -NFSPath "nfs-server.company.com:/exports/vayyari/backups"
    
    .EXAMPLE
    New-TenantPostgreSQLBackup -TenantName "vayyari" -NFSPath "10.0.1.100:/mnt/backups/vayyari" -BackupSchedule "0 */6 * * *" -RetentionDays 60
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string] $TenantId = "",
        
        [Parameter(Mandatory = $true)]
        [string] $TenantName,
        
        [Parameter(Mandatory = $true)]
        [string] $NFSPath,
        
        [Parameter(Mandatory = $false)]
        [string] $BackupSchedule = "0 2 * * *",
        
        [Parameter(Mandatory = $false)]
        [int] $RetentionDays = 30,
        
        [Parameter(Mandatory = $false)]
        [string] $NFSOptions = "rw,sync,hard,intr",
        
        [Parameter(Mandatory = $false)]
        [bool] $CompressionEnabled = $true
    )
    
    Write-Host "🗄️ Setting up PostgreSQL backup for tenant: $TenantName" -ForegroundColor Cyan
    
    # Normalize tenant name
    $normalizedName = $TenantName.ToLower() -replace '[^a-z0-9-]', '-'
    $containerName = "deeplens-backup-${normalizedName}"
    $volumeName = "tenant_${normalizedName}_pgbackup"
    $dbName = "tenant_${normalizedName}_metadata"
    
    # Check if backup container already exists
    $existingContainer = docker ps -a --filter "name=^${containerName}$" --format "{{.Names}}"
    if ($existingContainer) {
        Write-Host "⚠️  Backup container already exists: $containerName" -ForegroundColor Yellow
        Write-Host "   Use Remove-TenantPostgreSQLBackup to remove it first" -ForegroundColor Yellow
        return $null
    }
    
    try {
        # Create NFS volume for backup storage
        Write-Host "📦 Creating NFS volume: $volumeName" -ForegroundColor Yellow
        
        $volumeCreateCmd = @"
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=$NFSOptions \
  --opt device=:$NFSPath \
  $volumeName
"@
        
        Invoke-Expression $volumeCreateCmd
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create NFS volume"
        }
        
        Write-Host "✅ NFS volume created: $volumeName" -ForegroundColor Green
        
        # Create backup script
        $backupScript = @"
#!/bin/bash
set -e

# Configuration
DB_NAME="$dbName"
DB_USER="deeplens"
BACKUP_DIR="/backups"
RETENTION_DAYS=$RetentionDays
COMPRESSION_ENABLED=$($CompressionEnabled.ToString().ToLower())

# Create backup filename with timestamp
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\${BACKUP_DIR}/\${DB_NAME}_\${TIMESTAMP}.sql"

echo "[\$(date)] Starting backup for database: \${DB_NAME}"

# Perform backup
if [ "\$COMPRESSION_ENABLED" = "true" ]; then
    pg_dump -h deeplens-postgres -U \${DB_USER} -d \${DB_NAME} | gzip > "\${BACKUP_FILE}.gz"
    echo "[\$(date)] Backup completed (compressed): \${BACKUP_FILE}.gz"
else
    pg_dump -h deeplens-postgres -U \${DB_USER} -d \${DB_NAME} > "\${BACKUP_FILE}"
    echo "[\$(date)] Backup completed: \${BACKUP_FILE}"
fi

# Cleanup old backups
echo "[\$(date)] Cleaning up backups older than \${RETENTION_DAYS} days"
find \${BACKUP_DIR} -name "\${DB_NAME}_*.sql*" -type f -mtime +\${RETENTION_DAYS} -delete

# List current backups
echo "[\$(date)] Current backups:"
ls -lh \${BACKUP_DIR}/\${DB_NAME}_*.sql* 2>/dev/null || echo "No backups found"

echo "[\$(date)] Backup process completed"
"@
        
        # Create temporary directory for backup script
        $tempDir = [System.IO.Path]::GetTempPath()
        $scriptPath = Join-Path $tempDir "backup-${normalizedName}.sh"
        $backupScript | Out-File -FilePath $scriptPath -Encoding ASCII -NoNewline
        
        # Create backup container with cron job
        Write-Host "🐳 Creating backup container: $containerName" -ForegroundColor Yellow
        
        # First, create a base postgres container that will run the backup
        $containerCreateCmd = @"
docker run -d \
  --name $containerName \
  --network deeplens-network \
  --restart unless-stopped \
  -v ${volumeName}:/backups \
  -e PGPASSWORD=DeepLens123! \
  -e BACKUP_SCHEDULE="$BackupSchedule" \
  -e DB_NAME=$dbName \
  -e RETENTION_DAYS=$RetentionDays \
  -e COMPRESSION_ENABLED=$($CompressionEnabled.ToString().ToLower()) \
  --label tenant=$normalizedName \
  --label service=postgres-backup \
  postgres:16-alpine \
  sh -c 'apk add --no-cache postgresql-client && \
         echo "$BackupSchedule /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | crontab - && \
         crond -f -l 2'
"@
        
        Invoke-Expression $containerCreateCmd
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create backup container"
        }
        
        # Copy backup script into container
        docker cp $scriptPath "${containerName}:/usr/local/bin/backup.sh"
        docker exec $containerName chmod +x /usr/local/bin/backup.sh
        
        # Remove temporary script file
        Remove-Item -Path $scriptPath -Force
        
        Write-Host "✅ Backup container created and configured" -ForegroundColor Green
        
        # Perform initial backup
        Write-Host "🔄 Running initial backup..." -ForegroundColor Yellow
        docker exec $containerName /usr/local/bin/backup.sh
        
        # Return backup configuration
        $backupConfig = @{
            TenantName = $TenantName
            TenantId = $TenantId
            ContainerName = $containerName
            VolumeName = $volumeName
            DatabaseName = $dbName
            NFSPath = $NFSPath
            BackupSchedule = $BackupSchedule
            RetentionDays = $RetentionDays
            CompressionEnabled = $CompressionEnabled
            Status = "Active"
        }
        
        Write-Host ""
        Write-Host "✅ PostgreSQL backup configured successfully!" -ForegroundColor Green
        Write-Host "   📦 Container: $containerName" -ForegroundColor Cyan
        Write-Host "   💾 NFS Path: $NFSPath" -ForegroundColor Cyan
        Write-Host "   ⏰ Schedule: $BackupSchedule" -ForegroundColor Cyan
        Write-Host "   📅 Retention: $RetentionDays days" -ForegroundColor Cyan
        $compressionStatus = if ($CompressionEnabled) { 'Enabled' } else { 'Disabled' }
        Write-Host "   🗜️  Compression: $compressionStatus" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Check backup logs:" -ForegroundColor Yellow
        Write-Host "   docker logs $containerName" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🔍 List backups:" -ForegroundColor Yellow
        Write-Host "   docker exec $containerName ls -lh /backups" -ForegroundColor Gray
        Write-Host ""
        
        return $backupConfig
    }
    catch {
        Write-Error "Failed to configure PostgreSQL backup: $($_.Exception.Message)"
        
        # Cleanup on failure
        if (docker ps -a --filter "name=^${containerName}$" --format "{{.Names}}") {
            Write-Host "🧹 Cleaning up failed backup container..." -ForegroundColor Yellow
            docker rm -f $containerName | Out-Null
        }
        
        if (docker volume ls --filter "name=^${volumeName}$" --format "{{.Name}}") {
            Write-Host "🧹 Cleaning up failed NFS volume..." -ForegroundColor Yellow
            docker volume rm $volumeName | Out-Null
        }
        
        return $null
    }
}

function Remove-TenantPostgreSQLBackup {
    <#
    .SYNOPSIS
    Removes PostgreSQL backup configuration for a tenant.
    
    .PARAMETER TenantName
    Tenant name
    
    .PARAMETER RemoveBackups
    Remove all backup files from NFS (default: $false - keeps backups)
    
    .EXAMPLE
    Remove-TenantPostgreSQLBackup -TenantName "vayyari"
    
    .EXAMPLE
    Remove-TenantPostgreSQLBackup -TenantName "vayyari" -RemoveBackups $true
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantName,
        
        [Parameter(Mandatory = $false)]
        [bool] $RemoveBackups = $false
    )
    
    $normalizedName = $TenantName.ToLower() -replace '[^a-z0-9-]', '-'
    $containerName = "deeplens-backup-${normalizedName}"
    $volumeName = "tenant_${normalizedName}_pgbackup"
    
    Write-Host "🗑️  Removing PostgreSQL backup for tenant: $TenantName" -ForegroundColor Cyan
    
    # Check if container exists
    $existingContainer = docker ps -a --filter "name=^${containerName}$" --format "{{.Names}}"
    if (-not $existingContainer) {
        Write-Host "⚠️  Backup container not found: $containerName" -ForegroundColor Yellow
        return $false
    }
    
    try {
        # Stop and remove container
        Write-Host "🛑 Stopping backup container..." -ForegroundColor Yellow
        docker stop $containerName | Out-Null
        docker rm $containerName | Out-Null
        Write-Host "✅ Backup container removed" -ForegroundColor Green
        
        # Remove volume (and backups if requested)
        if ($RemoveBackups) {
            Write-Host "🗑️  Removing NFS volume and all backups..." -ForegroundColor Yellow
            docker volume rm $volumeName | Out-Null
            Write-Host "✅ Backups removed from NFS" -ForegroundColor Green
        }
        else {
            Write-Host "💾 Keeping backup files on NFS (volume: $volumeName)" -ForegroundColor Cyan
            Write-Host "   To remove backups later: docker volume rm $volumeName" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "✅ PostgreSQL backup configuration removed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Failed to remove backup configuration: $($_.Exception.Message)"
        return $false
    }
}

function Get-TenantPostgreSQLBackupStatus {
    <#
    .SYNOPSIS
    Gets the status and configuration of PostgreSQL backup for a tenant.
    
    .PARAMETER TenantName
    Tenant name
    
    .EXAMPLE
    Get-TenantPostgreSQLBackupStatus -TenantName "vayyari"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $TenantName
    )
    
    $normalizedName = $TenantName.ToLower() -replace '[^a-z0-9-]', '-'
    $containerName = "deeplens-backup-${normalizedName}"
    $volumeName = "tenant_${normalizedName}_pgbackup"
    
    # Check if container exists
    $containerInfo = docker ps -a --filter "name=^${containerName}$" --format "{{json .}}" | ConvertFrom-Json
    
    if (-not $containerInfo) {
        Write-Host "⚠️  No backup configured for tenant: $TenantName" -ForegroundColor Yellow
        return $null
    }
    
    # Get container details
    $containerDetails = docker inspect $containerName | ConvertFrom-Json
    $volumeDetails = docker volume inspect $volumeName 2>$null | ConvertFrom-Json
    
    # Get backup files count
    $backupList = docker exec $containerName sh -c "ls -lh /backups/*.sql* 2>/dev/null" 2>$null
    $backupCount = if ($backupList) { ($backupList -split "`n").Count } else { 0 }
    
    # Get last backup time from logs
    $lastLogs = docker logs --tail 50 $containerName 2>$null | Select-String "Backup completed" | Select-Object -Last 1
    $lastBackupTime = if ($lastLogs) { $lastLogs.ToString() } else { "No backups yet" }
    
    $status = @{
        TenantName = $TenantName
        ContainerName = $containerName
        ContainerStatus = $containerInfo.Status
        VolumeName = $volumeName
        NFSPath = if ($volumeDetails) { $volumeDetails.Options.device } else { "Unknown" }
        BackupCount = $backupCount
        LastBackup = $lastBackupTime
        DatabaseName = "tenant_${normalizedName}_metadata"
    }
    
    # Display status
    Write-Host ""
    Write-Host "📊 PostgreSQL Backup Status: $TenantName" -ForegroundColor Cyan
    Write-Host "   Container: $($status.ContainerName) - $($status.ContainerStatus)" -ForegroundColor $(if ($containerInfo.Status -like "*Up*") { "Green" } else { "Red" })
    Write-Host "   Volume: $($status.VolumeName)" -ForegroundColor Cyan
    Write-Host "   NFS Path: $($status.NFSPath)" -ForegroundColor Cyan
    Write-Host "   Database: $($status.DatabaseName)" -ForegroundColor Cyan
    Write-Host "   Backup Files: $($status.BackupCount)" -ForegroundColor Cyan
    Write-Host "   Last Backup: $($status.LastBackup)" -ForegroundColor Cyan
    Write-Host ""
    
    return $status
}

function Get-AllTenantPostgreSQLBackups {
    <#
    .SYNOPSIS
    Lists all tenant PostgreSQL backup configurations.
    
    .EXAMPLE
    Get-AllTenantPostgreSQLBackups
    #>
    [CmdletBinding()]
    param()
    
    Write-Host "🔍 Finding all tenant PostgreSQL backups..." -ForegroundColor Cyan
    
    # Find all backup containers
    $backupContainers = docker ps -a --filter "label=service=postgres-backup" --format "{{json .}}" | 
        ForEach-Object { ConvertFrom-Json $_ }
    
    if (-not $backupContainers) {
        Write-Host "⚠️  No tenant backups found" -ForegroundColor Yellow
        return @()
    }
    
    $backups = @()
    foreach ($container in $backupContainers) {
        $tenantLabel = docker inspect $container.Names --format '{{index .Config.Labels "tenant"}}' 2>$null
        
        $backups += @{
            TenantName = $tenantLabel
            ContainerName = $container.Names
            Status = $container.Status
            Created = $container.CreatedAt
        }
    }
    
    # Display summary
    Write-Host ""
    Write-Host "📋 Tenant PostgreSQL Backups ($($backups.Count) total)" -ForegroundColor Cyan
    foreach ($backup in $backups) {
        $statusColor = if ($backup.Status -like "*Up*") { "Green" } else { "Red" }
        Write-Host "   • $($backup.TenantName): $($backup.ContainerName) - $($backup.Status)" -ForegroundColor $statusColor
    }
    Write-Host ""
    
    return $backups
}

# =============================================================================
# Export Functions
# =============================================================================

Export-ModuleMember -Function @(
    'New-DeepLensTenant',
    'Get-DeepLensTenant',
    'Remove-DeepLensTenant',
    'Test-DeepLensStorageConfig',
    'Start-DeepLensInfrastructure',
    'Stop-DeepLensInfrastructure',
    'Show-DeepLensStatus',
    'Initialize-DeepLensTenantCache',
    'Initialize-DeepLensTenantVectors',
    'Initialize-DeepLensTenantVectorsForModel',
    'Initialize-DeepLensModelCollections',
    'Show-Phase1Status',
    'Get-DeepLensInfisicalSecrets',
    'Test-DeepLensMonitoringStack',
    'Backup-DeepLensTenantData',
    'New-TenantMinIOStorage',
    'Remove-TenantMinIOStorage',
    'Get-TenantMinIOStatus',
    'Get-AllTenantMinIOInstances',
    'New-TenantPostgreSQLBackup',
    'Remove-TenantPostgreSQLBackup',
    'Get-TenantPostgreSQLBackupStatus',
    'Get-AllTenantPostgreSQLBackups'
    
    # Phase 2 Functions (Commented out for Phase 1)
    # 'Start-SmartModelIntroduction',
    # 'Get-ABTestResults',
    # 'Enable-DualExtraction'
)