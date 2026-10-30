namespace Store.Api.Services;

public interface IWhatsAppCloudApiClient
{
    bool IsMockMode { get; }
    Task<bool> SendOtpMessageAsync(string phoneNumber, string otpCode, CancellationToken ct = default);
}
