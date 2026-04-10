using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using BCrypt.Net;
using NextGen.Identity.Core.DTOs;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Data.Services;

public class AuthenticationService : IAuthenticationService
{
    private readonly IUserRepository _userRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthenticationService(
        IUserRepository userRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, string ipAddress, string userAgent)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.UserAuthentication);
        activity?.SetTag(Telemetry.Tags.UserEmail, request.Email);
        activity?.SetTag("ip.address", ipAddress);

        try
        {
            // Get user by email
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                activity?.SetTag("auth.result", "user_not_found");
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            activity?.SetTag(Telemetry.Tags.UserId, user.Id);
            activity?.SetTag(Telemetry.Tags.TenantId, user.TenantId);

            // Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                activity?.SetTag("auth.result", "invalid_password");
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Check if user is active
            if (!user.IsActive)
            {
                activity?.SetTag("auth.result", "user_inactive");
                throw new UnauthorizedAccessException("Account is inactive");
            }

            // Generate tokens
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var refreshToken = GenerateRefreshToken();

            // Save refresh token
            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = false,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            await _refreshTokenRepository.CreateAsync(refreshTokenEntity);

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            activity?.SetTag("auth.result", "success");
            activity?.SetTag(Telemetry.Tags.TokenType, "access+refresh");

            return new LoginResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role.ToString(),
                    TenantId = user.TenantId
                }
            };
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<LoginResponse> RefreshTokenAsync(string refreshToken, string ipAddress, string userAgent)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TokenValidation);
        activity?.SetTag(Telemetry.Tags.TokenType, "refresh");
        activity?.SetTag("ip.address", ipAddress);

        try
        {
            // Get refresh token
            var tokenEntity = await _refreshTokenRepository.GetByTokenAsync(refreshToken);
            if (tokenEntity == null || tokenEntity.IsRevoked || tokenEntity.ExpiresAt < DateTime.UtcNow)
            {
                activity?.SetTag("token.result", "invalid_or_expired");
                throw new UnauthorizedAccessException("Invalid or expired refresh token");
            }

            activity?.SetTag(Telemetry.Tags.UserId, tokenEntity.UserId);

            // Get user
            var user = await _userRepository.GetByIdAsync(tokenEntity.UserId);
            if (user == null || !user.IsActive)
            {
                activity?.SetTag("token.result", "user_not_found_or_inactive");
                throw new UnauthorizedAccessException("User not found or inactive");
            }

            activity?.SetTag(Telemetry.Tags.TenantId, user.TenantId);

            // Revoke old refresh token
            tokenEntity.IsRevoked = true;
            tokenEntity.RevokedAt = DateTime.UtcNow;
            tokenEntity.RevokedReason = "Replaced by refresh";
            await _refreshTokenRepository.UpdateAsync(tokenEntity);

            // Generate new tokens
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var newRefreshToken = GenerateRefreshToken();

            // Save new refresh token
            var newRefreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = false,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            await _refreshTokenRepository.CreateAsync(newRefreshTokenEntity);

            activity?.SetTag("token.result", "refreshed_successfully");

            return new LoginResponse
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken,
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role.ToString(),
                    TenantId = user.TenantId
                }
            };
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<UserInfo> RegisterUserAsync(RegisterRequest request)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.UserRegistration);
        activity?.SetTag(Telemetry.Tags.UserEmail, request.Email);
        activity?.SetTag(Telemetry.Tags.TenantId, request.TenantId);

        try
        {
            // Check if user already exists
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                activity?.SetTag("registration.result", "email_already_exists");
                throw new InvalidOperationException("User with this email already exists");
            }

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Create user
            var user = new User
            {
                Id = Guid.NewGuid(),
                TenantId = request.TenantId,
                Email = request.Email,
                PasswordHash = passwordHash,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = UserRole.User,
                IsActive = true,
                EmailConfirmed = false,
                CreatedAt = DateTime.UtcNow
            };

            var createdUser = await _userRepository.CreateAsync(user);

            activity?.SetTag(Telemetry.Tags.UserId, createdUser.Id);
            activity?.SetTag("registration.result", "success");

            return new UserInfo
            {
                Id = createdUser.Id,
                Email = createdUser.Email,
                FirstName = createdUser.FirstName,
                LastName = createdUser.LastName,
                Role = createdUser.Role.ToString(),
                TenantId = createdUser.TenantId
            };
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TokenValidation);
        activity?.SetTag(Telemetry.Tags.TokenType, "refresh");
        activity?.SetTag("token.action", "revoke");

        try
        {
            var tokenEntity = await _refreshTokenRepository.GetByTokenAsync(refreshToken);
            if (tokenEntity == null)
            {
                activity?.SetTag("revoke.result", "token_not_found");
                throw new ArgumentException("Token not found");
            }

            activity?.SetTag(Telemetry.Tags.UserId, tokenEntity.UserId);

            tokenEntity.IsRevoked = true;
            tokenEntity.RevokedAt = DateTime.UtcNow;
            tokenEntity.RevokedReason = "User logout";
            await _refreshTokenRepository.UpdateAsync(tokenEntity);

            activity?.SetTag("revoke.result", "success");
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<bool> ValidateTokenAsync(string token)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TokenValidation);
        activity?.SetTag(Telemetry.Tags.TokenType, "access");

        try
        {
            var isValid = _jwtTokenService.ValidateToken(token);
            activity?.SetTag("validation.result", isValid ? "valid" : "invalid");
            return isValid;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
