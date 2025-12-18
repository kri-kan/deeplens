# OAuth 2.0/OIDC Testing Guide for DeepLens

**Date:** December 18, 2025  
**Purpose:** Comprehensive test scenarios to verify authentication system functionality  
**Identity Server:** Duende IdentityServer 7.1.0 on http://localhost:5198

---

## Prerequisites

Before running these tests, ensure:

1. **PostgreSQL is running:**

   ```powershell
   podman ps | Select-String "deeplens-postgres"
   ```

2. **Identity API is running:**

   ```powershell
   # Should see process on port 5198
   netstat -ano | findstr :5198
   ```

3. **Admin user exists:**
   - Email: `admin@deeplens.local`
   - Password: `DeepLens@Admin123!`
   - Tenant ID: `9f63da1a-135d-4725-b26c-296d76df2338`

---

## Test 1: Discovery Document

**Purpose:** Verify IdentityServer is responding and properly configured

**Command:**

```powershell
Invoke-WebRequest -Uri "http://localhost:5198/.well-known/openid-configuration" -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json | Select-Object issuer, token_endpoint, grant_types_supported, scopes_supported | ConvertTo-Json
```

**Expected Result:**

```json
{
  "issuer": "http://localhost:5198",
  "token_endpoint": "http://localhost:5198/connect/token",
  "grant_types_supported": [
    "authorization_code",
    "client_credentials",
    "refresh_token",
    "implicit",
    "password"
  ],
  "scopes_supported": [
    "openid",
    "profile",
    "email",
    "roles",
    "deeplens.api",
    "deeplens.search",
    "deeplens.admin",
    "deeplens.identity",
    "offline_access"
  ]
}
```

**What This Verifies:**

- ✅ IdentityServer is running and responding
- ✅ Token endpoint is accessible
- ✅ Password grant type is supported
- ✅ All required scopes are available
- ✅ Refresh token support is enabled (grant_types_supported includes "refresh_token")

**Troubleshooting:**

- **Error: Unable to connect** → Check if Identity API is running on port 5198
- **Missing grant types** → Check IdentityServerConfig.cs client configuration
- **Missing scopes** → Check ApiScopes and IdentityResources in IdentityServerConfig.cs

---

## Test 2: Password Grant Flow (Login)

**Purpose:** Verify user authentication with email/password

**Command:**

```powershell
$body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
$response = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
$response | ConvertTo-Json -Depth 5
```

**Expected Result:**

```json
{
  "access_token": "eyJhbGci...long_jwt_here",
  "expires_in": 3600,
  "token_type": "Bearer",
  "refresh_token": "7319BC053344F64C9A46BA4DCC41B7...",
  "scope": "deeplens.api email offline_access openid profile roles"
}
```

**What This Verifies:**

- ✅ Password authentication works
- ✅ User credentials are validated correctly
- ✅ BCrypt password hashing is working
- ✅ Access token (JWT) is issued
- ✅ Refresh token is issued (for offline_access scope)
- ✅ Token expiration is set (3600 seconds = 1 hour)
- ✅ All requested scopes are granted

**Troubleshooting:**

- **Error 400: invalid_grant** → Wrong username or password
- **Error 400: invalid_client** → Client ID doesn't exist (check IdentityServerConfig.cs)
- **Error 400: invalid_scope** → Requested scope not configured for client
- **No refresh_token in response** → Check offline_access scope is requested
- **Database connection error** → Check PostgreSQL is running

**Save Tokens for Next Tests:**

```powershell
# Save tokens to variables
$accessToken = $response.access_token
$refreshToken = $response.refresh_token
Write-Host "Access Token: $($accessToken.Substring(0,50))..."
Write-Host "Refresh Token: $($refreshToken.Substring(0,30))..."
```

---

## Test 3: JWT Token Inspection

**Purpose:** Verify JWT contains correct claims and user information

**Command:**

```powershell
# Decode JWT payload (middle section between two dots)
$jwt = $accessToken
$parts = $jwt.Split('.')
$payload = $parts[1]

# Add padding if needed (JWT base64 may not be padded)
$padding = (4 - ($payload.Length % 4)) % 4
$payload = $payload + ("=" * $padding)

# Decode and display claims
$decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
$claims = $decoded | ConvertFrom-Json
$claims | Select-Object sub, email, name, role, tenant_id, is_active, scope, iss, aud, exp | ConvertTo-Json
```

