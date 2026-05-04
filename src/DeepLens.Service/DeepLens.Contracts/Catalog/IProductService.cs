using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using DeepLens.Domain.Entities.Catalog;
using DeepLens.Contracts.Media;

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
    Task<bool> StarMediaAsync(Guid productId, Guid mediaId);
    Task<bool> ReorderMediaAsync(Guid productId, List<Guid> mediaIds);
    Task<VendorProduct?> GetProductByIdAsync(Guid id);
    Task<MergePreviewDto> GetMergePreviewAsync(Guid sourceId, Guid targetId);
    Task<bool> LinkInstagramPostAsync(Guid postId, Guid productId, string linkType);
    Task<IEnumerable<InstagramProductLinkDto>> GetInstagramLinksAsync(Guid postId);
    Task<VendorProduct> CreateProductFromPostAsync(Guid postId, ProductIngestionDto data);
    Task<IEnumerable<CategoryDto>> GetCategoriesAsync();
}

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}

public class InstagramProductLinkDto
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid ProductId { get; set; }
    public string LinkType { get; set; } = string.Empty;
    public string? ProductTitle { get; set; }
    public string? ProductCode { get; set; }
}

public class MergePreviewDto
{
    public VendorProduct Source { get; set; } = null!;
    public VendorProduct Target { get; set; } = null!;
    public int CombinedImageCount { get; set; }
    public int CombinedListingCount { get; set; }
}

public class ProductCatalogFilter
{
    public string? Query { get; set; }
    public string? Category { get; set; }
    public string? SortBy { get; set; } // recent, price_low, price_high
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int Skip { get; set; } = 0;
    public int Take { get; set; } = 20;
}

public class ProductCatalogResult
{
    public IEnumerable<VendorProduct> Products { get; set; } = new List<VendorProduct>();
    public int TotalCount { get; set; }
}

public class ProductClusterDto
{
    public Guid TargetMasterId { get; set; }
    public List<Guid> SourceProductIds { get; set; } = new();
    public bool IsVendorProductIds { get; set; }
}

public class ProductIngestionDto
{
    public Guid? CategoryId { get; set; }
    public string? CategorySlug { get; set; }
    public decimal VendorPrice { get; set; }
    public string? Description { get; set; }
    public string? MasterTitle { get; set; }
    public MediaCategory Category { get; set; } = MediaCategory.Product;
    public string SubCategory { get; set; } = "General";
    public string? Retention { get; set; }
    public string? Fabric { get; set; }
    public string? StitchType { get; set; }
    public string? WorkHeaviness { get; set; }
    public string? Color { get; set; }
    public List<string> Tags { get; set; } = new();
    public int? SequenceId { get; set; }
    public Guid? SourcePostId { get; set; }
}

public class MediaFileDto
{
    public required Stream Content { get; set; }
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public string? VendorMediaId { get; set; }
    public string? Color { get; set; }
}
