using System.Security.Claims;
using BCrypt.Net;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Validation;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Api.Services;

/// <summary>
/// Custom resource owner password validator for Duende IdentityServer
/// Handles username/password authentication
/// </summary>
public class DeepLensResourceOwnerPasswordValidator : IResourceOwnerPasswordValidator
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<DeepLensResourceOwnerPasswordValidator> _logger;

    public DeepLensResourceOwnerPasswordValidator(
        IUserRepository userRepository,
        ILogger<DeepLensResourceOwnerPasswordValidator> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task ValidateAsync(ResourceOwnerPasswordValidationContext context)
    {
        try
        {
            // Get user by email
            var user = await _userRepository.GetByEmailAsync(context.UserName);

            if (user == null)
            {
                _logger.LogWarning("Authentication failed for user: {UserName}", context.UserName);
                context.Result = new GrantValidationResult(
                    TokenRequestErrors.InvalidGrant,
                    "Invalid username or password");
                return;
            }

            // Verify password using BCrypt
            if (!BCrypt.Net.BCrypt.Verify(context.Password, user.PasswordHash))
            {
                _logger.LogWarning("Invalid password for user: {UserName}", context.UserName);
                context.Result = new GrantValidationResult(
                    TokenRequestErrors.InvalidGrant,
                    "Invalid username or password");
                return;
            }

            // Check if user is active
            if (!user.IsActive || user.DeletedAt != null)
            {
                _logger.LogWarning("Inactive user attempted login: {UserId}", user.Id);
                context.Result = new GrantValidationResult(
                    TokenRequestErrors.InvalidGrant,
                    "Account is inactive or deleted");
                return;
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            // Create claims for the user
            var claims = new List<Claim>
            {
                new Claim("sub", user.Id.ToString()),
                new Claim("email", user.Email),
                new Claim("role", user.Role.ToString()),
                new Claim("tenant_id", user.TenantId.ToString()),
                new Claim("given_name", user.FirstName),
                new Claim("family_name", user.LastName),
                new Claim("name", $"{user.FirstName} {user.LastName}")
            };

            context.Result = new GrantValidationResult(
                subject: user.Id.ToString(),
                authenticationMethod: "password",
                claims: claims);

            _logger.LogInformation("User authenticated successfully: {UserId}", user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password validation for user: {UserName}", context.UserName);
            context.Result = new GrantValidationResult(
                TokenRequestErrors.InvalidGrant,
                "Authentication failed");
        }
    }
}