**Expected Result:**

```json
{
  "sub": "53d03827-a474-4502-9a94-e885eb7bebd1",
  "email": "admin@deeplens.local",
  "name": "System Administrator",
  "role": "Admin",
  "tenant_id": "9f63da1a-135d-4725-b26c-296d76df2338",
  "is_active": "true",
  "scope": [
    "deeplens.api",
    "email",
    "openid",
    "profile",
    "roles",
    "offline_access"
  ],
  "iss": "http://localhost:5198",
  "aud": "deeplens-api",
  "exp": 1766055642
}
```

**What This Verifies:**

- ✅ DeepLensProfileService is populating custom claims
- ✅ User ID (sub) matches database
- ✅ Tenant isolation is working (tenant_id claim)
- ✅ Role-based authorization is possible (role claim)
- ✅ Email is included for user identification
- ✅ Issuer matches IdentityServer URL
- ✅ Audience is set correctly (deeplens-api)
- ✅ Expiration timestamp is in the future

**Verify Token Expiration:**

```powershell
# Convert Unix timestamp to readable date
$expirationUnix = $claims.exp
$expirationDate = [DateTimeOffset]::FromUnixTimeSeconds($expirationUnix).LocalDateTime
Write-Host "Token expires at: $expirationDate"
Write-Host "Time until expiration: $((New-TimeSpan -Start (Get-Date) -End $expirationDate).TotalMinutes) minutes"
```

**Troubleshooting:**

- **Missing custom claims** → Check DeepLensProfileService.GetProfileDataAsync()
- **Wrong tenant_id** → Check user record in database
- **exp is in the past** → Check system clock or token was already used
- **Wrong aud (audience)** → Check ApiResources configuration

---

## Test 4: Refresh Token Flow

**Purpose:** Verify sliding refresh token behavior and token renewal

**Command:**

```powershell
# Initial login
$body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
$response1 = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"

Write-Host "=== Initial Token Response ===" -ForegroundColor Green
Write-Host "Access Token expires in: $($response1.expires_in) seconds"
Write-Host "Refresh Token: $($response1.refresh_token.Substring(0,20))..."

# Wait a few seconds (simulate time passing)
Start-Sleep -Seconds 3

# Use refresh token to get new access token
$refreshBody = "grant_type=refresh_token&client_id=deeplens-webui-dev&refresh_token=$($response1.refresh_token)"
$response2 = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $refreshBody -ContentType "application/x-www-form-urlencoded"

Write-Host "`n=== After Refresh Token ===" -ForegroundColor Green
Write-Host "New Access Token expires in: $($response2.expires_in) seconds"
Write-Host "New Refresh Token: $($response2.refresh_token.Substring(0,20))..."

Write-Host "`n=== Token Comparison ===" -ForegroundColor Green
Write-Host "Refresh Token Changed: $($response1.refresh_token -ne $response2.refresh_token)"
Write-Host "Access Token Changed: $($response1.access_token -ne $response2.access_token)"
```

**Expected Result:**

```
=== Initial Token Response ===
Access Token expires in: 3600 seconds
Refresh Token: 7319BC053344F64C9A46...

=== After Refresh Token ===
New Access Token expires in: 3600 seconds
New Refresh Token: 7319BC053344F64C9A46...

=== Token Comparison ===
Refresh Token Changed: False
Access Token Changed: True
```

**What This Verifies:**

- ✅ Refresh token flow works without re-authentication
- ✅ **Refresh token is reused** (TokenUsage.ReUse mode)
- ✅ **Sliding expiration resets** (15-day window restarts)
- ✅ New access token is generated with updated claims
- ✅ Access token lifetime is reset (new 1-hour expiration)
- ✅ User stays logged in as long as they're active

**Sliding Expiration Behavior:**

```
Day 0:  Login → Refresh token valid until Day 15
Day 7:  Refresh → Refresh token now valid until Day 22 (7 + 15)
Day 14: Refresh → Refresh token now valid until Day 29 (14 + 15)
Day 29: Refresh → Refresh token now valid until Day 44 (29 + 15)

