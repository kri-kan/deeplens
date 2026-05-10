using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace DeepLens.Infrastructure.Persistence.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public OrderRepository(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<int> CreateOrderRecordAsync(long id, string orderId, int? sourceId, int? paymentModeId, string? sourceHandle, string? instagramUserId, string? customerPhone)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.ExecuteAsync(@"
            INSERT INTO ""orderId"" (id, order_id, source_id, payment_mode_id, source_handle, instagram_user_id, customer_phone)
            VALUES (@Id, @OrderId, @SourceId, @PaymentModeId, @SourceHandle, @InstagramUserId, @CustomerPhone)", 
            new { 
                Id = id, 
                OrderId = orderId, 
                SourceId = sourceId, 
                PaymentModeId = paymentModeId, 
                SourceHandle = sourceHandle,
                InstagramUserId = instagramUserId,
                CustomerPhone = customerPhone
            });
    }

    public async Task<IEnumerable<OrderHistoryDto>> GetRecentHistoryAsync(int limit)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QueryAsync<OrderHistoryDto>(@"
            SELECT 
                o.order_id as Id, 
                s.name as Source, 
                p.name as PaymentMode, 
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

    public async Task<OrderDetailDto?> GetDetailsAsync(string orderId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        var order = await connection.QueryFirstOrDefaultAsync<OrderDetailsQueryResult>(@"
            SELECT 
                o.order_id as Id, 
                s.name as SourceName, 
                p.name as PaymentModeName, 
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
            WHERE o.order_id = @OrderId",
            new { OrderId = orderId });
 
        if (order == null) return null;
 
        var items = await connection.QueryAsync<OrderItemQueryResult>(@"
            SELECT 
                i.id as Id,
                i.product_id as ProductId,
                i.comments as Comments
            FROM ""orderItem"" i
            WHERE i.order_id_ref = (SELECT id FROM ""orderId"" WHERE order_id = @OrderId)
            ORDER BY i.item_index",
            new { OrderId = orderId });
 
        var attachments = await connection.QueryAsync<AttachmentDto>(@"
            SELECT a.id, a.bucket_name as bucket, a.object_key as key, a.original_filename as name, ea.tag
            FROM attachments a
            JOIN entity_attachments ea ON a.id = ea.attachment_id
            WHERE ea.entity_type = 'order' AND ea.entity_id = @OrderId",
            new { OrderId = orderId });
 
        var itemsList = new List<OrderItemDetailDto>();
        foreach (var item in items) {
            var itemAttachments = await connection.QueryAsync<AttachmentDto>(@"
                SELECT a.id, a.bucket_name as bucket, a.object_key as key, a.original_filename as name
                FROM attachments a
                JOIN entity_attachments ea ON a.id = ea.attachment_id
                WHERE ea.entity_type = 'order_item' AND ea.entity_id = @ItemId",
                new { ItemId = item.Id.ToString() });
            
            itemsList.Add(new OrderItemDetailDto
            {
                Id = item.Id,
                ProductId = item.ProductId,
                Comments = item.Comments,
                Attachments = itemAttachments.ToList()
            });
        }
 
        return new OrderDetailDto
        {
            Id = order.Id,
            Source = Enum.TryParse<OrderSource>(order.SourceName, true, out var src) ? src : null,
            PaymentMode = Enum.TryParse<PaymentMode>(order.PaymentModeName, true, out var pay) ? pay : null, 
            CustomerPhone = order.CustomerPhone,
            SourceHandle = order.SourceHandle,
            InstagramHandle = order.InstagramHandle,
            InstagramUserId = order.InstagramUserId,
            CustomerAddress = order.CustomerAddress,
            TransactionId = order.TransactionId,
            Timestamp = order.Timestamp,
            Attachments = attachments.ToList(),
            Items = itemsList
        };
    }

    public async Task<bool> UpdateDetailsAsync(string orderId, string? phone, string? address, int? sourceId, string? sourceHandle, int? paymentModeId, string? transactionId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(@"
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
        return rows > 0;
    }

    public async Task DeleteItemsAsync(int orderInternalId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync("DELETE FROM \"orderItem\" WHERE order_id_ref = @InternalId", new { InternalId = orderInternalId });
    }

    public async Task AddOrderItemAsync(int orderInternalId, int index, string? productId, string? comments)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            INSERT INTO ""orderItem"" (order_id_ref, item_index, product_id, comments)
            VALUES (@InternalId, @Index, @ProdId, @Comments)",
            new { 
                InternalId = orderInternalId, 
                Index = index, 
                ProdId = productId, 
                Comments = comments 
            });
    }

    public async Task<int> GetInternalIdAsync(string orderId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleAsync<int>("SELECT id FROM \"orderId\" WHERE order_id = @OrderId", new { OrderId = orderId });
    }

    private record OrderDetailsQueryResult(
        string Id, 
        string? SourceName, 
        string? PaymentModeName, 
        string? CustomerPhone, 
        string? SourceHandle, 
        string? InstagramHandle, 
        string? InstagramUserId, 
        string? CustomerAddress, 
        string? TransactionId, 
        DateTime Timestamp);

    private record OrderItemQueryResult(int Id, string? ProductId, string? Comments);
}
