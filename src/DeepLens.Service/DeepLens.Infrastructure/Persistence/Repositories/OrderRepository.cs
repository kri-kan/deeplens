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

    public async Task<int> CreateOrderRecordAsync(long id, string orderId, int? sourceId, int? paymentModeId, string? sourceHandle, string? instagramUserId, string? customerPhone, Guid? customerId = null)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.ExecuteAsync(@"
            INSERT INTO ""orderId"" (id, order_id, source_id, payment_mode_id, source_handle, instagram_user_id, customer_phone, customer_id)
            VALUES (@Id, @OrderId, @SourceId, @PaymentModeId, @SourceHandle, @InstagramUserId, @CustomerPhone, @CustomerId)", 
            new { 
                Id = id, 
                OrderId = orderId, 
                SourceId = sourceId, 
                PaymentModeId = paymentModeId, 
                SourceHandle = sourceHandle,
                InstagramUserId = instagramUserId,
                CustomerPhone = customerPhone,
                CustomerId = customerId
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
                o.customer_name as CustomerName,
                o.customer_phone as CustomerPhone,
                o.source_handle as SourceHandle,
                o.instagram_handle as InstagramHandle,
                o.instagram_user_id as InstagramUserId,
                o.customer_address as CustomerAddress,
                o.transaction_id as TransactionId,
                o.total_amount as TotalAmount,
                o.advance_paid as AdvancePaid,
                o.cod_balance as CodBalance,
                o.created_at as Timestamp,
                o.is_deleted as IsDeleted,
                o.customer_id as CustomerId
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
                o.customer_name as CustomerName,
                o.customer_phone as CustomerPhone,
                o.source_handle as SourceHandle,
                o.instagram_handle as InstagramHandle,
                o.instagram_user_id as InstagramUserId,
                o.customer_address as CustomerAddress,
                o.shipping_street as ShippingStreet,
                o.shipping_city as ShippingCity,
                o.shipping_state as ShippingState,
                o.shipping_pincode as ShippingPincode,
                o.is_serviceable as IsServiceable,
                o.total_amount as TotalAmount,
                o.advance_paid as AdvancePaid,
                o.cod_balance as CodBalance,
                o.shipping_charges as ShippingCharges,
                o.transaction_id as TransactionId,
                o.created_at as Timestamp,
                o.is_deleted as IsDeleted,
                o.customer_id as CustomerId
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
                i.quantity as Quantity,
                COALESCE(i.unit_price, i.price, 0) as UnitPrice,
                COALESCE(i.subtotal, 0) as Subtotal,
                i.vendor_id as VendorId,
                i.source_type as SourceType,
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
                Quantity = item.Quantity > 0 ? item.Quantity : 1,
                UnitPrice = item.UnitPrice,
                Subtotal = item.Subtotal > 0 ? item.Subtotal : (item.UnitPrice * (item.Quantity > 0 ? item.Quantity : 1)),
                VendorId = item.VendorId,
                SourceType = item.SourceType,
                Comments = item.Comments,
                Attachments = itemAttachments.ToList()
            });
        }
 
        return new OrderDetailDto
        {
            Id = order.Id,
            Source = Enum.TryParse<OrderSource>(order.SourceName, true, out var src) ? src : null,
            PaymentMode = Enum.TryParse<PaymentMode>(order.PaymentModeName, true, out var pay) ? pay : null, 
            CustomerName = order.CustomerName,
            CustomerPhone = order.CustomerPhone,
            SourceHandle = order.SourceHandle,
            InstagramHandle = order.InstagramHandle,
            InstagramUserId = order.InstagramUserId,
            CustomerAddress = order.CustomerAddress,
            ShippingStreet = order.ShippingStreet,
            ShippingCity = order.ShippingCity,
            ShippingState = order.ShippingState,
            ShippingPincode = order.ShippingPincode,
            IsServiceable = order.IsServiceable,
            TotalAmount = order.TotalAmount,
            AdvancePaid = order.AdvancePaid,
            CodBalance = order.CodBalance,
            ShippingCharges = order.ShippingCharges,
            TransactionId = order.TransactionId,
            Timestamp = order.Timestamp,
            IsDeleted = order.IsDeleted,
            CustomerId = order.CustomerId,
            Attachments = attachments.ToList(),
            Items = itemsList
        };
    }

    public async Task<bool> UpdateDetailsAsync(
        string orderId, 
        string? phone, 
        string? address, 
        int? sourceId, 
        string? sourceHandle, 
        int? paymentModeId, 
        string? transactionId, 
        Guid? customerId = null,
        string? customerName = null,
        decimal? advancePaid = null,
        decimal? codBalance = null,
        decimal? totalAmount = null,
        decimal? shippingCharges = null,
        string? shippingStreet = null,
        string? shippingCity = null,
        string? shippingState = null,
        string? shippingPincode = null,
        bool? isServiceable = null)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(@"
            UPDATE ""orderId"" 
            SET customer_phone = COALESCE(@Phone, customer_phone),
                source_id = COALESCE(@SourceId, source_id),
                source_handle = COALESCE(@SourceHandle, source_handle),
                payment_mode_id = COALESCE(@PaymentModeId, payment_mode_id),
                customer_address = COALESCE(@Address, customer_address),
                transaction_id = COALESCE(@TransactionId, transaction_id),
                customer_id = COALESCE(@CustomerId, customer_id),
                customer_name = COALESCE(@CustomerName, customer_name),
                advance_paid = COALESCE(@AdvancePaid, advance_paid),
                cod_balance = COALESCE(@CodBalance, cod_balance),
                total_amount = COALESCE(@TotalAmount, total_amount),
                shipping_charges = COALESCE(@ShippingCharges, shipping_charges),
                shipping_street = COALESCE(@ShippingStreet, shipping_street),
                shipping_city = COALESCE(@ShippingCity, shipping_city),
                shipping_state = COALESCE(@ShippingState, shipping_state),
                shipping_pincode = COALESCE(@ShippingPincode, shipping_pincode),
                is_serviceable = COALESCE(@IsServiceable, is_serviceable)
            WHERE order_id = @OrderId",
            new { 
                OrderId = orderId, 
                Phone = phone, 
                SourceId = sourceId,
                SourceHandle = sourceHandle,
                PaymentModeId = paymentModeId,
                Address = address,
                TransactionId = transactionId,
                CustomerId = customerId,
                CustomerName = customerName,
                AdvancePaid = advancePaid,
                CodBalance = codBalance,
                TotalAmount = totalAmount,
                ShippingCharges = shippingCharges,
                ShippingStreet = shippingStreet,
                ShippingCity = shippingCity,
                ShippingState = shippingState,
                ShippingPincode = shippingPincode,
                IsServiceable = isServiceable
            });
        return rows > 0;
    }

    public async Task DeleteItemsAsync(int orderInternalId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync("DELETE FROM \"orderItem\" WHERE order_id_ref = @InternalId", new { InternalId = orderInternalId });
    }

    public async Task AddOrderItemAsync(int orderInternalId, int index, string? productId, string? comments, int quantity = 1, decimal unitPrice = 0, decimal subtotal = 0, Guid? vendorId = null, string? sourceType = "catalog")
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            INSERT INTO ""orderItem"" (order_id_ref, item_index, product_id, comments, quantity, price, unit_price, subtotal, vendor_id, source_type)
            VALUES (@InternalId, @Index, @ProdId, @Comments, @Quantity, @UnitPrice, @UnitPrice, @Subtotal, @VendorId, @SourceType)",
            new { 
                InternalId = orderInternalId, 
                Index = index, 
                ProdId = productId, 
                Comments = comments,
                Quantity = quantity,
                UnitPrice = unitPrice,
                Subtotal = subtotal > 0 ? subtotal : (unitPrice * quantity),
                VendorId = vendorId,
                SourceType = sourceType ?? "catalog"
            });
    }

    public async Task<int> GetInternalIdAsync(string orderId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleAsync<int>("SELECT id FROM \"orderId\" WHERE order_id = @OrderId", new { OrderId = orderId });
    }

    public async Task<bool> SoftDeleteOrderAsync(string orderId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(@"
            UPDATE ""orderId"" 
            SET is_deleted = true
            WHERE order_id = @OrderId",
            new { OrderId = orderId });
        return rows > 0;
    }

    private record OrderDetailsQueryResult(
        string Id, 
        string? SourceName, 
        string? PaymentModeName, 
        string? CustomerName,
        string? CustomerPhone, 
        string? SourceHandle, 
        string? InstagramHandle, 
        string? InstagramUserId, 
        string? CustomerAddress, 
        string? ShippingStreet,
        string? ShippingCity,
        string? ShippingState,
        string? ShippingPincode,
        bool? IsServiceable,
        decimal? TotalAmount,
        decimal? AdvancePaid,
        decimal? CodBalance,
        decimal? ShippingCharges,
        string? TransactionId, 
        DateTime Timestamp,
        bool IsDeleted,
        Guid? CustomerId);

    private record OrderItemQueryResult(
        int Id, 
        string? ProductId, 
        int Quantity, 
        decimal UnitPrice, 
        decimal Subtotal, 
        Guid? VendorId, 
        string? SourceType, 
        string? Comments);
}
