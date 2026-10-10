using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;
using DeepLens.Domain.Entities.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
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
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogger<LogisticsController> _logger;

    public LogisticsController(
        IShipmentService shipmentService,
        IPickupService pickupService,
        ITrackingService trackingService,
        INdrService ndrService,
        IPincodeService pincodeService,
        ILogisticsRepository repository,
        IDelhiveryClient delhiveryClient,
        ILogger<LogisticsController> logger)
    {
        _shipmentService = shipmentService;
        _pickupService = pickupService;
        _trackingService = trackingService;
        _ndrService = ndrService;
        _pincodeService = pincodeService;
        _repository = repository;
        _delhiveryClient = delhiveryClient;
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
                IsStarred = w.IsStarred,
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
    /// Syncs warehouse information from Delhivery / database on demand.
    /// POST /api/v1/logistics/warehouses/sync
    /// </summary>
    [HttpPost("warehouses/sync")]
    public async Task<ActionResult<WarehouseSyncResponse>> SyncWarehouses(CancellationToken ct)
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
                IsStarred = w.IsStarred,
                IsActive = w.IsActive,
                CreatedAt = w.CreatedAt
            }).ToList();

            return Ok(new WarehouseSyncResponse
            {
                Success = true,
                Message = $"Synchronized {dtos.Count} warehouses successfully with Delhivery Logistics Engine.",
                Warehouses = dtos,
                SyncedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync warehouses");
            return StatusCode(500, new WarehouseSyncResponse
            {
                Success = false,
                Message = $"Failed to sync warehouses: {ex.Message}",
                SyncedAt = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Create and optionally register a new warehouse with Delhivery.
    /// POST /api/v1/logistics/warehouses
    /// </summary>
    [HttpPost("warehouses")]
    public async Task<ActionResult<WarehouseDto>> CreateWarehouse(
        [FromBody] CreateWarehouseDto request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new { message = "Warehouse Name and Code are required." });
        }

        try
        {
            var entity = new Warehouse
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Code = request.Code.Trim(),
                AddressLine1 = request.AddressLine1.Trim(),
                AddressLine2 = request.AddressLine2?.Trim(),
                City = request.City.Trim(),
                State = request.State.Trim(),
                Pincode = request.Pincode.Trim(),
                Phone = request.Phone.Trim(),
                ContactPerson = request.ContactPerson?.Trim(),
                IsCentral = request.IsCentral,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var id = await _repository.CreateWarehouseAsync(entity);
            entity.Id = id;

            // Register with Delhivery if requested
            if (request.RegisterWithDelhivery)
            {
                try
                {
                    await _delhiveryClient.CreateWarehouseAsync(new DelhiveryWarehouseCreateRequest
                    {
                        Name = entity.Name,
                        Phone = entity.Phone,
                        Address = entity.AddressLine1,
                        City = entity.City,
                        Pin = entity.Pincode,
                        ReturnAddress = entity.AddressLine1,
                        ReturnPin = entity.Pincode,
                        ReturnCity = entity.City,
                        ReturnState = entity.State
                    }, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Warehouse saved locally, but Delhivery API registration warning for {Name}", entity.Name);
                }
            }

            var dto = new WarehouseDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Code = entity.Code,
                AddressLine1 = entity.AddressLine1,
                AddressLine2 = entity.AddressLine2,
                City = entity.City,
                State = entity.State,
                Pincode = entity.Pincode,
                Phone = entity.Phone,
                ContactPerson = entity.ContactPerson,
                IsCentral = entity.IsCentral,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt
            };

            return CreatedAtAction(nameof(GetWarehouses), new { id = dto.Id }, dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create warehouse");
            return StatusCode(500, new { message = "Failed to create warehouse", error = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing warehouse.
    /// PUT /api/v1/logistics/warehouses/{id}
    /// </summary>
    [HttpPut("warehouses/{id}")]
    public async Task<ActionResult<WarehouseDto>> UpdateWarehouse(
        Guid id,
        [FromBody] UpdateWarehouseDto request,
        CancellationToken ct)
    {
        try
        {
            var existing = await _repository.GetWarehouseByIdAsync(id);
            if (existing == null)
            {
                return NotFound(new { message = $"Warehouse with ID '{id}' not found." });
            }

            if (!string.IsNullOrWhiteSpace(request.Name)) existing.Name = request.Name.Trim();
            if (!string.IsNullOrWhiteSpace(request.Code)) existing.Code = request.Code.Trim();
            if (!string.IsNullOrWhiteSpace(request.AddressLine1)) existing.AddressLine1 = request.AddressLine1.Trim();
            if (request.AddressLine2 != null) existing.AddressLine2 = request.AddressLine2.Trim();
            if (!string.IsNullOrWhiteSpace(request.City)) existing.City = request.City.Trim();
            if (!string.IsNullOrWhiteSpace(request.State)) existing.State = request.State.Trim();
            if (!string.IsNullOrWhiteSpace(request.Pincode)) existing.Pincode = request.Pincode.Trim();
            if (!string.IsNullOrWhiteSpace(request.Phone)) existing.Phone = request.Phone.Trim();
            if (request.ContactPerson != null) existing.ContactPerson = request.ContactPerson.Trim();
            if (request.IsCentral.HasValue) existing.IsCentral = request.IsCentral.Value;
            if (request.IsActive.HasValue) existing.IsActive = request.IsActive.Value;

            await _repository.UpdateWarehouseAsync(existing);

            if (request.UpdateDelhivery)
            {
                try
                {
                    await _delhiveryClient.EditWarehouseAsync(new DelhiveryWarehouseEditRequest
                    {
                        Name = existing.Name,
                        Pin = existing.Pincode,
                        Address = existing.AddressLine1,
                        Phone = existing.Phone
                    }, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Warehouse updated locally, but Delhivery API edit warning for {Name}", existing.Name);
                }
            }

            return Ok(new WarehouseDto
            {
                Id = existing.Id,
                Name = existing.Name,
                Code = existing.Code,
                AddressLine1 = existing.AddressLine1,
                AddressLine2 = existing.AddressLine2,
                City = existing.City,
                State = existing.State,
                Pincode = existing.Pincode,
                Phone = existing.Phone,
                ContactPerson = existing.ContactPerson,
                IsCentral = existing.IsCentral,
                IsActive = existing.IsActive,
                CreatedAt = existing.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update warehouse {Id}", id);
            return StatusCode(500, new { message = "Failed to update warehouse", error = ex.Message });
        }
    }

    /// <summary>
    /// Deletes a warehouse facility from the DeepLens registry.
    /// DELETE /api/v1/logistics/warehouses/{id}
    /// </summary>
    [HttpDelete("warehouses/{id}")]
    public async Task<IActionResult> DeleteWarehouse(Guid id, CancellationToken ct)
    {
        try
        {
            var success = await _repository.DeleteWarehouseAsync(id);
            if (!success)
            {
                return NotFound(new { message = $"Warehouse {id} not found" });
            }

            return Ok(new { success = true, message = "Warehouse deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete warehouse {Id}", id);
            return StatusCode(500, new { message = "Failed to delete warehouse", error = ex.Message });
        }
    }

    /// <summary>
    /// Toggles the starred/favorite status for a warehouse facility.
    /// POST /api/v1/logistics/warehouses/{id}/toggle-star
    /// </summary>
    [HttpPost("warehouses/{id}/toggle-star")]
    public async Task<IActionResult> ToggleWarehouseStar(Guid id)
    {
        try
        {
            var existing = await _repository.GetWarehouseByIdAsync(id);
            if (existing == null)
            {
                return NotFound(new { message = $"Warehouse with ID '{id}' not found." });
            }

            existing.IsStarred = !existing.IsStarred;
            await _repository.UpdateWarehouseAsync(existing);

            return Ok(new { id = existing.Id, isStarred = existing.IsStarred });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to toggle star for warehouse {Id}", id);
            return StatusCode(500, new { message = "Failed to toggle star for warehouse", error = ex.Message });
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
    /// Estimates courier shipping charges and transit delivery days based on origin, destination, mode, weight, and COD.
    /// POST /api/v1/logistics/estimate
    /// </summary>
    [HttpPost("estimate")]
    public async Task<ActionResult<ShippingEstimateResponse>> EstimateShipping(
        [FromBody] ShippingEstimateRequest request,
        CancellationToken ct)
    {
        try
        {
            var destPin = request.DestinationPincode?.Trim() ?? string.Empty;
            var originPin = request.OriginPincode?.Trim() ?? "502325";
            bool isExpress = string.Equals(request.ShippingMode, "Express", StringComparison.OrdinalIgnoreCase);
            bool isCod = string.Equals(request.PaymentMode, "COD", StringComparison.OrdinalIgnoreCase);
            int weightGrams = Math.Max(100, request.WeightGrams);
            int slabs = (int)Math.Ceiling(weightGrams / 500.0);

            string zone = "National";
            int minDays = 3;
            int maxDays = 5;
            decimal baseRate = isExpress ? 95m : 65m;
            decimal extraRate = isExpress ? 50m : 38m;

            string originPrefix = originPin.Length >= 2 ? originPin.Substring(0, 2) : "50";
            string destPrefix = destPin.Length >= 2 ? destPin.Substring(0, 2) : "";

            var apTelanganaPrefixes = new HashSet<string> { "50", "51", "52", "53" };
            var metroPrefixes = new HashSet<string> { "11", "40", "70", "60", "56", "50" };
            var specialPrefixes = new HashSet<string> { "18", "19", "78", "79" };

            if (!string.IsNullOrEmpty(destPrefix))
            {
                if (originPrefix == destPrefix)
                {
                    zone = "Intra-City";
                    baseRate = isExpress ? 50m : 38m;
                    extraRate = isExpress ? 25m : 20m;
                    minDays = 1;
                    maxDays = 2;
                }
                else if (apTelanganaPrefixes.Contains(originPrefix) && apTelanganaPrefixes.Contains(destPrefix))
                {
                    zone = "Regional (AP/TG)";
                    baseRate = isExpress ? 65m : 45m;
                    extraRate = isExpress ? 30m : 25m;
                    minDays = 1;
                    maxDays = 2;
                }
                else if (metroPrefixes.Contains(originPrefix) && metroPrefixes.Contains(destPrefix))
                {
                    zone = "Metro";
                    baseRate = isExpress ? 85m : 55m;
                    extraRate = isExpress ? 45m : 35m;
                    minDays = isExpress ? 1 : 2;
                    maxDays = isExpress ? 2 : 3;
                }
                else if (specialPrefixes.Contains(destPrefix))
                {
                    zone = "Special Zone (NE/J&K)";
                    baseRate = isExpress ? 135m : 85m;
                    extraRate = isExpress ? 70m : 50m;
                    minDays = isExpress ? 3 : 5;
                    maxDays = isExpress ? 5 : 7;
                }
                else
                {
                    zone = "National";
                    baseRate = isExpress ? 100m : 68m;
                    extraRate = isExpress ? 55m : 40m;
                    minDays = isExpress ? 2 : 3;
                    maxDays = isExpress ? 3 : 5;
                }
            }

            decimal totalCost = baseRate + ((slabs - 1) * extraRate);
            if (isCod && request.CodAmount > 0)
            {
                totalCost += Math.Max(35m, Math.Round(request.CodAmount * 0.015m));
            }

            bool isServiceable = true;
            if (destPin.Length == 6)
            {
                try
                {
                    var pinCheck = await _pincodeService.CheckPincodeAsync(destPin, ct);
                    if (pinCheck != null && !pinCheck.IsServiceable)
                    {
                        isServiceable = false;
                    }
                }
                catch
                {
                    // Ignore transient error for estimate
                }
            }

            return Ok(new ShippingEstimateResponse
            {
                EstimatedCost = totalCost,
                EstimatedCostFormatted = $"₹{totalCost:N0}",
                EstimatedMinDays = minDays,
                EstimatedMaxDays = maxDays,
                EstimatedDaysFormatted = $"{minDays}-{maxDays} days",
                Zone = zone,
                IsServiceable = isServiceable
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate shipping estimate");
            return StatusCode(500, new { message = "Failed to calculate estimate", error = ex.Message });
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

    /// <summary>
    /// Cancels a manifested Delhivery shipment by AWB number.
    /// POST /api/v1/logistics/delhivery/cancel
    /// </summary>
    [HttpPost("delhivery/cancel")]
    public async Task<IActionResult> CancelDelhiveryShipment(
        [FromBody] CancelDelhiveryShipmentRequest request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.AwbNumber))
        {
            return BadRequest(new { message = "AWB number is required." });
        }

        try
        {
            var cleanAwb = request.AwbNumber.Trim();
            var response = await _delhiveryClient.CancelShipmentAsync(cleanAwb, request.Reason, ct);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel shipment with Delhivery for AWB {Awb}", request.AwbNumber);
            return StatusCode(500, new { message = "Failed to cancel shipment with Delhivery", error = ex.Message });
        }
    }
}

public class CancelDelhiveryShipmentRequest
{
    public string AwbNumber { get; set; } = string.Empty;
    public string? Reason { get; set; }
}