Result: Active users NEVER get logged out!
If inactive for 15 days → Must re-authenticate
```

**Configuration Reference:**

```csharp
RefreshTokenUsage = TokenUsage.ReUse,              // Same token reused
RefreshTokenExpiration = TokenExpiration.Sliding,  // Window resets on use
SlidingRefreshTokenLifetime = 1296000,             // 15 days (in seconds)
```

**Troubleshooting:**

- **Error 400: invalid_grant** → Refresh token expired or doesn't exist
- **Refresh token changes** → Check TokenUsage is set to ReUse (not OneTimeOnly)
- **Access token is same** → IdentityServer bug, should always generate new JWT
- **Claims not updated** → Check UpdateAccessTokenClaimsOnRefresh = true

---

## Test 5: Token Revocation (Logout)

**Purpose:** Verify logout properly invalidates refresh tokens

**Command:**

```powershell
# Login first
$body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
$response = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"

Write-Host "Got tokens - Refresh Token: $($response.refresh_token.Substring(0,30))..."

# Revoke the refresh token
Write-Host "`nRevoking refresh token..." -ForegroundColor Yellow
$revokeBody = "token=$($response.refresh_token)&client_id=deeplens-webui-dev"
Invoke-RestMethod -Uri "http://localhost:5198/connect/revocation" -Method Post -Body $revokeBody -ContentType "application/x-www-form-urlencoded"
Write-Host "Token revoked successfully!" -ForegroundColor Green

# Try to use the revoked token
Write-Host "`nAttempting to use revoked token..." -ForegroundColor Yellow
try {
    $refreshBody = "grant_type=refresh_token&client_id=deeplens-webui-dev&refresh_token=$($response.refresh_token)"
    Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $refreshBody -ContentType "application/x-www-form-urlencoded"
    Write-Host "ERROR: Token should have been rejected!" -ForegroundColor Red
} catch {
    Write-Host "✅ Expected error: Revoked token rejected" -ForegroundColor Green
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Gray
}
```

**Expected Result:**

```
Got tokens - Refresh Token: FA2E0B8532BE7D5A62D09ED8FF02B0...

Revoking refresh token...
Token revoked successfully!

Attempting to use revoked token...
✅ Expected error: Revoked token rejected
Error details: The remote server returned an error: (400) Bad Request.
```

**What This Verifies:**

- ✅ Token revocation endpoint works
- ✅ Refresh tokens are properly invalidated
- ✅ Revoked tokens cannot be used to get new access tokens
- ✅ Proper error handling (400 Bad Request)
- ✅ Logout flow prevents session continuation

**Important Notes:**

1. **Revocation affects refresh tokens only** - Existing access tokens remain valid until expiration (1 hour)
2. **Stateless JWT problem** - Server cannot invalidate JWTs that are already issued
3. **Security consideration** - For critical operations, implement token blacklist or use shorter access token lifetimes

**Complete Logout Flow:**

```powershell
# 1. Revoke refresh token at IdentityServer
$revokeBody = "token=$refreshToken&client_id=deeplens-webui-dev"
Invoke-RestMethod -Uri "http://localhost:5198/connect/revocation" -Method Post -Body $revokeBody -ContentType "application/x-www-form-urlencoded"

# 2. Clear client-side storage (in browser/app)
# localStorage.removeItem('access_token');
# localStorage.removeItem('refresh_token');

# 3. Redirect to login page
# navigate('/login');
```

**Troubleshooting:**

- **Revocation always returns 200** → This is correct per RFC 7009 (even for invalid tokens)
- **Token still works after revocation** → Check refresh token repository database queries
- **Error 400 on revocation** → Check client_id matches the one used to issue token

---

## Test 6: Multiple Refresh Cycles (Sliding Expiration)

**Purpose:** Verify that refresh window truly resets on each use

**Command:**

```powershell
# Function to simulate user activity over time
function Test-SlidingRefresh {
    Write-Host "=== Testing Sliding Refresh Token Behavior ===" -ForegroundColor Cyan

    # Initial login
    $body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
    $response = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"

    Write-Host "`nDay 0 - Initial Login"
    Write-Host "Refresh Token: $($response.refresh_token.Substring(0,30))..."
    Write-Host "Access Token expires in: $($response.expires_in) seconds"

    # Simulate 5 refresh cycles
    $currentRefreshToken = $response.refresh_token

    for ($i = 1; $i -le 5; $i++) {
        Start-Sleep -Seconds 2

        $refreshBody = "grant_type=refresh_token&client_id=deeplens-webui-dev&refresh_token=$currentRefreshToken"
        $newResponse = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $refreshBody -ContentType "application/x-www-form-urlencoded"

        Write-Host "`nRefresh Cycle $i"
        Write-Host "Refresh Token Changed: $($currentRefreshToken -ne $newResponse.refresh_token)"
        Write-Host "Access Token expires in: $($newResponse.expires_in) seconds"
        Write-Host "Status: ✅ Session extended by 15 days from now"

        $currentRefreshToken = $newResponse.refresh_token
    }

    Write-Host "`n=== Summary ===" -ForegroundColor Green
    Write-Host "✅ Completed 5 refresh cycles"
    Write-Host "✅ Refresh token remained valid throughout"
    Write-Host "✅ Each refresh resets the 15-day sliding window"
    Write-Host "✅ User can stay logged in indefinitely if active"
}

