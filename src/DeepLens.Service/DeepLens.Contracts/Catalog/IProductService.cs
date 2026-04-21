using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using DeepLens.Domain.Entities.Catalog;

namespace DeepLens.Contracts.Catalog;

public interface IProductService
{
    Task<VendorProduct> CreateProductAsync(ProductIngestionDto data, List<MediaFileDto> mediaFiles);
    Task<bool> MergeVendorProductsAsync(Guid targetMasterId, List<Guid> sourceMasterProductIds);
    Task<bool> MergeByVendorProductIdsAsync(Guid targetMasterId, List<Guid> vendorProductIds);
    Task<int> MergeClustersAsync(List<ProductClusterDto> clusters);
    Task UpdateMasterPriceAsync(Guid masterProductId, decimal sellingPrice, decimal resellerPrice);
    Task<IEnumerable<VendorProduct>> GetProductsAsync(int skip = 0, int take = 20);
}

public class ProductClusterDto
{
    public Guid TargetMasterId { get; set; }
    public List<Guid> SourceProductIds { get; set; } = new();
    public bool IsVendorProductIds { get; set; }
}

public class ProductIngestionDto
{
    public decimal VendorPrice { get; set; }
    public string? Description { get; set; }
    public string? MasterTitle { get; set; }
    public string? Category { get; set; }
}

public class MediaFileDto
{
    public required Stream Content { get; set; }
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public string? VendorMediaId { get; set; }
}
