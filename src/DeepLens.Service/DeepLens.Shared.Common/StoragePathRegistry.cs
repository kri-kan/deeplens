using System;

namespace DeepLens.Shared.Common;

public static class StoragePathRegistry
{
    public static class OrderAttachmentTypes
    {
        public const string Transaction = "transactions";
        public const string Comment = "comments";
    }

    public static string GetOrderPath(string orderId, string type, string fileName)
    {
        // Path structure: orders/{orderId}/{type}/{yyyy-mm-dd}/{guid}_{filename}
        return $"orders/{orderId}/{type}/{DateTime.UtcNow:yyyy-MM-dd}/{Guid.NewGuid():N}_{fileName}";
    }

    public static string GetProductPath(string tag, string fileName)
    {
        return $"products/{tag}/{DateTime.UtcNow:yyyy-MM-dd}/{Guid.NewGuid():N}_{fileName}";
    }
}
