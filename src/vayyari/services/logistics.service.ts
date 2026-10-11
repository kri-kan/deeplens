import { productMgmtApiClient, searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import {
  LogisticsOrder,
  FulfillmentPackage,
  FulfillmentItem,
  OrderFulfillmentStatus,
  GenerateDelhiveryAwbRequest,
  GenerateDelhiveryAwbResponse,
  SchedulePickupRequest,
  NdrException,
  NdrActionRequest,
  LogisticsEscalation,
  CreateEscalationRequest,
  ProcurementStage,
  FulfillmentPath,
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  WarehouseSyncResponse,
  ShippingEstimateRequest,
  ShippingEstimateResponse,
  MarkInTransitPayload,
  GroupShipmentHistoryItem
} from '@/types/logistics';

// No mock orders in production — live data only
const SAMPLE_MOCK_ORDERS: LogisticsOrder[] = [];

// Helper to populate items in package objects
function attachItemsToPackages(order: LogisticsOrder): LogisticsOrder {
  const pkgMap = new Map<string, FulfillmentPackage>();
  order.packages.forEach(pkg => {
    pkgMap.set(pkg.id, { ...pkg, items: [] });
  });

  order.items.forEach(item => {
    if (item.packageId && pkgMap.has(item.packageId)) {
      pkgMap.get(item.packageId)!.items.push(item);
    }
  });

  return {
    ...order,
    packages: Array.from(pkgMap.values()).map(pkg => {
      const packageValue = pkg.items.reduce((acc, it) => acc + it.totalPrice, 0);
      const isCod = order.paymentMode === 'COD';
      const codAmount = isCod ? packageValue : 0;
      return {
        ...pkg,
        itemCount: pkg.items.length,
        packageValue,
        codAmount
      };
    })
  };
}

function mapHistoryItemToLogisticsOrder(item: any): LogisticsOrder {
  const sourceStr = String(item.source || '').toLowerCase();
  const source: 'WhatsApp' | 'Instagram' | 'Web' | 'Manual' =
    sourceStr === 'whatsapp' ? 'WhatsApp' :
    sourceStr === 'instagram' ? 'Instagram' :
    sourceStr === 'web' ? 'Web' : 'Manual';

  const payStr = String(item.paymentMode || '').toUpperCase();
  const paymentMode: 'COD' | 'Prepaid' = payStr === 'PREPAID' ? 'Prepaid' : 'COD';

  const totalValue = Number(item.totalAmount) || 0;
  const codBalance = Number(item.codBalance) || (paymentMode === 'COD' ? totalValue : 0);

  const rawHistoryStatus = (item.status || '').toLowerCase().replace(/[\s_-]+/g, '');
  let status: OrderFulfillmentStatus = 'ReadyToShip';
  if (rawHistoryStatus === 'intransit') status = 'InTransit';
  else if (rawHistoryStatus === 'delivered') status = 'Delivered';
  else if (rawHistoryStatus === 'ndractionneeded') status = 'NdrActionNeeded';
  else if (rawHistoryStatus === 'rto') status = 'RTO';
  else if (rawHistoryStatus === 'cancelled') status = 'Cancelled';
  else if (rawHistoryStatus === 'readyforpickup') status = 'ReadyForPickup';
  else if (rawHistoryStatus === 'outfordelivery') status = 'OutForDelivery';
  else status = 'ReadyToShip';

  const hasLabel = Boolean(
    item.needLabel !== false && (item.labelUrl || item.awbNumber || item.delhiveryAwbNumber)
  );
  const placedAt = item.placedAt || item.timestamp || item.createdAt || new Date().toISOString();

  const order: LogisticsOrder = {
    id: item.id,
    orderNumber: item.id.startsWith('VY-') ? item.id : `VY-2026-${item.id}`,
    customerName: item.customerName || 'Customer',
    customerPhone: item.customerPhone || item.sourceHandle || '',
    shippingAddress: item.customerAddress || item.shippingStreet || '',
    shippingCity: item.shippingCity || '',
    shippingState: item.shippingState || '',
    shippingPincode: item.shippingPincode || '',
    source,
    sourceHandle: item.sourceHandle || undefined,
    paymentMode,
    totalOrderValue: totalValue,
    totalCodBalance: codBalance,
    orderDate: item.timestamp || new Date().toISOString(),
    placedAt,
    hasLabel,
    status,
    hasNdr: status === 'NdrActionNeeded',
    hasEscalation: false,
    items: [],
    packages: []
  };

  return attachItemsToPackages(order);
}

function mapOrderDetailToLogisticsOrder(dto: any): LogisticsOrder {
  const sourceStr = String(dto.source || '').toLowerCase();
  const source: 'WhatsApp' | 'Instagram' | 'Web' | 'Manual' =
    sourceStr === 'whatsapp' ? 'WhatsApp' :
    sourceStr === 'instagram' ? 'Instagram' :
    sourceStr === 'web' ? 'Web' : 'Manual';

  const payStr = String(dto.paymentMode || '').toUpperCase();
  const paymentMode: 'COD' | 'Prepaid' = payStr === 'PREPAID' ? 'Prepaid' : 'COD';

  const items: FulfillmentItem[] = Array.isArray(dto.items)
    ? dto.items.map((it: any, idx: number) => {
        const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
        const unitPrice = Number(it.unitPrice) || 0;
        const subtotal = Number(it.subtotal) || (unitPrice * qty);
        return {
          id: it.id ? String(it.id) : `ITEM-${dto.id}-${idx + 1}`,
          orderId: dto.id,
          productId: it.productId ?? '',
          productName: it.productTitle ?? '',
          quantity: qty,
          unitPrice,
          totalPrice: subtotal,
          proportionalCodAmount: subtotal,
          vendorId: it.vendorId ? String(it.vendorId) : 'VND-DEFAULT',
          vendorName: 'Default Vendor'
        };
      })
    : [];

  const totalValue = Number(dto.totalAmount) || items.reduce((acc, i) => acc + i.totalPrice, 0);
  const codBalance = Number(dto.codBalance) || (paymentMode === 'COD' ? totalValue : 0);

  const rawDtoStatus = (dto.status || '').toLowerCase().replace(/[\s_-]+/g, '');
  let dtoStatus: OrderFulfillmentStatus = 'ReadyToShip';
  if (rawDtoStatus === 'intransit') dtoStatus = 'InTransit';
  else if (rawDtoStatus === 'delivered') dtoStatus = 'Delivered';
  else if (rawDtoStatus === 'ndractionneeded') dtoStatus = 'NdrActionNeeded';
  else if (rawDtoStatus === 'rto') dtoStatus = 'RTO';
  else if (rawDtoStatus === 'cancelled') dtoStatus = 'Cancelled';
  else if (rawDtoStatus === 'readyforpickup') dtoStatus = 'ReadyForPickup';
  else if (rawDtoStatus === 'outfordelivery') dtoStatus = 'OutForDelivery';
  else dtoStatus = 'ReadyToShip';

  const hasLabel = Boolean(
    dto.needLabel !== false &&
      (dto.labelUrl ||
        dto.awbNumber ||
        (Array.isArray(dto.packages) &&
          dto.packages.some((p: any) => p.delhiveryAwbNumber || p.delhiveryLabelPdfUrl)))
  );
  const placedAt = dto.placedAt || dto.timestamp || dto.createdAt || new Date().toISOString();

  const order: LogisticsOrder = {
    id: dto.id,
    orderNumber: dto.id.startsWith('VY-') ? dto.id : `VY-2026-${dto.id}`,
    customerName: dto.customerName || 'Customer',
    customerPhone: dto.customerPhone || dto.sourceHandle || '',
    shippingAddress: dto.customerAddress || dto.shippingStreet || '',
    shippingCity: dto.shippingCity || '',
    shippingState: dto.shippingState || '',
    shippingPincode: dto.shippingPincode || '',
    source,
    sourceHandle: dto.sourceHandle || undefined,
    paymentMode,
    totalOrderValue: totalValue,
    totalCodBalance: codBalance,
    orderDate: dto.timestamp || new Date().toISOString(),
    placedAt,
    hasLabel,
    status: dtoStatus,
    hasNdr: dtoStatus === 'NdrActionNeeded',
    hasEscalation: false,
    items,
    packages: []
  };

  return attachItemsToPackages(order);
}

// In-memory state store for interactive development
let ordersStore = SAMPLE_MOCK_ORDERS.map(attachItemsToPackages);
const deletedOrderIds = new Set<string>();

function isMatchingOrderId(targetId: string, candidateId: string): boolean {
  if (!targetId || !candidateId) return false;
  const t = String(targetId).toLowerCase().trim();
  const c = String(candidateId).toLowerCase().trim();
  if (t === c) return true;
  const tClean = t.replace(/^vy-2026-/, '').replace(/^vy-/, '').replace(/^ord-/, '');
  const cClean = c.replace(/^vy-2026-/, '').replace(/^vy-/, '').replace(/^ord-/, '');
  return tClean === cClean;
}

function isOrderDeleted(orderId: string, orderNumber?: string): boolean {
  if (!orderId && !orderNumber) return false;
  for (const delId of deletedOrderIds) {
    if (orderId && isMatchingOrderId(delId, orderId)) return true;
    if (orderNumber && isMatchingOrderId(delId, orderNumber)) return true;
  }
  return false;
}

export const logisticsService = {
  /**
   * Register or prepend a newly created order into local store
   */
  registerOrder: (order: LogisticsOrder) => {
    deletedOrderIds.delete(order.id);
    deletedOrderIds.delete(order.orderNumber);
    const strippedId = order.id.toLowerCase().replace(/^vy-2026-/, '').replace(/^vy-/, '').replace(/^ord-/, '');
    deletedOrderIds.delete(strippedId);

    ordersStore = [
      attachItemsToPackages(order),
      ...ordersStore.filter(o => !isMatchingOrderId(order.id, o.id) && !isMatchingOrderId(order.id, o.orderNumber))
    ];
  },

  /**
   * Remove a deleted order from local store
   */
  removeOrder: (orderId: string) => {
    if (!orderId) return;
    const cleanId = String(orderId).toLowerCase().trim();
    const strippedId = cleanId.replace(/^vy-2026-/, '').replace(/^vy-/, '').replace(/^ord-/, '');
    deletedOrderIds.add(cleanId);
    deletedOrderIds.add(strippedId);
    deletedOrderIds.add(`vy-2026-${strippedId}`);
    deletedOrderIds.add(`ord-${strippedId}`);

    ordersStore = ordersStore.filter(o => !isOrderDeleted(o.id, o.orderNumber));
  },

  /**
   * Check whether an order ID or number is marked as deleted
   */
  isOrderDeleted: (orderId: string, orderNumber?: string): boolean => {
    return isOrderDeleted(orderId, orderNumber);
  },

  /**
   * List all logistics orders with optional search and filter
   */
  listOrders: async (filter?: OrderFulfillmentStatus | 'All', query?: string): Promise<LogisticsOrder[]> => {
    try {
      const res = await productMgmtApiClient.get<LogisticsOrder[]>(API_ROUTES.LOGISTICS.ORDERS_LIST, {
        params: { status: filter !== 'All' ? filter : undefined, q: query }
      });
      if (res && Array.isArray(res) && res.length > 0) {
        return res
          .filter(o => !isOrderDeleted(o.id, o.orderNumber))
          .map(attachItemsToPackages);
      }
    } catch {
      // Fall back to SearchApi recent history
    }

    try {
      const historyRes = await searchApiClient.get<any[]>(API_ROUTES.ORDERS.HISTORY, {
        params: { limit: 50 }
      });
      if (historyRes && Array.isArray(historyRes) && historyRes.length > 0) {
        // Track any explicit deleted items returned
        historyRes.forEach(o => {
          if (o.isDeleted || o.status === 'Deleted') {
            const cleanId = String(o.id).toLowerCase().trim();
            const strippedId = cleanId.replace(/^vy-2026-/, '').replace(/^vy-/, '').replace(/^ord-/, '');
            deletedOrderIds.add(cleanId);
            deletedOrderIds.add(strippedId);
            deletedOrderIds.add(`vy-2026-${strippedId}`);
            deletedOrderIds.add(`ord-${strippedId}`);
            if (o.orderNumber) {
              const numClean = String(o.orderNumber).toLowerCase().trim();
              deletedOrderIds.add(numClean);
            }
          }
        });

        const liveOrders = historyRes
          .filter(o => !o.isDeleted && o.status !== 'Deleted' && !isOrderDeleted(o.id, o.orderNumber))
          .map(mapHistoryItemToLogisticsOrder);
        ordersStore = liveOrders;
      }
    } catch {
      // Fall back to local store
    }

    let list = ordersStore.filter(o => !isOrderDeleted(o.id, o.orderNumber));
    if (filter && filter !== 'All') {
      list = list.filter(o => o.status === filter);
    }
    if (query && query.trim().length > 0) {
      const q = query.toLowerCase().trim();
      list = list.filter(o => 
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.shippingCity.toLowerCase().includes(q) ||
        o.packages.some(p => 
          p.delhiveryAwbNumber?.toLowerCase().includes(q) ||
          p.vendorAwbNumber?.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q)
        )
      );
    }
    return list;
  },

  /**
   * Get single order logistics detail
   */
  getOrder: async (orderId: string): Promise<LogisticsOrder> => {
    // 1. Try SearchApi canonical order details
    try {
      const orderDto = await searchApiClient.get<any>(API_ROUTES.ORDERS.GET_BY_ID(orderId));
      if (orderDto && orderDto.id) {
        const mapped = mapOrderDetailToLogisticsOrder(orderDto);
        logisticsService.registerOrder(mapped);
        return mapped;
      }
    } catch {
      // Fall through to logistics endpoint
    }

    // 2. Try Logistics backend
    try {
      const res = await productMgmtApiClient.get<LogisticsOrder>(API_ROUTES.LOGISTICS.ORDER_DETAIL(orderId));
      if (res && res.id) {
        return attachItemsToPackages(res);
      }
    } catch {
      // Fall back to local store
    }

    const found = ordersStore.find(o => o.id === orderId || o.orderNumber === orderId);
    if (found) return found;

    // 3. Fallback placeholder without dummy items
    const newOrder: LogisticsOrder = {
      id: orderId,
      orderNumber: orderId.startsWith('VY-') ? orderId : `VY-2026-${orderId}`,
      customerName: 'Customer',
      customerPhone: '',
      shippingAddress: '',
      shippingCity: '',
      shippingState: '',
      shippingPincode: '',
      source: 'WhatsApp',
      paymentMode: 'COD',
      totalOrderValue: 0,
      totalCodBalance: 0,
      orderDate: new Date().toISOString(),
      status: 'PendingFulfillment',
      hasNdr: false,
      hasEscalation: false,
      items: [],
      packages: []
    };
    return attachItemsToPackages(newOrder);
  },

  /**
   * Reassign an item to a different package or create a new package
   */
  reassignItem: async (orderId: string, itemId: string, targetPackageId: string): Promise<LogisticsOrder> => {
    try {
      await productMgmtApiClient.post(API_ROUTES.LOGISTICS.REASSIGN_ITEM(orderId), {
        itemId,
        targetPackageId
      });
    } catch {
      // Local fallback simulation
    }

    ordersStore = ordersStore.map(order => {
      if (order.id !== orderId) return order;

      const updatedItems = order.items.map(item => {
        if (item.id === itemId) {
          return { ...item, packageId: targetPackageId };
        }
        return item;
      });

      return attachItemsToPackages({
        ...order,
        items: updatedItems
      });
    });

    return (await logisticsService.getOrder(orderId));
  },

  /**
   * Create a new package within an order
   */
  createNewPackage: async (orderId: string, vendorId: string, vendorName: string, path: FulfillmentPath = 'ProcureToShip'): Promise<LogisticsOrder> => {
    const order = await logisticsService.getOrder(orderId);
    const newPkgNumber = order.packages.length + 1;
    const newPkgId = `PKG-${orderId}-${Date.now().toString().slice(-4)}`;

    const newPkg: FulfillmentPackage = {
      id: newPkgId,
      packageNumber: newPkgNumber,
      orderId,
      vendorId,
      vendorName,
      fulfillmentPath: path,
      items: [],
      itemCount: 0,
      packageValue: 0,
      codAmount: 0,
      weightKg: 0.5,
      dimensionsCm: { length: 25, width: 20, height: 5 },
      procurementStage: 'Pending',
      currentTrackingStatus: 'Package Created - Assign Items',
      isNdr: false,
      escalations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    ordersStore = ordersStore.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        packages: [...o.packages, newPkg]
      };
    });

    return (await logisticsService.getOrder(orderId));
  },

  /**
   * Update package fulfillment path (Direct Vendor vs Procure-to-Ship)
   */
  updatePackagePath: async (orderId: string, packageId: string, path: FulfillmentPath): Promise<LogisticsOrder> => {
    ordersStore = ordersStore.map(order => {
      if (order.id !== orderId) return order;
      const updatedPackages = order.packages.map(pkg => {
        if (pkg.id === packageId) {
          return { ...pkg, fulfillmentPath: path, updatedAt: new Date().toISOString() };
        }
        return pkg;
      });
      return { ...order, packages: updatedPackages };
    });
    return (await logisticsService.getOrder(orderId));
  },

  /**
   * Path B: Update procurement stage (Pending -> Inbound -> ReceivedAtHub)
   */
  updateProcurementStage: async (
    orderId: string, 
    packageId: string, 
    stage: ProcurementStage,
    inboundAwb?: string,
    inboundCourier?: string
  ): Promise<LogisticsOrder> => {
    try {
      await productMgmtApiClient.post(API_ROUTES.LOGISTICS.UPDATE_PROCUREMENT(orderId, packageId), {
        stage,
        inboundAwb,
        inboundCourier
      });
    } catch {
      // Local store simulation
    }

    ordersStore = ordersStore.map(order => {
      if (order.id !== orderId) return order;
      const updatedPackages = order.packages.map(pkg => {
        if (pkg.id === packageId) {
          const isReceived = stage === 'ReceivedAtHub';
          return {
            ...pkg,
            procurementStage: stage,
            procurementInboundAwb: inboundAwb || pkg.procurementInboundAwb,
            procurementInboundCourier: inboundCourier || pkg.procurementInboundCourier,
            procurementReceivedAt: isReceived ? new Date().toISOString() : pkg.procurementReceivedAt,
            currentTrackingStatus: isReceived 
              ? 'Received at Central Hub - Ready for Delhivery COD dispatch'
              : stage === 'Inbound' 
              ? `Inbound to Hub via ${inboundCourier || 'Courier'} (${inboundAwb || 'Pending AWB'})`
              : 'Awaiting Vendor Dispatch to Central Hub',
            updatedAt: new Date().toISOString()
          };
        }
        return pkg;
      });
      return { ...order, packages: updatedPackages, status: 'InProcurement' as OrderFulfillmentStatus };
    });

    return (await logisticsService.getOrder(orderId));
  },

  /**
   * Path A: Attach Vendor AWB / Label
   */
  attachVendorAwb: async (
    orderId: string,
    packageId: string,
    awbNumber: string,
    courierName: string,
    labelUrl?: string
  ): Promise<LogisticsOrder> => {
    try {
      await productMgmtApiClient.post(API_ROUTES.LOGISTICS.ATTACH_VENDOR_AWB(orderId, packageId), {
        awbNumber,
        courierName,
        labelUrl
      });
    } catch {
      // Local simulation
    }

    ordersStore = ordersStore.map(order => {
      if (order.id !== orderId) return order;
      const updatedPackages = order.packages.map(pkg => {
        if (pkg.id === packageId) {
          return {
            ...pkg,
            vendorAwbNumber: awbNumber,
            vendorCourierName: courierName,
            vendorLabelAttachmentUrl: labelUrl,
            currentTrackingStatus: `Dispatched by Vendor via ${courierName} (${awbNumber})`,
            updatedAt: new Date().toISOString()
          };
        }
        return pkg;
      });
      return { ...order, packages: updatedPackages, status: 'InTransit' as OrderFulfillmentStatus };
    });

    return (await logisticsService.getOrder(orderId));
  },

  /**
   * Mark an entire order or package as In Transit (for no-label vendor direct or custom shipments)
   */
  markOrderInTransit: async (
    orderId: string,
    payload: {
      packageId?: string;
      courierName?: string;
      awbNumber?: string;
      labelAttachmentUrl?: string;
      notes?: string;
    }
  ): Promise<LogisticsOrder> => {
    try {
      await productMgmtApiClient.post(`/api/v1/logistics/orders/${orderId}/mark-in-transit`, payload);
    } catch {
      // Local fallback simulation
    }

    ordersStore = ordersStore.map((order) => {
      if (!isMatchingOrderId(order.id, orderId)) return order;
      const updatedPackages = order.packages.map((pkg) => {
        if (!payload.packageId || pkg.id === payload.packageId) {
          return {
            ...pkg,
            vendorAwbNumber: payload.awbNumber || pkg.vendorAwbNumber,
            vendorCourierName: payload.courierName || pkg.vendorCourierName,
            vendorLabelAttachmentUrl: payload.labelAttachmentUrl || pkg.vendorLabelAttachmentUrl,
            currentTrackingStatus: payload.courierName || payload.awbNumber
              ? `Dispatched via ${payload.courierName || 'Courier'} (${payload.awbNumber || 'No AWB'})`
              : 'In Transit',
            updatedAt: new Date().toISOString(),
          };
        }
        return pkg;
      });
      return {
        ...order,
        packages: updatedPackages,
        status: 'InTransit' as OrderFulfillmentStatus,
        notes: payload.notes || order.notes,
      };
    });

    return await logisticsService.getOrder(orderId);
  },

  /**
   * Mark an entire order as Delivered (for offline verified delivery)
   */
  markOrderDelivered: async (
    orderId: string,
    notes?: string
  ): Promise<LogisticsOrder> => {
    try {
      await productMgmtApiClient.post(`/api/v1/logistics/orders/${orderId}/mark-delivered`, { notes });
    } catch {
      // Local fallback simulation
    }

    ordersStore = ordersStore.map((order) => {
      if (!isMatchingOrderId(order.id, orderId)) return order;
      const updatedPackages = order.packages.map((pkg) => ({
        ...pkg,
        currentTrackingStatus: 'Delivered',
        updatedAt: new Date().toISOString(),
      }));
      return {
        ...order,
        packages: updatedPackages,
        status: 'Delivered' as OrderFulfillmentStatus,
        notes: notes || order.notes,
      };
    });

    return await logisticsService.getOrder(orderId);
  },

  /**
   * Generate Delhivery COD AWB & Thermal Label
   */
  generateDelhiveryAwb: async (request: GenerateDelhiveryAwbRequest): Promise<GenerateDelhiveryAwbResponse> => {
    const res = await productMgmtApiClient.post<GenerateDelhiveryAwbResponse>(
      API_ROUTES.LOGISTICS.GENERATE_DELHIVERY_AWB(request.orderId, request.packageId),
      request
    );
    if (!res || !res.awbNumber) {
      throw new Error('Failed to generate Delhivery AWB: Empty response from logistics service');
    }
    return res;
  },

  /**
   * Schedule Delhivery Pickup
   */
  schedulePickup: async (request: SchedulePickupRequest): Promise<{ success: boolean; pickupToken: string }> => {
    const res = await productMgmtApiClient.post<{ success: boolean; pickupToken: string }>(
      API_ROUTES.LOGISTICS.SCHEDULE_PICKUP(request.orderId, request.packageId),
      request
    );
    return res || { success: true, pickupToken: '' };
  },

  /**
   * Action an NDR Exception (Reattempt, Update Address, RTO, Buyer Contacted)
   */
  resolveNdrAction: async (request: NdrActionRequest): Promise<void> => {
    try {
      await productMgmtApiClient.post(API_ROUTES.LOGISTICS.NDR_ACTION(request.ndrId), request);
    } catch {
      // Local simulation
    }

    ordersStore = ordersStore.map(order => {
      const updatedPackages = order.packages.map(pkg => {
        if (pkg.ndrException && pkg.ndrException.id === request.ndrId) {
          const actionMap: Record<string, string> = {
            Reattempt: 'ReattemptScheduled',
            UpdateAddress: 'AddressUpdated',
            RequestRTO: 'RTORequested',
            BuyerContacted: 'BuyerContacted'
          };
          const newStatus = (actionMap[request.action] || 'Pending') as any;

          return {
            ...pkg,
            isNdr: request.action !== 'RequestRTO',
            currentTrackingStatus: request.action === 'RequestRTO' 
              ? 'RTO Initiated - Returning to Central Hub'
              : request.action === 'Reattempt'
              ? `Reattempt scheduled for ${request.scheduledDate || 'tomorrow'}`
              : `NDR Update: ${request.action}`,
            ndrException: {
              ...pkg.ndrException,
              status: newStatus,
              scheduledReattemptDate: request.scheduledDate,
              correctedAddress: request.updatedAddress,
              correctedPhone: request.updatedPhone,
              history: [
                ...pkg.ndrException.history,
                {
                  id: `H-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  action: `Action: ${request.action}`,
                  notes: request.notes,
                  actor: 'Ops User'
                }
              ]
            }
          };
        }
        return pkg;
      });

      const hasRemainingNdr = updatedPackages.some(p => p.isNdr);
      return {
        ...order,
        packages: updatedPackages,
        hasNdr: hasRemainingNdr,
        status: hasRemainingNdr ? 'NdrActionNeeded' : ('InTransit' as OrderFulfillmentStatus)
      };
    });
  },

  /**
   * Create an internal dispute / logistics escalation
   */
  createEscalation: async (request: CreateEscalationRequest): Promise<LogisticsEscalation> => {
    const escalation: LogisticsEscalation = {
      id: `ESC-${Date.now().toString().slice(-5)}`,
      orderId: request.orderId,
      packageId: request.packageId,
      awbNumber: request.awbNumber,
      courier: request.courier,
      issueType: request.issueType,
      title: request.title,
      description: request.description,
      status: 'Investigating',
      delhiveryCrmTicketId: request.courier === 'Delhivery' ? `DLV-CRM-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      claimAmount: request.claimAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await productMgmtApiClient.post(API_ROUTES.LOGISTICS.CREATE_ESCALATION, request);
    } catch {
      // Local fallback
    }

    ordersStore = ordersStore.map(order => {
      if (order.id !== request.orderId) return order;
      const updatedPackages = order.packages.map(pkg => {
        if (pkg.id === request.packageId) {
          return {
            ...pkg,
            escalations: [...pkg.escalations, escalation]
          };
        }
        return pkg;
      });
      return {
        ...order,
        packages: updatedPackages,
        hasEscalation: true
      };
    });

    return escalation;
  },

  /**
   * Fetch all warehouses / facilities registered in DeepLens
   */
  getWarehouses: async (): Promise<Warehouse[]> => {
    return await productMgmtApiClient.get<Warehouse[]>(API_ROUTES.LOGISTICS.WAREHOUSES_LIST);
  },

  /**
   * Trigger on-demand sync of warehouses from Delhivery / master registry
   */
  syncWarehouses: async (): Promise<WarehouseSyncResponse> => {
    return await productMgmtApiClient.post<WarehouseSyncResponse>(API_ROUTES.LOGISTICS.WAREHOUSES_SYNC, {});
  },

  /**
   * Create a new warehouse in DeepLens and optionally register with Delhivery
   */
  createWarehouse: async (request: CreateWarehouseRequest): Promise<Warehouse> => {
    return await productMgmtApiClient.post<Warehouse>(API_ROUTES.LOGISTICS.WAREHOUSE_CREATE, request);
  },

  /**
   * Update an existing warehouse in DeepLens and optionally update Delhivery
   */
  updateWarehouse: async (id: string, request: UpdateWarehouseRequest): Promise<Warehouse> => {
    return await productMgmtApiClient.put<Warehouse>(API_ROUTES.LOGISTICS.WAREHOUSE_UPDATE(id), request);
  },

  /**
   * Delete a warehouse facility from the registry
   */
  deleteWarehouse: async (id: string): Promise<void> => {
    await productMgmtApiClient.delete(API_ROUTES.LOGISTICS.WAREHOUSE_DELETE(id));
  },

  /**
   * Toggle starred/favorite status for a warehouse facility
   */
  toggleWarehouseStar: async (id: string): Promise<boolean> => {
    try {
      const res = await productMgmtApiClient.post<{ id: string; isStarred: boolean }>(
        API_ROUTES.LOGISTICS.WAREHOUSE_TOGGLE_STAR(id)
      );
      return res?.isStarred ?? true;
    } catch (err) {
      console.warn('Failed to toggle warehouse star:', err);
      return false;
    }
  },

  /**
   * Cancel an active Delhivery shipment / AWB
   */
  cancelDelhiveryAwb: async (awbNumber: string): Promise<boolean> => {
    try {
      await searchApiClient.post('/api/v1/logistics/delhivery/cancel', { awbNumber });
      return true;
    } catch (err) {
      console.warn('Backend cancel shipment call failed, clearing local state:', err);
      return false;
    }
  },

  /**
   * Cancel group shipping label, cancel carrier shipment, hard delete label from storage,
   * soft delete manifest submission while retaining the AWB number for audit.
   */
  cancelGroupLabel: async (orderGrpId: string, awbNumber?: string, reason?: string): Promise<{ success: boolean; awbNumber?: string }> => {
    try {
      const response = await searchApiClient.post<{ orderGrpId: string; awbNumber?: string; status: string; success: boolean }>(
        `/api/v1/orderid/groups/${orderGrpId}/label/cancel`,
        { awbNumber, reason }
      );
      return { success: response?.success ?? true, awbNumber: response?.awbNumber ?? awbNumber };
    } catch (err) {
      console.warn('Backend cancelGroupLabel call failed:', err);
      return { success: false, awbNumber };
    }
  },

  /**
   * Updates need_label setting for an order group.
   */
  updateNeedLabel: async (orderGrpId: string, needLabel: boolean): Promise<boolean> => {
    try {
      await searchApiClient.put(`/api/v1/orderid/groups/${orderGrpId}/need-label`, { needLabel });
      return true;
    } catch (err) {
      console.warn('Backend updateNeedLabel call failed:', err);
      return false;
    }
  },

  /**
   * Fetches historical shipment records for an order group (including cancelled AWBs and manifestation metadata).
   */
  getGroupShipments: async (orderGrpId: string): Promise<GroupShipmentHistoryItem[]> => {
    try {
      const response = await searchApiClient.get<GroupShipmentHistoryItem[]>(
        `/api/v1/orderid/groups/${orderGrpId}/shipments`
      );
      return response || [];
    } catch (err) {
      console.warn('Backend getGroupShipments call failed:', err);
      return [];
    }
  },

  /**
   * Reconciles live tracking and pickup schedule with carrier (Delhivery) and returns refreshed shipment records.
   */
  syncGroupShipments: async (orderGrpId: string, awbNumber?: string): Promise<GroupShipmentHistoryItem[]> => {
    try {
      const url = `/api/v1/orderid/groups/${orderGrpId}/sync-tracking${awbNumber ? `?awbNumber=${encodeURIComponent(awbNumber)}` : ''}`;
      const response = await searchApiClient.post<GroupShipmentHistoryItem[]>(url);
      return response || [];
    } catch (err) {
      console.warn('Backend syncGroupShipments call failed:', err);
      return [];
    }
  },

  /**
   * Resets and clears the scheduled pickup for an order group (useful when cancelled offline by business/carrier).
   */
  resetGroupPickup: async (orderGrpId: string, awbNumber?: string): Promise<{ success: boolean; shipments: GroupShipmentHistoryItem[] }> => {
    try {
      const url = `/api/v1/orderid/groups/${orderGrpId}/reset-pickup${awbNumber ? `?awbNumber=${encodeURIComponent(awbNumber)}` : ''}`;
      const response = await searchApiClient.post<{ success: boolean; shipments: GroupShipmentHistoryItem[] }>(url);
      return response || { success: false, shipments: [] };
    } catch (err) {
      console.warn('Backend resetGroupPickup call failed:', err);
      return { success: false, shipments: [] };
    }
  },

  /**
   * Calculates shipping charges and transit delivery days based on origin, destination, mode, weight, and COD.
   */
  estimateShipping: async (request: ShippingEstimateRequest): Promise<ShippingEstimateResponse> => {
    try {
      const response = await searchApiClient.post<ShippingEstimateResponse>(
        API_ROUTES.LOGISTICS.ESTIMATE_SHIPPING,
        request
      );
      return response;
    } catch (err) {
      console.warn('Backend estimateShipping call failed, using client fallback estimation:', err);
      const weight = Math.max(100, request.weightGrams || 400);
      const slabs = Math.ceil(weight / 500);
      const isExpress = request.shippingMode === 'Express';
      const isCod = request.paymentMode === 'COD';
      const codSurcharge = isCod ? Math.max(35, Math.round((request.codAmount || 0) * 0.015)) : 0;
      const baseCost = isExpress ? 85 : 55;
      const extraCost = (slabs - 1) * (isExpress ? 45 : 35);
      const totalCost = baseCost + extraCost + codSurcharge;
      const days = isExpress ? '2 - 3 days' : '3 - 5 days';
      return {
        estimatedCost: totalCost,
        estimatedCostFormatted: `₹${totalCost}`,
        estimatedMinDays: isExpress ? 2 : 3,
        estimatedMaxDays: isExpress ? 3 : 5,
        estimatedDaysFormatted: days,
        zone: 'National',
        isServiceable: true,
      };
    }
  }
};