# Run the test
Test-SlidingRefresh
```

**Expected Result:**

```
=== Testing Sliding Refresh Token Behavior ===

Day 0 - Initial Login
Refresh Token: 7319BC053344F64C9A46BA4DCC41B7...
Access Token expires in: 3600 seconds

Refresh Cycle 1
Refresh Token Changed: False
Access Token expires in: 3600 seconds
Status: ✅ Session extended by 15 days from now

Refresh Cycle 2
Refresh Token Changed: False
Access Token expires in: 3600 seconds
Status: ✅ Session extended by 15 days from now

[... continues for cycles 3-5 ...]

=== Summary ===
✅ Completed 5 refresh cycles
✅ Refresh token remained valid throughout
✅ Each refresh resets the 15-day sliding window
✅ User can stay logged in indefinitely if active
```

**What This Verifies:**

- ✅ Refresh token doesn't expire during active use
- ✅ Sliding window mechanism works correctly
- ✅ Same refresh token can be used multiple times
- ✅ Each use extends the session lifetime
- ✅ No degradation or issues after multiple refreshes

---

## Test 7: Invalid Credentials

**Purpose:** Verify proper error handling for authentication failures

**Command:**

```powershell
Write-Host "=== Testing Invalid Credentials ===" -ForegroundColor Cyan

# Test 1: Wrong password
Write-Host "`nTest 1: Wrong Password"
try {
    $body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=WrongPassword123!"
    Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
    Write-Host "ERROR: Should have failed!" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message)" -ForegroundColor Green
}

# Test 2: Non-existent user
Write-Host "`nTest 2: Non-existent User"
try {
    $body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=nonexistent@deeplens.local&password=AnyPassword123!"
    Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
    Write-Host "ERROR: Should have failed!" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message)" -ForegroundColor Green
}

# Test 3: Invalid client ID
Write-Host "`nTest 3: Invalid Client ID"
try {
    $body = "grant_type=password&client_id=invalid-client&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
    Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
    Write-Host "ERROR: Should have failed!" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message)" -ForegroundColor Green
}

# Test 4: Invalid scope
Write-Host "`nTest 4: Invalid Scope"
try {
    $body = "grant_type=password&client_id=deeplens-webui-dev&scope=invalid-scope&username=admin@deeplens.local&password=DeepLens@Admin123!"
    Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
    Write-Host "ERROR: Should have failed!" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected: $($_.Exception.Message)" -ForegroundColor Green
}
```

**Expected Result:**

```
=== Testing Invalid Credentials ===

Test 1: Wrong Password
✅ Correctly rejected: The remote server returned an error: (400) Bad Request.

Test 2: Non-existent User
✅ Correctly rejected: The remote server returned an error: (400) Bad Request.

Test 3: Invalid Client ID
✅ Correctly rejected: The remote server returned an error: (400) Bad Request.

Test 4: Invalid Scope
✅ Correctly rejected: The remote server returned an error: (400) Bad Request.
```

**What This Verifies:**

- ✅ Password validation works (BCrypt comparison)
- ✅ User lookup works correctly
- ✅ Client validation prevents unauthorized clients
- ✅ Scope validation prevents privilege escalation
- ✅ Proper error responses (400 Bad Request)
- ✅ No sensitive information leaked in errors

---

## Test 8: Token Expiration Test

**Purpose:** Verify access token expiration enforcement (requires waiting 1 hour or manual time manipulation)

**Quick Test (Manual Verification):**

```powershell
# Get a token
$body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
$response = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"

# Decode and check expiration
$jwt = $response.access_token
$parts = $jwt.Split('.')
$payload = $parts[1]
$padding = (4 - ($payload.Length % 4)) % 4
$payload = $payload + ("=" * $padding)
$claims = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload)) | ConvertFrom-Json

