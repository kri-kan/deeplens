using System;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;

namespace DeepLens.Infrastructure.Services.Logistics;

public interface IShipmentService
{
    Task<PackageSplitPreviewResponse> GenerateSplitPreviewAsync(string orderIdOrNumber, PackageSplitPreviewRequest? request = null, CancellationToken ct = default);
    Task<CreateShipmentResponse> CreateDelhiveryShipmentAsync(CreateDelhiveryShipmentRequest request, CancellationToken ct = default);
    Task<AttachVendorTrackingResponse> AttachVendorTrackingAsync(Guid shipmentId, AttachVendorTrackingRequest request, CancellationToken ct = default);
    Task<ForwardCustomerTrackingResponse> ForwardCustomerTrackingAsync(Guid shipmentId, ForwardCustomerTrackingRequest request, CancellationToken ct = default);
    Task<ProcureStatusResponse> UpdateProcureStatusAsync(Guid shipmentId, ProcureStatusUpdateRequest request, CancellationToken ct = default);
}
