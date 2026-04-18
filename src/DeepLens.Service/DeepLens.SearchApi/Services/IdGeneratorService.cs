using Dapper;
using Npgsql;

namespace DeepLens.SearchApi.Services;

public class IdGeneratorService : IIdGeneratorService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<IdGeneratorService> _logger;
    private readonly IInstagramSidecarService _instagramSidecar;
    private readonly string _connectionString;

    public IdGeneratorService(IConfiguration configuration, ILogger<IdGeneratorService> logger, IInstagramSidecarService instagramSidecar)
    {
        _configuration = configuration;
        _logger = logger;
        _instagramSidecar = instagramSidecar;
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
                         ?? throw new InvalidOperationException("DefaultConnection string not found");
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<string> GenerateOrderIdAsync(string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null)
    {
        var (orderId, _) = await GenerateOrderInternalAsync(source, paymentMode, sourceHandle, instagramUserId);
        return orderId;
    }

    private async Task<(string OrderId, int InternalId)> GenerateOrderInternalAsync(string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null)
    {
        using var conn = await GetConnectionAsync();
        
        // 1. Resolve source and payment mode from enums (avoids DB calls)
        int? sourceId = null;
        if (!string.IsNullOrEmpty(source))
        {
            if (Enum.TryParse<DeepLens.Domain.Enums.OrderSource>(source, true, out var srcEnum))
            {
                sourceId = (int)srcEnum;
            }
        }

        int? paymentModeId = null;
        if (!string.IsNullOrEmpty(paymentMode))
        {
            if (Enum.TryParse<DeepLens.Domain.Enums.PaymentMode>(paymentMode, true, out var payEnum))
            {
                paymentModeId = (int)payEnum;
            }
        }

        // 2. Get next sequence value
        var nextValValue = await conn.QuerySingleAsync<long>("SELECT nextval('\"orderId_id_seq\"')");
        var orderId = ToBase36(nextValValue, 5);

        // 3. Determine which column to populate for the handle
        string? finalInstagramUserId = instagramUserId;
        string? customerPhone = null;
        
        if (source?.ToLower() == "whatsapp") {
            customerPhone = sourceHandle;
        } else if (source?.ToLower() == "instagram" && !string.IsNullOrEmpty(sourceHandle)) {
            // Only fetch if not already provided by frontend
            if (string.IsNullOrEmpty(finalInstagramUserId))
            {
                try 
                {
                    var profile = await _instagramSidecar.GetProfileAsync(sourceHandle);
                    if (profile != null) 
                    {
                        finalInstagramUserId = profile.UserId;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch Instagram User ID for {Handle}", sourceHandle);
                }
            }
        }

        // 4. Insert the order record
        await conn.ExecuteAsync(@"
            INSERT INTO ""orderId"" (id, order_id, source_id, payment_mode_id, source_handle, instagram_user_id, customer_phone)
            VALUES (@Id, @OrderId, @SourceId, @PaymentModeId, @SourceHandle, @InstagramUserId, @CustomerPhone)", 
            new { 
                Id = nextValValue, 
                OrderId = orderId, 
                SourceId = sourceId, 
                PaymentModeId = paymentModeId, 
                SourceHandle = sourceHandle,
                InstagramUserId = finalInstagramUserId,
                CustomerPhone = customerPhone
            });

        return (orderId, (int)nextValValue);
    }

    public async Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null)
    {
        var (orderId, internalId) = await GenerateOrderInternalAsync(source, paymentMode, sourceHandle, instagramUserId);
        
        using var conn = await GetConnectionAsync();
        var itemIds = new List<string>();

        // Insert items into orderItem table
        for (int i = 1; i <= itemCount; i++)
        {
            string itemId = GenerateOrderItemId(orderId, i);
            itemIds.Add(itemId);

            await conn.ExecuteAsync(@"
                INSERT INTO ""orderItem"" (order_id_ref, item_index)
                VALUES (@OrderRef, @ItemIndex)",
                new { OrderRef = internalId, ItemIndex = i });
        }

        return (orderId, itemIds);
    }

    public string GenerateOrderItemId(string orderId, int itemIndex)
    {
        return $"{orderId}-{itemIndex:D2}";
    }

    public async Task<string> GenerateProductIdAsync()
    {
        using var conn = await GetConnectionAsync();
        
        // 1. Get next sequence value
        var nextValValue = await conn.QuerySingleAsync<long>("SELECT nextval('\"productId_id_seq\"')");
        
        // 2. Format suffix (VF + min 3 chars, grows naturally)
        string suffix = ToBase36(nextValValue, 0); 
        if (suffix.Length < 3)
        {
            suffix = suffix.PadLeft(3, '0');
        }
        
        var productId = $"VF{suffix}";

        // 3. Insert product record
        await conn.ExecuteAsync("INSERT INTO \"productId\" (id, product_id) VALUES (@Id, @ProductId)", 
            new { Id = nextValValue, ProductId = productId });

        return productId;
    }

    public async Task<IEnumerable<object>> GetRecentOrderHistoryAsync(int limit = 20)
    {
        using var conn = await GetConnectionAsync();
        return await conn.QueryAsync<object>(@"
            SELECT 
                o.order_id as id, 
                s.name as source, 
                p.name as paymentMethod, 
                o.customer_phone as customerPhone,
                o.source_handle as sourceHandle,
                o.instagram_user_id as instagramUserId,
                o.customer_address as customerAddress,
                o.order_details as orderDetails,
                o.created_at as timestamp
            FROM ""orderId"" o
            LEFT JOIN order_sources s ON o.source_id = s.id
            LEFT JOIN payment_modes p ON o.payment_mode_id = p.id
            ORDER BY o.created_at DESC
            LIMIT @Limit", 
            new { Limit = limit });
    }

    public async Task<object?> GetOrderDetailsAsync(string orderId)
    {
        using var conn = await GetConnectionAsync();
        
        var order = await conn.QueryFirstOrDefaultAsync(@"
            SELECT 
                o.order_id as id, 
                s.name as source, 
                p.name as paymentMethod, 
                o.customer_phone as customerPhone,
                o.source_handle as sourceHandle,
                o.instagram_user_id as instagramUserId,
                o.customer_address as customerAddress,
                o.order_details as orderDetails,
                o.created_at as timestamp
            FROM ""orderId"" o
            LEFT JOIN order_sources s ON o.source_id = s.id
            LEFT JOIN payment_modes p ON o.payment_mode_id = p.id
            WHERE o.order_id = @OrderId",
            new { OrderId = orderId });

        if (order == null) return null;

        var items = await conn.QueryAsync(@"
            SELECT 
                product_id_text as productId,
                photo_url as photoUrl,
                comments
            FROM ""orderItem""
            WHERE order_id_ref = (SELECT id FROM ""orderId"" WHERE order_id = @OrderId)
            ORDER BY item_index",
            new { OrderId = orderId });

        return new {
            order.id,
            order.source,
            order.paymentMethod,
            order.customerPhone,
            order.sourceHandle,
            order.instagramUserId,
            order.customerAddress,
            order.orderDetails,
            order.timestamp,
            items = items
        };
    }

    public async Task<bool> UpdateOrderDetailsAsync(string orderId, string? phone = null, string? address = null, string? details = null, string? source = null, string? sourceHandle = null, string? paymentMode = null, IEnumerable<DeepLens.SearchApi.Controllers.OrderItemUpdateDto>? items = null)
    {
        using var conn = await GetConnectionAsync();
        
        int? sourceId = null;
        if (!string.IsNullOrEmpty(source))
        {
            if (Enum.TryParse<DeepLens.Domain.Enums.OrderSource>(source, true, out var srcEnum))
            {
                sourceId = (int)srcEnum;
            }
        }

        int? paymentModeId = null;
        if (!string.IsNullOrEmpty(paymentMode))
        {
            if (Enum.TryParse<DeepLens.Domain.Enums.PaymentMode>(paymentMode, true, out var payEnum))
            {
                paymentModeId = (int)payEnum;
            }
        }

        var rows = await conn.ExecuteAsync(@"
            UPDATE ""orderId"" 
            SET customer_phone = COALESCE(@Phone, customer_phone),
                source_id = COALESCE(@SourceId, source_id),
                source_handle = COALESCE(@SourceHandle, source_handle),
                payment_mode_id = COALESCE(@PaymentModeId, payment_mode_id),
                customer_address = COALESCE(@Address, customer_address),
                order_details = COALESCE(@Details, order_details)
            WHERE order_id = @OrderId",
            new { 
                OrderId = orderId, 
                Phone = phone, 
                SourceId = sourceId,
                SourceHandle = sourceHandle,
                PaymentModeId = paymentModeId,
                Address = address,
                Details = details
            });
        
        if (items != null)
        {
            // 1. Get internal ID
            var internalId = await conn.QuerySingleAsync<int>("SELECT id FROM \"orderId\" WHERE order_id = @OrderId", new { OrderId = orderId });
            
            // 2. Clear existing items
            await conn.ExecuteAsync("DELETE FROM \"orderItem\" WHERE order_id_ref = @InternalId", new { InternalId = internalId });
            
            // 3. Insert new items
            int index = 1;
            foreach (var item in items)
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO ""orderItem"" (order_id_ref, item_index, product_id_text, photo_url, comments)
                    VALUES (@InternalId, @Index, @ProdId, @PhotoUrl, @Comments)",
                    new { 
                        InternalId = internalId, 
                        Index = index++, 
                        ProdId = item.ProductId, 
                        PhotoUrl = item.PhotoUrl, 
                        Comments = item.Comments 
                    });
            }
        }

        return rows > 0;
    }

    private static string ToBase36(long value, int minLength)
    {
        const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (value == 0) return "0".PadLeft(minLength, '0');

        var result = new System.Collections.Generic.List<char>();
        while (value > 0)
        {
            result.Add(chars[(int)(value % 36)]);
            value /= 36;
        }
        result.Reverse();
        
        string s = new string(result.ToArray());
        return s.Length < minLength ? s.PadLeft(minLength, '0') : s;
    }
}
