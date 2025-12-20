using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using NextGen.Identity.Core.DTOs;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Data.Services;

public class ApiKeyService : IApiKeyService
{
    private readonly ITenantApiKeyRepository _apiKeyRepository;
    private readonly ILogger<ApiKeyService> _logger;
    private const string KeyPrefix = "dlp_";

    public ApiKeyService(ITenantApiKeyRepository apiKeyRepository, ILogger<ApiKeyService> logger)
    {
        _apiKeyRepository = apiKeyRepository;
        _logger = logger;
    }

    public async Task<CreateApiKeyResponse> CreateApiKeyAsync(Guid tenantId, Guid userId, CreateApiKeyRequest request)
    {
        _logger.LogInformation("Creating API key '{KeyName}' for tenant {TenantId}", request.Name, tenantId);

        // 1. Generate plain text key
        var randomPart = GenerateSecureRandomString(32);
        var plainTextKey = $"{KeyPrefix}{randomPart}";
        
        // 2. Extract prefix for display (prefix + first 4 chars of random part)
        var displayPrefix = plainTextKey.Substring(0, 8);
        
        // 3. Hash the key for storage
        var keyHash = HashKey(plainTextKey);
        
        var expiresAt = request.ExpiresInDays.HasValue 
            ? DateTime.UtcNow.AddDays(request.ExpiresInDays.Value) 
            : (DateTime?)null;

        var scopes = request.Scopes != null ? string.Join(" ", request.Scopes) : null;

        var apiKey = new TenantApiKey
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            KeyHash = keyHash,
            KeyPrefix = displayPrefix,
            Scopes = scopes,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            IsActive = true,
            CreatedBy = userId
        };

        await _apiKeyRepository.CreateAsync(apiKey);

        return new CreateApiKeyResponse
        {
            Id = apiKey.Id,
            Name = apiKey.Name,
            Prefix = apiKey.KeyPrefix,
            Scopes = request.Scopes,
            CreatedAt = apiKey.CreatedAt,
            ExpiresAt = apiKey.ExpiresAt,
            IsActive = apiKey.IsActive,
            PlainTextKey = plainTextKey // Return full key only once
        };
    }

    public async Task<bool> RevokeApiKeyAsync(Guid tenantId, Guid keyId)
    {
        var apiKey = await _apiKeyRepository.GetByIdAsync(keyId);
        if (apiKey == null || apiKey.TenantId != tenantId)
        {
            return false;
        }

        apiKey.IsActive = false;
        await _apiKeyRepository.UpdateAsync(apiKey);
        
        _logger.LogInformation("Revoked API key {KeyId} for tenant {TenantId}", keyId, tenantId);
        return true;
    }

    public async Task<List<ApiKeyResponse>> GetTenantApiKeysAsync(Guid tenantId)
    {
        var keys = await _apiKeyRepository.GetByTenantIdAsync(tenantId);
        return keys.Select(k => new ApiKeyResponse
        {
            Id = k.Id,
            Name = k.Name,
            Prefix = k.KeyPrefix,
            Scopes = !string.IsNullOrEmpty(k.Scopes) ? k.Scopes.Split(' ').ToList() : null,
            CreatedAt = k.CreatedAt,
            ExpiresAt = k.ExpiresAt,
            LastUsedAt = k.LastUsedAt,
            IsActive = k.IsActive
        }).ToList();
    }

    public async Task<TenantApiKey?> ValidateApiKeyAsync(string plainTextKey)
    {
        if (string.IsNullOrEmpty(plainTextKey) || !plainTextKey.StartsWith(KeyPrefix))
        {
            return null;
        }

        var displayPrefix = plainTextKey.Substring(0, 8);
        var keyHash = HashKey(plainTextKey);

        // For security, search by prefix first (indexed) then verify hash
        var apiKey = await _apiKeyRepository.GetByPrefixAsync(displayPrefix);
        
        if (apiKey == null || !apiKey.IsActive)
        {
            return null;
        }

        // Constant-time comparison or just direct hash comparison (since it's a strongly hashed secret)
        if (apiKey.KeyHash != keyHash)
        {
            return null;
        }

        // Check expiration
        if (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt.Value < DateTime.UtcNow)
        {
            _logger.LogWarning("Attempted use of expired API key {KeyId}", apiKey.Id);
            return null;
        }

        // Update last used
        apiKey.LastUsedAt = DateTime.UtcNow;
        await _apiKeyRepository.UpdateAsync(apiKey);

        return apiKey;
    }

    private static string GenerateSecureRandomString(int length)
    {
        const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var res = new StringBuilder();
        using (var rng = RandomNumberGenerator.Create())
        {
            byte[] uintBuffer = new byte[sizeof(uint)];

            while (length-- > 0)
            {
                rng.GetBytes(uintBuffer);
                uint num = BitConverter.ToUInt32(uintBuffer, 0);
                res.Append(chars[(int)(num % (uint)chars.Length)]);
            }
        }
        return res.ToString();
    }

    private static string HashKey(string key)
    {
        using (var sha256 = SHA256.Create())
        {
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(key));
            return Convert.ToBase64String(hashedBytes);
        }
    }
}
