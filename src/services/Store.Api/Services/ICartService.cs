using Store.Api.Models;

namespace Store.Api.Services;

public interface ICartService
{
    Task<CartDto> GetCartAsync(string deviceId);
    Task<CartDto> SyncCartAsync(string deviceId, List<CartItemDto> items);
    Task<SharedCartViewDto?> GetSharedCartAsync(string shareToken);
    Task<WishlistDto> GetWishlistAsync(string deviceId);
    Task<WishlistDto> ToggleWishlistAsync(string deviceId, WishlistItemDto item);
    Task<(int PrunedCarts, int PrunedWishlists)> PruneExpiredCartsAndWishlistsAsync();
}
