using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Orders;

public class PagedOrderHistoryResult
{
    [JsonPropertyName("items")]
    public IEnumerable<OrderHistoryDto> Items { get; set; } = new List<OrderHistoryDto>();

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    [JsonPropertyName("hasMore")]
    public bool HasMore { get; set; }
}
