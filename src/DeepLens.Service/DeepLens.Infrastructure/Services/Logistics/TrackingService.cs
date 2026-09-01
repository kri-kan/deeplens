using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Infrastructure.Persistence.Repositories.Logistics;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public class TrackingService : ITrackingService
{
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogisticsRepository _repository;
    private readonly INdrService _ndrService;
    private readonly ILogger<TrackingService> _logger;

    public TrackingService(
        IDelhiveryClient delhiveryClient,
        ILogisticsRepository repository,
        INdrService ndrService,
        ILogger<TrackingService> logger)
    {
        _delhiveryClient = delhiveryClient;
        _repository = repository;
        _ndrService = ndrService;
        _logger = logger;
    }

    public async Task<TrackingDetailsDto> TrackAwbAsync(string awb, CancellationToken ct = default)
    {
        var cleanAwb = awb?.Trim() ?? string.Empty;
        var response = await _delhiveryClient.TrackShipmentAsync(cleanAwb, ct);

        var shipment = response?.ShipmentData?.FirstOrDefault()?.Shipment;
        if (shipment == null)
        {
            return new TrackingDetailsDto
            {
                Waybill = cleanAwb,
                Status = "Unknown",
                Scans = new List<TrackingScanEventDto>()
            };
        }

        var scansList = new List<TrackingScanEventDto>();
        if (shipment.Scans != null)
        {
            foreach (var s in shipment.Scans)
            {
                if (s.ScanDetail != null)
                {
                    DateTime.TryParse(s.ScanDetail.ScanDateTime, out var scanDt);
                    scansList.Add(new TrackingScanEventDto
                    {
                        ScanDateTime = scanDt == default ? DateTime.UtcNow : scanDt,
                        ScanType = s.ScanDetail.ScanType ?? string.Empty,
                        Scan = s.ScanDetail.Scan ?? string.Empty,
                        Location = s.ScanDetail.ScannedLocation ?? string.Empty,
                        Instructions = s.ScanDetail.Instructions ?? string.Empty
                    });
                }
            }
        }

        DateTime.TryParse(shipment.Status?.StatusDateTime, out var statusDt);
        DateTime.TryParse(shipment.ExpectedDeliveryDate, out var edd);

        string statusText = shipment.Status?.Status ?? "In Transit";
        string statusCode = shipment.Status?.StatusCode ?? string.Empty;

        bool isDelivered = statusText.Contains("Delivered", StringComparison.OrdinalIgnoreCase) || statusCode == "DL";
        bool isRto = statusText.Contains("RTO", StringComparison.OrdinalIgnoreCase) || statusCode == "RT";
        bool isNdr = statusText.Contains("NDR", StringComparison.OrdinalIgnoreCase) || 
                     statusText.Contains("Undelivered", StringComparison.OrdinalIgnoreCase) ||
                     statusCode == "UD";

        return new TrackingDetailsDto
        {
            Waybill = shipment.Awb ?? cleanAwb,
            Status = statusText,
            StatusCode = statusCode,
            StatusDateTime = statusDt == default ? DateTime.UtcNow : statusDt,
            CurrentLocation = shipment.Status?.StatusLocation ?? shipment.Destination,
            Origin = shipment.Origin,
            Destination = shipment.Destination,
            EstimatedDeliveryDate = edd == default ? null : edd,
            IsDelivered = isDelivered,
            IsRto = isRto,
            IsNdr = isNdr,
            NdrReason = isNdr ? (shipment.Status?.Instructions ?? shipment.Status?.Status) : null,
            Scans = scansList.OrderByDescending(x => x.ScanDateTime).ToList()
        };
    }

    public async Task<DelhiveryWebhookResponse> ProcessWebhookScanAsync(DelhiveryWebhookPayload payload, CancellationToken ct = default)
    {
        var waybill = payload.Waybill 
                   ?? payload.Shipment?.Awb 
                   ?? payload.Scans?.FirstOrDefault()?.ScanDetail?.Scan;

        if (string.IsNullOrWhiteSpace(waybill))
        {
            return new DelhiveryWebhookResponse
            {
                Success = false,
                Acknowledged = false,
                Message = "Waybill missing in webhook payload"
            };
        }

        var statusText = payload.Status?.Status ?? payload.Shipment?.Status ?? "In Transit";
        var statusCode = payload.Status?.StatusCode ?? payload.Status?.StatusType ?? string.Empty;
        var instructions = payload.Status?.Instructions ?? string.Empty;

        _logger.LogInformation("Processing Delhivery webhook for AWB {Awb}, Status: {Status}, Code: {Code}", waybill, statusText, statusCode);

        var shipment = await _repository.GetShipmentByAwbAsync(waybill);
        bool ndrCreated = false;
        Guid? ndrTaskId = null;

        // Determine mapped shipment status
        string mappedStatus = "in_transit";
        if (statusText.Contains("Delivered", StringComparison.OrdinalIgnoreCase) || statusCode == "DL")
        {
            mappedStatus = "delivered";
        }
        else if (statusText.Contains("Out for Delivery", StringComparison.OrdinalIgnoreCase) || statusCode == "OD")
        {
            mappedStatus = "out_for_delivery";
        }
        else if (statusText.Contains("RTO Delivered", StringComparison.OrdinalIgnoreCase))
        {
            mappedStatus = "rto_delivered";
        }
        else if (statusText.Contains("RTO", StringComparison.OrdinalIgnoreCase) || statusCode == "RT")
        {
            mappedStatus = "rto_initiated";
        }
        else if (statusText.Contains("Manifest", StringComparison.OrdinalIgnoreCase) || statusCode == "MN")
        {
            mappedStatus = "manifested";
        }
        else if (statusText.Contains("NDR", StringComparison.OrdinalIgnoreCase) || 
                 statusText.Contains("Undelivered", StringComparison.OrdinalIgnoreCase) || 
                 statusCode == "UD")
        {
            mappedStatus = "ndr";
        }

        if (shipment != null)
        {
            await _repository.UpdateShipmentStatusAsync(shipment.Id, mappedStatus);

            if (mappedStatus == "ndr")
            {
                var task = await _ndrService.CreateOrUpdateNdrFromScanAsync(
                    shipment.Id, 
                    waybill, 
                    statusCode, 
                    string.IsNullOrWhiteSpace(instructions) ? statusText : instructions, 
                    null, 
                    ct);

                ndrCreated = true;
                ndrTaskId = task.Id;
            }
        }

        return new DelhiveryWebhookResponse
        {
            Success = true,
            Waybill = waybill,
            Acknowledged = true,
            NdrCreated = ndrCreated,
            NdrTaskId = ndrTaskId,
            Message = $"Webhook scan processed: {mappedStatus}"
        };
    }

    public string GenerateTrackingUrl(string courierPartner, string awb)
    {
        if (string.IsNullOrWhiteSpace(awb)) return string.Empty;

        var cleanAwb = awb.Trim();
        var courier = courierPartner?.ToLowerInvariant() ?? "delhivery";

        return courier switch
        {
            "delhivery" => $"https://www.delhivery.com/track/package/{cleanAwb}",
            "bluedart" => $"https://www.bluedart.com/tracking?track={cleanAwb}",
            "dtdc" => $"https://www.dtdc.in/tracking/tracking_results.asp?trkType=AWB&strCnno={cleanAwb}",
            "shadowfax" => $"https://tracker.shadowfax.in/#/track/{cleanAwb}",
            "xpressbees" => $"https://www.xpressbees.com/shipment/tracking?awb={cleanAwb}",
            _ => $"https://www.delhivery.com/track/package/{cleanAwb}"
        };
    }
}