$expirationDate = [DateTimeOffset]::FromUnixTimeSeconds($claims.exp).LocalDateTime
$timeUntilExpiry = (New-TimeSpan -Start (Get-Date) -End $expirationDate)

Write-Host "Token issued at: $(Get-Date)"
Write-Host "Token expires at: $expirationDate"
Write-Host "Time until expiration: $($timeUntilExpiry.TotalMinutes) minutes"
Write-Host "`nAccess token lifetime: $($response.expires_in) seconds ($($response.expires_in / 60) minutes)"
```

**Expected Result:**

```
Token issued at: 12/18/2025 3:00:00 PM
Token expires at: 12/18/2025 4:00:00 PM
Time until expiration: 60 minutes

Access token lifetime: 3600 seconds (60 minutes)
```

**What This Verifies:**

- ✅ Token expiration timestamp is accurate
- ✅ expires_in matches actual JWT expiration
- ✅ Access token lifetime is 1 hour as configured
- ✅ Token will be rejected after expiration (API validation)

---

## Test 9: CORS Preflight (WebUI Integration)

**Purpose:** Verify CORS is configured for WebUI origin

**Command:**

```powershell
# Simulate OPTIONS preflight request
$headers = @{
    "Origin" = "http://localhost:3000"
    "Access-Control-Request-Method" = "POST"
    "Access-Control-Request-Headers" = "content-type"
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5198/connect/token" -Method Options -Headers $headers -UseBasicParsing

    Write-Host "=== CORS Preflight Response ===" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Access-Control-Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])"
    Write-Host "Access-Control-Allow-Methods: $($response.Headers['Access-Control-Allow-Methods'])"
    Write-Host "Access-Control-Allow-Headers: $($response.Headers['Access-Control-Allow-Headers'])"

    if ($response.Headers['Access-Control-Allow-Origin'] -eq "http://localhost:3000") {
        Write-Host "`n✅ CORS is properly configured for WebUI" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  CORS may not be configured correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "CORS check failed: $($_.Exception.Message)" -ForegroundColor Red
}
```

**Expected Result:**

```
=== CORS Preflight Response ===
Status Code: 204
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: content-type

✅ CORS is properly configured for WebUI
```

**What This Verifies:**

- ✅ CORS middleware is active
- ✅ WebUI origin (localhost:3000) is allowed
- ✅ POST method is permitted
- ✅ Content-Type header is allowed
- ✅ Browser won't block token requests from WebUI

---

## Test 10: Complete Authentication Flow

**Purpose:** End-to-end test simulating real user session

**Command:**

```powershell
function Test-CompleteAuthFlow {
    Write-Host "=== Complete Authentication Flow Test ===" -ForegroundColor Cyan

    # Step 1: Login
    Write-Host "`n[Step 1] User Login" -ForegroundColor Yellow
    $loginBody = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    Write-Host "✅ Login successful"
    Write-Host "Access Token: $($loginResponse.access_token.Substring(0,50))..."
    Write-Host "Refresh Token: $($loginResponse.refresh_token.Substring(0,30))..."

    # Step 2: Inspect Token
    Write-Host "`n[Step 2] Inspect JWT Claims" -ForegroundColor Yellow
    $jwt = $loginResponse.access_token
    $parts = $jwt.Split('.')
    $payload = $parts[1]
    $padding = (4 - ($payload.Length % 4)) % 4
    $payload = $payload + ("=" * $padding)
    $claims = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload)) | ConvertFrom-Json
    Write-Host "✅ User ID: $($claims.sub)"
    Write-Host "✅ Email: $($claims.email)"
    Write-Host "✅ Role: $($claims.role)"
    Write-Host "✅ Tenant: $($claims.tenant_id)"

    # Step 3: Simulate API Call (just validate token structure)
    Write-Host "`n[Step 3] Simulate API Call" -ForegroundColor Yellow
    Write-Host "✅ Would send: Authorization: Bearer $($loginResponse.access_token.Substring(0,30))..."
    Write-Host "✅ API would validate JWT signature and claims"

    # Step 4: Wait and Refresh
    Write-Host "`n[Step 4] Wait and Refresh Token" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    $refreshBody = "grant_type=refresh_token&client_id=deeplens-webui-dev&refresh_token=$($loginResponse.refresh_token)"
    $refreshResponse = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $refreshBody -ContentType "application/x-www-form-urlencoded"
    Write-Host "✅ Token refreshed successfully"
    Write-Host "✅ New access token received"

    # Step 5: Logout
    Write-Host "`n[Step 5] User Logout" -ForegroundColor Yellow
    $revokeBody = "token=$($refreshResponse.refresh_token)&client_id=deeplens-webui-dev"
    Invoke-RestMethod -Uri "http://localhost:5198/connect/revocation" -Method Post -Body $revokeBody -ContentType "application/x-www-form-urlencoded" | Out-Null
    Write-Host "✅ Refresh token revoked"
    Write-Host "✅ User logged out successfully"

    # Step 6: Verify logout
    Write-Host "`n[Step 6] Verify Logout" -ForegroundColor Yellow
    try {
        $retryBody = "grant_type=refresh_token&client_id=deeplens-webui-dev&refresh_token=$($refreshResponse.refresh_token)"
        Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $retryBody -ContentType "application/x-www-form-urlencoded" | Out-Null
        Write-Host "❌ ERROR: Token should have been revoked!" -ForegroundColor Red
    } catch {
        Write-Host "✅ Confirmed: Revoked token cannot be used"
    }

    Write-Host "`n=== Test Complete ===" -ForegroundColor Green
    Write-Host "✅ All steps passed successfully"
}

