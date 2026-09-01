using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DeepLens.Domain.Entities.Logistics;

namespace DeepLens.Infrastructure.Persistence.Repositories.Logistics;

public interface ILogisticsRepository
{
    // Warehouses
    Task<List<Warehouse>> GetAllWarehousesAsync();
    Task<Warehouse?> GetWarehouseByIdAsync(Guid id);
    Task<Warehouse?> GetCentralWarehouseAsync();

    // Shipments
    Task<Shipment?> GetShipmentByIdAsync(Guid id);
    Task<Shipment?> GetShipmentByAwbAsync(string awb);
    Task<Shipment?> GetShipmentByOrderNumberAsync(string orderNumber);
    Task<List<Shipment>> GetShipmentsByOrderIdAsync(Guid orderId);
    Task<Guid> CreateShipmentAsync(Shipment shipment);
    Task UpdateShipmentAsync(Shipment shipment);
    Task UpdateShipmentStatusAsync(Guid id, string status, string? awbNumber = null, string? labelUrl = null, string? minioKey = null);
    Task UpdateProcureStatusAsync(Guid id, string procureStatus);
    Task UpdateVendorTrackingAsync(Guid id, string courierPartner, string awbNumber, string? trackingUrl, DateTime? edd);
    Task RecordCustomerNotifiedAsync(Guid id, DateTime timestamp);

    // Shipment Items
    Task AddShipmentItemsAsync(IEnumerable<ShipmentItem> items);
    Task<List<ShipmentItem>> GetShipmentItemsAsync(Guid shipmentId);

    // NDR Tasks
    Task<Guid> CreateNdrTaskAsync(NdrTask task);
    Task<NdrTask?> GetNdrTaskByIdAsync(Guid id);
    Task<NdrTask?> GetOpenNdrTaskByShipmentIdAsync(Guid shipmentId);
    Task<List<NdrTask>> GetPendingNdrTasksAsync();
    Task UpdateNdrTaskActionAsync(Guid id, string chosenAction, DateTime? reattemptDate, string remarks, bool dispatchedToDelhivery, string actionStatus);

    // Shipping Escalations
    Task<Guid> CreateEscalationAsync(ShippingEscalation escalation);
    Task<List<ShippingEscalation>> GetEscalationsAsync(string? status = null, Guid? shipmentId = null);
    Task<ShippingEscalation?> GetEscalationByIdAsync(Guid id);
    Task ResolveEscalationAsync(Guid id, string resolutionNotes);

    // Vendor Logistics Configs
    Task<VendorLogisticsConfig?> GetVendorLogisticsConfigAsync(Guid vendorId);
}
