# Token Lifecycle and Refresh Token Behavior

**Date:** December 18, 2025  
**Status:** Implemented and Tested

---

## Overview

DeepLens uses Duende IdentityServer 7.1.0 for OAuth 2.0/OpenID Connect authentication. The token lifecycle is designed to balance security and user experience through a sliding refresh token mechanism.

---

## Token Types

### 1. **Access Token (JWT)**

- **Lifetime:** 1 hour (3600 seconds)
- **Purpose:** Authorizes API requests
- **Contains:** User claims (sub, email, name, role, tenant_id, is_active)
- **Format:** Bearer token (JWT)
- **Audience:** `deeplens-api`

**Example Claims:**

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
  ]
}
```

### 2. **Refresh Token**

- **Lifetime:** 15 days (1,296,000 seconds) **SLIDING**
- **Purpose:** Obtains new access tokens without re-authentication
- **Format:** Opaque reference token
- **Usage:** `TokenUsage.ReUse` (same token used multiple times)
- **Expiration:** `TokenExpiration.Sliding` (resets on each use)

### 3. **Identity Token**

- **Lifetime:** 5 minutes (300 seconds)
- **Purpose:** Contains user identity information for the client
- **Format:** JWT
- **Note:** Only issued in authorization code flow (not password grant)

---

## Sliding Refresh Token Behavior

### How It Works

**Configuration:**

```csharp
RefreshTokenUsage = TokenUsage.ReUse,
RefreshTokenExpiration = TokenExpiration.Sliding,
SlidingRefreshTokenLifetime = 1296000, // 15 days
```

**Behavior:**

1. User logs in → Receives access token + refresh token
2. Access token expires after 1 hour
3. Client uses refresh token to get new access token
4. **Sliding window resets to 15 days from the refresh request**
5. Same refresh token is reused (not rotated)
6. New access token is issued with updated claims

### Active Session Benefit

✅ **Yes, the token lifetime DOES increase as the user session stays active!**

- **Initial login:** Refresh token valid for 15 days from login time
- **After 7 days:** User refreshes → Refresh token now valid for 15 days from day 7
- **After 14 days:** User refreshes → Refresh token now valid for 15 days from day 14
- **Result:** As long as the user is active, their session never expires

**Inactivity timeout:**

- If user doesn't use the app for 15 days → Refresh token expires
- User must re-authenticate with email/password

---

## Token Refresh Flow

### Successful Refresh

**Request:**

```http
POST /connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id=deeplens-webui
&refresh_token=<refresh_token_here>
```

**Response:**

```json
{
  "access_token": "<new_jwt>",
  "refresh_token": "<same_refresh_token>",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "deeplens.api email offline_access openid profile roles"
}
```

**Observations:**

- ✅ Access token changes (new JWT with updated claims)
- ✅ Refresh token stays the same (ReUse mode)
- ✅ Sliding window resets to 15 days
- ✅ All user claims are updated (UpdateAccessTokenClaimsOnRefresh = true)

---

## Token Revocation (Logout)

### How to Revoke

**Request:**

```http
POST /connect/revocation
Content-Type: application/x-www-form-urlencoded

token=<refresh_token>
&client_id=deeplens-webui
```

**Response:**

- HTTP 200 OK (even if token doesn't exist)
- No response body

**Effects:**

- ✅ Refresh token is invalidated
- ✅ Cannot be used to get new access tokens
- ⚠️ Existing access tokens remain valid until expiration (1 hour)
- ⚠️ Server cannot invalidate JWTs (stateless by design)

### Best Practices for Logout

1. **Client-side:**

   - Clear all tokens from storage (localStorage/sessionStorage)
   - Clear AuthContext state
   - Redirect to login page

2. **Server-side:**

   - Revoke refresh token via `/connect/revocation`
   - Log the logout event

3. **Security note:**
   - Access tokens remain valid for 1 hour after logout
   - For critical operations, implement server-side token blacklist
   - Or use shorter access token lifetimes (e.g., 15 minutes)

---

## Testing Results

### Test 1: Refresh Token Flow

```powershell
# Login
Initial Token - expires_in: 3600 seconds
Refresh Token: 7319BC053344F64C9A46BA4DCC41B7...

# Wait 3 seconds, then refresh
After Refresh - expires_in: 3600 seconds
New Refresh Token: 7319BC053344F64C9A46BA4DCC41B7...

# Results
✅ Refresh Token Changed: False (ReUse mode working)
✅ Access Token Changed: True (New JWT issued)
```

### Test 2: Token Revocation

```powershell
Got tokens - Refresh Token: FA2E0B8532BE7D5A62D09ED8FF02B0...
Now revoking the refresh token...
✅ Token revoked successfully!

