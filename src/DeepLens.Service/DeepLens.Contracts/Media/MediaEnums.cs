namespace DeepLens.Contracts.Media;

/// <summary>
/// Major media buckets (top-level categories).
/// </summary>
public enum MediaCategory
{
    Unknown = 0,
    Product = 1,
    Order = 2,
    Archive = 3,
    Profile = 4,
    System = 5
}

/// <summary>
/// Specific types for Product media.
/// </summary>
public enum ProductSubCategory
{
    General = 0,
    Saree = 1,
    Lehanga = 2,
    Dress = 3,
    Suits = 4,
    Fabric = 5,
    Jewelry = 6,
    Accessory = 7
}

/// <summary>
/// Specific types for Order-related media.
/// </summary>
public enum OrderSubCategory
{
    General = 0,
    Transaction = 1, // Payment proof, receipts
    Reference = 2,   // Customer provided reference images
    Comments = 3,    // Images attached to order notes
    ParcelVideo = 4, // Unboxing/Packing videos
    Invoice = 5,     // System generated invoices
    Logistics = 6    // Waybills, courier receipts
}

/// <summary>
/// Provides top-down drilling from Category to Sub-Categories.
/// </summary>
public static class MediaHierarchy
{
    public static IEnumerable<string> GetSubCategories(this MediaCategory category)
    {
        return category switch
        {
            MediaCategory.Product => Enum.GetNames<ProductSubCategory>(),
            MediaCategory.Order => Enum.GetNames<OrderSubCategory>(),
            _ => Array.Empty<string>()
        };
    }

    /// <summary>
    /// Validates if a sub-category string belongs to a specific category.
    /// </summary>
    public static bool IsValidSubCategory(this MediaCategory category, string subCategory)
    {
        var validOnes = category.GetSubCategories();
        return validOnes.Any(s => s.Equals(subCategory, StringComparison.OrdinalIgnoreCase));
    }
}

/// <summary>
/// Base record for OO-based storage path resolution.
/// </summary>
public abstract record StorageContext(MediaCategory Category, string Folder)
{
    public string Bucket => Category.ToString().ToLowerInvariant();

    public static StorageContext Create(MediaCategory category, string subCategory)
    {
        return category switch
        {
            MediaCategory.Product => Enum.TryParse<ProductSubCategory>(subCategory, true, out var pSub) 
                ? new ProductContext(pSub) 
                : new ProductContext(ProductSubCategory.General),
            
            MediaCategory.Order => Enum.TryParse<OrderSubCategory>(subCategory, true, out var oSub) 
                ? new OrderContext(oSub) 
                : new OrderContext(OrderSubCategory.General),
            
            _ => new GenericContext(category, subCategory.ToLowerInvariant())
        };
    }
}

/// <summary>
/// Context for Product media.
/// </summary>
public record ProductContext(ProductSubCategory Type) 
    : StorageContext(MediaCategory.Product, Type.ToString().ToLowerInvariant());

/// <summary>
/// Context for Order media.
/// </summary>
public record OrderContext(OrderSubCategory Type) 
    : StorageContext(MediaCategory.Order, Type.ToString().ToLowerInvariant());

/// <summary>
/// Simple context for any other storage needs.
/// </summary>
public record GenericContext(MediaCategory Category, string Folder) : StorageContext(Category, Folder);
