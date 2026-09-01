using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;
using DeepLens.Domain.Entities.Logistics;
using DeepLens.Infrastructure.Persistence.Repositories.Logistics;
using DeepLens.Infrastructure.Services.Logistics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/logistics")]
public class LogisticsController : ControllerBase
{
    private readonly IShipmentService _shipmentService;
    private readonly IPickupService _pickupService;
    private readonly ITrackingService _trackingService;
    private readonly INdrService _ndrService;
    private readonly IPincodeService _pincodeService;
    private readonly ILogisticsRepository _repository;
    private readonly ILogger<LogisticsController> _logger;

    public LogisticsController(
        IShipmentService shipmentService,
        IPickupService pickupService,
        ITrackingService trackingService,
        INdrService ndrService,
        IPincodeService pincodeService,
        ILogisticsRepository repository,
        ILogger<LogisticsController> logger)
    {
        _shipmentService = shipmentService;
        _pickupService = pickupService;
        _trackingService = trackingService;
        _ndrService = ndrService;
        _pincodeService = pincodeService;
        _repository = repository;
        _logger = logger;
    }

    /// <summary>
    /// Generates a package split plan based on order items, vendors, and fulfillment hubs, calculating proportional COD per package.
    /// POST /api/v1/logistics/orders/{orderId}/split-preview
    /// </summary>
    [HttpPost("orders/{orderId}/split-preview")]
    public async Task<ActionResult<PackageSplitPreviewResponse>> GetOrderSplitPreview(
        string orderId,
        [FromBody] PackageSplitPreviewRequest? request,
        CancellationToken ct)
    {
        try
        {
            var plan = await _shipmentService.GenerateSplitPreviewAsync(orderId, request, ct);
            return Ok(plan);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate split preview for order {OrderId}", orderId);
            return StatusCode(500, new { message = "Failed to generate package split plan", error = ex.Message });
        }
    }

    /// <summary>
    /// Manifests shipment with Delhivery Express/Surface, allocates AWB, saves thermal PDF label to MinIO, and optionally schedules pickup.
    /// POST /api/v1/logistics/shipments/create-delhivery
    /// </summary>
    [HttpPost("shipments/create-delhivery")]
    public async Task<ActionResult<CreateShipmentResponse>> CreateDelhiveryShipment(
        [FromBody] CreateDelhiveryShipmentRequest request,
        CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Request payload is required." });
        }

