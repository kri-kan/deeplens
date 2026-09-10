using System.Text.Json.Serialization;

namespace Store.Api.Models;

public record PublishProductRequest(
    [property: JsonPropertyName("vayyariProductId")] Guid VayyariProductId,
    [property: JsonPropertyName("productCode")] string ProductCode,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("categoryName")] string CategoryName,
    [property: JsonPropertyName("fabric")] string? Fabric,
    [property: JsonPropertyName("baseCost")] decimal BaseCost,
    [property: JsonPropertyName("mediaUrls")] List<string> MediaUrls
);

public record BatchPublishRequest(
    [property: JsonPropertyName("products")] List<PublishProductRequest> Products
);

public record StoreMediaItemDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("mediaType")] int MediaType,
    [property: JsonPropertyName("order")] int Order,
    [property: JsonPropertyName("dwellSeconds")] double DwellSeconds,
    [property: JsonPropertyName("isCover")] bool IsCover
);

public record StoreProductDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("vayyariProductId")] Guid VayyariProductId,
    [property: JsonPropertyName("productCode")] string ProductCode,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("categoryName")] string CategoryName,
    [property: JsonPropertyName("fabric")] string? Fabric,
    [property: JsonPropertyName("baseCost")] decimal BaseCost,
    [property: JsonPropertyName("mrp")] decimal Mrp,
    [property: JsonPropertyName("salePrice")] decimal SalePrice,
    [property: JsonPropertyName("lifecycleStatus")] string LifecycleStatus,
    [property: JsonPropertyName("stockQuantity")] int StockQuantity,
    [property: JsonPropertyName("colorGroupId")] Guid? ColorGroupId,
    [property: JsonPropertyName("colorwayName")] string ColorwayName,
    [property: JsonPropertyName("colorHex")] string ColorHex,
    [property: JsonPropertyName("mediaOrder")] List<StoreMediaItemDto> MediaOrder,
    [property: JsonPropertyName("tags")] List<string> Tags,
    [property: JsonPropertyName("isPublished")] bool IsPublished,
    [property: JsonPropertyName("publishedAt")] DateTime PublishedAt
);

public record StoreProductAuditDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("storeProductId")] Guid StoreProductId,
    [property: JsonPropertyName("actionType")] string ActionType,
    [property: JsonPropertyName("fieldName")] string? FieldName,
    [property: JsonPropertyName("oldValue")] string? OldValue,
    [property: JsonPropertyName("newValue")] string? NewValue,
    [property: JsonPropertyName("authorEmail")] string AuthorEmail,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt
);

public record StoreProductCurationDto(
    [property: JsonPropertyName("product")] StoreProductDto Product,
    [property: JsonPropertyName("auditHistory")] List<StoreProductAuditDto> AuditHistory,
    [property: JsonPropertyName("smartDwellSuggestions")] List<string> SmartDwellSuggestions
);

public record UpdateCurationRequest(
    [property: JsonPropertyName("lifecycleStatus")] string? LifecycleStatus,
    [property: JsonPropertyName("stockQuantity")] int? StockQuantity,
    [property: JsonPropertyName("mrp")] decimal? Mrp,
    [property: JsonPropertyName("salePrice")] decimal? SalePrice,
    [property: JsonPropertyName("colorGroupId")] Guid? ColorGroupId,
    [property: JsonPropertyName("colorwayName")] string? ColorwayName,
    [property: JsonPropertyName("colorHex")] string? ColorHex,
    [property: JsonPropertyName("mediaOrder")] List<StoreMediaItemDto>? MediaOrder,
    [property: JsonPropertyName("tags")] List<string>? Tags
);
