using System;

namespace DeepLens.Shared.Common;

public static class StoragePathRegistry
{
    // Root Categories (Singular)
    public const string RootProduct = "product";
    public const string RootOrder = "order";

    // Default Bucket
    public const string ProductBucket = "products";

    // Product Categories (Singular)
    public static class ProductCategories
    {
        public const string Saree = "saree";
        public const string Dress = "dress";
        public const string Lehanga = "lehanga";
        public const string Kids = "kids";
        public const string General = "general";
    }

    public static class OrderAttachmentTypes
    {
        public const string Transaction = "transaction";
        public const string Comment = "comment";
    }

    /// <summary>
    /// Generates a path for a product: {category}/Q{N}{YY}/{hash}{extension}
    /// </summary>
    public static string GetProductPath(string? category, string hash, string extension)
    {
        var now = DateTime.UtcNow;
        int quarter = (now.Month + 2) / 3;
        string timeSuffix = $"Q{quarter}{now:yy}"; // e.g. Q226
        
        string sanitizedCategory = string.IsNullOrWhiteSpace(category) ? ProductCategories.General : category.ToLowerInvariant().Trim();
        return $"{ProductBucket}/{sanitizedCategory}/{timeSuffix}/{hash}{extension}";
    }

    /// <summary>
    /// Returns the mc CLI compatible path: local/{bucket}/{object}
    /// </summary>
    public static string GetMinioMcPath(string fullPath)
    {
        return $"local/{fullPath}";
    }

    public static string GetOrderPath(string orderId, string type, string fileName)
    {
        string sanitizedType = string.IsNullOrWhiteSpace(type) ? OrderAttachmentTypes.Transaction : type.ToLower();
        return $"{RootOrder}/{orderId}/{sanitizedType}/{Guid.NewGuid():N}_{fileName}";
    }
}
