using Dapper;
using Npgsql;

namespace DeepLens.SearchApi.Services;

public class IdGeneratorService : IIdGeneratorService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<IdGeneratorService> _logger;
    private readonly string _connectionString;

    public IdGeneratorService(IConfiguration configuration, ILogger<IdGeneratorService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
                         ?? throw new InvalidOperationException("DefaultConnection string not found");
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<string> GenerateOrderIdAsync(string? source = null, string? paymentMode = null)
    {
        var (orderId, _) = await GenerateOrderInternalAsync(source, paymentMode);
        return orderId;
    }

    private async Task<(string OrderId, int InternalId)> GenerateOrderInternalAsync(string? source = null, string? paymentMode = null)
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

        // 3. Insert the order record
        await conn.ExecuteAsync(@"
            INSERT INTO ""orderId"" (id, order_id, source_id, payment_mode_id)
            VALUES (@Id, @OrderId, @SourceId, @PaymentModeId)", 
            new { Id = nextValValue, OrderId = orderId, SourceId = sourceId, PaymentModeId = paymentModeId });

        return (orderId, (int)nextValValue);
    }

    public async Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, string? source = null, string? paymentMode = null)
    {
        var (orderId, internalId) = await GenerateOrderInternalAsync(source, paymentMode);
        
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
                o.created_at as timestamp
            FROM ""orderId"" o
            LEFT JOIN order_sources s ON o.source_id = s.id
            LEFT JOIN payment_modes p ON o.payment_mode_id = p.id
            ORDER BY o.created_at DESC
            LIMIT @Limit", 
            new { Limit = limit });
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
