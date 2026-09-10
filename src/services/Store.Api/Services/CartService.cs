using System.Collections.Concurrent;
using Store.Api.Models;

namespace Store.Api.Services;

public class CartService : ICartService
{
    private static readonly ConcurrentDictionary<string, CartDto> _carts = new();
    private static readonly ConcurrentDictionary<string, string> _shareTokenToDevice = new();
    private static readonly ConcurrentDictionary<string, WishlistDto> _wishlists = new();
    private readonly ILogger<CartService> _logger;
    private readonly string _baseUrl;

    public CartService(ILogger<CartService> logger, IConfiguration config)
    {
        _logger = logger;
        _baseUrl = config["Store:BaseUrl"] ?? "https://store.vayyari.com";
    }

    public Task<CartDto> GetCartAsync(string deviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        if (!_carts.TryGetValue(deviceId, out var cart))
        {
            var shareToken = "crt_" + Guid.NewGuid().ToString("N")[..8];
            cart = new CartDto
            {
                DeviceId = deviceId,
                ShareToken = shareToken,
                ShareUrl = $"{_baseUrl}/cart/share/{shareToken}",
                Items = new(),
                TotalAmount = 0,
                TotalMRP = 0,
                TotalDiscount = 0,
                ItemCount = 0,
                LastActiveAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            };
            _carts[deviceId] = cart;
            _shareTokenToDevice[shareToken] = deviceId;
        }
        else
        {
            cart.LastActiveAt = DateTime.UtcNow;
            cart.ExpiresAt = DateTime.UtcNow.AddDays(30);
        }

        return Task.FromResult(cart);
    }

    public Task<CartDto> SyncCartAsync(string deviceId, List<CartItemDto> items)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        if (!_carts.TryGetValue(deviceId, out var cart))
        {
            var shareToken = "crt_" + Guid.NewGuid().ToString("N")[..8];
            cart = new CartDto
            {
                DeviceId = deviceId,
                ShareToken = shareToken,
                ShareUrl = $"{_baseUrl}/cart/share/{shareToken}",
                LastActiveAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            };
            _shareTokenToDevice[shareToken] = deviceId;
        }

        cart.Items = items ?? new();
        cart.ItemCount = cart.Items.Sum(i => i.Quantity);
        cart.TotalMRP = cart.Items.Sum(i => (i.OriginalPrice > 0 ? i.OriginalPrice : i.Price) * i.Quantity);
        cart.TotalAmount = cart.Items.Sum(i => i.Price * i.Quantity);
        cart.TotalDiscount = Math.Max(0, cart.TotalMRP - cart.TotalAmount);
        cart.LastActiveAt = DateTime.UtcNow;
        cart.ExpiresAt = DateTime.UtcNow.AddDays(30);

        _carts[deviceId] = cart;
        _logger.LogInformation("Synced cart for device {DeviceId} with {Count} items. Total: ₹{Total}", deviceId, cart.ItemCount, cart.TotalAmount);

        return Task.FromResult(cart);
    }

    public Task<SharedCartViewDto?> GetSharedCartAsync(string shareToken)
    {
        if (!_shareTokenToDevice.TryGetValue(shareToken, out var deviceId) ||
            !_carts.TryGetValue(deviceId, out var cart))
        {
            return Task.FromResult<SharedCartViewDto?>(null);
        }

        var sharedView = new SharedCartViewDto
        {
            ShareToken = shareToken,
            Items = cart.Items,
            TotalAmount = cart.TotalAmount,
            TotalMRP = cart.TotalMRP,
            TotalDiscount = cart.TotalDiscount,
            ItemCount = cart.ItemCount,
            CreatedAt = cart.LastActiveAt,
            IsSharedView = true
        };

        return Task.FromResult<SharedCartViewDto?>(sharedView);
    }

    public Task<WishlistDto> GetWishlistAsync(string deviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        if (!_wishlists.TryGetValue(deviceId, out var wishlist))
        {
            wishlist = new WishlistDto
            {
                DeviceId = deviceId,
                Items = new(),
                ItemCount = 0,
                ExpiresAt = DateTime.UtcNow.AddDays(100)
            };
            _wishlists[deviceId] = wishlist;
        }

        return Task.FromResult(wishlist);
    }

    public Task<WishlistDto> ToggleWishlistAsync(string deviceId, WishlistItemDto item)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        if (!_wishlists.TryGetValue(deviceId, out var wishlist))
        {
            wishlist = new WishlistDto
            {
                DeviceId = deviceId,
                Items = new(),
                ItemCount = 0,
                ExpiresAt = DateTime.UtcNow.AddDays(100)
            };
        }

        var existing = wishlist.Items.FirstOrDefault(i => i.ProductId == item.ProductId);
        if (existing != null)
        {
            wishlist.Items.Remove(existing);
            _logger.LogInformation("Removed product {ProductId} from wishlist for device {DeviceId}", item.ProductId, deviceId);
        }
        else
        {
            item.AddedAt = DateTime.UtcNow;
            wishlist.Items.Add(item);
            _logger.LogInformation("Added product {ProductId} ({Title}) to wishlist for device {DeviceId}", item.ProductId, item.Title, deviceId);
        }

        wishlist.ItemCount = wishlist.Items.Count;
        wishlist.ExpiresAt = DateTime.UtcNow.AddDays(100);
        _wishlists[deviceId] = wishlist;

        return Task.FromResult(wishlist);
    }

    public Task<(int PrunedCarts, int PrunedWishlists)> PruneExpiredCartsAndWishlistsAsync()
    {
        var now = DateTime.UtcNow;
        var expiredCartKeys = _carts.Where(kv => kv.Value.ExpiresAt < now).Select(kv => kv.Key).ToList();
        foreach (var key in expiredCartKeys)
        {
            if (_carts.TryRemove(key, out var cart))
            {
                _shareTokenToDevice.TryRemove(cart.ShareToken, out _);
            }
        }

        var expiredWishlistKeys = _wishlists.Where(kv => kv.Value.ExpiresAt < now).Select(kv => kv.Key).ToList();
        foreach (var key in expiredWishlistKeys)
        {
            _wishlists.TryRemove(key, out _);
        }

        _logger.LogInformation("Pruned {CartCount} expired carts (>30d) and {WishlistCount} expired wishlists (>100d)", expiredCartKeys.Count, expiredWishlistKeys.Count);

        return Task.FromResult((expiredCartKeys.Count, expiredWishlistKeys.Count));
    }
}
