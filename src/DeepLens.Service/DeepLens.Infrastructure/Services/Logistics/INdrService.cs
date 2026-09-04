using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;
using DeepLens.Domain.Entities.Logistics;

namespace DeepLens.Infrastructure.Services.Logistics;

public interface INdrService
{
    Task<NdrTask> CreateOrUpdateNdrFromScanAsync(Guid shipmentId, string awb, string ndrCode, string ndrReason, string? customerPhone, CancellationToken ct = default);
    Task<List<PendingNdrDto>> GetPendingNdrsAsync(CancellationToken ct = default);
    Task<NdrActionResponse> ExecuteNdrActionAsync(Guid ndrTaskId, NdrActionRequest request, CancellationToken ct = default);
}