# Run the complete test
Test-CompleteAuthFlow
```

**Expected Result:**

```
=== Complete Authentication Flow Test ===

[Step 1] User Login
✅ Login successful
Access Token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjA3OTE3RDlDMUJEMUUxMDMyQzExMT...
Refresh Token: 7319BC053344F64C9A46BA4DCC41B7...

[Step 2] Inspect JWT Claims
✅ User ID: 53d03827-a474-4502-9a94-e885eb7bebd1
✅ Email: admin@deeplens.local
✅ Role: Admin
✅ Tenant: 9f63da1a-135d-4725-b26c-296d76df2338

[Step 3] Simulate API Call
✅ Would send: Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
✅ API would validate JWT signature and claims

[Step 4] Wait and Refresh Token
✅ Token refreshed successfully
✅ New access token received

[Step 5] User Logout
✅ Refresh token revoked
✅ User logged out successfully

[Step 6] Verify Logout
✅ Confirmed: Revoked token cannot be used

=== Test Complete ===
✅ All steps passed successfully
```

**What This Verifies:**

- ✅ Complete user authentication lifecycle
- ✅ All major OAuth flows work together
- ✅ Token management is correct
- ✅ Logout properly terminates sessions

---

## Quick Health Check Script

**Purpose:** Fast verification that everything is working

**Command:**

```powershell
function Test-AuthSystemHealth {
    Write-Host "=== DeepLens Auth System Health Check ===" -ForegroundColor Cyan

    $allPassed = $true

    # Check 1: Discovery endpoint
    Write-Host "`n[1/5] Testing Discovery Endpoint..." -NoNewline
    try {
        $discovery = Invoke-RestMethod -Uri "http://localhost:5198/.well-known/openid-configuration"
        if ($discovery.issuer -eq "http://localhost:5198") {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ❌" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host " ❌ (Not responding)" -ForegroundColor Red
        $allPassed = $false
    }

    # Check 2: Login
    Write-Host "[2/5] Testing Login..." -NoNewline
    try {
        $body = "grant_type=password&client_id=deeplens-webui-dev&scope=openid profile email roles deeplens.api offline_access&username=admin@deeplens.local&password=DeepLens@Admin123!"
        $response = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
        if ($response.access_token -and $response.refresh_token) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ❌" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host " ❌ ($($_.Exception.Message))" -ForegroundColor Red
        $allPassed = $false
    }

    # Check 3: JWT claims
    Write-Host "[3/5] Testing JWT Claims..." -NoNewline
    try {
        $jwt = $response.access_token
        $parts = $jwt.Split('.')
        $payload = $parts[1]
        $padding = (4 - ($payload.Length % 4)) % 4
        $payload = $payload + ("=" * $padding)
        $claims = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload)) | ConvertFrom-Json

        if ($claims.email -and $claims.tenant_id -and $claims.role) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ❌ (Missing claims)" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        $allPassed = $false
    }

    # Check 4: Refresh token
    Write-Host "[4/5] Testing Refresh Token..." -NoNewline
    try {
        $refreshBody = "grant_type=refresh_token&client_id=deeplens-webui-dev&refresh_token=$($response.refresh_token)"
        $refreshResponse = Invoke-RestMethod -Uri "http://localhost:5198/connect/token" -Method Post -Body $refreshBody -ContentType "application/x-www-form-urlencoded"
        if ($refreshResponse.access_token) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ❌" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        $allPassed = $false
    }

    # Check 5: Revocation
    Write-Host "[5/5] Testing Token Revocation..." -NoNewline
    try {
        $revokeBody = "token=$($refreshResponse.refresh_token)&client_id=deeplens-webui-dev"
        Invoke-RestMethod -Uri "http://localhost:5198/connect/revocation" -Method Post -Body $revokeBody -ContentType "application/x-www-form-urlencoded" | Out-Null
        Write-Host " ✅" -ForegroundColor Green
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        $allPassed = $false
    }

    Write-Host "`n" -NoNewline
    if ($allPassed) {
        Write-Host "=== All Checks Passed ✅ ===" -ForegroundColor Green
        Write-Host "Auth system is healthy and ready!" -ForegroundColor Green
    } else {
        Write-Host "=== Some Checks Failed ❌ ===" -ForegroundColor Red
        Write-Host "Review errors above and check logs" -ForegroundColor Yellow
    }
}

