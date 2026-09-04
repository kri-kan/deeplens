using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;

namespace DeepLens.Infrastructure.Services.Logistics;

public interface IPickupService
{
    Task<PickupResponseDto> SchedulePickupAsync(PickupRequestDto request, CancellationToken ct = default);
}
