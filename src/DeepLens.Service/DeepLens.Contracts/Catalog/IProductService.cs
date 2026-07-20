using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using DeepLens.Domain.Entities.Catalog;
using DeepLens.Contracts.Media;
using DeepLens.Domain.Enums;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Catalog;

public interface IProductService
{
    Task<VendorProduct> CreateProductAsync(ProductIngestionDto data, List<MediaFileDto> mediaFiles);
    Task<bool> MergeVendorProductsAsync(Guid targetMasterId, List<Guid> sourceMasterProductIds);
    Task<bool> MergeByVendorProductIdsAsync(Guid targetMasterId, List<Guid> vendorProductIds);
    Task<int> MergeClustersAsync(List<ProductClusterDto> clusters);
    Task UpdateMasterPriceAsync(Guid masterProductId, decimal sellingPrice, decimal resellerPrice);
    Task<IEnumerable<VendorProduct>> GetProductsAsync(int skip = 0, int take = 20);
    Task<ProductCatalogResult> GetCatalogAsync(ProductCatalogFilter filter);
    Task<bool> DeleteProductAsync(Guid productId);
    Task<int> ArchiveProductsAsync(List<Guid> productIds);
    Task<int> UnarchiveProductsAsync(List<Guid> productIds);
    Task<bool> StarProductAsync(Guid productId, bool isStarred, CancellationToken ct = default);
    Task<bool> StarMediaAsync(Guid productId, Guid mediaId);
    Task<bool> SetDefaultMediaAsync(Guid productId, Guid mediaId, CancellationToken ct = default);
    Task<bool> ReorderMediaAsync(Guid productId, List<Guid> mediaIds);
    Task<VendorProduct?> GetProductByIdAsync(Guid id);
    Task<MergePreviewDto> GetMergePreviewAsync(Guid sourceId, Guid targetId);
    Task<bool> LinkInstagramPostAsync(Guid postId, Guid productId, InstagramLinkType linkType);
    Task<IEnumerable<InstagramProductLinkDto>> GetInstagramLinksAsync(Guid postId);
    Task<bool> UnlinkInstagramPostAsync(Guid postId, Guid productId);
    Task<VendorProduct> CreateProductFromPostAsync(Guid postId, ProductIngestionDto data);
    Task<IEnumerable<CategoryDto>> GetCategoriesAsync();
    Task<bool> ChangeCategoryAsync(Guid productId, string categorySlug);
    Task<ProductFilterOptions> GetFilterOptionsAsync();
    Task<int> BackfillFabricAsync();
    Task<ProductShareLogDto> RecordShareAsync(Guid productId, string platform, string? descriptionUsed, CancellationToken ct = default);
    Task<string> GenerateShareDescriptionAsync(Guid productId, string? targetPlatform, CancellationToken ct = default);
    Task<bool> UpdateProductMetadataAsync(Guid productId, ProductCorrectionDto dto);
}

public class CategoryDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;
}

public class InstagramProductLinkDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("postId")]
    public Guid PostId { get; set; }

    [JsonPropertyName("productId")]
    public Guid ProductId { get; set; }

    [JsonPropertyName("linkType")]
    public InstagramLinkType LinkType { get; set; }

    [JsonPropertyName("productTitle")]
    public string? ProductTitle { get; set; }

    [JsonPropertyName("productCode")]
    public string? ProductCode { get; set; }

    [JsonPropertyName("price")]
    public decimal? Price { get; set; }

    [JsonPropertyName("mediaJson")]
    public string? MediaJson { get; set; }

    [JsonPropertyName("media")]
    public List<MediaEntry> Media { get; set; } = new();
}

public class MergePreviewDto
{
    [JsonPropertyName("source")]
    public VendorProduct Source { get; set; } = null!;

    [JsonPropertyName("target")]
    public VendorProduct Target { get; set; } = null!;

    [JsonPropertyName("combinedImageCount")]
    public int CombinedImageCount { get; set; }

    [JsonPropertyName("combinedListingCount")]
    public int CombinedListingCount { get; set; }
}

public class ProductCatalogFilter
{
    [JsonPropertyName("query")]
    public string? Query { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("categories")]
    public string[]? Categories { get; set; }

    [JsonPropertyName("includeArchived")]
    public bool IncludeArchived { get; set; }

    [JsonPropertyName("sortBy")]
    public string? SortBy { get; set; } // recent, price_low, price_high, oldest

    [JsonPropertyName("startDate")]
    public DateTime? StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public DateTime? EndDate { get; set; }

    [JsonPropertyName("skip")]
    public int Skip { get; set; } = 0;

    [JsonPropertyName("take")]
    public int Take { get; set; } = 20;

    [JsonPropertyName("fabrics")]
    public string[]? Fabrics { get; set; }

    [JsonPropertyName("vendorNames")]
    public string[]? VendorNames { get; set; }

    [JsonPropertyName("minPrice")]
    public int? MinPrice { get; set; }

    [JsonPropertyName("maxPrice")]
    public int? MaxPrice { get; set; }
}

public class ProductFilterOptions
{
    [JsonPropertyName("fabrics")]
    public List<string> Fabrics { get; set; } = new();

    [JsonPropertyName("vendors")]
    public List<string> Vendors { get; set; } = new();

    [JsonPropertyName("minPrice")]
    public int MinPrice { get; set; }

    [JsonPropertyName("maxPrice")]
    public int MaxPrice { get; set; }
}

public class ProductCatalogResult
{
    [JsonPropertyName("products")]
    public IEnumerable<VendorProduct> Products { get; set; } = new List<VendorProduct>();

    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }
}

public class ProductClusterDto
{
    [JsonPropertyName("targetMasterId")]
    public Guid TargetMasterId { get; set; }

    [JsonPropertyName("sourceProductIds")]
    public List<Guid> SourceProductIds { get; set; } = new();

    [JsonPropertyName("isVendorProductIds")]
    public bool IsVendorProductIds { get; set; }
}

public class ProductIngestionDto
{
    [JsonPropertyName("categoryId")]
    public Guid? CategoryId { get; set; }

    [JsonPropertyName("categorySlug")]
    public string? CategorySlug { get; set; }

    [JsonPropertyName("vendorPrice")]
    public decimal VendorPrice { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("category")]
    public MediaCategory Category { get; set; } = MediaCategory.Product;

    [JsonPropertyName("subCategory")]
    public string SubCategory { get; set; } = "General";

    [JsonPropertyName("retention")]
    public string? Retention { get; set; }

    [JsonPropertyName("fabric")]
    public string? Fabric { get; set; }

    [JsonPropertyName("stitchType")]
    public string? StitchType { get; set; }

    [JsonPropertyName("workHeaviness")]
    public string? WorkHeaviness { get; set; }

    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("sequenceId")]
    public int? SequenceId { get; set; }

    [JsonPropertyName("sourcePostId")]
    public Guid? SourcePostId { get; set; }
}

public class MediaFileDto
{
    [JsonIgnore]
    public required Stream Content { get; set; }

    [JsonPropertyName("fileName")]
    public required string FileName { get; set; }

    [JsonPropertyName("contentType")]
    public required string ContentType { get; set; }

    [JsonPropertyName("vendorMediaId")]
    public string? VendorMediaId { get; set; }

    [JsonPropertyName("color")]
    public string? Color { get; set; }
}
