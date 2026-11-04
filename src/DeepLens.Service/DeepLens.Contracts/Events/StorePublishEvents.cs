using System;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Events;

public static class StorePublishTopics
{
    public const string PublishRequested = "store.product.publish.requested";
    public const string SyncCompleted = "store.product.sync.completed";
    public const string PublishFailed = "store.product.publish.failed";
}

public record StoreProductPublishRequestedEvent(
    [property: JsonPropertyName("eventId")] Guid EventId,
    [property: JsonPropertyName("jobId")] Guid JobId,
    [property: JsonPropertyName("action")] string Action,
    [property: JsonPropertyName("productId")] Guid ProductId,
    [property: JsonPropertyName("productCode")] string ProductCode,
    [property: JsonPropertyName("requestedBy")] string? RequestedBy,
    [property: JsonPropertyName("timestamp")] DateTime Timestamp
);

public record StoreProductSyncCompletedEvent(
    [property: JsonPropertyName("eventId")] Guid EventId,
    [property: JsonPropertyName("jobId")] Guid JobId,
    [property: JsonPropertyName("action")] string Action,
    [property: JsonPropertyName("productId")] Guid ProductId,
    [property: JsonPropertyName("productCode")] string ProductCode,
    [property: JsonPropertyName("isReviewPending")] bool IsReviewPending,
    [property: JsonPropertyName("reviewReason")] string? ReviewReason,
    [property: JsonPropertyName("publishedAt")] DateTime PublishedAt,
    [property: JsonPropertyName("syncedMediaCount")] int SyncedMediaCount,
    [property: JsonPropertyName("timestamp")] DateTime Timestamp
);

public record StoreProductPublishFailedEvent(
    [property: JsonPropertyName("eventId")] Guid EventId,
    [property: JsonPropertyName("jobId")] Guid JobId,
    [property: JsonPropertyName("productId")] Guid ProductId,
    [property: JsonPropertyName("productCode")] string ProductCode,
    [property: JsonPropertyName("errorMessage")] string ErrorMessage,
    [property: JsonPropertyName("timestamp")] DateTime Timestamp
);
