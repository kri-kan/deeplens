using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Domain.Entities.Logistics;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Persistence.Repositories.Logistics;

public class LogisticsRepository : ILogisticsRepository
{
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly ILogger<LogisticsRepository> _logger;
    private static bool _schemaEnsured = false;
    private static readonly object _lock = new();

    public LogisticsRepository(IDbConnectionFactory dbConnectionFactory, ILogger<LogisticsRepository> logger)
    {
        _dbConnectionFactory = dbConnectionFactory;
        _logger = logger;
        EnsureSchema();
    }

    private void EnsureSchema()
    {
        if (_schemaEnsured) return;
        lock (_lock)
        {
            if (_schemaEnsured) return;
            try
            {
                using var connection = _dbConnectionFactory.CreateConnectionAsync().GetAwaiter().GetResult();
                connection.Execute(@"
                    CREATE TABLE IF NOT EXISTS public.warehouses (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name TEXT NOT NULL,
                        code TEXT NOT NULL UNIQUE,
                        address_line1 TEXT,
                        address_line2 TEXT,
                        city TEXT,
                        state TEXT,
                        pincode TEXT,
                        phone TEXT,
                        contact_person TEXT,
                        is_central BOOLEAN NOT NULL DEFAULT false,
                        is_active BOOLEAN NOT NULL DEFAULT true,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS public.vendor_logistics_configs (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        vendor_id UUID,
                        vendor_name TEXT,
                        fulfillment_mode TEXT NOT NULL DEFAULT 'direct_dispatch',
                        return_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
                        default_pickup_pincode TEXT,
                        auto_manifest BOOLEAN NOT NULL DEFAULT false,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS public.shipments (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        order_id UUID,
                        order_number TEXT,
                        shipment_number TEXT UNIQUE,
                        warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
                        courier_partner TEXT,
                        awb_number TEXT,
                        status TEXT NOT NULL DEFAULT 'pending',
                        shipping_mode TEXT DEFAULT 'Surface',
                        fulfillment_type TEXT DEFAULT 'direct_dispatch',
                        cod_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                        label_url TEXT,
                        minio_label_key TEXT,
                        pickup_scheduled_at TIMESTAMPTZ,
                        pickup_token TEXT,
                        estimated_delivery_date TIMESTAMPTZ,
                        vendor_name TEXT,
                        vendor_tracking_url TEXT,
                        customer_notified_at TIMESTAMPTZ,
                        procure_status TEXT DEFAULT 'not_applicable',
                        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS public.shipment_items (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
                        order_item_id UUID,
                        product_id UUID,
                        product_name TEXT,
                        sku TEXT,
                        quantity INT NOT NULL DEFAULT 1,
                        unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS public.ndr_tasks (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
                        awb_number TEXT,
                        ndr_reason TEXT,
                        ndr_code TEXT,
                        customer_phone TEXT,
                        customer_feedback TEXT,
                        action_status TEXT NOT NULL DEFAULT 'open',
                        chosen_action TEXT,
                        reattempt_date TIMESTAMPTZ,
                        remarks TEXT,
                        dispatched_to_delhivery BOOLEAN NOT NULL DEFAULT false,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS public.shipping_escalations (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
                        awb_number TEXT,
                        issue_type TEXT NOT NULL,
                        description TEXT,
                        status TEXT NOT NULL DEFAULT 'open',
                        external_ticket_id TEXT,
                        resolution_notes TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        resolved_at TIMESTAMPTZ
                    );

                    INSERT INTO public.warehouses (id, name, code, address_line1, address_line2, city, state, pincode, phone, contact_person, is_central, is_active, created_at)
                    VALUES (
                        'a0000000-0000-0000-0000-000000000001',
                        'Vayyari Central Hub',
                        'VAY-CENTRAL-01',
                        'Plot 42, Vayyari Logistics Park, Industrial Area Phase 2',
                        'Bhatar Road',
                        'Surat',
                        'Gujarat',
                        '395002',
                        '+91-9876543210',
                        'Operations Lead',
                        true,
                        true,
                        NOW()
                    )
                    ON CONFLICT (code) DO NOTHING;
                ");
                _schemaEnsured = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not verify/initialize logistics schema tables at startup. Using database tables as-is.");
                _schemaEnsured = true;
            }
        }
    }

    // --- Warehouses ---

    public async Task<List<Warehouse>> GetAllWarehousesAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var result = await connection.QueryAsync<Warehouse>(@"
            SELECT 
                id, name, code, 
                address_line1 as AddressLine1, 
                address_line2 as AddressLine2, 
                city, state, pincode, phone, 
                contact_person as ContactPerson, 
                is_central as IsCentral, 
                is_active as IsActive, 
                created_at as CreatedAt
            FROM public.warehouses
            WHERE is_active = true
            ORDER BY is_central DESC, name ASC");

        return result.ToList();
    }

    public async Task<Warehouse?> GetWarehouseByIdAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Warehouse>(@"
            SELECT 
                id, name, code, 
                address_line1 as AddressLine1, 
                address_line2 as AddressLine2, 
                city, state, pincode, phone, 
                contact_person as ContactPerson, 
                is_central as IsCentral, 
                is_active as IsActive, 
                created_at as CreatedAt
            FROM public.warehouses
            WHERE id = @Id",
            new { Id = id });
    }

    public async Task<Warehouse?> GetCentralWarehouseAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QueryFirstOrDefaultAsync<Warehouse>(@"
            SELECT 
                id, name, code, 
                address_line1 as AddressLine1, 
                address_line2 as AddressLine2, 
                city, state, pincode, phone, 
                contact_person as ContactPerson, 
                is_central as IsCentral, 
                is_active as IsActive, 
                created_at as CreatedAt
            FROM public.warehouses
            WHERE is_central = true AND is_active = true
            LIMIT 1");
    }

    // --- Shipments ---

    public async Task<Shipment?> GetShipmentByIdAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var shipment = await connection.QuerySingleOrDefaultAsync<Shipment>(@"
            SELECT 
                id, 
                order_id as OrderId, 
                order_number as OrderNumber, 
                shipment_number as ShipmentNumber, 
                warehouse_id as WarehouseId, 
                courier_partner as CourierPartner, 
                awb_number as AwbNumber, 
                status, 
                shipping_mode as ShippingMode, 
                fulfillment_type as FulfillmentType, 
                cod_amount as CodAmount, 
                label_url as LabelUrl, 
                minio_label_key as MinioLabelKey, 
                pickup_scheduled_at as PickupScheduledAt, 
                pickup_token as PickupToken, 
                estimated_delivery_date as EstimatedDeliveryDate, 
                vendor_name as VendorName, 
                vendor_tracking_url as VendorTrackingUrl, 
                customer_notified_at as CustomerNotifiedAt, 
                procure_status as ProcureStatus, 
                metadata, 
                created_at as CreatedAt, 
                updated_at as UpdatedAt
            FROM public.shipments
            WHERE id = @Id",
            new { Id = id });

        if (shipment != null)
        {
            shipment.Items = await GetShipmentItemsAsync(shipment.Id);
        }

        return shipment;
    }

    public async Task<Shipment?> GetShipmentByAwbAsync(string awb)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var shipment = await connection.QueryFirstOrDefaultAsync<Shipment>(@"
            SELECT 
                id, 
                order_id as OrderId, 
                order_number as OrderNumber, 
                shipment_number as ShipmentNumber, 
                warehouse_id as WarehouseId, 
                courier_partner as CourierPartner, 
                awb_number as AwbNumber, 
                status, 
                shipping_mode as ShippingMode, 
                fulfillment_type as FulfillmentType, 
                cod_amount as CodAmount, 
                label_url as LabelUrl, 
                minio_label_key as MinioLabelKey, 
                pickup_scheduled_at as PickupScheduledAt, 
                pickup_token as PickupToken, 
                estimated_delivery_date as EstimatedDeliveryDate, 
                vendor_name as VendorName, 
                vendor_tracking_url as VendorTrackingUrl, 
                customer_notified_at as CustomerNotifiedAt, 
                procure_status as ProcureStatus, 
                metadata, 
                created_at as CreatedAt, 
                updated_at as UpdatedAt
            FROM public.shipments
            WHERE awb_number = @Awb",
            new { Awb = awb });

        if (shipment != null)
        {
            shipment.Items = await GetShipmentItemsAsync(shipment.Id);
        }

        return shipment;
    }

    public async Task<Shipment?> GetShipmentByOrderNumberAsync(string orderNumber)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var shipment = await connection.QueryFirstOrDefaultAsync<Shipment>(@"
            SELECT 
                id, 
                order_id as OrderId, 
                order_number as OrderNumber, 
                shipment_number as ShipmentNumber, 
                warehouse_id as WarehouseId, 
                courier_partner as CourierPartner, 
                awb_number as AwbNumber, 
                status, 
                shipping_mode as ShippingMode, 
                fulfillment_type as FulfillmentType, 
                cod_amount as CodAmount, 
                label_url as LabelUrl, 
                minio_label_key as MinioLabelKey, 
                pickup_scheduled_at as PickupScheduledAt, 
                pickup_token as PickupToken, 
                estimated_delivery_date as EstimatedDeliveryDate, 
                vendor_name as VendorName, 
                vendor_tracking_url as VendorTrackingUrl, 
                customer_notified_at as CustomerNotifiedAt, 
                procure_status as ProcureStatus, 
                metadata, 
                created_at as CreatedAt, 
                updated_at as UpdatedAt
            FROM public.shipments
            WHERE order_number = @OrderNumber
            ORDER BY created_at DESC
            LIMIT 1",
            new { OrderNumber = orderNumber });

        if (shipment != null)
        {
            shipment.Items = await GetShipmentItemsAsync(shipment.Id);
        }

        return shipment;
    }

    public async Task<List<Shipment>> GetShipmentsByOrderIdAsync(Guid orderId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var list = await connection.QueryAsync<Shipment>(@"
            SELECT 
                id, 
                order_id as OrderId, 
                order_number as OrderNumber, 
                shipment_number as ShipmentNumber, 
                warehouse_id as WarehouseId, 
                courier_partner as CourierPartner, 
                awb_number as AwbNumber, 
                status, 
                shipping_mode as ShippingMode, 
                fulfillment_type as FulfillmentType, 
                cod_amount as CodAmount, 
                label_url as LabelUrl, 
                minio_label_key as MinioLabelKey, 
                pickup_scheduled_at as PickupScheduledAt, 
                pickup_token as PickupToken, 
                estimated_delivery_date as EstimatedDeliveryDate, 
                vendor_name as VendorName, 
                vendor_tracking_url as VendorTrackingUrl, 
                customer_notified_at as CustomerNotifiedAt, 
                procure_status as ProcureStatus, 
                metadata, 
                created_at as CreatedAt, 
                updated_at as UpdatedAt
            FROM public.shipments
            WHERE order_id = @OrderId
            ORDER BY created_at DESC",
            new { OrderId = orderId });

        var shipments = list.ToList();
        foreach (var shp in shipments)
        {
            shp.Items = await GetShipmentItemsAsync(shp.Id);
        }

        return shipments;
    }

    public async Task<Guid> CreateShipmentAsync(Shipment shipment)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var id = await connection.QuerySingleAsync<Guid>(@"
            INSERT INTO public.shipments (
                id, order_id, order_number, shipment_number, warehouse_id, 
                courier_partner, awb_number, status, shipping_mode, fulfillment_type, 
                cod_amount, label_url, minio_label_key, pickup_scheduled_at, pickup_token, 
                estimated_delivery_date, vendor_name, vendor_tracking_url, customer_notified_at, 
                procure_status, metadata, created_at, updated_at
            )
            VALUES (
                @Id, @OrderId, @OrderNumber, @ShipmentNumber, @WarehouseId, 
                @CourierPartner, @AwbNumber, @Status, @ShippingMode, @FulfillmentType, 
                @CodAmount, @LabelUrl, @MinioLabelKey, @PickupScheduledAt, @PickupToken, 
                @EstimatedDeliveryDate, @VendorName, @VendorTrackingUrl, @CustomerNotifiedAt, 
                @ProcureStatus, @Metadata::jsonb, @CreatedAt, @UpdatedAt
            )
            RETURNING id",
            new
            {
                shipment.Id,
                shipment.OrderId,
                shipment.OrderNumber,
                shipment.ShipmentNumber,
                shipment.WarehouseId,
                shipment.CourierPartner,
                shipment.AwbNumber,
                shipment.Status,
                shipment.ShippingMode,
                shipment.FulfillmentType,
                shipment.CodAmount,
                shipment.LabelUrl,
                shipment.MinioLabelKey,
                shipment.PickupScheduledAt,
                shipment.PickupToken,
                shipment.EstimatedDeliveryDate,
                shipment.VendorName,
                shipment.VendorTrackingUrl,
                shipment.CustomerNotifiedAt,
                shipment.ProcureStatus,
                Metadata = string.IsNullOrWhiteSpace(shipment.Metadata) ? "{}" : shipment.Metadata,
                shipment.CreatedAt,
                shipment.UpdatedAt
            });

        if (shipment.Items != null && shipment.Items.Count > 0)
        {
            foreach (var item in shipment.Items)
            {
                item.ShipmentId = id;
            }
            await AddShipmentItemsAsync(shipment.Items);
        }

        return id;
    }

    public async Task UpdateShipmentAsync(Shipment shipment)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE public.shipments SET
                warehouse_id = @WarehouseId,
                courier_partner = @CourierPartner,
                awb_number = @AwbNumber,
                status = @Status,
                shipping_mode = @ShippingMode,
                fulfillment_type = @FulfillmentType,
                cod_amount = @CodAmount,
                label_url = @LabelUrl,
                minio_label_key = @MinioLabelKey,
                pickup_scheduled_at = @PickupScheduledAt,
                pickup_token = @PickupToken,
                estimated_delivery_date = @EstimatedDeliveryDate,
                vendor_name = @VendorName,
                vendor_tracking_url = @VendorTrackingUrl,
                customer_notified_at = @CustomerNotifiedAt,
                procure_status = @ProcureStatus,
                metadata = @Metadata::jsonb,
                updated_at = NOW()
            WHERE id = @Id",
            new
            {
                shipment.Id,
                shipment.WarehouseId,
                shipment.CourierPartner,
                shipment.AwbNumber,
                shipment.Status,
                shipment.ShippingMode,
                shipment.FulfillmentType,
                shipment.CodAmount,
                shipment.LabelUrl,
                shipment.MinioLabelKey,
                shipment.PickupScheduledAt,
                shipment.PickupToken,
                shipment.EstimatedDeliveryDate,
                shipment.VendorName,
                shipment.VendorTrackingUrl,
                shipment.CustomerNotifiedAt,
                shipment.ProcureStatus,
                Metadata = string.IsNullOrWhiteSpace(shipment.Metadata) ? "{}" : shipment.Metadata
            });
    }

    public async Task UpdateShipmentStatusAsync(Guid id, string status, string? awbNumber = null, string? labelUrl = null, string? minioKey = null)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE public.shipments SET
                status = @Status,
                awb_number = COALESCE(@AwbNumber, awb_number),
                label_url = COALESCE(@LabelUrl, label_url),
                minio_label_key = COALESCE(@MinioKey, minio_label_key),
                updated_at = NOW()
            WHERE id = @Id",
            new { Id = id, Status = status, AwbNumber = awbNumber, LabelUrl = labelUrl, MinioKey = minioKey });
    }

    public async Task UpdateProcureStatusAsync(Guid id, string procureStatus)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE public.shipments SET
                procure_status = @ProcureStatus,
                updated_at = NOW()
            WHERE id = @Id",
            new { Id = id, ProcureStatus = procureStatus });
    }

    public async Task UpdateVendorTrackingAsync(Guid id, string courierPartner, string awbNumber, string? trackingUrl, DateTime? edd)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE public.shipments SET
                courier_partner = @CourierPartner,
                awb_number = @AwbNumber,
                vendor_tracking_url = @TrackingUrl,
                estimated_delivery_date = COALESCE(@Edd, estimated_delivery_date),
                status = 'in_transit',
                updated_at = NOW()
            WHERE id = @Id",
            new { Id = id, CourierPartner = courierPartner, AwbNumber = awbNumber, TrackingUrl = trackingUrl, Edd = edd });
    }

    public async Task RecordCustomerNotifiedAsync(Guid id, DateTime timestamp)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE public.shipments SET
                customer_notified_at = @Timestamp,
                updated_at = NOW()
            WHERE id = @Id",
            new { Id = id, Timestamp = timestamp });
    }

    // --- Shipment Items ---

    public async Task AddShipmentItemsAsync(IEnumerable<ShipmentItem> items)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            INSERT INTO public.shipment_items (id, shipment_id, order_item_id, product_id, product_name, sku, quantity, unit_price, created_at)
            VALUES (@Id, @ShipmentId, @OrderItemId, @ProductId, @ProductName, @Sku, @Quantity, @UnitPrice, @CreatedAt)",
            items);
    }

    public async Task<List<ShipmentItem>> GetShipmentItemsAsync(Guid shipmentId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var items = await connection.QueryAsync<ShipmentItem>(@"
            SELECT 
                id, 
                shipment_id as ShipmentId, 
                order_item_id as OrderItemId, 
                product_id as ProductId, 
                product_name as ProductName, 
                sku, 
                quantity, 
                unit_price as UnitPrice, 
                created_at as CreatedAt
            FROM public.shipment_items
            WHERE shipment_id = @ShipmentId",
            new { ShipmentId = shipmentId });

        return items.ToList();
    }

    // --- NDR Tasks ---

    public async Task<Guid> CreateNdrTaskAsync(NdrTask task)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleAsync<Guid>(@"
            INSERT INTO public.ndr_tasks (
                id, shipment_id, awb_number, ndr_reason, ndr_code, 
                customer_phone, customer_feedback, action_status, chosen_action, 
                reattempt_date, remarks, dispatched_to_delhivery, created_at, updated_at
            )
            VALUES (
                @Id, @ShipmentId, @AwbNumber, @NdrReason, @NdrCode, 
                @CustomerPhone, @CustomerFeedback, @ActionStatus, @ChosenAction, 
                @ReattemptDate, @Remarks, @DispatchedToDelhivery, @CreatedAt, @UpdatedAt
            )
            RETURNING id",
            task);
    }

    public async Task<NdrTask?> GetNdrTaskByIdAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<NdrTask>(@"
            SELECT 
                id, 
                shipment_id as ShipmentId, 
                awb_number as AwbNumber, 
                ndr_reason as NdrReason, 
                ndr_code as NdrCode, 
                customer_phone as CustomerPhone, 
                customer_feedback as CustomerFeedback, 
                action_status as ActionStatus, 
                chosen_action as ChosenAction, 
                reattempt_date as ReattemptDate, 
                remarks, 
                dispatched_to_delhivery as DispatchedToDelhivery, 
                created_at as CreatedAt, 
                updated_at as UpdatedAt
            FROM public.ndr_tasks
            WHERE id = @Id",
            new { Id = id });
    }

    public async Task<NdrTask?> GetOpenNdrTaskByShipmentIdAsync(Guid shipmentId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QueryFirstOrDefaultAsync<NdrTask>(@"
            SELECT 
                id, 
                shipment_id as ShipmentId, 
                awb_number as AwbNumber, 
                ndr_reason as NdrReason, 
                ndr_code as NdrCode, 
                customer_phone as CustomerPhone, 
                customer_feedback as CustomerFeedback, 
                action_status as ActionStatus, 
                chosen_action as ChosenAction, 
                reattempt_date as ReattemptDate, 
                remarks, 
                dispatched_to_delhivery as DispatchedToDelhivery, 
                created_at as CreatedAt, 
                updated_at as UpdatedAt
            FROM public.ndr_tasks
            WHERE shipment_id = @ShipmentId AND action_status IN ('open', 'contacted')
            ORDER BY created_at DESC
            LIMIT 1",
            new { ShipmentId = shipmentId });
    }

    public async Task<List<NdrTask>> GetPendingNdrTasksAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var list = await connection.QueryAsync<NdrTask>(@"
            SELECT 
                id, 
                shipment_id as ShipmentId, 
                awb_number as AwbNumber, 
                ndr_reason as NdrReason, 
                ndr_code as NdrCode, 
                customer_phone as CustomerPhone, 
                customer_feedback as CustomerFeedback, 
                action_status as ActionStatus, 
                chosen_action as ChosenAction, 
                reattempt_date as ReattemptDate, 
                remarks, 
                dispatched_to_delhivery as DispatchedToDelhivery, 
                created_at as CreatedAt, 
                updated_at as UpdatedAt
            FROM public.ndr_tasks
            WHERE action_status IN ('open', 'contacted')
            ORDER BY created_at DESC");

        return list.ToList();
    }

    public async Task UpdateNdrTaskActionAsync(Guid id, string chosenAction, DateTime? reattemptDate, string remarks, bool dispatchedToDelhivery, string actionStatus)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE public.ndr_tasks SET
                chosen_action = @ChosenAction,
                reattempt_date = @ReattemptDate,
                remarks = @Remarks,
                dispatched_to_delhivery = @DispatchedToDelhivery,
                action_status = @ActionStatus,
                updated_at = NOW()
            WHERE id = @Id",
            new
            {
                Id = id,
                ChosenAction = chosenAction,
                ReattemptDate = reattemptDate,
                Remarks = remarks,
                DispatchedToDelhivery = dispatchedToDelhivery,
                ActionStatus = actionStatus
            });
    }

    // --- Shipping Escalations ---

    public async Task<Guid> CreateEscalationAsync(ShippingEscalation escalation)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleAsync<Guid>(@"
            INSERT INTO public.shipping_escalations (
                id, shipment_id, awb_number, issue_type, description, 
                status, external_ticket_id, resolution_notes, created_at, resolved_at
            )
            VALUES (
                @Id, @ShipmentId, @AwbNumber, @IssueType, @Description, 
                @Status, @ExternalTicketId, @ResolutionNotes, @CreatedAt, @ResolvedAt
            )
            RETURNING id",
            escalation);
    }

    public async Task<List<ShippingEscalation>> GetEscalationsAsync(string? status = null, Guid? shipmentId = null)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var sql = @"
            SELECT 
                id, 
                shipment_id as ShipmentId, 
                awb_number as AwbNumber, 
                issue_type as IssueType, 
                description, 
                status, 
                external_ticket_id as ExternalTicketId, 
                resolution_notes as ResolutionNotes, 
                created_at as CreatedAt, 
                resolved_at as ResolvedAt
            FROM public.shipping_escalations
            WHERE 1=1";

        var parameters = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(status))
        {
            sql += " AND status = @Status";
            parameters.Add("Status", status);
        }
        if (shipmentId.HasValue && shipmentId.Value != Guid.Empty)
        {
            sql += " AND shipment_id = @ShipmentId";
            parameters.Add("ShipmentId", shipmentId.Value);
        }

        sql += " ORDER BY created_at DESC";

        var list = await connection.QueryAsync<ShippingEscalation>(sql, parameters);
        return list.ToList();
    }

    public async Task<ShippingEscalation?> GetEscalationByIdAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<ShippingEscalation>(@"
            SELECT 
                id, 
                shipment_id as ShipmentId, 
                awb_number as AwbNumber, 
                issue_type as IssueType, 
                description, 
                status, 
                external_ticket_id as ExternalTicketId, 
                resolution_notes as ResolutionNotes, 
                created_at as CreatedAt, 
                resolved_at as ResolvedAt
            FROM public.shipping_escalations
            WHERE id = @Id",
            new { Id = id });
    }

    public async Task ResolveEscalationAsync(Guid id, string resolutionNotes)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync(@"
            UPDATE public.shipping_escalations SET
                status = 'resolved',
                resolution_notes = @ResolutionNotes,
                resolved_at = NOW()
            WHERE id = @Id",
            new { Id = id, ResolutionNotes = resolutionNotes });
    }

    // --- Vendor Logistics Configs ---

    public async Task<VendorLogisticsConfig?> GetVendorLogisticsConfigAsync(Guid vendorId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QueryFirstOrDefaultAsync<VendorLogisticsConfig>(@"
            SELECT 
                id, 
                vendor_id as VendorId, 
                vendor_name as VendorName, 
                fulfillment_mode as FulfillmentMode, 
                return_warehouse_id as ReturnWarehouseId, 
                default_pickup_pincode as DefaultPickupPincode, 
                auto_manifest as AutoManifest, 
                created_at as CreatedAt
            FROM public.vendor_logistics_configs
            WHERE vendor_id = @VendorId
            LIMIT 1",
            new { VendorId = vendorId });
    }
}
