using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Catalog;

public class VisualSimilaritySearchRequest
{
    [JsonPropertyName("postId")]
    public Guid? PostId { get; set; }

    [JsonPropertyName("mediaId")]
    public Guid? MediaId { get; set; }

    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("phash")]
    public string? Phash { get; set; }

    [JsonPropertyName("imageBase64")]
    public string? ImageBase64 { get; set; }

    [JsonPropertyName("take")]
    public int Take { get; set; } = 30;

    [JsonPropertyName("minSimilarity")]
    public int MinSimilarity { get; set; } = 30;
}

public class VisualSimilaritySearchResponse
{
    [JsonPropertyName("sourcePhash")]
    public string SourcePhash { get; set; } = string.Empty;

    [JsonPropertyName("totalCandidates")]
    public int TotalCandidates { get; set; }

    [JsonPropertyName("matches")]
    public List<VisualSimilarityMatchDto> Matches { get; set; } = new();
}

public class VisualSimilarityMatchDto
{
    [JsonPropertyName("productId")]
    public Guid ProductId { get; set; }

    [JsonPropertyName("sku")]
    public string Sku { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("vendorPrice")]
    public decimal VendorPrice { get; set; }

    [JsonPropertyName("similarityPercentage")]
    public int SimilarityPercentage { get; set; }

    [JsonPropertyName("distance")]
    public int Distance { get; set; }

    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("mediaCount")]
    public int MediaCount { get; set; }

    [JsonPropertyName("isLinked")]
    public bool IsLinked { get; set; }

    [JsonPropertyName("existingLinkType")]
    public string? ExistingLinkType { get; set; }
}
