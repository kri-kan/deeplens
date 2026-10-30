using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using Npgsql;
using Store.Api.Models;

namespace Store.Api.Services;

public class AuthService : IAuthService
{
    private readonly string _connectionString;
    private readonly IWhatsAppCloudApiClient _whatsAppClient;
    private readonly ITelemetryService _telemetryService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IConfiguration config,
        IWhatsAppCloudApiClient whatsAppClient,
        ITelemetryService telemetryService,
        ILogger<AuthService> logger)
    {
        _whatsAppClient = whatsAppClient;
        _telemetryService = telemetryService;
        _logger = logger;
        _connectionString = config.GetConnectionString("StoreDb")
            ?? config["ConnectionStrings:StoreDb"]
            ?? config["ConnectionStrings__StoreDb"]
            ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";
    }

    public static string NormalizePhoneNumber(string rawPhone)
    {
        if (string.IsNullOrWhiteSpace(rawPhone)) return string.Empty;
        var digits = Regex.Replace(rawPhone, @"\D", "");
        if (digits.Length == 10) return "+91" + digits;
        if (digits.Length == 11 && digits.StartsWith("0")) return "+91" + digits[1..];
        if (digits.Length == 12 && digits.StartsWith("91")) return "+" + digits;
        return "+" + digits;
    }

    private static string HashOtp(string otp, string salt)
    {
        using var sha256 = SHA256.Create();
        var rawBytes = Encoding.UTF8.GetBytes($"salt:{salt}:otp:{otp}");
        var hashBytes = sha256.ComputeHash(rawBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    public async Task<SendOtpResponse> SendOtpAsync(SendOtpRequest request, CancellationToken ct = default)
    {
        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone) || normalizedPhone.Length < 10)
        {
            return new SendOtpResponse
            {
                Success = false,
                Message = "A valid phone number is required.",
                Phone = request.Phone
            };
        }

        var deviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? "dev_anonymous" : request.DeviceId;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        // Rate limit: max 5 requests per 10 minutes for this phone number
        const string rateLimitSql = @"
            SELECT COUNT(*) FROM store_otp_requests
            WHERE phone = @Phone AND created_at > (NOW() - INTERVAL '10 minutes');";

        var recentCount = await conn.ExecuteScalarAsync<int>(rateLimitSql, new { Phone = normalizedPhone });
        if (recentCount >= 5)
        {
            return new SendOtpResponse
            {
                Success = false,
                Message = "Too many OTP requests. Please wait 10 minutes before requesting again.",
                Phone = normalizedPhone
            };
        }

        // Generate 6-digit cryptographic OTP
        var otpCode = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var otpHash = HashOtp(otpCode, salt);
        var expiresInSeconds = 300; // 5 minutes

        const string insertOtpSql = @"
            INSERT INTO store_otp_requests (id, phone, device_id, otp_hash, salt, attempts_count, is_verified, expires_at, created_at)
            VALUES (gen_random_uuid(), @Phone, @DeviceId, @OtpHash, @Salt, 0, FALSE, NOW() + INTERVAL '5 minutes', NOW());";

        await conn.ExecuteAsync(insertOtpSql, new
        {
            Phone = normalizedPhone,
            DeviceId = deviceId,
            OtpHash = otpHash,
            Salt = salt
        });

        // Dispatch via WhatsApp Cloud API client
        var dispatchSuccess = await _whatsAppClient.SendOtpMessageAsync(normalizedPhone, otpCode, ct);
        if (!dispatchSuccess && !_whatsAppClient.IsMockMode)
        {
            return new SendOtpResponse
            {
                Success = false,
                Message = "Failed to dispatch WhatsApp OTP. Please try again or contact support.",
                Phone = normalizedPhone
            };
        }

        return new SendOtpResponse
        {
            Success = true,
            Message = "OTP sent successfully via WhatsApp.",
            Phone = normalizedPhone,
            ExpiresInSeconds = expiresInSeconds,
            MockOtp = _whatsAppClient.IsMockMode ? otpCode : null
        };
    }

    public async Task<VerifyOtpResponse> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken ct = default)
    {
        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
        {
            return new VerifyOtpResponse { Success = false, Message = "Invalid phone number." };
        }

        if (string.IsNullOrWhiteSpace(request.Otp) || request.Otp.Trim().Length != 6)
        {
            return new VerifyOtpResponse { Success = false, Message = "Please enter a valid 6-digit verification code." };
        }

        var deviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? "dev_anonymous" : request.DeviceId;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string findOtpSql = @"
            SELECT id, phone, device_id, otp_hash, salt, attempts_count, is_verified, expires_at
            FROM store_otp_requests
            WHERE phone = @Phone AND is_verified = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1;";

        var otpRow = await conn.QuerySingleOrDefaultAsync<dynamic>(findOtpSql, new { Phone = normalizedPhone });
        if (otpRow == null)
        {
            return new VerifyOtpResponse
            {
                Success = false,
                Message = "No active OTP request found or code has expired. Please request a new code."
            };
        }

        int currentAttempts = (int)otpRow.attempts_count;
        if (currentAttempts >= 5)
        {
            return new VerifyOtpResponse
            {
                Success = false,
                Message = "Maximum verification attempts reached. Please request a new code."
            };
        }

        var expectedHash = HashOtp(request.Otp.Trim(), (string)otpRow.salt);
        if (expectedHash != (string)otpRow.otp_hash)
        {
            await conn.ExecuteAsync(
                "UPDATE store_otp_requests SET attempts_count = attempts_count + 1 WHERE id = @Id;",
                new { Id = (Guid)otpRow.id });

            var remaining = 5 - (currentAttempts + 1);
            return new VerifyOtpResponse
            {
                Success = false,
                Message = remaining > 0
                    ? $"Invalid verification code. {remaining} attempt(s) remaining."
                    : "Maximum verification attempts reached. Please request a new code."
            };
        }

        // OTP is valid - mark verified
        await conn.ExecuteAsync("UPDATE store_otp_requests SET is_verified = TRUE WHERE id = @Id;", new { Id = (Guid)otpRow.id });

        // Deterministic Customer User ID
        var digitsOnly = Regex.Replace(normalizedPhone, @"\D", "");
        var userId = $"usr_wa_{digitsOnly}";

        // Upsert customer profile
        const string upsertCustomerSql = @"
            INSERT INTO store_customers (id, phone, full_name, email, default_address, created_at, updated_at)
            VALUES (@UserId, @Phone, NULL, NULL, '{}'::jsonb, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            RETURNING id, phone, full_name, email, default_address::text AS default_address, created_at;";

        var customerDb = await conn.QuerySingleAsync<dynamic>(upsertCustomerSql, new
        {
            UserId = userId,
            Phone = normalizedPhone
        });

        // Generate 365-day Long-Lived Session Token
        var sessionTokenBytes = RandomNumberGenerator.GetBytes(48);
        var sessionToken = "vy_sess_" + Convert.ToHexString(sessionTokenBytes).ToLowerInvariant();
        var expiresAt = DateTime.UtcNow.AddDays(365);

        const string insertSessionSql = @"
            INSERT INTO store_customer_sessions (session_token, user_id, phone, device_id, is_active, expires_at, last_active_at, created_at)
            VALUES (@SessionToken, @UserId, @Phone, @DeviceId, TRUE, @ExpiresAt, NOW(), NOW());";

        await conn.ExecuteAsync(insertSessionSql, new
        {
            SessionToken = sessionToken,
            UserId = userId,
            Phone = normalizedPhone,
            DeviceId = deviceId,
            ExpiresAt = expiresAt
        });

        // Stitch Device to User Identity Graph
        try
        {
            await _telemetryService.StitchDeviceToUserAsync(new StitchIdentityRequest
            {
                DeviceId = deviceId,
                UserId = userId,
                ConfidenceScore = 1.0,
                LinkSource = "whatsapp_otp"
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to asynchronously stitch device {DeviceId} to user {UserId}", deviceId, userId);
        }

        JsonElement? parsedAddress = null;
        if (customerDb.default_address != null && !string.IsNullOrWhiteSpace((string)customerDb.default_address))
        {
            try
            {
                parsedAddress = JsonSerializer.Deserialize<JsonElement>((string)customerDb.default_address);
            }
            catch { }
        }

        var customerDto = new CustomerProfileDto
        {
            UserId = (string)customerDb.id,
            Phone = (string)customerDb.phone,
            FullName = (string?)customerDb.full_name,
            Email = (string?)customerDb.email,
            DefaultAddress = parsedAddress,
            CreatedAt = (DateTime)customerDb.created_at
        };

        return new VerifyOtpResponse
        {
            Success = true,
            Message = "Authentication successful.",
            SessionToken = sessionToken,
            ExpiresAt = expiresAt,
            Customer = customerDto
        };
    }

    public async Task<SessionValidationResponse> ValidateSessionAsync(string sessionToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(sessionToken))
        {
            return new SessionValidationResponse { IsValid = false };
        }

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string selectSessionSql = @"
            SELECT s.session_token, s.user_id, s.phone, s.device_id, s.is_active, s.expires_at, s.last_active_at,
                   c.full_name, c.email, c.default_address::text AS default_address, c.created_at AS customer_created_at
            FROM store_customer_sessions s
            INNER JOIN store_customers c ON s.user_id = c.id
            WHERE s.session_token = @SessionToken AND s.is_active = TRUE AND s.expires_at > NOW()
            LIMIT 1;";

        var row = await conn.QuerySingleOrDefaultAsync<dynamic>(selectSessionSql, new { SessionToken = sessionToken });
        if (row == null)
        {
            return new SessionValidationResponse { IsValid = false };
        }

        // Touch session activity
        await conn.ExecuteAsync(
            "UPDATE store_customer_sessions SET last_active_at = NOW() WHERE session_token = @SessionToken;",
            new { SessionToken = sessionToken });

        JsonElement? parsedAddress = null;
        if (row.default_address != null && !string.IsNullOrWhiteSpace((string)row.default_address))
        {
            try
            {
                parsedAddress = JsonSerializer.Deserialize<JsonElement>((string)row.default_address);
            }
            catch { }
        }

        var customerDto = new CustomerProfileDto
        {
            UserId = (string)row.user_id,
            Phone = (string)row.phone,
            FullName = (string?)row.full_name,
            Email = (string?)row.email,
            DefaultAddress = parsedAddress,
            CreatedAt = (DateTime)row.customer_created_at
        };

        return new SessionValidationResponse
        {
            IsValid = true,
            Customer = customerDto,
            DeviceId = (string?)row.device_id,
            ExpiresAt = (DateTime?)row.expires_at
        };
    }

    public async Task<CustomerProfileDto?> GetProfileAsync(string sessionToken, CancellationToken ct = default)
    {
        var validation = await ValidateSessionAsync(sessionToken, ct);
        return validation.IsValid ? validation.Customer : null;
    }

    public async Task<CustomerProfileDto?> UpdateProfileAsync(string sessionToken, UpdateCustomerProfileRequest request, CancellationToken ct = default)
    {
        var validation = await ValidateSessionAsync(sessionToken, ct);
        if (!validation.IsValid || validation.Customer == null)
        {
            return null;
        }

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var addressJson = request.DefaultAddress.HasValue
            ? request.DefaultAddress.Value.GetRawText()
            : "{}";

        const string updateSql = @"
            UPDATE store_customers
            SET full_name = COALESCE(@FullName, full_name),
                email = COALESCE(@Email, email),
                default_address = CASE WHEN @HasAddress THEN @Address::jsonb ELSE default_address END,
                updated_at = NOW()
            WHERE id = @UserId
            RETURNING id, phone, full_name, email, default_address::text AS default_address, created_at;";

        var row = await conn.QuerySingleAsync<dynamic>(updateSql, new
        {
            UserId = validation.Customer.UserId,
            FullName = request.FullName,
            Email = request.Email,
            HasAddress = request.DefaultAddress.HasValue,
            Address = addressJson
        });

        JsonElement? parsedAddress = null;
        if (row.default_address != null && !string.IsNullOrWhiteSpace((string)row.default_address))
        {
            try { parsedAddress = JsonSerializer.Deserialize<JsonElement>((string)row.default_address); } catch { }
        }

        return new CustomerProfileDto
        {
            UserId = (string)row.id,
            Phone = (string)row.phone,
            FullName = (string?)row.full_name,
            Email = (string?)row.email,
            DefaultAddress = parsedAddress,
            CreatedAt = (DateTime)row.created_at
        };
    }

    public async Task<bool> LogoutAsync(string sessionToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(sessionToken)) return false;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var affected = await conn.ExecuteAsync(
            "UPDATE store_customer_sessions SET is_active = FALSE WHERE session_token = @SessionToken;",
            new { SessionToken = sessionToken });

        return affected > 0;
    }
}
