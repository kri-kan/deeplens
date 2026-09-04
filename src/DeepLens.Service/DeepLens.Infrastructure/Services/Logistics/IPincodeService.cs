using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;

namespace DeepLens.Infrastructure.Services.Logistics;

public interface IPincodeService
{
    Task<PincodeCheckResponse> CheckPincodeAsync(string pincode, CancellationToken ct = default);
}
