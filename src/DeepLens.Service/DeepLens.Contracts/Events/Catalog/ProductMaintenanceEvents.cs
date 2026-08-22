using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Events.Catalog;

public static class ProductMaintenanceTopics
{
    public const string ProductArchiveCommand = "deeplens.catalog.product.archive.command";
    public const string ProductDeleteCommand = "deeplens.catalog.product.delete.command";
}

public class ProductArchiveBatchCommand
{
    [JsonPropertyName("eventId")]
    public Guid EventId { get; set; } = Guid.NewGuid();

    [JsonPropertyName("batchId")]
    public Guid BatchId { get; set; }

    [JsonPropertyName("tenantId")]
    public string TenantId { get; set; } = "default";

    [JsonPropertyName("productIds")]
    public List<Guid> ProductIds { get; set; } = new();

    [JsonPropertyName("requestedBy")]
    public string? RequestedBy { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class ProductDeleteBatchCommand
{
    [JsonPropertyName("eventId")]
    public Guid EventId { get; set; } = Guid.NewGuid();

    [JsonPropertyName("batchId")]
    public Guid BatchId { get; set; }

    [JsonPropertyName("tenantId")]
    public string TenantId { get; set; } = "default";

    [JsonPropertyName("productIds")]
    public List<Guid> ProductIds { get; set; } = new();

    [JsonPropertyName("requestedBy")]
    public string? RequestedBy { get; set; }

    [JsonPropertyName("isPermanent")]
    public bool IsPermanent { get; set; } = true;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class ProductMaintenanceQueueResult
{
    [JsonPropertyName("batchId")]
    public Guid BatchId { get; set; }

    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "queued";

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
