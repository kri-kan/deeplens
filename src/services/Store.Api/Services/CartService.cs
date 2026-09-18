using Dapper;
using Npgsql;
using Store.Api.Models;

namespace Store.Api.Services;

public class CartService : ICartService
{
    private readonly string _connectionString;
    private readonly string _baseUrl;
    private readonly ILogger<CartService> _logger;

    public CartService(IConfiguration config, ILogger<CartService> logger)
    {
        _logger = logger;
        _baseUrl = config["Store:BaseUrl"] ?? "https://store.vayyari.com";
        _connectionString = config.GetConnectionString("StoreDb")
            ?? config["ConnectionStrings:StoreDb"]
            ?? config["ConnectionStrings__StoreDb"]
            ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";
    }

    public async Task<CartDto> GetCartAsync(string deviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string selectSql = @"
            SELECT id, device_id, share_token, total_amount, total_mrp, total_discount, item_count, last_active_at, expires_at
            FROM carts
            WHERE device_id = @DeviceId LIMIT 1;";

        var cartRow = await conn.QuerySingleOrDefaultAsync<CartDbRow>(selectSql, new { DeviceId = deviceId });

        if (cartRow == null)
        {
            var shareToken = "crt_" + Guid.NewGuid().ToString("N")[..8];
            const string insertSql = @"
                INSERT INTO carts (id, device_id, share_token, total_amount, total_mrp, total_discount, item_count, created_at, last_active_at, expires_at)
                VALUES (gen_random_uuid(), @DeviceId, @ShareToken, 0.00, 0.00, 0.00, 0, NOW(), NOW(), NOW() + INTERVAL '30 days')
                RETURNING id, device_id, share_token, total_amount, total_mrp, total_discount, item_count, last_active_at, expires_at;";

            cartRow = await conn.QuerySingleAsync<CartDbRow>(insertSql, new { DeviceId = deviceId, ShareToken = shareToken });
        }
        else
        {
            const string touchSql = @"
                UPDATE carts SET last_active_at = NOW(), expires_at = NOW() + INTERVAL '30 days'
                WHERE id = @Id;";
            await conn.ExecuteAsync(touchSql, new { Id = cartRow.Id });
        }

        const string itemsSql = @"
            SELECT id::text AS id, product_id, product_code, title, price, original_price, quantity, selected_color, selected_size, primary_image_uri
            FROM cart_items
            WHERE cart_id = @CartId
            ORDER BY created_at ASC;";

        var items = (await conn.QueryAsync<CartItemDto>(itemsSql, new { CartId = cartRow.Id })).ToList();

        return new CartDto
        {
            DeviceId = cartRow.DeviceId,
            ShareToken = cartRow.ShareToken,
            ShareUrl = $"{_baseUrl}/cart/share/{cartRow.ShareToken}",
            Items = items,
            TotalAmount = cartRow.TotalAmount,
            TotalMRP = cartRow.TotalMrp,
            TotalDiscount = cartRow.TotalDiscount,
            ItemCount = cartRow.ItemCount,
            LastActiveAt = cartRow.LastActiveAt,
            ExpiresAt = cartRow.ExpiresAt
        };
    }

    public async Task<CartDto> SyncCartAsync(string deviceId, List<CartItemDto> items)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        items ??= new();
        var itemCount = items.Sum(i => i.Quantity);
        var totalMrp = items.Sum(i => (i.OriginalPrice > 0 ? i.OriginalPrice : i.Price) * i.Quantity);
        var totalAmount = items.Sum(i => i.Price * i.Quantity);
        var totalDiscount = Math.Max(0, totalMrp - totalAmount);

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        try
        {
            var shareToken = "crt_" + Guid.NewGuid().ToString("N")[..8];
            const string upsertCartSql = @"
                INSERT INTO carts (id, device_id, share_token, total_amount, total_mrp, total_discount, item_count, created_at, last_active_at, expires_at)
                VALUES (gen_random_uuid(), @DeviceId, @ShareToken, @TotalAmount, @TotalMrp, @TotalDiscount, @ItemCount, NOW(), NOW(), NOW() + INTERVAL '30 days')
                ON CONFLICT (device_id) DO UPDATE SET
                    total_amount = EXCLUDED.total_amount,
                    total_mrp = EXCLUDED.total_mrp,
                    total_discount = EXCLUDED.total_discount,
                    item_count = EXCLUDED.item_count,
                    last_active_at = NOW(),
                    expires_at = NOW() + INTERVAL '30 days'
                RETURNING id, device_id, share_token, total_amount, total_mrp, total_discount, item_count, last_active_at, expires_at;";

            var cartRow = await conn.QuerySingleAsync<CartDbRow>(upsertCartSql, new
            {
                DeviceId = deviceId,
                ShareToken = shareToken,
                TotalAmount = totalAmount,
                TotalMrp = totalMrp,
                TotalDiscount = totalDiscount,
                ItemCount = itemCount
            }, tx);

            // Delete old items and insert fresh
            await conn.ExecuteAsync("DELETE FROM cart_items WHERE cart_id = @CartId;", new { CartId = cartRow.Id }, tx);

            if (items.Count > 0)
            {
                const string insertItemSql = @"
                    INSERT INTO cart_items (id, cart_id, product_id, product_code, title, price, original_price, quantity, selected_color, selected_size, primary_image_uri, created_at)
                    VALUES (gen_random_uuid(), @CartId, @ProductId, @ProductCode, @Title, @Price, @OriginalPrice, @Quantity, @SelectedColor, @SelectedSize, @PrimaryImageUri, NOW());";

                foreach (var it in items)
                {
                    await conn.ExecuteAsync(insertItemSql, new
                    {
                        CartId = cartRow.Id,
                        ProductId = it.ProductId,
                        ProductCode = it.ProductCode,
                        Title = it.Title,
                        Price = it.Price,
                        OriginalPrice = it.OriginalPrice,
                        Quantity = it.Quantity,
                        SelectedColor = it.SelectedColor,
                        SelectedSize = it.SelectedSize,
                        PrimaryImageUri = it.PrimaryImageUri
                    }, tx);
                }
            }

            await tx.CommitAsync();

            _logger.LogInformation("Synced cart in PostgreSQL for device {DeviceId} with {Count} items. Total: ₹{Total}", deviceId, itemCount, totalAmount);

            return new CartDto
            {
                DeviceId = cartRow.DeviceId,
                ShareToken = cartRow.ShareToken,
                ShareUrl = $"{_baseUrl}/cart/share/{cartRow.ShareToken}",
                Items = items,
                TotalAmount = totalAmount,
                TotalMRP = totalMrp,
                TotalDiscount = totalDiscount,
                ItemCount = itemCount,
                LastActiveAt = cartRow.LastActiveAt,
                ExpiresAt = cartRow.ExpiresAt
            };
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<SharedCartViewDto?> GetSharedCartAsync(string shareToken)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string cartSql = @"
            SELECT id, device_id, share_token, total_amount, total_mrp, total_discount, item_count, created_at, last_active_at, expires_at
            FROM carts
            WHERE share_token = @ShareToken AND expires_at > NOW() LIMIT 1;";

        var cartRow = await conn.QuerySingleOrDefaultAsync<CartDbRow>(cartSql, new { ShareToken = shareToken });
        if (cartRow == null) return null;

        const string itemsSql = @"
            SELECT id::text AS id, product_id, product_code, title, price, original_price, quantity, selected_color, selected_size, primary_image_uri
            FROM cart_items
            WHERE cart_id = @CartId
            ORDER BY created_at ASC;";

        var items = (await conn.QueryAsync<CartItemDto>(itemsSql, new { CartId = cartRow.Id })).ToList();

        return new SharedCartViewDto
        {
            ShareToken = cartRow.ShareToken,
            Items = items,
            TotalAmount = cartRow.TotalAmount,
            TotalMRP = cartRow.TotalMrp,
            TotalDiscount = cartRow.TotalDiscount,
            ItemCount = cartRow.ItemCount,
            CreatedAt = cartRow.LastActiveAt,
            IsSharedView = true
        };
    }

