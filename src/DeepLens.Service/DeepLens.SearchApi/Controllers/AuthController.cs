using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using BCrypt.Net;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Auth;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IPermissionCacheService _permissionCacheService;
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IPermissionCacheService permissionCacheService,
        IDbConnectionFactory dbConnectionFactory,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _permissionCacheService = permissionCacheService;
        _dbConnectionFactory = dbConnectionFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email and password are required." });
        }

        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT id, tenant_id, email, password_hash, first_name, last_name, email_confirmed, is_active, created_at, last_login_at
            FROM public.users
            WHERE LOWER(email) = LOWER(@Email) AND deleted_at IS NULL
            LIMIT 1;";

        var user = await connection.QueryFirstOrDefaultAsync<dynamic>(sql, new { Email = request.Email.Trim() });

        if (user == null)
        {
            _logger.LogWarning("Login failed: User not found for email {Email}", request.Email);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (user.is_active == false)
        {
            _logger.LogWarning("Login failed: User account is inactive for {Email}", request.Email);
            return Unauthorized(new { message = "User account is inactive. Please contact your administrator." });
        }

        string passwordHash = user.password_hash ?? string.Empty;
        bool isPasswordValid = false;

        try
        {
            if (!string.IsNullOrEmpty(passwordHash) && passwordHash.StartsWith("$2"))
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, passwordHash);
            }
            else if (!string.IsNullOrEmpty(passwordHash))
            {
                isPasswordValid = string.Equals(request.Password, passwordHash, StringComparison.Ordinal);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying password for {Email}", request.Email);
            isPasswordValid = false;
        }

        if (!isPasswordValid)
        {
            _logger.LogWarning("Login failed: Invalid password for {Email}", request.Email);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        Guid userId = user.id;
        Guid tenantId = user.tenant_id ?? Guid.Empty;

        // Update last login
        try
        {
            const string updateLoginSql = "UPDATE public.users SET last_login_at = NOW() WHERE id = @UserId;";
            await connection.ExecuteAsync(updateLoginSql, new { UserId = userId });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update last_login_at for user {UserId}", userId);
        }

        var auth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userId);

        var (accessToken, expiresIn) = GenerateJwtToken(userId, tenantId, (string)user.email, auth);
        var refreshToken = GenerateRefreshToken();

        // Save 90-day refresh token in public.refresh_tokens
        try
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();
            const string insertTokenSql = @"
                INSERT INTO public.refresh_tokens (id, user_id, token, expires_at, created_at, is_revoked, ip_address, user_agent)
                VALUES (gen_random_uuid(), @UserId, @Token, NOW() + INTERVAL '90 days', NOW(), false, @IpAddress, @UserAgent);";
            await connection.ExecuteAsync(insertTokenSql, new
            {
                UserId = userId,
                Token = refreshToken,
                IpAddress = ipAddress,
                UserAgent = userAgent
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist refresh token for user {UserId}", userId);
        }

        var profile = new UserProfileDto
        {
            Id = userId,
            TenantId = tenantId,
            Email = user.email,
            FirstName = user.first_name ?? string.Empty,
            LastName = user.last_name ?? string.Empty,
            EmailConfirmed = user.email_confirmed ?? false,
            IsActive = user.is_active ?? true,
            CreatedAt = user.created_at ?? DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow,
            Roles = auth.Roles,
            Permissions = auth.Permissions
        };

        var capabilities = new UserCapabilitiesResponse
        {
            UserId = userId,
            TenantId = tenantId,
            IsSuperAdmin = auth.IsSuperAdmin,
            Roles = auth.Roles,
            Permissions = auth.Permissions,
            Version = auth.Version
        };

        var response = new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = expiresIn,
            TokenType = "Bearer",
            User = profile,
            Capabilities = capabilities
        };

        return Ok(response);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new { message = "Refresh token is required." });
        }

        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // 1. Query for valid unrevoked token
        const string selectTokenSql = @"
            SELECT id, user_id, token, expires_at, created_at, is_revoked, revoked_at, revoked_reason
            FROM public.refresh_tokens
            WHERE token = @RefreshToken AND is_revoked = false AND expires_at > NOW()
            LIMIT 1;";

        var storedToken = await connection.QueryFirstOrDefaultAsync<dynamic>(selectTokenSql, new { RefreshToken = request.RefreshToken.Trim() });

        if (storedToken == null)
        {
            _logger.LogWarning("Refresh token invalid, expired, or already revoked.");
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }

        Guid userId = storedToken.user_id;

        // 2. Look up user
        const string selectUserSql = @"
            SELECT id, tenant_id, email, first_name, last_name, email_confirmed, is_active, created_at, last_login_at
            FROM public.users
            WHERE id = @UserId AND deleted_at IS NULL
            LIMIT 1;";

        var user = await connection.QueryFirstOrDefaultAsync<dynamic>(selectUserSql, new { UserId = userId });

        if (user == null || user.is_active == false)
        {
            _logger.LogWarning("User {UserId} not found or inactive during token refresh.", userId);
            return Unauthorized(new { message = "User account is inactive or disabled." });
        }

        Guid tenantId = request.TenantId ?? user.tenant_id ?? Guid.Empty;

        // 3. Fetch user authorization & roles
        var auth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userId);

        // 4. Generate new signed JWT accessToken
        var (newAccessToken, expiresIn) = GenerateJwtToken(userId, tenantId, (string)user.email, auth);

        // 5. Revoke old refresh token (mark is_revoked = true, revoked_at = NOW(), revoked_reason = 'Rotated')
        const string revokeTokenSql = @"
            UPDATE public.refresh_tokens
            SET is_revoked = true, revoked_at = NOW(), revoked_reason = 'Rotated'
            WHERE id = @TokenId;";

        await connection.ExecuteAsync(revokeTokenSql, new { TokenId = (Guid)storedToken.id });

        // 6. Create and insert new 90-day refresh token
        var newRefreshToken = GenerateRefreshToken();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();

        const string insertNewTokenSql = @"
            INSERT INTO public.refresh_tokens (id, user_id, token, expires_at, created_at, is_revoked, ip_address, user_agent)
            VALUES (gen_random_uuid(), @UserId, @Token, NOW() + INTERVAL '90 days', NOW(), false, @IpAddress, @UserAgent);";

        await connection.ExecuteAsync(insertNewTokenSql, new
        {
            UserId = userId,
            Token = newRefreshToken,
            IpAddress = ipAddress,
            UserAgent = userAgent
        });

        _logger.LogInformation("Successfully rotated refresh token for user {UserId}", userId);

        return Ok(new
        {
            accessToken = newAccessToken,
            refreshToken = newRefreshToken,
            expiresIn = expiresIn,
            tokenType = "Bearer"
        });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request)
    {
        if (!string.IsNullOrWhiteSpace(request?.RefreshToken))
        {
            try
            {
                using var connection = await _dbConnectionFactory.CreateConnectionAsync();
                const string revokeSql = @"
                    UPDATE public.refresh_tokens
                    SET is_revoked = true, revoked_at = NOW(), revoked_reason = 'User Logout'
                    WHERE token = @RefreshToken AND is_revoked = false;";
                await connection.ExecuteAsync(revokeSql, new { RefreshToken = request.RefreshToken.Trim() });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking refresh token on logout");
            }
        }

        return Ok(new { message = "Logged out successfully." });
    }

    [HttpGet("capabilities")]
    [Authorize]
    public async Task<IActionResult> GetCapabilities()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? User.FindFirst("userId")?.Value;

        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
        {
            return Unauthorized(new { message = "Invalid or missing user identity in access token." });
        }

        var tenantClaim = User.FindFirst("tenant_id")?.Value
                       ?? User.FindFirst("tenantId")?.Value;

        Guid tenantId = Guid.Empty;
        if (!string.IsNullOrEmpty(tenantClaim))
        {
            Guid.TryParse(tenantClaim, out tenantId);
        }

        if (tenantId == Guid.Empty)
        {
            using var connection = await _dbConnectionFactory.CreateConnectionAsync();
            const string sql = "SELECT tenant_id FROM public.users WHERE id = @UserId LIMIT 1;";
            tenantId = await connection.QueryFirstOrDefaultAsync<Guid>(sql, new { UserId = userId });
        }

        if (tenantId == Guid.Empty)
        {
            tenantId = Guid.Empty;
        }

        var auth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userId);

        var response = new UserCapabilitiesResponse
        {
            UserId = auth.UserId,
            TenantId = auth.TenantId,
            IsSuperAdmin = auth.IsSuperAdmin,
            Roles = auth.Roles,
            Permissions = auth.Permissions,
            Version = auth.Version
        };

        return Ok(response);
    }

    private (string token, int expiresInSeconds) GenerateJwtToken(Guid userId, Guid tenantId, string email, UserAuthorizationModel auth)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? "deeplens-super-secret-key-32-chars-long-2026!";
        var issuer = _configuration["Jwt:Issuer"] ?? "deeplens-api";
        var audience = _configuration["Jwt:Audience"] ?? "deeplens-api";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var mins) ? mins : 1440;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Email, email),
            new("tenant_id", tenantId.ToString()),
            new("is_super_admin", auth.IsSuperAdmin ? "true" : "false"),
            new("scope", "deeplens.search deeplens.api")
        };

        foreach (var role in auth.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        foreach (var perm in auth.Permissions)
        {
            claims.Add(new Claim("permission", perm));
        }

        var expires = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expires,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return (tokenHandler.WriteToken(token), expiryMinutes * 60);
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
