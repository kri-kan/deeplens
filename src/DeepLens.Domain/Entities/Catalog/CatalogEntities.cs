namespace DeepLens.Domain.Entities.Catalog;

public class Category
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? MetadataJson { get; set; }
}

public class Seller
{
    public Guid Id { get; set; }
    public string? ExternalId { get; set; }
    public required string Name { get; set; }
    public string? ContactInfo { get; set; }
    public decimal Rating { get; set; }
    public bool IsTrusted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Product
{
    public Guid Id { get; set; }
    public Guid? CategoryId { get; set; }
    public string? BaseSku { get; set; }
    public string? Title { get; set; }
    public List<string> Tags { get; set; } = new();
    public string? UnifiedAttributes { get; set; } // JSONB
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Category? Category { get; set; }
    public List<ProductVariant> Variants { get; set; } = new();
}

public class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string? VariantSku { get; set; }
    public string? Color { get; set; }
    public string? Fabric { get; set; }
    public string? StitchType { get; set; }
    public string? WorkHeaviness { get; set; }
    public List<string> SearchKeywords { get; set; } = new();
    public string? AttributesJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Product? Product { get; set; }
    public List<SellerListing> Listings { get; set; } = new();
    public List<Image> Images { get; set; } = new();
}

public class Image
{
    public Guid Id { get; set; }
    public Guid VariantId { get; set; }
    public required string StoragePath { get; set; }
    public string? OriginalFilename { get; set; }
    public long FileSizeBytes { get; set; }
    public string? MimeType { get; set; }
    public short Status { get; set; } // 0=Uploaded, 1=Processed, 2=Indexed, 98=PendingDelete, 99=Failed
    public Guid? VectorId { get; set; }
    public string? PHash { get; set; }
    public bool IsDefault { get; set; }
    public decimal? QualityScore { get; set; }
    public bool FeaturesExtracted { get; set; }
    public bool Indexed { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? MetadataJson { get; set; }

    // Navigation
    public ProductVariant? Variant { get; set; }
}

public class SellerListing
{
    public Guid Id { get; set; }
    public Guid VariantId { get; set; }
    public Guid SellerId { get; set; }
    public string? ExternalId { get; set; }
    public decimal? CurrentPrice { get; set; }
    public string Currency { get; set; } = "INR";
    public string ShippingInfo { get; set; } = "plus shipping";
    public bool IsFavorite { get; set; }
    public bool IsActive { get; set; }
    public string? Description { get; set; } 
    public string? Url { get; set; }
    public DateTime LastPricedAt { get; set; } = DateTime.UtcNow;
    public string? RawDataJson { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ProductVariant? Variant { get; set; }
    public Seller? Seller { get; set; }
    public List<PriceHistory> PriceHistory { get; set; } = new();
}

public class PriceHistory
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "INR";
    public DateTime EffectiveDate { get; set; } = DateTime.UtcNow;
}

public class ImageDeletionQueue
{
    public Guid Id { get; set; }
    public Guid ImageId { get; set; }
    public required string StoragePath { get; set; }
    public bool DeletedFromDisk { get; set; }
    public bool DeletedFromVector { get; set; }
    public int Retries { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}
