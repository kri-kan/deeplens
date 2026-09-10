using System.Text.Json.Serialization;

namespace Store.Api.Models;

public class CartItemDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("productId")]
    public string ProductId { get; set; } = string.Empty;

    [JsonPropertyName("productCode")]
    public string ProductCode { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("price")]
    public decimal Price { get; set; }

    [JsonPropertyName("originalPrice")]
    public decimal OriginalPrice { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; } = 1;

    [JsonPropertyName("selectedColor")]
    public string? SelectedColor { get; set; }

    [JsonPropertyName("selectedSize")]
    public string? SelectedSize { get; set; }

    [JsonPropertyName("primaryImageUri")]
    public string PrimaryImageUri { get; set; } = string.Empty;
}

public class CartDto
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("shareToken")]
    public string ShareToken { get; set; } = string.Empty;

    [JsonPropertyName("shareUrl")]
    public string ShareUrl { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<CartItemDto> Items { get; set; } = new();

    [JsonPropertyName("totalAmount")]
    public decimal TotalAmount { get; set; }

    [JsonPropertyName("totalMRP")]
    public decimal TotalMRP { get; set; }

    [JsonPropertyName("totalDiscount")]
    public decimal TotalDiscount { get; set; }

    [JsonPropertyName("itemCount")]
    public int ItemCount { get; set; }

    [JsonPropertyName("lastActiveAt")]
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(30);
}

public class SyncCartRequest
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<CartItemDto> Items { get; set; } = new();
}

public class WishlistItemDto
{
    [JsonPropertyName("productId")]
    public string ProductId { get; set; } = string.Empty;

    [JsonPropertyName("productCode")]
    public string ProductCode { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("price")]
    public decimal Price { get; set; }

    [JsonPropertyName("primaryImageUri")]
    public string PrimaryImageUri { get; set; } = string.Empty;

    [JsonPropertyName("addedAt")]
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}

public class WishlistDto
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<WishlistItemDto> Items { get; set; } = new();

    [JsonPropertyName("itemCount")]
    public int ItemCount { get; set; }

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(100);
}

public class ToggleWishlistRequest
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("item")]
    public WishlistItemDto Item { get; set; } = new();
}

public class SharedCartViewDto
{
    [JsonPropertyName("shareToken")]
    public string ShareToken { get; set; } = string.Empty;

    [JsonPropertyName("items")]
    public List<CartItemDto> Items { get; set; } = new();

    [JsonPropertyName("totalAmount")]
    public decimal TotalAmount { get; set; }

    [JsonPropertyName("totalMRP")]
    public decimal TotalMRP { get; set; }

    [JsonPropertyName("totalDiscount")]
    public decimal TotalDiscount { get; set; }

    [JsonPropertyName("itemCount")]
    public int ItemCount { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("isSharedView")]
    public bool IsSharedView { get; set; } = true;
}
