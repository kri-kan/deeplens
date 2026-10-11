using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;
using Polly.Timeout;

namespace DeepLens.Infrastructure.Clients.Delhivery;

public class DelhiveryClient : IDelhiveryClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IStorageService _storageService;
    private readonly ILogger<DelhiveryClient> _logger;
    private readonly DelhiveryOptions _options;
    private readonly ResiliencePipeline _resiliencePipeline;

    public DelhiveryClient(
        HttpClient httpClient,
        IConfiguration configuration,
        IStorageService storageService,
        ILogger<DelhiveryClient> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _storageService = storageService;
        _logger = logger;

        _options = new DelhiveryOptions();
        _configuration.GetSection(DelhiveryOptions.SectionName).Bind(_options);

        // Fallbacks if not set in config
        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
        {
            _options.BaseUrl = "https://staging-express.delhivery.com";
        }

        if (string.IsNullOrWhiteSpace(_options.ApiToken))
        {
            _options.ApiToken = _configuration["Delhivery:ApiToken"] ?? "delhivery_demo_token";
        }

        // Configure Polly resilience pipeline with exponential backoff & jitter
        _resiliencePipeline = new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = _options.RetryCount > 0 ? _options.RetryCount : 3,
                Delay = TimeSpan.FromSeconds(1),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TimeoutRejectedException>()
                    .Handle<TaskCanceledException>(),
                OnRetry = args =>
                {
                    _logger.LogWarning("Delhivery API call failed. Retrying attempt {AttemptNumber} after {Delay} due to {Error}...",
                        args.AttemptNumber, args.RetryDelay, args.Outcome.Exception?.Message);
                    return ValueTask.CompletedTask;
                }
            })
            .AddTimeout(TimeSpan.FromSeconds(_options.TimeoutSeconds > 0 ? _options.TimeoutSeconds : 60))
            .Build();
    }

    private void ApplyAuthHeader(HttpRequestMessage request)
    {
        var token = _options.ApiToken;
        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.TryAddWithoutValidation("Authorization", $"Token {token}");
        }
    }

    public async Task<DelhiveryPincodeResponse> CheckPincodeServiceabilityAsync(string pincode, CancellationToken ct = default)
    {
        var cleanPin = pincode?.Trim() ?? string.Empty;
        var url = $"{_options.BaseUrl.TrimEnd('/')}/c/api/pin-codes/json/?filter_codes={cleanPin}";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            ApplyAuthHeader(request);

            _logger.LogInformation("Checking Delhivery pincode serviceability for {Pincode}", cleanPin);
            using var response = await _httpClient.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Delhivery pincode check returned HTTP {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                throw new HttpRequestException($"Delhivery pincode check failed with HTTP {response.StatusCode}: {errorBody}");
            }

            var result = await response.Content.ReadFromJsonAsync<DelhiveryPincodeResponse>(cancellationToken: ct);
            return result ?? new DelhiveryPincodeResponse();
        }, ct);
    }

    public async Task<DelhiveryCmuResponse> CreateShipmentAsync(DelhiveryCmuPayload payload, CancellationToken ct = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/cmu/create.json";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            var jsonPayload = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            ApplyAuthHeader(request);

            // Delhivery CMU format expects application/x-www-form-urlencoded with 'format=json&data={payload}'
            var formParams = new Dictionary<string, string>
            {
                { "format", "json" },
                { "data", jsonPayload }
            };
            request.Content = new FormUrlEncodedContent(formParams);

            _logger.LogInformation("Creating Delhivery shipment with CMU API for {Count} packages", payload.Shipments?.Count ?? 0);
            using var response = await _httpClient.SendAsync(request, ct);
            var responseContent = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Delhivery CMU shipment creation failed with status {StatusCode}: {Response}", response.StatusCode, responseContent);
                throw new HttpRequestException($"Delhivery CMU API error: {response.StatusCode} - {responseContent}");
            }

            try
            {
                var result = JsonSerializer.Deserialize<DelhiveryCmuResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return result ?? throw new InvalidOperationException("Delhivery CMU returned an empty response.");
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex, "Failed to parse Delhivery CMU response. Raw content: {Content}", responseContent);
                throw new InvalidOperationException($"Failed to parse Delhivery CMU response: {ex.Message}");
            }
        }, ct);
    }

    public async Task<byte[]> GeneratePackingSlipAsync(string awb, CancellationToken ct = default)
    {
        var cleanAwb = awb?.Trim() ?? string.Empty;
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/p/packing_slip?wbns={cleanAwb}&pdf=true";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            ApplyAuthHeader(request);

            _logger.LogInformation("Fetching packing slip for AWB {Awb}", cleanAwb);
            using var response = await _httpClient.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Delhivery packing slip API returned HTTP {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                throw new HttpRequestException($"Delhivery packing slip API error ({response.StatusCode}): {errorBody}");
            }

            var contentType = response.Content.Headers.ContentType?.MediaType ?? string.Empty;
            if (contentType.Contains("application/pdf") || contentType.Contains("octet-stream"))
            {
                return await response.Content.ReadAsByteArrayAsync(ct);
            }

            var textContent = await response.Content.ReadAsStringAsync(ct);
            try
            {
                var slipResponse = JsonSerializer.Deserialize<DelhiveryPackingSlipResponse>(textContent);
                var pkg = slipResponse?.Packages?.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(pkg?.PdfEncoded))
                {
                    return Convert.FromBase64String(pkg.PdfEncoded);
                }

                if (!string.IsNullOrWhiteSpace(pkg?.PdfDownloadLink))
                {
                    _logger.LogInformation("Downloading official Delhivery packing slip PDF from S3 link for AWB {Awb}", cleanAwb);
                    using var s3Response = await _httpClient.GetAsync(pkg.PdfDownloadLink, ct);
                    if (s3Response.IsSuccessStatusCode)
                    {
                        return await s3Response.Content.ReadAsByteArrayAsync(ct);
                    }
                    _logger.LogError("Failed to download PDF from Delhivery S3 link. Status: {StatusCode}", s3Response.StatusCode);
                }
            }
            catch (Exception parseEx)
            {
                _logger.LogError(parseEx, "Failed to parse Delhivery packing slip JSON for AWB {Awb}", cleanAwb);
                throw;
            }

            throw new InvalidOperationException($"Delhivery packing slip API did not return a valid PDF download link or payload for AWB {cleanAwb}.");
        }, ct);
    }

    public async Task<string> GeneratePackingSlipAndPersistAsync(string awb, CancellationToken ct = default)
    {
        var pdfBytes = await GeneratePackingSlipAsync(awb, ct);
        using var ms = new MemoryStream(pdfBytes);
        ms.Position = 0;

        string minioPath = $"labels/{awb}.pdf";
        _logger.LogInformation("Persisting thermal label for AWB {Awb} to MinIO at {Path}", awb, minioPath);
        
        var uploadedPath = await _storageService.UploadToPathAsync(
            minioPath,
            ms,
            "application/pdf",
            new Dictionary<string, string>
            {
                { "awb", awb },
                { "type", "shipping_label" }
            });

        return uploadedPath;
    }

    public async Task<DelhiveryPickupResponse> SchedulePickupAsync(DelhiveryPickupRequest request, CancellationToken ct = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/fm/request/new/";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            ApplyAuthHeader(httpRequest);
            httpRequest.Content = JsonContent.Create(request);

            _logger.LogInformation("Scheduling Delhivery pickup at location {Location} for date {Date}", request.PickupLocation, request.PickupDate);
            using var response = await _httpClient.SendAsync(httpRequest, ct);
            var responseContent = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Delhivery pickup request failed with status {StatusCode}: {Response}", response.StatusCode, responseContent);
                throw new HttpRequestException($"Delhivery pickup request failed ({response.StatusCode}): {responseContent}");
            }

            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                options.Converters.Add(new FlexibleStringConverter());

                var result = JsonSerializer.Deserialize<DelhiveryPickupResponse>(responseContent, options);
                return result ?? throw new InvalidOperationException("Delhivery pickup returned an empty response.");
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex, "Failed to parse Delhivery pickup response. Raw content: {Content}", responseContent);
                throw new InvalidOperationException($"Failed to parse Delhivery pickup response: {ex.Message}");
            }
        }, ct);
    }

    public async Task<DelhiveryTrackingResponse> TrackShipmentAsync(string awb, CancellationToken ct = default)
    {
        var cleanAwb = awb?.Trim() ?? string.Empty;
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/v1/packages/json/?waybill={cleanAwb}";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            ApplyAuthHeader(request);

            _logger.LogInformation("Querying Delhivery tracking status for AWB {Awb}", cleanAwb);
            using var response = await _httpClient.SendAsync(request, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Delhivery tracking API returned HTTP {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                throw new HttpRequestException($"Delhivery tracking API error ({response.StatusCode}): {errorBody}");
            }

            var content = await response.Content.ReadAsStringAsync(ct);
            try
            {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                options.Converters.Add(new FlexibleStringConverter());

                var trackingData = JsonSerializer.Deserialize<DelhiveryTrackingResponse>(content, options);
                if (trackingData?.ShipmentData != null && trackingData.ShipmentData.Count > 0)
                {
                    return trackingData;
                }
            }
            catch (Exception parseEx)
            {
                _logger.LogError(parseEx, "Failed to parse Delhivery tracking JSON for AWB {Awb}", cleanAwb);
                throw;
            }

            throw new InvalidOperationException($"No shipment tracking records found for AWB '{cleanAwb}' on Delhivery.");
        }, ct);
    }

    public async Task<DelhiveryNdrEditResponse> SubmitNdrActionAsync(DelhiveryNdrEditRequest request, CancellationToken ct = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/p/edit";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            ApplyAuthHeader(httpRequest);
            httpRequest.Content = JsonContent.Create(request);

            _logger.LogInformation("Submitting Delhivery NDR action {Action} for waybill {Waybill}", request.Action, request.Waybill);
            using var response = await _httpClient.SendAsync(httpRequest, ct);
            var responseContent = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Delhivery NDR action returned status {StatusCode}: {Response}", response.StatusCode, responseContent);
                throw new HttpRequestException($"Delhivery NDR action failed ({response.StatusCode}): {responseContent}");
            }

            try
            {
                var result = JsonSerializer.Deserialize<DelhiveryNdrEditResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return result ?? throw new InvalidOperationException("Delhivery NDR action returned empty response.");
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex, "Failed to parse Delhivery NDR response. Raw content: {Content}", responseContent);
                throw new InvalidOperationException($"Failed to parse Delhivery NDR response: {ex.Message}");
            }
        }, ct);
    }

    public async Task<DelhiveryWarehouseResponse> CreateWarehouseAsync(DelhiveryWarehouseCreateRequest request, CancellationToken ct = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/backend/clientwarehouse/create/";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            ApplyAuthHeader(httpRequest);
            httpRequest.Content = JsonContent.Create(request);

            _logger.LogInformation("Registering client warehouse {Name} with Delhivery", request.Name);
            using var response = await _httpClient.SendAsync(httpRequest, ct);
            var responseContent = await response.Content.ReadAsStringAsync(ct);

            try
            {
                var result = JsonSerializer.Deserialize<DelhiveryWarehouseResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return result ?? new DelhiveryWarehouseResponse { Success = response.IsSuccessStatusCode, Message = responseContent };
            }
            catch
            {
                return new DelhiveryWarehouseResponse
                {
                    Success = response.IsSuccessStatusCode,
                    Message = responseContent
                };
            }
        }, ct);
    }

    public async Task<DelhiveryWarehouseResponse> EditWarehouseAsync(DelhiveryWarehouseEditRequest request, CancellationToken ct = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/backend/clientwarehouse/edit/";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            ApplyAuthHeader(httpRequest);
            httpRequest.Content = JsonContent.Create(request);

            _logger.LogInformation("Updating client warehouse {Name} with Delhivery", request.Name);
            using var response = await _httpClient.SendAsync(httpRequest, ct);
            var responseContent = await response.Content.ReadAsStringAsync(ct);

            try
            {
                var result = JsonSerializer.Deserialize<DelhiveryWarehouseResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return result ?? new DelhiveryWarehouseResponse { Success = response.IsSuccessStatusCode, Message = responseContent };
            }
            catch
            {
                return new DelhiveryWarehouseResponse
                {
                    Success = response.IsSuccessStatusCode,
                    Message = responseContent
                };
            }
        }, ct);
    }

    public async Task<DelhiveryCancelResponse> CancelShipmentAsync(string waybill, string? reason = null, CancellationToken ct = default)
    {
        var cleanAwb = waybill?.Trim() ?? string.Empty;
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/p/edit";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            ApplyAuthHeader(httpRequest);
            httpRequest.Content = JsonContent.Create(new DelhiveryCancelRequest
            {
                Waybill = cleanAwb,
                Cancellation = "true"
            });

            _logger.LogInformation("Submitting cancellation to Delhivery for waybill {Waybill}", cleanAwb);
            using var response = await _httpClient.SendAsync(httpRequest, ct);
            var responseContent = await response.Content.ReadAsStringAsync(ct);

            try
            {
                var result = JsonSerializer.Deserialize<DelhiveryCancelResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return result ?? new DelhiveryCancelResponse
                {
                    Status = response.IsSuccessStatusCode,
                    Success = response.IsSuccessStatusCode,
                    Message = responseContent
                };
            }
            catch
            {
                return new DelhiveryCancelResponse
                {
                    Status = response.IsSuccessStatusCode,
                    Success = response.IsSuccessStatusCode,
                    Message = responseContent
                };
            }
        }, ct);
    }

    public async Task<DelhiveryTrackingResponse> TrackShipmentsBulkAsync(IEnumerable<string> awbs, CancellationToken ct = default)
    {
        var cleanList = awbs?.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList() ?? new List<string>();
        if (!cleanList.Any())
        {
            return new DelhiveryTrackingResponse();
        }

        var joinedWaybills = string.Join(",", cleanList);
        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/v1/packages/json/?waybill={Uri.EscapeDataString(joinedWaybills)}";

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            ApplyAuthHeader(request);

            _logger.LogInformation("Querying Delhivery bulk tracking for {Count} waybills", cleanList.Count);
            using var response = await _httpClient.SendAsync(request, ct);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(ct);
                try
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };
                    options.Converters.Add(new FlexibleStringConverter());

                    var trackingData = JsonSerializer.Deserialize<DelhiveryTrackingResponse>(content, options);
                    if (trackingData?.ShipmentData != null && trackingData.ShipmentData.Count > 0)
                    {
                        return trackingData;
                    }
                }
                catch { }
            }

            return new DelhiveryTrackingResponse();
        }, ct);
    }

}
