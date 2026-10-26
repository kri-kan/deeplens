using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.SearchApi.Models;
using Microsoft.Extensions.Logging;

namespace DeepLens.SearchApi.Services;

public interface IProductMergeService
{
    Task<ProductMergeResult> MergeAsync(ProductMergeRequest request, CancellationToken ct = default);
    Task<ProductMergeResult> MergeAsync(IEnumerable<Guid> sourceIds, Guid? targetId = null, CancellationToken ct = default);
    Task<ProductMergeResult> MergeProductsAsync(ProductMergeRequest request, CancellationToken ct = default);
    Task<ProductMergeResult> MergeProductsAsync(IEnumerable<Guid> sourceIds, Guid? targetId = null, CancellationToken ct = default);
}

public class ProductMergeService : IProductMergeService
{
    private readonly ICatalogProductRepository _repository;
    private readonly ILogger<ProductMergeService>? _logger;

    public ProductMergeService(ICatalogProductRepository repository, ILogger<ProductMergeService>? logger = null)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger;
    }

    public Task<ProductMergeResult> MergeAsync(IEnumerable<Guid> sourceIds, Guid? targetId = null, CancellationToken ct = default)
    {
        return MergeAsync(new ProductMergeRequest(sourceIds, targetId), ct);
    }

    public Task<ProductMergeResult> MergeProductsAsync(IEnumerable<Guid> sourceIds, Guid? targetId = null, CancellationToken ct = default)
    {
        return MergeAsync(new ProductMergeRequest(sourceIds, targetId), ct);
    }

    public Task<ProductMergeResult> MergeProductsAsync(ProductMergeRequest request, CancellationToken ct = default)
    {
        return MergeAsync(request, ct);
    }

    public async Task<ProductMergeResult> MergeAsync(ProductMergeRequest request, CancellationToken ct = default)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));
        if ((request.SourceIds == null || request.SourceIds.Count == 0) && !request.TargetId.HasValue)
        {
            throw new ArgumentException("At least one product ID must be provided for merge.", nameof(request));
        }

        var candidateIds = request.TargetId.HasValue
            ? (request.SourceIds ?? Array.Empty<Guid>()).Append(request.TargetId.Value).Distinct().ToList()
            : (request.SourceIds ?? Array.Empty<Guid>()).Distinct().ToList();

        var candidates = (await _repository.GetProductsByIdsAsync(candidateIds, ct)).ToList();
        if (candidates.Count == 0)
        {
            throw new InvalidOperationException("No matching candidate products found for merge.");
        }

        var publishedCandidates = candidates.Where(c => c.IsPublished).ToList();
        if (publishedCandidates.Count > 1)
        {
            _logger?.LogWarning("Merge rejected: Multiple published products detected in merge candidates ({Count} published).", publishedCandidates.Count);
            throw new InvalidOperationException("Cannot automatically merge multiple already-published products. Manual resolution required.");
        }

        CatalogProduct winner;
        bool isAnchored = false;

        if (publishedCandidates.Count == 1)
        {
            winner = publishedCandidates[0];
            isAnchored = true;
            _logger?.LogInformation("Published anchor enforced: Product {WinnerId} chosen as merge target.", winner.Id);
        }
        else if (request.TargetId.HasValue && candidates.Any(c => c.Id == request.TargetId.Value))
        {
            winner = candidates.First(c => c.Id == request.TargetId.Value);
            _logger?.LogInformation("Explicit target specified: Product {WinnerId} chosen as merge target.", winner.Id);
        }
        else
        {
            winner = candidates.OrderByDescending(c => c.CreatedAt).First();
            _logger?.LogInformation("Standard recency merge: Product {WinnerId} chosen as merge target.", winner.Id);
        }

        var loserIds = candidates.Where(c => c.Id != winner.Id).Select(c => c.Id).ToList();

        // Bump media delta tracking timestamp on winner
        var mediaBumpTime = DateTime.UtcNow;
        winner.MediaUpdatedAt = mediaBumpTime;

        await _repository.UpdateProductAsync(winner, ct);
        await _repository.RecordMergeAuditAsync(winner.Id, loserIds, isAnchored, ct);

        return new ProductMergeResult
        {
            WinnerId = winner.Id,
            IsAnchored = isAnchored,
            MediaUpdatedAt = mediaBumpTime,
            MergedSourceIds = loserIds
        };
    }
}
