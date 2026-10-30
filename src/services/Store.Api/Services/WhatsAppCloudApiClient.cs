using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Store.Api.Models;

namespace Store.Api.Services;

public class WhatsAppCloudApiClient : IWhatsAppCloudApiClient
{
    private readonly HttpClient _httpClient;
    private readonly WhatsAppCloudApiOptions _options;
    private readonly ILogger<WhatsAppCloudApiClient> _logger;

    public bool IsMockMode => _options.MockMode || string.IsNullOrWhiteSpace(_options.PhoneNumberId) || string.IsNullOrWhiteSpace(_options.AccessToken);

    public WhatsAppCloudApiClient(HttpClient httpClient, IConfiguration config, ILogger<WhatsAppCloudApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        _options = new WhatsAppCloudApiOptions();
        config.GetSection("WhatsApp:CloudApi").Bind(_options);

        var envPhoneId = Environment.GetEnvironmentVariable("WHATSAPP_PHONE_NUMBER_ID");
        if (!string.IsNullOrWhiteSpace(envPhoneId)) _options.PhoneNumberId = envPhoneId;

        var envAccessToken = Environment.GetEnvironmentVariable("WHATSAPP_ACCESS_TOKEN");
        if (!string.IsNullOrWhiteSpace(envAccessToken)) _options.AccessToken = envAccessToken;

        var envMock = Environment.GetEnvironmentVariable("WHATSAPP_MOCK_MODE");
        if (!string.IsNullOrWhiteSpace(envMock) && bool.TryParse(envMock, out var mockVal))
        {
            _options.MockMode = mockVal;
        }
    }

    public async Task<bool> SendOtpMessageAsync(string phoneNumber, string otpCode, CancellationToken ct = default)
    {
        var cleanRecipient = Regex.Replace(phoneNumber, @"\D", "");

        if (IsMockMode)
        {
            _logger.LogInformation(
                "\n======================================================\n" +
                "[MOCK WHATSAPP OTP] Dispatched code: {OtpCode} to: {Recipient} (MockMode: {MockMode})\n" +
                "======================================================",
                otpCode, cleanRecipient, _options.MockMode);
            return true;
        }

        try
        {
            var url = $"{_options.BaseUrl.TrimEnd('/')}/{_options.ApiVersion}/{_options.PhoneNumberId}/messages";

            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = cleanRecipient,
                type = "template",
                template = new
                {
                    name = _options.OtpTemplateName,
                    language = new { code = "en" },
                    components = new object[]
                    {
                        new
                        {
                            type = "body",
                            parameters = new object[]
                            {
                                new { type = "text", text = otpCode }
                            }
                        },
                        new
                        {
                            type = "button",
                            sub_type = "url",
                            index = "0",
                            parameters = new object[]
                            {
                                new { type = "text", text = otpCode }
                            }
                        }
                    }
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AccessToken);
            request.Content = jsonContent;

            var response = await _httpClient.SendAsync(request, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully sent WhatsApp OTP to {Phone}. Meta response: {Response}", cleanRecipient, responseBody);
                return true;
            }

            _logger.LogError("Failed to send WhatsApp OTP to {Phone}. Status: {StatusCode}, Response: {Response}",
                cleanRecipient, response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while attempting to send WhatsApp OTP to {Phone}", cleanRecipient);
            return false;
        }
    }
}
