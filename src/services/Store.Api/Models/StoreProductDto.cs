using System.Text.Json.Serialization;

namespace Store.Api.Models;

public record SiblingSwatchDto(
    [property: JsonPropertyName("productCode")] string ProductCode,
    [property: JsonPropertyName("colorHex")] string ColorHex,
    [property: JsonPropertyName("colorwayName")] string ColorwayName,
    [property: JsonPropertyName("heroImageUrl")] string? HeroImageUrl
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
    [property: JsonPropertyName("publishedAt")] DateTime PublishedAt,
    [property: JsonPropertyName("parentCatalogId")] Guid? ParentCatalogId = null,
    [property: JsonPropertyName("catalogColorGroupId")] Guid? CatalogColorGroupId = null,
    [property: JsonPropertyName("parentProductCode")] string? ParentProductCode = null,
    [property: JsonPropertyName("previousLifecycleStatus")] string? PreviousLifecycleStatus = null,
    [property: JsonPropertyName("takeDownExpiresAt")] DateTime? TakeDownExpiresAt = null,
    [property: JsonPropertyName("isReEvaluationPending")] bool IsReEvaluationPending = false,
    [property: JsonPropertyName("waitlistCount")] int WaitlistCount = 0,
    [property: JsonPropertyName("siblingSwatches")] List<SiblingSwatchDto>? SiblingSwatches = null,
    [property: JsonPropertyName("swatchesCount")] int SwatchesCount = 0,
    [property: JsonPropertyName("skus")] List<StoreSkuDto>? Skus = null
);

public record UpdateLifecycleRequest(
    [property: JsonPropertyName("productId")] Guid? ProductId = null,
    [property: JsonPropertyName("parentId")] Guid? ParentId = null,
    [property: JsonPropertyName("status")] string Status = "",
    [property: JsonPropertyName("takeDownExpiresAt")] DateTime? TakeDownExpiresAt = null,
    [property: JsonPropertyName("timeoutHours")] int? TimeoutHours = null,
    [property: JsonPropertyName("timeoutDays")] int? TimeoutDays = null
);
