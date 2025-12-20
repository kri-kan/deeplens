# DeepLens Platform Admin Initialization
# This script bootstraps the platform admin tenant and user directly in the database.

$AdminTenantName = "DeepLens Administration"
$AdminTenantSlug = "admin"
$AdminEmail = "admin@deeplens.local"
$AdminPasswordHash = '$2a$11$mXG60WfA7Wn9j3w9f7W9fOu6u6u6u6u6u6u6u6u6u6u6u6u6u6u6u' # BCrypt for 'DeepLensAdmin123!'
$PlatformDB = "nextgen_identity"

Write-Host "🚀 Initializing DeepLens Platform Administration..." -ForegroundColor Green

# 1. Create Platform Admin Tenant
$tenantId = [guid]::NewGuid().ToString()
$checkTenantSQL = "SELECT id FROM tenants WHERE slug = '$AdminTenantSlug';"
$existingTenantId = podman exec -i deeplens-postgres psql -U postgres -d $PlatformDB -t -c "$checkTenantSQL" 2>$null

if ($existingTenantId -and $existingTenantId.Trim()) {
    $tenantId = $existingTenantId.Trim()
    Write-Host "[INFO] Platform admin tenant already exists (ID: $tenantId)" -ForegroundColor Yellow
}
else {
    $insertTenantSQL = @"
INSERT INTO tenants (
    id, name, slug, database_name, qdrant_container_name, 
    qdrant_http_port, qdrant_grpc_port, minio_endpoint, 
    minio_bucket_name, status, tier
) VALUES (
    '$tenantId', '$AdminTenantName', '$AdminTenantSlug', '$PlatformDB', 'deeplens-qdrant',
    6333, 6334, 'http://localhost:9000', 'platform-admin', 1, 3
);
"@
    podman exec -i deeplens-postgres psql -U postgres -d $PlatformDB -c "$insertTenantSQL" | Out-Null
    Write-Host "[OK] Created platform admin tenant" -ForegroundColor Green
}

# 2. Create Global Admin User
$checkUserSQL = "SELECT id FROM users WHERE email = '$AdminEmail';"
$existingUserId = podman exec -i deeplens-postgres psql -U postgres -d $PlatformDB -t -c "$checkUserSQL" 2>$null

if ($existingUserId -and $existingUserId.Trim()) {
    Write-Host "[INFO] Global admin user already exists" -ForegroundColor Yellow
}
else {
    $userId = [guid]::NewGuid().ToString()
    $insertUserSQL = @"
INSERT INTO users (
    id, tenant_id, email, password_hash, first_name, last_name, role, is_active
) VALUES (
    '$userId', '$tenantId', '$AdminEmail', '$AdminPasswordHash', 'System', 'Administrator', 2, true
);
"@
    podman exec -i deeplens-postgres psql -U postgres -d $PlatformDB -c "$insertUserSQL" | Out-Null
    Write-Host "[OK] Created system admin user: $AdminEmail" -ForegroundColor Green
}

Write-Host "`n[SUMMARY]" -ForegroundColor Cyan
Write-Host "  Platform Tenant: $AdminTenantSlug" -ForegroundColor White
Write-Host "  Admin Email:     $AdminEmail" -ForegroundColor White
Write-Host "  Default Pass:    DeepLensAdmin123! (PLEASE CHANGE AFTER LOGIN)" -ForegroundColor Yellow
Write-Host ""
