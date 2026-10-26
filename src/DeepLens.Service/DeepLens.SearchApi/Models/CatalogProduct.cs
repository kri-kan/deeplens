using System;
using System.Collections.Generic;

namespace DeepLens.SearchApi.Models;

/// <summary>
/// Domain model representing a catalog product for merge anchoring and delta tracking.
/// </summary>
public class CatalogProduct
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Sku { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public DateTime? StorePublishUpdatedAt { get; set; }
    public DateTime? MediaUpdatedAt { get; set; }
}

/// <summary>
/// Request parameter for merging catalog products.
/// </summary>
public class ProductMergeRequest
{
    public IReadOnlyList<Guid> SourceIds { get; set; } = Array.Empty<Guid>();
    public Guid? TargetId { get; set; }

    public ProductMergeRequest() { }

    public ProductMergeRequest(IEnumerable<Guid> sourceIds, Guid? targetId = null)
    {
        SourceIds = sourceIds != null ? new List<Guid>(sourceIds) : Array.Empty<Guid>();
        TargetId = targetId;
    }
}

/// <summary>
/// Result produced after merging catalog products.
/// </summary>
public class ProductMergeResult
{
    public Guid WinnerId { get; set; }
    public bool IsAnchored { get; set; }
    public DateTime MediaUpdatedAt { get; set; }
    public IReadOnlyList<Guid> MergedSourceIds { get; set; } = Array.Empty<Guid>();
}

/// <summary>
/// Repository abstraction for catalog product lookup and updates during merge operations.
/// </summary>
public interface ICatalogProductRepository
{
    Task<IReadOnlyList<CatalogProduct>> GetProductsByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default);
    Task<CatalogProduct> UpdateProductAsync(CatalogProduct product, CancellationToken ct = default);
    Task RecordMergeAuditAsync(Guid winnerId, IEnumerable<Guid> loserIds, bool isAnchored, CancellationToken ct = default);
}
