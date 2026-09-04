using System.Threading;
using System.Threading.Tasks;

namespace DeepLens.Infrastructure.Clients.Delhivery;

public interface IDelhiveryClient
{
    /// <summary>
    /// Checks pincode serviceability for delivery and pickup.
    /// GET /c/api/pin-codes/json/?filter_codes={pincode}
    /// </summary>
    Task<DelhiveryPincodeResponse> CheckPincodeServiceabilityAsync(string pincode, CancellationToken ct = default);

    /// <summary>
    /// Creates and manifests one or more shipments.
    /// POST /api/cmu/create.json
    /// </summary>
    Task<DelhiveryCmuResponse> CreateShipmentAsync(DelhiveryCmuPayload payload, CancellationToken ct = default);

    /// <summary>
    /// Fetches the raw thermal label PDF bytes for an AWB.
    /// GET /api/p/packing_slip?wbns={awb}&pdf=true
    /// </summary>
    Task<byte[]> GeneratePackingSlipAsync(string awb, CancellationToken ct = default);

    /// <summary>
    /// Fetches the thermal label PDF and persists it directly into MinIO storage.
    /// Returns the MinIO storage path / key.
    /// </summary>
    Task<string> GeneratePackingSlipAndPersistAsync(string awb, CancellationToken ct = default);

    /// <summary>
    /// Schedules a pickup request with Delhivery.
    /// POST /fm/request/new/
    /// </summary>
    Task<DelhiveryPickupResponse> SchedulePickupAsync(DelhiveryPickupRequest request, CancellationToken ct = default);

    /// <summary>
    /// Tracks shipment waybill scans and status.
    /// GET /api/v1/packages/json/?waybill={awb}
    /// </summary>
    Task<DelhiveryTrackingResponse> TrackShipmentAsync(string awb, CancellationToken ct = default);

    /// <summary>
    /// Dispatches an NDR human-in-the-loop action (Reattempt, Address update, RTO, etc.)
    /// POST /api/p/edit
    /// </summary>
    Task<DelhiveryNdrEditResponse> SubmitNdrActionAsync(DelhiveryNdrEditRequest request, CancellationToken ct = default);
}