    public async Task<WishlistDto> GetWishlistAsync(string deviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string selectSql = @"
            SELECT product_id, product_code, title, price, primary_image_uri, created_at AS AddedAt
            FROM wishlists
            WHERE device_id = @DeviceId AND expires_at > NOW()
            ORDER BY created_at DESC;";

        var items = (await conn.QueryAsync<WishlistItemDto>(selectSql, new { DeviceId = deviceId })).ToList();

        return new WishlistDto
        {
            DeviceId = deviceId,
            Items = items,
            ItemCount = items.Count,
            ExpiresAt = DateTime.UtcNow.AddDays(100)
        };
    }

    public async Task<WishlistDto> ToggleWishlistAsync(string deviceId, WishlistItemDto item)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            deviceId = "dev_" + Guid.NewGuid().ToString("N")[..12];
        }

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string checkSql = @"
            SELECT id FROM wishlists WHERE device_id = @DeviceId AND product_id = @ProductId LIMIT 1;";
        var existingId = await conn.QuerySingleOrDefaultAsync<Guid?>(checkSql, new { DeviceId = deviceId, ProductId = item.ProductId });

        if (existingId.HasValue)
        {
            await conn.ExecuteAsync("DELETE FROM wishlists WHERE id = @Id;", new { Id = existingId.Value });
            _logger.LogInformation("Removed product {ProductId} from wishlist in PostgreSQL for device {DeviceId}", item.ProductId, deviceId);
        }
        else
        {
            const string insertSql = @"
                INSERT INTO wishlists (id, device_id, product_id, product_code, title, price, primary_image_uri, created_at, expires_at)
                VALUES (gen_random_uuid(), @DeviceId, @ProductId, @ProductCode, @Title, @Price, @PrimaryImageUri, NOW(), NOW() + INTERVAL '100 days');";
            await conn.ExecuteAsync(insertSql, new
            {
                DeviceId = deviceId,
                ProductId = item.ProductId,
                ProductCode = item.ProductCode,
                Title = item.Title,
                Price = item.Price,
                PrimaryImageUri = item.PrimaryImageUri
            });
            _logger.LogInformation("Added product {ProductId} to wishlist in PostgreSQL for device {DeviceId}", item.ProductId, deviceId);
        }

        return await GetWishlistAsync(deviceId);
    }

    public async Task<(int PrunedCarts, int PrunedWishlists)> PruneExpiredCartsAndWishlistsAsync()
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        var prunedCarts = await conn.ExecuteAsync("DELETE FROM carts WHERE expires_at < NOW();");
        var prunedWishlists = await conn.ExecuteAsync("DELETE FROM wishlists WHERE expires_at < NOW();");

        _logger.LogInformation("Pruned {CartCount} expired carts (>30d) and {WishlistCount} expired wishlists (>100d) from PostgreSQL", prunedCarts, prunedWishlists);

        return (prunedCarts, prunedWishlists);
    }

    private class CartDbRow
    {
        public Guid Id { get; set; }
        public string DeviceId { get; set; } = string.Empty;
        public string ShareToken { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TotalMrp { get; set; }
        public decimal TotalDiscount { get; set; }
        public int ItemCount { get; set; }
        public DateTime LastActiveAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
