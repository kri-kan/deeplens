using System;

namespace DeepLens.Infrastructure.Common
{
    public static class StoragePathRegistry
    {
        // Root Categories (Singular)
        public const string RootProduct = "product";
        public const string RootOrder = "order";

        // Product Categories (Singular)
        public static class ProductCategories
        {
            public const string Saree = "saree";
            public const string Dress = "dress";
            public const string Lehanga = "lehanga";
            public const string General = "general";
        }

        // Order Level Attachment Types
        public static class OrderAttachmentTypes
        {
            public const string Transaction = "transaction";
            public const string Comment = "comment";
        }

        // Order Item Level Attachment Types
        public static class OrderItemAttachmentTypes
        {
            public const string Product = "product";
        }

        /// <summary>
        /// Generates a path for a product: product/{category}/Q{N}{YY}/{filename}
        /// </summary>
        public static string GetProductPath(string category, string fileName)
        {
            var now = DateTime.UtcNow;
            int quarter = (now.Month + 2) / 3;
            string timeSuffix = $"Q{quarter}{now:yy}"; // e.g. Q226 (No underscore, yy format)
            
            string sanitizedCategory = string.IsNullOrWhiteSpace(category) ? ProductCategories.General : category.ToLower();
            return $"{RootProduct}/{sanitizedCategory}/{timeSuffix}/{Guid.NewGuid():N}_{fileName}";
        }

        /// <summary>
        /// Generates a path for an order level attachment: order/{orderId}/{type}/{filename}
        /// types: transaction, comment
        /// </summary>
        public static string GetOrderPath(string orderId, string type, string fileName)
        {
            string sanitizedType = string.IsNullOrWhiteSpace(type) ? OrderAttachmentTypes.Transaction : type.ToLower();
            return $"{RootOrder}/{orderId}/{sanitizedType}/{Guid.NewGuid():N}_{fileName}";
        }

        /// <summary>
        /// Generates a path for an order item level attachment: order/{orderId}/item/{itemId}/product/{filename}
        /// </summary>
        public static string GetOrderItemPath(string orderId, int itemId, string fileName)
        {
            return $"{RootOrder}/{orderId}/item/{itemId}/{OrderItemAttachmentTypes.Product}/{Guid.NewGuid():N}_{fileName}";
        }
    }
}
