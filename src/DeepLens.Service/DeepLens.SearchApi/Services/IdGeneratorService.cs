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

    public async Task<IEnumerable<OrderHistoryDto>> GetRecentOrderHistoryAsync(int limit = 20)
    {
        using var conn = await GetConnectionAsync();
        return await conn.QueryAsync<OrderHistoryDto>(@"
            SELECT 
                o.order_id as Id, 
                s.name as Source, 
                p.name as PaymentMethod, 
                o.customer_phone as CustomerPhone,
                o.source_handle as SourceHandle,
                o.instagram_handle as InstagramHandle,
                o.instagram_user_id as InstagramUserId,
                o.customer_address as CustomerAddress,
                o.transaction_id as TransactionId,
                o.created_at as Timestamp
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
                p.name as paymentmethod, 
                o.customer_phone as customerphone,
                o.source_handle as sourcehandle,
                o.instagram_handle as instagramhandle,
                o.instagram_user_id as instagramuserid,
                o.customer_address as customeraddress,
                o.transaction_id as transactionid,
                o.created_at as timestamp
            FROM ""orderId"" o
            LEFT JOIN order_sources s ON o.source_id = s.id
            LEFT JOIN payment_modes p ON o.payment_mode_id = p.id
            WHERE o.order_id = @OrderId",
            new { OrderId = orderId });

        if (order == null) return null;

        var items = await conn.QueryAsync<dynamic>(@"
            SELECT 
                i.id,
                i.product_id,
                i.comments
            FROM ""orderItem"" i
            WHERE i.order_id_ref = (SELECT id FROM ""orderId"" WHERE order_id = @OrderId)
            ORDER BY i.item_index",
            new { OrderId = orderId });

        var orderWithAttachments = (IDictionary<string, object>)order;
        orderWithAttachments["attachments"] = await conn.QueryAsync(@"
            SELECT a.id, a.bucket_name as bucket, a.object_key as key, a.original_filename as name, ea.tag
            FROM attachments a
            JOIN entity_attachments ea ON a.id = ea.attachment_id
            WHERE ea.entity_type = 'order' AND ea.entity_id = @OrderId",
            new { OrderId = orderId });

        var itemsList = new List<object>();
        foreach (var item in items) {
            var itemDict = (IDictionary<string, object>)item;
            var itemId = (int)itemDict["id"];
            itemDict["attachments"] = await conn.QueryAsync(@"
                SELECT a.id, a.bucket_name as bucket, a.object_key as key, a.original_filename as name
                FROM attachments a
                JOIN entity_attachments ea ON a.id = ea.attachment_id
                WHERE ea.entity_type = 'order_item' AND ea.entity_id = @ItemId",
                new { ItemId = itemId.ToString() });
            itemsList.Add(itemDict);
        }

        return new
        {
            id = order.id,
            source = order.source,
            paymentMethod = order.paymentmethod, // paymentmethod is likely lowercase too
            customerPhone = order.customerphone,
            sourceHandle = order.sourcehandle,
            instagramHandle = order.instagramhandle,
            instagramUserId = order.instagramuserid,
            customerAddress = order.customeraddress,
            transactionId = order.transactionid,
            timestamp = order.timestamp,
            attachments = orderWithAttachments["attachments"],
            items = itemsList
        };
    }

    public async Task<bool> UpdateOrderDetailsAsync(string orderId, string? phone = null, string? address = null, string? source = null, string? sourceHandle = null, string? paymentMode = null, IEnumerable<DeepLens.SearchApi.Controllers.OrderItemUpdateDto>? items = null, string? transactionId = null)
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
                transaction_id = COALESCE(@TransactionId, transaction_id)
            WHERE order_id = @OrderId",
            new { 
                OrderId = orderId, 
                Phone = phone, 
                SourceId = sourceId,
                SourceHandle = sourceHandle,
                PaymentModeId = paymentModeId,
                Address = address,
                TransactionId = transactionId
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
                    INSERT INTO ""orderItem"" (order_id_ref, item_index, product_id, comments)
                    VALUES (@InternalId, @Index, @ProdId, @Comments)",
                    new { 
                        InternalId = internalId, 
                        Index = index++, 
                        ProdId = item.ProductId, 
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

public record OrderHistoryDto(
    string Id,
    string? Source,
    string? PaymentMethod,
    string? CustomerPhone,
    string? SourceHandle,
    string? InstagramHandle,
    string? InstagramUserId,
    string? CustomerAddress,
    string? TransactionId,
    DateTime Timestamp
);
