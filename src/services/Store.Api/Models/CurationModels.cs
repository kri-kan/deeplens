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
    [property: JsonPropertyName("isCover")] bool IsCover,
    [property: JsonPropertyName("colorGroupId")] string? ColorGroupId = null,
    [property: JsonPropertyName("isQualified")] bool? IsQualified = null,
    [property: JsonPropertyName("isCommon")] bool? IsCommon = null,
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("originalUrl")] string? OriginalUrl = null,
    [property: JsonPropertyName("modifiedUrl")] string? ModifiedUrl = null,
    [property: JsonPropertyName("activeDisplaySource")] string? ActiveDisplaySource = "original",
    [property: JsonPropertyName("hasModified")] bool HasModified = false,
    [property: JsonPropertyName("transformRecipe")] string? TransformRecipe = null
);

public record StoreColorGroupDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("colorwayCode")] string? ColorwayCode = null,
    [property: JsonPropertyName("template")] string? Template = null,
    [property: JsonPropertyName("slotA")] string? SlotA = null,
    [property: JsonPropertyName("slotB")] string? SlotB = null,
    [property: JsonPropertyName("slotC")] string? SlotC = null,
    [property: JsonPropertyName("slotD")] string? SlotD = null,
    [property: JsonPropertyName("colors")] List<string>? Colors = null,
    [property: JsonPropertyName("colorCount")] int? ColorCount = null,
    [property: JsonPropertyName("isAvailable")] bool? IsAvailable = null
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
    [property: JsonPropertyName("swatchTemplate")] string? SwatchTemplate,
    [property: JsonPropertyName("colorGroups")] List<StoreColorGroupDto>? ColorGroups,
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
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("colorGroupId")] Guid? ColorGroupId,
    [property: JsonPropertyName("colorwayName")] string? ColorwayName,
    [property: JsonPropertyName("colorHex")] string? ColorHex,
    [property: JsonPropertyName("swatchTemplate")] string? SwatchTemplate,
    [property: JsonPropertyName("colorGroups")] List<StoreColorGroupDto>? ColorGroups,
    [property: JsonPropertyName("mediaOrder")] List<StoreMediaItemDto>? MediaOrder,
    [property: JsonPropertyName("tags")] List<string>? Tags
);

public record ToggleMediaDisplaySourceRequest(
    [property: JsonPropertyName("activeDisplaySource")] string ActiveDisplaySource
);
