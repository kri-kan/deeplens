using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;

namespace DeepLens.Infrastructure.Services.Logistics;

public interface ITrackingService
{
    Task<TrackingDetailsDto> TrackAwbAsync(string awb, CancellationToken ct = default);
    Task<DelhiveryWebhookResponse> ProcessWebhookScanAsync(DelhiveryWebhookPayload payload, CancellationToken ct = default);
    string GenerateTrackingUrl(string courierPartner, string awb);
}