        try
        {
            var response = await _shipmentService.CreateDelhiveryShipmentAsync(request, ct);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Delhivery shipment for order {OrderNumber}", request.OrderNumber);
            return StatusCode(500, new { message = "Failed to manifest shipment with Delhivery", error = ex.Message });
        }
    }

    /// <summary>
    /// Attaches an external courier label/AWB from vendor dispatch.
    /// POST /api/v1/logistics/shipments/{id}/attach-vendor-tracking
    /// </summary>
    [HttpPost("shipments/{id}/attach-vendor-tracking")]
    public async Task<ActionResult<AttachVendorTrackingResponse>> AttachVendorTracking(
        Guid id,
        [FromBody] AttachVendorTrackingRequest request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.AwbNumber))
        {
            return BadRequest(new { message = "AWB Number is required." });
        }

        try
        {
            var response = await _shipmentService.AttachVendorTrackingAsync(id, request, ct);
            return Ok(response);
        }
        catch (KeyNotFoundException knf)
        {
            return NotFound(new { message = knf.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to attach vendor tracking for shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Failed to attach vendor tracking", error = ex.Message });
        }
    }

    /// <summary>
    /// Prepares and dispatches customer tracking notification link via WhatsApp / Instagram.
    /// POST /api/v1/logistics/shipments/{id}/forward-customer-tracking
    /// </summary>
    [HttpPost("shipments/{id}/forward-customer-tracking")]
    public async Task<ActionResult<ForwardCustomerTrackingResponse>> ForwardCustomerTracking(
        Guid id,
        [FromBody] ForwardCustomerTrackingRequest request,
        CancellationToken ct)
    {
        try
        {
            var response = await _shipmentService.ForwardCustomerTrackingAsync(id, request, ct);
            return Ok(response);
        }
        catch (KeyNotFoundException knf)
        {
            return NotFound(new { message = knf.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to forward customer tracking for shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Failed to forward customer tracking", error = ex.Message });
        }
    }

    /// <summary>
    /// Transitions Procure-to-Ship items (Pending -> Inbound -> ReceivedAtHub -> ReadyToShip).
    /// PUT /api/v1/logistics/shipments/{id}/procure-status
    /// </summary>
    [HttpPut("shipments/{id}/procure-status")]
    public async Task<ActionResult<ProcureStatusResponse>> UpdateProcureStatus(
        Guid id,
        [FromBody] ProcureStatusUpdateRequest request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.ProcureStatus))
        {
            return BadRequest(new { message = "Procure status is required." });
        }

        try
        {
            var response = await _shipmentService.UpdateProcureStatusAsync(id, request, ct);
            return Ok(response);
        }
        catch (KeyNotFoundException knf)
        {
            return NotFound(new { message = knf.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update procure status for shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Failed to update procure status", error = ex.Message });
        }
    }

    /// <summary>
    /// Ingests tracking scan webhooks from Delhivery and auto-creates NDR human-in-the-loop tasks when NDR status is detected.
    /// POST /api/v1/logistics/webhook/delhivery
    /// </summary>
    [HttpPost("webhook/delhivery")]
    [AllowAnonymous]
    public async Task<ActionResult<DelhiveryWebhookResponse>> DelhiveryWebhook(
        [FromBody] DelhiveryWebhookPayload payload,
        CancellationToken ct)
    {
        if (payload == null)
        {
            return BadRequest(new { message = "Webhook payload is required." });
        }

        try
        {
            var response = await _trackingService.ProcessWebhookScanAsync(payload, ct);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process Delhivery webhook");
            return StatusCode(500, new { message = "Webhook processing error", error = ex.Message });
        }
    }

    /// <summary>
    /// Dispatches approved NDR human-in-the-loop action (Reattempt, Address update, RTO, Phone update) to Delhivery.
    /// POST /api/v1/logistics/ndr/{id}/action
    /// </summary>
    [HttpPost("ndr/{id}/action")]
    public async Task<ActionResult<NdrActionResponse>> SubmitNdrAction(
        Guid id,
        [FromBody] NdrActionRequest request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Action))
        {
            return BadRequest(new { message = "NDR action is required." });
        }

        try
        {
            var response = await _ndrService.ExecuteNdrActionAsync(id, request, ct);
            return Ok(response);
        }
        catch (KeyNotFoundException knf)
        {
            return NotFound(new { message = knf.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute NDR action for task {Id}", id);
            return StatusCode(500, new { message = "Failed to execute NDR action", error = ex.Message });
        }
    }

    /// <summary>
    /// Returns list of active fulfillment warehouses / hubs.
    /// GET /api/v1/logistics/warehouses
    /// </summary>
    [HttpGet("warehouses")]
    public async Task<ActionResult<List<WarehouseDto>>> GetWarehouses()
    {
        try
        {
            var warehouses = await _repository.GetAllWarehousesAsync();
            var dtos = warehouses.Select(w => new WarehouseDto
            {
                Id = w.Id,
                Name = w.Name,
                Code = w.Code,
                AddressLine1 = w.AddressLine1,
                AddressLine2 = w.AddressLine2,
                City = w.City,
                State = w.State,
                Pincode = w.Pincode,
                Phone = w.Phone,
                ContactPerson = w.ContactPerson,
                IsCentral = w.IsCentral,
                IsActive = w.IsActive,
                CreatedAt = w.CreatedAt
            }).ToList();

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve warehouses");
            return StatusCode(500, new { message = "Failed to retrieve warehouses", error = ex.Message });
        }
    }

    /// <summary>
    /// Returns pending NDR items needing human-in-the-loop resolution.
    /// GET /api/v1/logistics/ndr/pending
    /// </summary>
    [HttpGet("ndr/pending")]
    public async Task<ActionResult<List<PendingNdrDto>>> GetPendingNdr(CancellationToken ct)
    {
        try
        {
            var list = await _ndrService.GetPendingNdrsAsync(ct);
            return Ok(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve pending NDR tasks");
            return StatusCode(500, new { message = "Failed to retrieve pending NDR tasks", error = ex.Message });
        }
    }

    /// <summary>
    /// Returns logistics escalations with optional status / shipmentId filters.
    /// GET /api/v1/logistics/escalations
    /// </summary>
    [HttpGet("escalations")]
    public async Task<ActionResult<List<LogisticsEscalationDto>>> GetEscalations(
        [FromQuery] string? status = null,
        [FromQuery] Guid? shipmentId = null)
    {
        try
        {
            var escalations = await _repository.GetEscalationsAsync(status, shipmentId);
            var dtos = new List<LogisticsEscalationDto>();

            foreach (var e in escalations)
            {
                var shipment = await _repository.GetShipmentByIdAsync(e.ShipmentId);
                dtos.Add(new LogisticsEscalationDto
                {
                    Id = e.Id,
                    ShipmentId = e.ShipmentId,
                    OrderNumber = shipment?.OrderNumber ?? string.Empty,
                    AwbNumber = e.AwbNumber ?? shipment?.AwbNumber,
                    IssueType = e.IssueType,
                    Description = e.Description,
                    Status = e.Status,
                    ExternalTicketId = e.ExternalTicketId,
                    ResolutionNotes = e.ResolutionNotes,
                    CreatedAt = e.CreatedAt,
                    ResolvedAt = e.ResolvedAt
                });
            }

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve escalations");
            return StatusCode(500, new { message = "Failed to retrieve escalations", error = ex.Message });
        }
    }

    /// <summary>
    /// Creates a logistics escalation (e.g. delay, lost in transit, damaged, fake attempt).
    /// POST /api/v1/logistics/escalations
    /// </summary>
    [HttpPost("escalations")]
    public async Task<ActionResult<LogisticsEscalationDto>> CreateEscalation(
        [FromBody] CreateEscalationRequest request)
    {
        if (request == null || request.ShipmentId == Guid.Empty)
        {
            return BadRequest(new { message = "Shipment ID is required." });
        }

        try
        {
            var shipment = await _repository.GetShipmentByIdAsync(request.ShipmentId);
            var awb = request.AwbNumber ?? shipment?.AwbNumber;

            var escalation = new ShippingEscalation
            {
                Id = Guid.NewGuid(),
                ShipmentId = request.ShipmentId,
                AwbNumber = awb,
                IssueType = request.IssueType ?? "delay",
                Description = request.Description,
                Status = "open",
                ExternalTicketId = request.ExternalTicketId,
                CreatedAt = DateTime.UtcNow
            };

            var id = await _repository.CreateEscalationAsync(escalation);
            escalation.Id = id;

            var dto = new LogisticsEscalationDto
            {
                Id = id,
                ShipmentId = escalation.ShipmentId,
                OrderNumber = shipment?.OrderNumber ?? string.Empty,
                AwbNumber = awb,
                IssueType = escalation.IssueType,
                Description = escalation.Description,
                Status = escalation.Status,
                ExternalTicketId = escalation.ExternalTicketId,
                CreatedAt = escalation.CreatedAt
            };

            return CreatedAtAction(nameof(GetEscalations), new { shipmentId = escalation.ShipmentId }, dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create escalation for shipment {ShipmentId}", request.ShipmentId);
            return StatusCode(500, new { message = "Failed to create escalation", error = ex.Message });
        }
    }

    /// <summary>
    /// Checks pincode serviceability for prepaid, COD, express, and pickup.
    /// GET /api/v1/logistics/pincode/{pincode}
    /// </summary>
    [HttpGet("pincode/{pincode}")]
    public async Task<ActionResult<PincodeCheckResponse>> CheckPincode(string pincode, CancellationToken ct)
    {
        try
        {
            var result = await _pincodeService.CheckPincodeAsync(pincode, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check pincode {Pincode}", pincode);
            return StatusCode(500, new { message = "Failed to check pincode", error = ex.Message });
        }
    }

    /// <summary>
    /// Tracks shipment live scans and EDD by AWB number.
    /// GET /api/v1/logistics/track/{awb}
    /// </summary>
    [HttpGet("track/{awb}")]
    public async Task<ActionResult<TrackingDetailsDto>> TrackShipment(string awb, CancellationToken ct)
    {
        try
        {
            var tracking = await _trackingService.TrackAwbAsync(awb, ct);
            return Ok(tracking);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track AWB {Awb}", awb);
            return StatusCode(500, new { message = "Failed to track shipment", error = ex.Message });
        }
    }

    /// <summary>
    /// Schedules a pickup request with Delhivery.
    /// POST /api/v1/logistics/pickups/schedule
    /// </summary>
    [HttpPost("pickups/schedule")]
    public async Task<ActionResult<PickupResponseDto>> SchedulePickup(
        [FromBody] PickupRequestDto request,
        CancellationToken ct)
    {
        try
        {
            var response = await _pickupService.SchedulePickupAsync(request, ct);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to schedule pickup");
            return StatusCode(500, new { message = "Failed to schedule pickup", error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves shipment details by ID.
    /// GET /api/v1/logistics/shipments/{id}
    /// </summary>
    [HttpGet("shipments/{id}")]
    public async Task<ActionResult<Shipment>> GetShipment(Guid id)
    {
        var shipment = await _repository.GetShipmentByIdAsync(id);
        if (shipment == null)
        {
            return NotFound(new { message = $"Shipment with ID '{id}' not found." });
        }

        return Ok(shipment);
    }
}
