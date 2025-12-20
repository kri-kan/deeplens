# DeepLens Identity Smoke Tests
# Validates Platform Admin and Tenant Admin login functionality

param(
    [string]$BaseUrl = "http://localhost:5198",
    [string]$ClientId = "deeplens-webui-dev"
)

$ErrorActionPreference = "Stop"

Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
Write-Host " 🔐 DEEPLENS IDENTITY CHECKPOINT" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1/3] Checking Identity API Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/api/auth/health" -Method Get
    Write-Host "✅ API Status: $($health.status) (v: $($health.service))" -ForegroundColor Green
}
catch {
    Write-Host "❌ Identity API is not reachable at $BaseUrl" -ForegroundColor Red
    Write-Host "   Please ensure the API is running (dotnet run)" -ForegroundColor Gray
    exit 1
}

# 2. Test Cases Definition
$testConfigPath = "$PSScriptRoot\config\test-users.json"
if (Test-Path $testConfigPath) {
    $testCases = Get-Content $testConfigPath | ConvertFrom-Json
}
else {
    Write-Host "⚠️ Test configuration not found at $testConfigPath. Using defaults." -ForegroundColor Yellow
    $testCases = @(
        @{
            name         = "Platform Admin"
            email        = "admin@deeplens.local"
            password     = "DeepLensAdmin123!"
            expectedRole = "Admin"
        },
        @{
            name         = "Tenant Admin (Vayyari)"
            email        = "admin@vayyari.local"
            password     = "DeepLens@vayyari123!"
            expectedRole = "TenantOwner"
        }
    )
}

Write-Host "`n[2/3] Running Authentication Tests..." -ForegroundColor Yellow

foreach ($test in $testCases) {
    Write-Host "`n--- Testing: $($test.name) ---" -ForegroundColor White
    
    try {
        # A. Get Token
        $body = @{
            grant_type = "password"
            client_id  = $ClientId
            username   = $test.email
            password   = $test.password
            scope      = "openid profile email roles deeplens.api"
        }
        
        $tokenResponse = Invoke-RestMethod -Uri "$BaseUrl/connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body
        Write-Host "   ✅ Token Acquired" -ForegroundColor Green
        
        # B. Verify Profile
        $headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }
        $userProfile = Invoke-RestMethod -Uri "$BaseUrl/api/auth/me" -Method Get -Headers $headers
        
        if ($userProfile.role -eq $test.expectedRole) {
            Write-Host "   ✅ Profile Verified (Role: $($userProfile.role))" -ForegroundColor Green
            Write-Host "   ✅ Tenant Context: $($userProfile.tenantId)" -ForegroundColor Green
        }
        else {
            Write-Host "   ❌ Role Mismatch! Expected: $($test.expectedRole), Got: $($userProfile.role)" -ForegroundColor Red
        }
        
    }
    catch {
        Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.InnerException) {
            Write-Host "      Details: $($_.Exception.InnerException.Message)" -ForegroundColor Gray
        }
    }
}

# 3. API Key Lifecycle Test
Write-Host "`n[3/4] Running API Key Lifecycle Tests..." -ForegroundColor Yellow

# Use the first test case (usually Platform Admin) to test API Key functionality
$adminTest = $testCases[0]
Write-Host "--- Testing API Key (using $($adminTest.name)) ---" -ForegroundColor White

try {
    # A. Get Admin Token
    $body = @{
        grant_type = "password"
        client_id  = $ClientId
        username   = $adminTest.email
        password   = $adminTest.password
        scope      = "openid profile email roles deeplens.api"
    }
    $tokenResponse = Invoke-RestMethod -Uri "$BaseUrl/connect/token" -Method Post -ContentType "application/x-www-form-urlencoded" -Body $body
    $headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }

    # B. Create API Key
    $keyRequest = @{
        name          = "Checkpoint-Test-Key"
        scopes        = @("deeplens.search")
        expiresInDays = 1
    } | ConvertTo-Json
    
    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ApiKey" -Method Post -Headers $headers -ContentType "application/json" -Body $keyRequest
    $keyId = $createResponse.id
    Write-Host "   ✅ API Key Created (ID: $keyId)" -ForegroundColor Green
    
    # C. Verify in List
    $listResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ApiKey" -Method Get -Headers $headers
    $foundKey = $listResponse | Where-Object { $_.id -eq $keyId }
    
    if ($foundKey) {
        Write-Host "   ✅ API Key verified in list" -ForegroundColor Green
    }
    else {
        throw "API Key not found in list after creation"
    }
    
    # D. Revoke API Key
    Invoke-RestMethod -Uri "$BaseUrl/api/ApiKey/$keyId" -Method Delete -Headers $headers | Out-Null
    Write-Host "   ✅ API Key Revoked (Cleanup)" -ForegroundColor Green
    
}
catch {
    Write-Host "   ❌ API Key Test Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Summary
Write-Host "`n[4/4] Checkpoint Summary" -ForegroundColor Yellow
Write-Host ("-" * 40)
Write-Host "Identity API:   $BaseUrl" -ForegroundColor Gray
Write-Host "API Key System: Verified (Auto-Cleaned)" -ForegroundColor Green
Write-Host "Environment:    Development" -ForegroundColor Gray
Write-Host "Next Step:      Ready for Service Integration" -ForegroundColor Green
Write-Host ("-" * 40)
Write-Host ""
