using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Instagram;

namespace DeepLens.Application.Abstractions.Services;

public interface IProfileClassifierService
{
    Task<ProfileClassificationResult> ClassifyProfileAsync(ProfileClassificationRequest request, CancellationToken cancellationToken = default);
}