Trying to use revoked token...
✅ Expected error: The remote server returned an error: (400) Bad Request.
```

---

## Security Considerations

### Why Sliding Refresh Tokens?

**Pros:**

- ✅ Better UX: Active users never logged out
- ✅ Automatic session extension
- ✅ Simplicity: No token rotation complexity

**Cons:**

- ⚠️ If refresh token is stolen, attacker can maintain access indefinitely
- ⚠️ No detection of token theft (rotation would detect this)

### Mitigation Strategies

1. **Use HTTPS only** (prevents token interception)
2. **Implement token binding** (bind refresh token to device/IP)
3. **Monitor refresh patterns** (alert on unusual refresh frequency)
4. **Absolute maximum lifetime** (even with sliding, enforce 90-day max)
5. **Require re-authentication for sensitive operations** (password change, etc.)

---

## Configuration Options

### Current Production Config

```csharp
new Client
{
    ClientId = "deeplens-webui",

    // Token lifetimes
    AccessTokenLifetime = 3600,              // 1 hour
    IdentityTokenLifetime = 300,             // 5 minutes
    RefreshTokenUsage = TokenUsage.ReUse,    // Reuse same token
    RefreshTokenExpiration = TokenExpiration.Sliding, // Sliding window
    SlidingRefreshTokenLifetime = 1296000,   // 15 days

    // Token management
    AllowOfflineAccess = true,               // Enable refresh tokens
    UpdateAccessTokenClaimsOnRefresh = true, // Update claims on refresh
    AlwaysIncludeUserClaimsInIdToken = true  // Include in ID token
}
```

### Alternative: OneTime Refresh Tokens (More Secure)

```csharp
RefreshTokenUsage = TokenUsage.OneTimeOnly,  // Rotate on each use
RefreshTokenExpiration = TokenExpiration.Absolute, // Fixed lifetime
AbsoluteRefreshTokenLifetime = 2592000,     // 30 days absolute max
```

**Behavior:**

- Each refresh issues a new refresh token
- Old refresh token is invalidated
- Can detect token theft (parallel refresh attempts)
- More complex for clients (must handle rotation)

---

## API Endpoints

### Token Endpoint

- **URL:** `POST http://localhost:5198/connect/token`
- **Grants:** `password`, `refresh_token`, `client_credentials`
- **Authentication:** Client credentials (for confidential clients)

### Revocation Endpoint

- **URL:** `POST http://localhost:5198/connect/revocation`
- **Purpose:** Revoke refresh tokens
- **Response:** Always 200 OK

### Introspection Endpoint (Future)

- **URL:** `POST http://localhost:5198/connect/introspect`
- **Purpose:** Check token validity and claims
- **Note:** Not yet configured

### Discovery Endpoint

- **URL:** `GET http://localhost:5198/.well-known/openid-configuration`
- **Purpose:** OIDC metadata (endpoints, scopes, grant types)

---

## WebUI Integration

### AuthContext Implementation

**Token Storage:**

```typescript
// Store in localStorage for persistence
localStorage.setItem("access_token", response.access_token);
localStorage.setItem("refresh_token", response.refresh_token);
```

**Automatic Refresh:**

```typescript
// Use axios interceptor to refresh on 401
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await authService.refreshToken();
      // Retry original request
    }
  }
);
```

**Logout:**

```typescript
const logout = async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (refreshToken) {
    await authService.revokeToken(refreshToken);
  }
  localStorage.clear();
  navigate("/login");
};
```

---

## Monitoring and Metrics

### Recommended Telemetry

1. **Token issuance rate** (logins per hour)
2. **Refresh token usage** (refreshes per user per day)
3. **Token revocation rate** (logouts per hour)
4. **Failed refresh attempts** (expired/revoked tokens)
5. **Average session duration** (time between login and last refresh)

### OpenTelemetry Integration

```csharp
// In IdentityServer events
options.Events.RaiseSuccessEvents = true;
options.Events.RaiseFailureEvents = true;
```

---

## Future Improvements

1. **Implement absolute maximum session duration** (90 days)
2. **Add token binding** (device fingerprinting)
3. **Switch to PKCE flow** (more secure than password grant)
4. **Add persistent grant store** (PostgreSQL instead of in-memory)
5. **Implement token theft detection** (parallel refresh monitoring)
6. **Add refresh token audit log** (track all refresh events)

---

## Credentials

**Admin User:**

- Email: `admin@deeplens.local`
- Password: `DeepLens@Admin123!`
- Tenant ID: `9f63da1a-135d-4725-b26c-296d76df2338`
- User ID: `53d03827-a474-4502-9a94-e885eb7bebd1`

---

## References

- [Duende IdentityServer Documentation](https://docs.duendesoftware.com/identityserver/v7)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Token Revocation RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)