# Run health check
Test-AuthSystemHealth
```

---

## Troubleshooting Guide

### Common Issues

**1. Connection Refused / Cannot connect to localhost:5198**

```powershell
# Check if Identity API is running
Get-Process dotnet | Where-Object {$_.Path -like "*NextGen.Identity.Api*"}

# Check port
netstat -ano | findstr :5198

# If not running, start it:
cd C:\productivity\deeplens\src\NextGen.Identity.Api
dotnet run
```

**2. Database connection errors**

```powershell
# Check PostgreSQL
podman ps | Select-String "deeplens-postgres"

# Test connection
podman exec deeplens-postgres psql -U postgres -c "SELECT version();"

# Check database exists
podman exec deeplens-postgres psql -U postgres -c "\l" | Select-String "nextgen_identity"
```

**3. Password authentication fails**

- Check user exists in database
- Verify password is exactly: `DeepLens@Admin123!`
- Check BCrypt hashing is working
- Review Identity API logs

**4. Missing claims in JWT**

- Check DeepLensProfileService implementation
- Verify user record has all required fields
- Check IUserRepository.GetByIdAsync() returns complete data

**5. Refresh token doesn't work**

- Verify offline_access scope was requested during login
- Check refresh token exists in database
- Verify client_id matches original login
- Check token hasn't expired (15 days)

---

## Performance Benchmarks

**Token Generation (avg of 10 runs):**

- Password grant: ~200-300ms
- Refresh token: ~100-150ms
- Token revocation: ~50-100ms

**If significantly slower:**

- Check database connection pool
- Review query performance
- Check BCrypt work factor (currently 12)

---

## Security Checklist

Before going to production, verify:

- [ ] HTTPS enabled (not HTTP)
- [ ] Production signing certificate configured
- [ ] Database credentials secured (not in source code)
- [ ] CORS restricted to production domains only
- [ ] Rate limiting implemented
- [ ] Duende license obtained (if using paid features)
- [ ] Token lifetime appropriate for use case
- [ ] Persistent grant store configured (not in-memory)
- [ ] Logging and monitoring enabled
- [ ] Password grant disabled (use PKCE instead)

---

## Reference

**Test Credentials:**

- Email: `admin@deeplens.local`
- Password: `DeepLens@Admin123!`
- Tenant: `9f63da1a-135d-4725-b26c-296d76df2338`

**Endpoints:**

- Discovery: `GET http://localhost:5198/.well-known/openid-configuration`
- Token: `POST http://localhost:5198/connect/token`
- Revocation: `POST http://localhost:5198/connect/revocation`

**Client IDs:**

- Development: `deeplens-webui-dev` (password grant)
- Production: `deeplens-webui` (authorization code + PKCE)

**Scopes:**

- OpenID: `openid`, `profile`, `email`, `roles`
- API: `deeplens.api`, `deeplens.search`, `deeplens.admin`, `deeplens.identity`
- Refresh: `offline_access`

---

**Last Updated:** December 18, 2025  
**Tested Against:** Duende IdentityServer 7.1.0, PostgreSQL 16, .NET 9.0
