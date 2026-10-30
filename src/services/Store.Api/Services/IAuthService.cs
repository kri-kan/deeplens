using Store.Api.Models;

namespace Store.Api.Services;

public interface IAuthService
{
    Task<SendOtpResponse> SendOtpAsync(SendOtpRequest request, CancellationToken ct = default);
    Task<VerifyOtpResponse> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken ct = default);
    Task<SessionValidationResponse> ValidateSessionAsync(string sessionToken, CancellationToken ct = default);
    Task<CustomerProfileDto?> GetProfileAsync(string sessionToken, CancellationToken ct = default);
    Task<CustomerProfileDto?> UpdateProfileAsync(string sessionToken, UpdateCustomerProfileRequest request, CancellationToken ct = default);
    Task<bool> LogoutAsync(string sessionToken, CancellationToken ct = default);
}
