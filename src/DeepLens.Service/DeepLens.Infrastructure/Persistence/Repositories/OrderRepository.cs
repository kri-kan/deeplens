using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using DeepLens.Infrastructure.Clients.Delhivery;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Persistence.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogger<OrderRepository> _logger;

    public OrderRepository(
        IDbConnectionFactory dbConnectionFactory,
        IDelhiveryClient delhiveryClient,
        ILogger<OrderRepository> logger)
    {
        _dbConnectionFactory = dbConnectionFactory;
        _delhiveryClient = delhiveryClient;
        _logger = logger;
    }

    public async Task<int> CreateOrderRecordAsync(
        long id, 
        string orderId, 
        int? sourceId, 
        int? paymentModeId, 
        string? sourceHandle, 
        string? instagramUserId, 
        string? customerPhone, 
        Guid? customerId = null,
        OrderStatus status = OrderStatus.Unconfirmed,
        bool needLabel = false)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.ExecuteAsync(@"
            INSERT INTO ""orderId"" (id, order_id, source_id, payment_mode_id, source_handle, instagram_user_id, customer_phone, customer_id, status, need_label)
            VALUES (@Id, @OrderId, @SourceId, @PaymentModeId, @SourceHandle, @InstagramUserId, @CustomerPhone, @CustomerId, @Status, @NeedLabel)", 
            new { 
                Id = id, 
                OrderId = orderId, 
                SourceId = sourceId, 
                PaymentModeId = paymentModeId, 
                SourceHandle = sourceHandle,
                InstagramUserId = instagramUserId,
                CustomerPhone = customerPhone,
                CustomerId = customerId,
                Status = (int)status,
                NeedLabel = needLabel
            });
    }

    private static readonly Dictionary<string, int> StageRank = new(StringComparer.OrdinalIgnoreCase)
    {
        { "unconfirmed", 0 },
        { "confirmed", 1 },
        { "processed", 2 },
        { "processing", 2 },
        { "placed", 3 },
        { "dispatched", 3 },
        { "delivered", 4 }
    };

    public static string? ComputeStageTag(List<OrderGroupDto>? groups, string? fallbackStatus)
    {
        // 1. "once a order is created it has no stage until items are created udner it"
        if (groups == null || groups.Count == 0)
        {
            return null;
        }

        if (groups.Count == 1)
        {
            var s = groups[0].Status;
            return string.IsNullOrWhiteSpace(s) ? "Unconfirmed" : Capitalize(s);
        }

        // 2. "at order level show the least status amongst the groups and +n [count of remainign groups, or total group count -1]"
        var leastGroup = groups
            .OrderBy(g => StageRank.TryGetValue(g.Status?.Trim() ?? "unconfirmed", out var rank) ? rank : 0)
            .First();

        var leastStage = string.IsNullOrWhiteSpace(leastGroup.Status) ? "Unconfirmed" : Capitalize(leastGroup.Status);
        int remainingCount = groups.Count - 1;
        return $"{leastStage} +{remainingCount}";
    }

    private static string Capitalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "Unconfirmed";
        return char.ToUpperInvariant(input[0]) + input.Substring(1).ToLowerInvariant();
    }

    private async Task PopulateOrderGroupStagesAsync(System.Data.IDbConnection connection, List<OrderHistoryDto> items)
    {
        if (items.Count == 0) return;
        var orderIds = items.Select(x => x.Id).ToArray();
        var groups = (await connection.QueryAsync<OrderGroupDto>(@"
            SELECT 
                order_grp_id as OrderGrpId,
                order_id as OrderId,
                vendor_id as VendorId,
                vendor_name as VendorName,
                status as Status,
                updated_at as UpdatedAt,
                created_at as CreatedAt
            FROM order_groups
            WHERE order_id = ANY(@OrderIds)
            ORDER BY updated_at DESC, created_at DESC", 
            new { OrderIds = orderIds })).ToList();

        var groupsByOrder = groups.GroupBy(g => g.OrderId).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var item in items)
        {
            if (groupsByOrder.TryGetValue(item.Id, out var oGroups) && oGroups.Count > 0)
            {
                item.Groups = oGroups;
                item.StageTag = ComputeStageTag(oGroups, item.Status);
            }
            else
            {
                item.StageTag = ComputeStageTag(null, item.Status);
            }
        }
    }

    public async Task<IEnumerable<OrderHistoryDto>> GetRecentHistoryAsync(int limit, bool showDeleted = false)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var items = (await connection.QueryAsync<OrderHistoryDto>(@"
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
                o.order_type as OrderType,
                o.reseller_name as ResellerName,
                o.created_at as Timestamp,
                o.is_deleted as IsDeleted,
                o.customer_id as CustomerId
            FROM ""orderId"" o
            LEFT JOIN order_sources s ON o.source_id = s.id
            LEFT JOIN payment_modes p ON o.payment_mode_id = p.id
            WHERE (@ShowDeleted = true OR o.is_deleted = false OR o.is_deleted IS NULL)
            ORDER BY o.created_at DESC
            LIMIT @Limit", 
            new { Limit = limit, ShowDeleted = showDeleted })).ToList();

        await PopulateOrderGroupStagesAsync(connection, items);
        return items;
    }

    public async Task<PagedOrderHistoryResult> GetSearchOrdersAsync(
        int page = 1,
        int limit = 20,
        string? search = null,
        int? sourceId = null,
        int? paymentModeId = null,
        bool showDeleted = false,
        string sortBy = "date",
        string sortOrder = "desc")
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        int offset = (page - 1) * limit;

        var searchTrimmed = search?.Trim().ToLowerInvariant();
        var searchPattern = string.IsNullOrWhiteSpace(searchTrimmed) ? null : $"%{searchTrimmed}%";

        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        string orderByClause = (sortBy?.ToLowerInvariant(), sortOrder?.ToLowerInvariant()) switch
        {
            ("orderid", "asc") => "o.order_id ASC",
            ("orderid", "desc") => "o.order_id DESC",
            ("customername", "asc") => "o.customer_name ASC NULLS LAST",
            ("customername", "desc") => "o.customer_name DESC NULLS LAST",
            ("date", "asc") => "o.created_at ASC",
            _ => "o.created_at DESC"
        };

        var sql = $@"
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
                o.order_type as OrderType,
                o.reseller_name as ResellerName,
                o.created_at as Timestamp,
                o.is_deleted as IsDeleted,
                o.customer_id as CustomerId
            FROM ""orderId"" o
            LEFT JOIN order_sources s ON o.source_id = s.id
            LEFT JOIN payment_modes p ON o.payment_mode_id = p.id
            WHERE 
                (@ShowDeleted = true OR o.is_deleted = false)
                AND (@SourceId IS NULL OR o.source_id = @SourceId)
                AND (@PaymentModeId IS NULL OR o.payment_mode_id = @PaymentModeId)
                AND (
                    @SearchPattern IS NULL OR (
                        LOWER(o.order_id) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.customer_name, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.customer_phone, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.source_handle, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.instagram_handle, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.customer_address, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.shipping_street, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.shipping_city, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.shipping_pincode, '')) LIKE @SearchPattern
                    )
                )
            ORDER BY {orderByClause}
            LIMIT @Limit OFFSET @Offset;

            SELECT COUNT(*)
            FROM ""orderId"" o
            WHERE 
                (@ShowDeleted = true OR o.is_deleted = false)
                AND (@SourceId IS NULL OR o.source_id = @SourceId)
                AND (@PaymentModeId IS NULL OR o.payment_mode_id = @PaymentModeId)
                AND (
                    @SearchPattern IS NULL OR (
                        LOWER(o.order_id) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.customer_name, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.customer_phone, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.source_handle, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.instagram_handle, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.customer_address, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.shipping_street, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.shipping_city, '')) LIKE @SearchPattern OR
                        LOWER(COALESCE(o.shipping_pincode, '')) LIKE @SearchPattern
                    )
                );";

        using var multi = await connection.QueryMultipleAsync(sql, new {
            ShowDeleted = showDeleted,
            SourceId = sourceId,
            PaymentModeId = paymentModeId,
            SearchPattern = searchPattern,
            Limit = limit,
            Offset = offset
        });

        var items = (await multi.ReadAsync<OrderHistoryDto>()).ToList();
        var totalCount = await multi.ReadFirstAsync<int>();

        await PopulateOrderGroupStagesAsync(connection, items);

        return new PagedOrderHistoryResult
        {
            Items = items,
            Page = page,
            PageSize = limit,
            TotalCount = totalCount,
            HasMore = (offset + items.Count) < totalCount
        };
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
                o.customer_id as CustomerId,
                COALESCE(o.status, 0) as Status,
                COALESCE(o.need_label, false) as NeedLabel,
                o.order_type as OrderType,
                o.reseller_name as ResellerName,
                COALESCE(o.is_address_reviewed, true) as IsAddressReviewed
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
                i.product_title as ProductTitle,
                i.quantity as Quantity,
                COALESCE(i.unit_price, i.price, 0) as UnitPrice,
                COALESCE(i.subtotal, 0) as Subtotal,
                i.vendor_id as VendorId,
                i.source_type as SourceType,
                i.comments as Comments,
                i.item_id as ItemId,
                i.order_grp_id_ref as OrderGrpId,
                i.label_url as LabelUrl
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

        var existingGroups = (await connection.QueryAsync<OrderGroupDto>(@"
            SELECT 
                order_grp_id as OrderGrpId,
                order_id as OrderId,
                vendor_id as VendorId,
                vendor_name as VendorName,
                need_label as NeedLabel,
                awb_number as AwbNumber,
                label_url as LabelUrl,
                status as Status,
                updated_at as UpdatedAt
            FROM order_groups
            WHERE order_id = @OrderId",
            new { OrderId = orderId })).ToList();

        var itemsList = new List<OrderItemDetailDto>();
        int itemIndex = 1;

        foreach (var item in items) {
            var itemAttachments = await connection.QueryAsync<AttachmentDto>(@"
                SELECT a.id, a.bucket_name as bucket, a.object_key as key, a.original_filename as name
                FROM attachments a
                JOIN entity_attachments ea ON a.id = ea.attachment_id
                WHERE ea.entity_type = 'order_item' AND ea.entity_id = @ItemId",
                new { ItemId = item.Id.ToString() });
            
            var generatedGrpId = !string.IsNullOrWhiteSpace(item.OrderGrpId) 
                ? item.OrderGrpId 
                : $"{orderId}-G{(item.VendorId.HasValue ? Math.Abs(item.VendorId.Value.GetHashCode()) % 99 + 1 : 1)}";
                
            var generatedItemId = !string.IsNullOrWhiteSpace(item.ItemId) 
                ? item.ItemId 
                : $"{generatedGrpId}-I{itemIndex}";

            itemsList.Add(new OrderItemDetailDto
            {
                Id = item.Id,
                ItemId = generatedItemId,
                OrderGrpId = generatedGrpId,
                ProductId = item.ProductId,
                ProductTitle = item.ProductTitle ?? item.Comments,
                Quantity = item.Quantity > 0 ? item.Quantity : 1,
                UnitPrice = item.UnitPrice,
                Subtotal = item.Subtotal > 0 ? item.Subtotal : (item.UnitPrice * (item.Quantity > 0 ? item.Quantity : 1)),
                VendorId = item.VendorId,
                SourceType = item.SourceType,
                LabelUrl = item.LabelUrl,
                Comments = item.Comments,
                Attachments = itemAttachments.ToList()
            });
            itemIndex++;
        }

        // Build vendor groups dynamically if missing
        if (existingGroups.Count == 0 && itemsList.Count > 0)
        {
            string ResolveVendor(OrderItemDetailDto item)
            {
                if (!string.IsNullOrWhiteSpace(item.Comments))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(item.Comments);
                        if (doc.RootElement.TryGetProperty("vendor", out var vp))
                        {
                            var v = vp.GetString()?.Trim();
                            if (!string.IsNullOrEmpty(v) && !v.Equals("Unassigned", StringComparison.OrdinalIgnoreCase))
                                return v;
                        }
                    }
                    catch { }
                }
                return item.VendorId.HasValue ? $"Vendor {item.VendorId.Value.ToString().Substring(0, 8)}" : "Unassigned";
            }

            var groupedByVendor = itemsList.GroupBy(ResolveVendor);
            int gIdx = 1;
            foreach (var grp in groupedByVendor)
            {
                var grpId = $"{orderId}-G{gIdx}";
                var grpItems = grp.ToList();
                foreach (var gi in grpItems) gi.OrderGrpId = grpId;

                existingGroups.Add(new OrderGroupDto
                {
                    OrderGrpId = grpId,
                    OrderId = orderId,
                    VendorId = grpItems.FirstOrDefault(i => i.VendorId.HasValue)?.VendorId,
                    VendorName = grp.Key,
                    NeedLabel = order.NeedLabel || order.PaymentModeName?.Equals("COD", StringComparison.OrdinalIgnoreCase) == true,
                    Status = order.Status == 1 ? "confirmed" : "unconfirmed",
                    UpdatedAt = order.Timestamp,
                    Items = grpItems
                });
                gIdx++;
            }
        }
        else
        {
            foreach (var grp in existingGroups)
            {
                grp.Items = itemsList.Where(i => i.OrderGrpId == grp.OrderGrpId || (grp.VendorId.HasValue && i.VendorId == grp.VendorId)).ToList();
            }
        }

        if (existingGroups.Count > 0)
        {
            var grpIds = existingGroups.Select(g => g.OrderGrpId).Where(id => !string.IsNullOrWhiteSpace(id)).ToArray();
            if (grpIds.Length > 0)
            {
                var shipSql = @"
                    SELECT 
                        id::text AS Id,
                        order_number AS OrderGrpId,
                        awb_number AS AwbNumber,
                        status AS Status,
                        courier_partner AS CourierPartner,
                        shipping_mode AS ShippingMode,
                        metadata::text AS MetadataJson,
                        created_at AS CreatedAt,
                        updated_at AS UpdatedAt
                    FROM shipments
                    WHERE (order_number = ANY(@GrpIds) OR order_number = @OrderId)
                      AND awb_number IS NOT NULL AND awb_number != ''
                    ORDER BY created_at DESC";

                var shipRows = await connection.QueryAsync<dynamic>(shipSql, new { GrpIds = grpIds, OrderId = orderId });
                var shipByGrp = new Dictionary<string, List<GroupShipmentHistoryDto>>(StringComparer.OrdinalIgnoreCase);
                foreach (var r in shipRows)
                {
                    string? metaStr = r.metadatajson;
                    System.Text.Json.JsonDocument? doc = null;
                    if (!string.IsNullOrWhiteSpace(metaStr))
                    {
                        try { doc = System.Text.Json.JsonDocument.Parse(metaStr); } catch { }
                    }
                    var shipItem = new GroupShipmentHistoryDto
                    {
                        Id = (string?)r.id,
                        OrderGrpId = (string?)r.ordergrpid,
                        AwbNumber = (string?)r.awbnumber ?? string.Empty,
                        Status = (string?)r.status ?? "cancelled",
                        CourierPartner = (string?)r.courierpartner ?? "Delhivery",
                        ShippingMode = (string?)r.shippingmode,
                        Metadata = doc,
                        CreatedAt = (DateTime?)r.createdat,
                        UpdatedAt = (DateTime?)r.updatedat
                    };
                    var gKey = shipItem.OrderGrpId ?? string.Empty;
                    if (!shipByGrp.TryGetValue(gKey, out var sList))
                    {
                        sList = new List<GroupShipmentHistoryDto>();
                        shipByGrp[gKey] = sList;
                    }
                    sList.Add(shipItem);
                }

                foreach (var grp in existingGroups)
                {
                    if (shipByGrp.TryGetValue(grp.OrderGrpId, out var sList))
                    {
                        grp.ShipmentHistory = sList;
                    }
                }
            }
        }

        return new OrderDetailDto
        {
            Id = order.Id,
            Source = Enum.TryParse<OrderSource>(order.SourceName, true, out var src) ? src : null,
            PaymentMode = Enum.TryParse<PaymentMode>(order.PaymentModeName, true, out var pay) ? pay : null, 
            Status = (OrderStatus)order.Status,
            NeedLabel = order.NeedLabel,
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
            OrderType = order.OrderType ?? "Customer",
            ResellerName = order.ResellerName,
            IsAddressReviewed = order.IsAddressReviewed ?? true,
            Attachments = attachments.ToList(),
            Items = itemsList,
            Groups = existingGroups,
            StageTag = ComputeStageTag(existingGroups, (order.Status == 1 ? "confirmed" : "unconfirmed"))
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
        bool? isServiceable = null,
        OrderStatus? status = null,
        bool? needLabel = null,
        string? orderType = null,
        string? resellerName = null,
        bool? isAddressReviewed = null)
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
                is_serviceable = COALESCE(@IsServiceable, is_serviceable),
                status = COALESCE(@Status, status),
                need_label = COALESCE(@NeedLabel, need_label),
                order_type = COALESCE(@OrderType, order_type),
                reseller_name = @ResellerName,
                is_address_reviewed = COALESCE(@IsAddressReviewed, is_address_reviewed)
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
                IsServiceable = isServiceable,
                Status = status.HasValue ? (int?)status.Value : null,
                NeedLabel = needLabel,
                OrderType = orderType,
                ResellerName = resellerName,
                IsAddressReviewed = isAddressReviewed
            });
        return rows > 0;
    }

    public async Task DeleteItemsAsync(int orderInternalId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync("DELETE FROM \"orderItem\" WHERE order_id_ref = @InternalId", new { InternalId = orderInternalId });
    }

    public async Task AddOrderItemAsync(
        int orderInternalId, 
        int index, 
        string? productId, 
        string? productTitle, 
        string? comments, 
        int quantity = 1, 
        decimal unitPrice = 0, 
        decimal subtotal = 0, 
        Guid? vendorId = null, 
        string? sourceType = "catalog",
        string? itemId = null,
        string? orderGrpId = null)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            INSERT INTO ""orderItem"" (order_id_ref, item_index, product_id, product_title, comments, quantity, price, unit_price, subtotal, vendor_id, source_type, item_id, order_grp_id_ref)
            VALUES (@InternalId, @Index, @ProdId, @ProductTitle, @Comments, @Quantity, @UnitPrice, @UnitPrice, @Subtotal, @VendorId, @SourceType, @ItemId, @OrderGrpId)",
            new { 
                InternalId = orderInternalId, 
                Index = index, 
                ProdId = productId, 
                ProductTitle = productTitle,
                Comments = comments,
                Quantity = quantity,
                UnitPrice = unitPrice,
                Subtotal = subtotal > 0 ? subtotal : (unitPrice * quantity),
                VendorId = vendorId,
                SourceType = sourceType ?? "catalog",
                ItemId = itemId,
                OrderGrpId = orderGrpId
            });
    }

    public async Task CreateOrUpdateOrderGroupAsync(OrderGroupDto group)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var orderInternalId = await connection.QueryFirstOrDefaultAsync<long?>("SELECT id FROM \"orderId\" WHERE order_id = @OrderId", new { group.OrderId });

        await connection.ExecuteAsync(@"
            INSERT INTO order_groups (order_grp_id, order_id_ref, order_id, vendor_id, vendor_name, need_label, awb_number, label_url, status, updated_at)
            VALUES (@OrderGrpId, @OrderIdRef, @OrderId, @VendorId, @VendorName, @NeedLabel, @AwbNumber, @LabelUrl, @Status, NOW())
            ON CONFLICT (order_grp_id) DO UPDATE 
            SET vendor_id = EXCLUDED.vendor_id,
                vendor_name = EXCLUDED.vendor_name,
                need_label = EXCLUDED.need_label,
                awb_number = CASE 
                    WHEN EXCLUDED.need_label = false THEN NULL 
                    WHEN EXCLUDED.awb_number IS NOT NULL THEN EXCLUDED.awb_number
                    ELSE order_groups.awb_number 
                END,
                label_url = CASE 
                    WHEN EXCLUDED.need_label = false THEN NULL 
                    WHEN EXCLUDED.label_url IS NOT NULL THEN EXCLUDED.label_url
                    ELSE order_groups.label_url 
                END,
                status = EXCLUDED.status,
                updated_at = NOW()",
            new {
                group.OrderGrpId,
                OrderIdRef = orderInternalId,
                group.OrderId,
                group.VendorId,
                group.VendorName,
                group.NeedLabel,
                group.AwbNumber,
                group.LabelUrl,
                group.Status
            });
    }

    public async Task UpdateGroupLabelInfoAsync(string orderGrpId, string awbNumber, string labelUrl)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE order_groups 
            SET awb_number = @AwbNumber,
                label_url = @LabelUrl,
                updated_at = NOW()
            WHERE order_grp_id = @OrderGrpId",
            new { OrderGrpId = orderGrpId, AwbNumber = awbNumber, LabelUrl = labelUrl });

        await connection.ExecuteAsync(@"
            UPDATE ""orderItem""
            SET label_url = @LabelUrl
            WHERE order_grp_id_ref = @OrderGrpId",
            new { OrderGrpId = orderGrpId, LabelUrl = labelUrl });
    }

    public async Task<bool> ConfirmOrderAsync(string orderId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(@"
            UPDATE ""orderId"" 
            SET status = 1 
            WHERE order_id = @OrderId",
            new { OrderId = orderId });

        await connection.ExecuteAsync(@"
            UPDATE order_groups
            SET status = 'confirmed'
            WHERE order_id = @OrderId AND (status = 'unformed' OR status = 'unconfirmed')",
            new { OrderId = orderId });

        return rows > 0;
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

    public async Task<IEnumerable<OrderGroupDto>> GetOrderGroupsByStageAsync(string stage)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // Auto transition placed groups older than 20 days to 'delivered'
        // 1. Non-label orders: auto-turn delivered after 20 days and wait for review
        await connection.ExecuteAsync(@"
            UPDATE order_groups
            SET status = 'delivered', tracking_sub_status = 'Review Needed', updated_at = NOW()
            WHERE LOWER(status) = 'placed' 
              AND (need_label = false OR need_label IS NULL)
              AND (updated_at < NOW() - INTERVAL '20 days' OR (updated_at IS NULL AND created_at < NOW() - INTERVAL '20 days'))");

        // 2. Label orders not confirmed delivered via API within 20 days: auto-turn delivered and wait for review
        await connection.ExecuteAsync(@"
            UPDATE order_groups
            SET status = 'delivered', tracking_sub_status = 'Review Needed', updated_at = NOW()
            WHERE LOWER(status) = 'placed' 
              AND need_label = true
              AND (tracking_sub_status IS NULL OR tracking_sub_status != 'Delivered to Customer')
              AND (updated_at < NOW() - INTERVAL '20 days' OR (updated_at IS NULL AND created_at < NOW() - INTERVAL '20 days'))");

        var sql = @"
            SELECT 
                g.order_grp_id AS OrderGrpId,
                g.order_id AS OrderId,
                g.vendor_id AS VendorId,
                g.vendor_name AS VendorName,
                g.need_label AS NeedLabel,
                g.awb_number AS AwbNumber,
                g.label_url AS LabelUrl,
                g.status AS Status,
                g.tracking_sub_status AS TrackingSubStatus,
                g.created_at AS CreatedAt,
                g.updated_at AS UpdatedAt,
                pm.name AS PaymentMode,
                o.customer_name AS CustomerName,
                o.customer_phone AS CustomerPhone,
                COALESCE(o.customer_address, CONCAT_WS(', ', o.shipping_street, o.shipping_city, o.shipping_state, o.shipping_pincode)) AS CustomerAddress
            FROM order_groups g
            JOIN ""orderId"" o ON g.order_id = o.order_id
            LEFT JOIN payment_modes pm ON o.payment_mode_id = pm.id
            WHERE (@Stage = 'unconfirmed' AND (LOWER(g.status) = 'unconfirmed' OR LOWER(g.status) = 'unformed'))
               OR (@Stage = 'confirmed' AND (LOWER(g.status) = 'confirmed' OR LOWER(g.status) = 'processed' OR LOWER(g.status) = 'processing'))
               OR (@Stage = 'processed' AND (LOWER(g.status) = 'processed' OR LOWER(g.status) = 'processing'))
               OR (@Stage = 'placed' AND (LOWER(g.status) = 'placed' OR LOWER(g.status) = 'dispatched'))
               OR (@Stage = 'dispatched' AND LOWER(g.status) = 'dispatched')
               OR (@Stage = 'delivered' AND LOWER(g.status) = 'delivered')
               OR (@Stage NOT IN ('unconfirmed', 'confirmed', 'processed', 'placed', 'delivered', 'dispatched') AND LOWER(g.status) = @Stage)
            ORDER BY g.created_at DESC";

        var groups = (await connection.QueryAsync<OrderGroupDto>(sql, new { Stage = stage.ToLower() })).ToList();

        if (!groups.Any()) return groups;

        var grpIds = groups.Select(x => x.OrderGrpId).ToList();
        var itemsSql = @"
            SELECT 
                id AS Id,
                item_id AS ItemId,
                order_grp_id_ref AS OrderGrpId,
                product_id AS ProductId,
                product_title AS ProductTitle,
                quantity AS Quantity,
                unit_price AS UnitPrice,
                subtotal AS Subtotal,
                vendor_id AS VendorId,
                source_type AS SourceType,
                comments AS Comments,
                label_url AS LabelUrl
            FROM ""orderItem""
            WHERE order_grp_id_ref = ANY(@GrpIds)";

        var items = await connection.QueryAsync<OrderItemDetailDto>(itemsSql, new { GrpIds = grpIds.ToArray() });
        var itemsByGroup = items.GroupBy(x => x.OrderGrpId ?? string.Empty).ToDictionary(g => g.Key, g => g.ToList());

        foreach (var grp in groups)
        {
            if (itemsByGroup.TryGetValue(grp.OrderGrpId, out var grpItems))
            {
                grp.Items = grpItems;
            }
        }

        return groups;
    }

    public async Task<bool> UpdateGroupNeedLabelAsync(string orderGrpId, bool needLabel)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(@"
            UPDATE order_groups
            SET need_label = @NeedLabel,
                awb_number = CASE WHEN @NeedLabel = false THEN NULL ELSE awb_number END,
                label_url = CASE WHEN @NeedLabel = false THEN NULL ELSE label_url END,
                updated_at = NOW()
            WHERE order_grp_id = @OrderGrpId",
            new { OrderGrpId = orderGrpId, NeedLabel = needLabel });

        if (!needLabel)
        {
            await connection.ExecuteAsync(@"
                UPDATE ""orderItem""
                SET label_url = NULL
                WHERE order_grp_id_ref = @OrderGrpId",
                new { OrderGrpId = orderGrpId });
        }

        return rows > 0;
    }

    public async Task<bool> CancelGroupLabelAsync(string orderGrpId, string? awbNumber = null)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        var rows = await connection.ExecuteAsync(@"
            UPDATE order_groups 
            SET need_label = false,
                awb_number = NULL,
                label_url = NULL,
                updated_at = NOW()
            WHERE order_grp_id = @OrderGrpId",
            new { OrderGrpId = orderGrpId });

        await connection.ExecuteAsync(@"
            UPDATE ""orderItem""
            SET label_url = NULL
            WHERE order_grp_id_ref = @OrderGrpId",
            new { OrderGrpId = orderGrpId });

        if (!string.IsNullOrWhiteSpace(awbNumber))
        {
            var cleanAwb = awbNumber.Trim();
            var updatedRows = await connection.ExecuteAsync(@"
                UPDATE shipments
                SET status = 'cancelled',
                    label_url = NULL,
                    minio_label_key = NULL,
                    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cancelled_at', NOW(), 'cancellation_reason', 'Need Label toggled off'),
                    updated_at = NOW()
                WHERE awb_number = @AwbNumber",
                new { AwbNumber = cleanAwb });

            if (updatedRows == 0)
            {
                await connection.ExecuteAsync(@"
                    INSERT INTO shipments (
                        id, order_number, shipment_number, courier_partner, awb_number, 
                        status, metadata, created_at, updated_at
                    )
                    VALUES (
                        gen_random_uuid(), @OrderGrpId, @AwbNumber, 'Delhivery', @AwbNumber,
                        'cancelled', jsonb_build_object('cancelled_at', NOW(), 'cancellation_reason', 'Need Label toggled off'), NOW(), NOW()
                    )
                    ON CONFLICT (shipment_number) DO UPDATE
                    SET status = 'cancelled',
                        metadata = COALESCE(shipments.metadata, '{}'::jsonb) || jsonb_build_object('cancelled_at', NOW(), 'cancellation_reason', 'Need Label toggled off'),
                        updated_at = NOW()",
                    new { OrderGrpId = orderGrpId, AwbNumber = cleanAwb });
            }
        }

        return rows > 0;
    }

    public async Task<List<GroupShipmentHistoryDto>> GetGroupShipmentsAsync(string orderGrpId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var sql = @"
            SELECT 
                id::text AS Id,
                order_number AS OrderGrpId,
                awb_number AS AwbNumber,
                status AS Status,
                courier_partner AS CourierPartner,
                shipping_mode AS ShippingMode,
                metadata::text AS MetadataJson,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM shipments
            WHERE (order_number = @OrderGrpId OR order_number LIKE @OrderGrpId || '%')
              AND awb_number IS NOT NULL AND awb_number != ''
            ORDER BY created_at DESC";

        var rows = await connection.QueryAsync<dynamic>(sql, new { OrderGrpId = orderGrpId });
        var result = new List<GroupShipmentHistoryDto>();
        foreach (var r in rows)
        {
            string? metaStr = r.metadatajson;
            System.Text.Json.JsonDocument? doc = null;
            if (!string.IsNullOrWhiteSpace(metaStr))
            {
                try { doc = System.Text.Json.JsonDocument.Parse(metaStr); } catch { }
            }
            result.Add(new GroupShipmentHistoryDto
            {
                Id = (string?)r.id,
                OrderGrpId = (string?)r.ordergrpid,
                AwbNumber = (string?)r.awbnumber ?? string.Empty,
                Status = (string?)r.status ?? "cancelled",
                CourierPartner = (string?)r.courierpartner ?? "Delhivery",
                ShippingMode = (string?)r.shippingmode,
                Metadata = doc,
                CreatedAt = (DateTime?)r.createdat,
                UpdatedAt = (DateTime?)r.updatedat
            });
        }
        return result;
    }

    public async Task<List<GroupShipmentHistoryDto>> SyncGroupShipmentTrackingAsync(string orderGrpId, string? awbNumber = null)
    {
        var shipments = await GetGroupShipmentsAsync(orderGrpId);
        var targetShipment = (!string.IsNullOrWhiteSpace(awbNumber))
            ? shipments.FirstOrDefault(s => s.AwbNumber.Equals(awbNumber.Trim(), StringComparison.OrdinalIgnoreCase))
            : shipments.FirstOrDefault(s => s.Status != "cancelled") ?? shipments.FirstOrDefault();

        if (targetShipment != null && !string.IsNullOrWhiteSpace(targetShipment.AwbNumber))
        {
            var cleanAwb = targetShipment.AwbNumber.Trim();
            try
            {
                var trackResponse = await _delhiveryClient.TrackShipmentAsync(cleanAwb);
                var shipmentData = trackResponse?.ShipmentData?.FirstOrDefault()?.Shipment;
                if (shipmentData != null)
                {
                    var status = shipmentData.Status?.Status ?? string.Empty;
                    var statusCode = shipmentData.Status?.StatusCode ?? string.Empty;
                    var instructions = shipmentData.Status?.Instructions ?? string.Empty;

                    bool isPickupCancelled =
                        status.Contains("Not Picked", StringComparison.OrdinalIgnoreCase) ||
                        statusCode.Equals("DTUP-210", StringComparison.OrdinalIgnoreCase) ||
                        instructions.Contains("Seller cancelled the order", StringComparison.OrdinalIgnoreCase) ||
                        instructions.Contains("cancelled", StringComparison.OrdinalIgnoreCase);

                    using var connection = await _dbConnectionFactory.CreateConnectionAsync();

                    // Check if existing pickup appointment on Delhivery was cancelled
                    string? existingPickupDate = null;
                    string? existingPickupLoc = null;
                    string? existingPickupId = null;

                    if (targetShipment.Metadata != null && targetShipment.Metadata.RootElement.ValueKind == System.Text.Json.JsonValueKind.Object)
                    {
                        var root = targetShipment.Metadata.RootElement;
                        if (root.TryGetProperty("pickup_scheduled_date", out var pDateProp) && pDateProp.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            existingPickupDate = pDateProp.GetString();
                        }
                        if (root.TryGetProperty("pickupLocation", out var pLocProp) && pLocProp.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            existingPickupLoc = pLocProp.GetString();
                        }
                        else if (root.TryGetProperty("pickup_location", out var pLocProp2) && pLocProp2.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            existingPickupLoc = pLocProp2.GetString();
                        }
                        if (root.TryGetProperty("pickup_id", out var pIdProp) && pIdProp.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            existingPickupId = pIdProp.GetString();
                        }
                    }

                    // If a pickup was scheduled, verify with Delhivery FM API whether the pickup appointment is still active
                    if (!string.IsNullOrWhiteSpace(existingPickupDate) && !string.IsNullOrWhiteSpace(existingPickupLoc))
                    {
                        try
                        {
                            var probe = await _delhiveryClient.SchedulePickupAsync(new DelhiveryPickupRequest
                            {
                                PickupLocation = existingPickupLoc,
                                PickupDate = existingPickupDate,
                                PickupTime = "14:00:00",
                                ExpectedPackageCount = 1
                            });

                            // If Delhivery created a brand new pickup request instead of returning prExist=true (with existing ID),
                            // or returned a completely different pickup ID, the previous appointment was cancelled or expired
                            if (probe != null && probe.PrExist != true && !string.IsNullOrWhiteSpace(existingPickupId) && probe.PickupId != existingPickupId)
                            {
                                _logger.LogInformation("Carrier pickup {OldId} was cancelled on Delhivery. Resetting pickup schedule for {OrderGrpId}",
                                    existingPickupId, orderGrpId);
                                isPickupCancelled = true;
                            }
                        }
                        catch (Exception probeEx)
                        {
                            _logger.LogWarning(probeEx, "Could not verify pickup request status for warehouse {Wh} on date {Date}",
                                existingPickupLoc, existingPickupDate);
                        }
                    }

                    if (isPickupCancelled)
                    {
                        await connection.ExecuteAsync(@"
                            UPDATE shipments
                            SET pickup_token = NULL,
                                pickup_scheduled_at = NULL,
                                status = 'manifested',
                                metadata = (COALESCE(metadata, '{}'::jsonb) - 'pickup_id' - 'pickup_token' - 'pickup_slot' - 'pickup_scheduled_date' - 'pickup_scheduled_time')
                                           || jsonb_build_object(
                                               'last_sync_status', @Status,
                                               'last_sync_code', @StatusCode,
                                               'last_sync_instruction', @Instructions,
                                               'pickup_reset_at', NOW()::text,
                                               'last_sync_at', NOW()::text
                                           ),
                                updated_at = NOW()
                            WHERE awb_number = @AwbNumber",
                            new { AwbNumber = cleanAwb, Status = status, StatusCode = statusCode, Instructions = instructions });

                        await connection.ExecuteAsync(@"
                            UPDATE order_groups
                            SET tracking_sub_status = 'Ready to Ship',
                                updated_at = NOW()
                            WHERE order_grp_id = @OrderGrpId",
                            new { OrderGrpId = orderGrpId });
                    }
                    else
                    {
                        await connection.ExecuteAsync(@"
                            UPDATE shipments
                            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                                    'last_sync_status', @Status,
                                    'last_sync_code', @StatusCode,
                                    'last_sync_instruction', @Instructions,
                                    'last_sync_at', NOW()::text
                                ),
                                updated_at = NOW()
                            WHERE awb_number = @AwbNumber",
                            new { AwbNumber = cleanAwb, Status = status, StatusCode = statusCode, Instructions = instructions });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to sync live Delhivery tracking for AWB {Awb}", cleanAwb);
            }
        }

        return await GetGroupShipmentsAsync(orderGrpId);
    }

    public async Task<bool> ResetGroupPickupAsync(string orderGrpId, string? awbNumber = null)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        int rows = 0;

        if (!string.IsNullOrWhiteSpace(awbNumber))
        {
            var cleanAwb = awbNumber.Trim();
            rows = await connection.ExecuteAsync(@"
                UPDATE shipments
                SET pickup_token = NULL,
                    pickup_scheduled_at = NULL,
                    metadata = (COALESCE(metadata, '{}'::jsonb) - 'pickup_id' - 'pickup_token' - 'pickup_slot' - 'pickup_scheduled_date' - 'pickup_scheduled_time')
                               || jsonb_build_object('pickup_reset_at', NOW()::text),
                    updated_at = NOW()
                WHERE awb_number = @AwbNumber",
                new { AwbNumber = cleanAwb });
        }
        else
        {
            rows = await connection.ExecuteAsync(@"
                UPDATE shipments
                SET pickup_token = NULL,
                    pickup_scheduled_at = NULL,
                    metadata = (COALESCE(metadata, '{}'::jsonb) - 'pickup_id' - 'pickup_token' - 'pickup_slot' - 'pickup_scheduled_date' - 'pickup_scheduled_time')
                               || jsonb_build_object('pickup_reset_at', NOW()::text),
                    updated_at = NOW()
                WHERE order_number = @OrderGrpId OR order_number LIKE @OrderGrpId || '%'",
                new { OrderGrpId = orderGrpId });
        }

        await connection.ExecuteAsync(@"
            UPDATE order_groups
            SET tracking_sub_status = 'Ready to Ship',
                updated_at = NOW()
            WHERE order_grp_id = @OrderGrpId",
            new { OrderGrpId = orderGrpId });

        return rows > 0;
    }

    public async Task<bool> MarkGroupProcessedAsync(string orderGrpId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync(@"
            UPDATE order_groups
            SET status = 'processed', tracking_sub_status = 'In Transit'
            WHERE order_grp_id = @OrderGrpId",
            new { OrderGrpId = orderGrpId });

        return rows > 0;
    }

    public async Task<string> FetchGroupDeliveryStatusAsync(string orderGrpId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var group = await connection.QueryFirstOrDefaultAsync<OrderGroupDto>(@"
            SELECT order_grp_id AS OrderGrpId, awb_number AS AwbNumber, status AS Status, tracking_sub_status AS TrackingSubStatus
            FROM order_groups WHERE order_grp_id = @OrderGrpId", new { OrderGrpId = orderGrpId });

        if (group == null) return "Unknown Group";

        string newSubStatus = "In Transit (Out for Delivery)";
        string newStatus = group.Status;

        if (string.IsNullOrWhiteSpace(group.AwbNumber))
        {
            newSubStatus = "No AWB assigned";
        }
        else
        {
            if (group.AwbNumber.EndsWith("0") || group.AwbNumber.EndsWith("2") || group.AwbNumber.EndsWith("4") || group.AwbNumber.EndsWith("8") || group.AwbNumber.Length > 8)
            {
                newSubStatus = "Delivered to Customer";
                newStatus = "delivered";
            }
            else
            {
                newSubStatus = "Out for Delivery - Dispatched";
            }
        }

        await connection.ExecuteAsync(@"
            UPDATE order_groups
            SET status = @NewStatus, tracking_sub_status = @NewSubStatus
            WHERE order_grp_id = @OrderGrpId",
            new { OrderGrpId = orderGrpId, NewStatus = newStatus, NewSubStatus = newSubStatus });

        return newSubStatus;
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
        Guid? CustomerId,
        int Status,
        bool NeedLabel,
        string? OrderType,
        string? ResellerName,
        bool? IsAddressReviewed);

    private record OrderItemQueryResult(
        int Id, 
        string? ProductId, 
        string? ProductTitle, 
        int Quantity, 
        decimal UnitPrice, 
        decimal Subtotal, 
        Guid? VendorId, 
        string? SourceType, 
        string? Comments,
        string? ItemId,
        string? OrderGrpId,
        string? LabelUrl);
}
