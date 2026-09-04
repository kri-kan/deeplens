import { productMgmtApiClient } from '@/api/client';
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
  FulfillmentPath
} from '@/types/logistics';

// Sample mock orders for fallback / local development
const SAMPLE_MOCK_ORDERS: LogisticsOrder[] = [
  {
    id: 'ORD-98210',
    orderNumber: 'VY-2026-98210',
    customerName: 'Ananya Sharma',
    customerPhone: '+919876543210',
    shippingAddress: 'Flat 402, Royale Palms, 24th Main, HSR Layout Sector 2',
    shippingCity: 'Bengaluru',
    shippingState: 'Karnataka',
    shippingPincode: '560102',
    source: 'Instagram',
    sourceHandle: '@ananya_s',
    paymentMode: 'COD',
    totalOrderValue: 4800,
    totalCodBalance: 4800,
    orderDate: '2026-09-01T14:30:00Z',
    status: 'PendingFulfillment',
    hasNdr: false,
    hasEscalation: false,
    items: [
      {
        id: 'ITEM-101',
        orderId: 'ORD-98210',
        productId: 'PRD-SRT-01',
        productName: 'Kanjivaram Silk Saree - Emerald Green & Zari',
        sku: 'VY-KANJI-EMG-01',
        quantity: 1,
        unitPrice: 2800,
        totalPrice: 2800,
        proportionalCodAmount: 2800,
        photoUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        packageId: 'PKG-98210-1'
      },
      {
        id: 'ITEM-102',
        orderId: 'ORD-98210',
        productId: 'PRD-JWL-09',
        productName: 'Handcrafted Temple Choker & Earring Set',
        sku: 'VY-TMPL-SET-09',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
        proportionalCodAmount: 2000,
        photoUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
        vendorId: 'VND-JPR-02',
        vendorName: 'Jaipur Meenakari Craft',
        vendorPhone: '+919414098765',
        packageId: 'PKG-98210-2'
      }
    ],
    packages: [
      {
        id: 'PKG-98210-1',
        packageNumber: 1,
        orderId: 'ORD-98210',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        fulfillmentPath: 'ProcureToShip',
        items: [],
        itemCount: 1,
        packageValue: 2800,
        codAmount: 2800,
        weightKg: 0.8,
        dimensionsCm: { length: 30, width: 25, height: 5 },
        procurementStage: 'Pending',
        currentTrackingStatus: 'Awaiting Vendor Dispatch to Central Hub',
        isNdr: false,
        escalations: [],
        createdAt: '2026-09-01T15:00:00Z',
        updatedAt: '2026-09-01T15:00:00Z'
      },
      {
        id: 'PKG-98210-2',
        packageNumber: 2,
        orderId: 'ORD-98210',
        vendorId: 'VND-JPR-02',
        vendorName: 'Jaipur Meenakari Craft',
        vendorPhone: '+919414098765',
        fulfillmentPath: 'DirectVendor',
        items: [],
        itemCount: 1,
        packageValue: 2000,
        codAmount: 2000,
        weightKg: 0.3,
        dimensionsCm: { length: 15, width: 15, height: 8 },
        procurementStage: 'Pending',
        currentTrackingStatus: 'Ready for Vendor WhatsApp Handover',
        isNdr: false,
        escalations: [],
        createdAt: '2026-09-01T15:00:00Z',
        updatedAt: '2026-09-01T15:00:00Z'
      }
    ]
  },
  {
    id: 'ORD-98211',
    orderNumber: 'VY-2026-98211',
    customerName: 'Priya Nambiar',
    customerPhone: '+919988776655',
    shippingAddress: 'Villa 12, Sobha Iris, Outer Ring Road, Bellandur',
    shippingCity: 'Bengaluru',
    shippingState: 'Karnataka',
    shippingPincode: '560103',
    source: 'WhatsApp',
    sourceHandle: '+919988776655',
    paymentMode: 'COD',
    totalOrderValue: 3500,
    totalCodBalance: 3500,
    orderDate: '2026-08-30T10:15:00Z',
    status: 'InTransit',
    hasNdr: false,
    hasEscalation: false,
    items: [
      {
        id: 'ITEM-201',
        orderId: 'ORD-98211',
        productId: 'PRD-LHN-04',
        productName: 'Raw Silk Embroidered Kurti Set',
        sku: 'VY-KURTI-RS-04',
        quantity: 1,
        unitPrice: 3500,
        totalPrice: 3500,
        proportionalCodAmount: 3500,
        photoUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        packageId: 'PKG-98211-1'
      }
    ],
    packages: [
      {
        id: 'PKG-98211-1',
        packageNumber: 1,
        orderId: 'ORD-98211',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        fulfillmentPath: 'ProcureToShip',
        items: [],
        itemCount: 1,
        packageValue: 3500,
        codAmount: 3500,
        weightKg: 0.9,
        dimensionsCm: { length: 32, width: 26, height: 6 },
        procurementStage: 'ReceivedAtHub',
        procurementInboundAwb: 'DTDC-BLR-89218',
        procurementInboundCourier: 'DTDC',
        procurementDispatchedAt: '2026-08-30T14:00:00Z',
        procurementReceivedAt: '2026-08-31T11:30:00Z',
        delhiveryAwbNumber: '14829103859201',
        delhiveryLabelPdfUrl: 'https://cdn.vayyari.com/labels/14829103859201.pdf',
        delhiveryRoutingCode: 'BLR/HSR/02',
        delhiveryPickupDate: '2026-09-01',
        delhiveryPickupTimeSlot: '14:00 - 18:00',
        delhiveryPickupScheduled: true,
        delhiveryStatus: 'Out for Delivery (Hub Bengaluru)',
        currentTrackingStatus: 'Delhivery AWB 14829103859201 - Out for Delivery',
        isNdr: false,
        escalations: [],
        createdAt: '2026-08-30T11:00:00Z',
        updatedAt: '2026-09-01T09:00:00Z'
      }
    ]
  },
  {
    id: 'ORD-98212',
    orderNumber: 'VY-2026-98212',
    customerName: 'Kavita Menon',
    customerPhone: '+919741239870',
    shippingAddress: '45/2, Marine Drive, Near High Court Junction, Marine Lines',
    shippingCity: 'Kochi',
    shippingState: 'Kerala',
    shippingPincode: '682031',
    source: 'Instagram',
    sourceHandle: '@kavita_m',
    paymentMode: 'COD',
    totalOrderValue: 5200,
    totalCodBalance: 5200,
    orderDate: '2026-08-28T09:00:00Z',
    status: 'NdrActionNeeded',
    hasNdr: true,
    hasEscalation: false,
    items: [
      {
        id: 'ITEM-301',
        orderId: 'ORD-98212',
        productId: 'PRD-LHN-99',
        productName: 'Banarasi Brocade Festive Anarkali',
        sku: 'VY-BAN-ANR-99',
        quantity: 1,
        unitPrice: 5200,
        totalPrice: 5200,
        proportionalCodAmount: 5200,
        photoUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80',
        vendorId: 'VND-VNS-03',
        vendorName: 'Varanasi Weavers Guild',
        vendorPhone: '+919450011223',
        packageId: 'PKG-98212-1'
      }
    ],
    packages: [
      {
        id: 'PKG-98212-1',
        packageNumber: 1,
        orderId: 'ORD-98212',
        vendorId: 'VND-VNS-03',
        vendorName: 'Varanasi Weavers Guild',
        vendorPhone: '+919450011223',
        fulfillmentPath: 'ProcureToShip',
        items: [],
        itemCount: 1,
        packageValue: 5200,
        codAmount: 5200,
        weightKg: 1.2,
        dimensionsCm: { length: 35, width: 28, height: 8 },
        procurementStage: 'ReceivedAtHub',
        delhiveryAwbNumber: '14829103859942',
        delhiveryLabelPdfUrl: 'https://cdn.vayyari.com/labels/14829103859942.pdf',
        delhiveryRoutingCode: 'COK/MRL/01',
        delhiveryPickupScheduled: true,
        delhiveryStatus: 'Delivery Attempted - Customer Phone Switched Off',
        currentTrackingStatus: 'NDR Action Needed: Buyer unreachable on phone',
        isNdr: true,
        ndrException: {
          id: 'NDR-501',
          orderId: 'ORD-98212',
          packageId: 'PKG-98212-1',
          awbNumber: '14829103859942',
          courier: 'Delhivery',
          reason: 'CustomerUnavailable',
          reasonText: 'Customer phone switched off at delivery attempt 1',
          attemptNumber: 1,
          attemptedAt: '2026-09-01T16:45:00Z',
          buyerFeedback: 'Buyer requested call after 6 PM or reattempt next day',
          status: 'Pending',
          history: [
            {
              id: 'H-1',
              timestamp: '2026-09-01T16:45:00Z',
              action: 'NDR Raised by Delhivery field agent',
              notes: 'Door locked, phone unreachable',
              actor: 'Delhivery API'
            }
          ]
        },
        escalations: [],
        createdAt: '2026-08-28T09:30:00Z',
        updatedAt: '2026-09-01T17:00:00Z'
      }
    ]
  },
  {
    id: 'ORD-98213',
    orderNumber: 'VY-2026-98213',
    customerName: 'Meera Iyer',
    customerPhone: '+919884012399',
    shippingAddress: 'Flat 3B, Ceebros Heights, TTK Road, Alwarpet',
    shippingCity: 'Chennai',
    shippingState: 'Tamil Nadu',
    shippingPincode: '600018',
    source: 'WhatsApp',
    sourceHandle: '+919884012399',
    paymentMode: 'Prepaid',
    totalOrderValue: 6400,
    totalCodBalance: 0,
    orderDate: '2026-08-29T11:00:00Z',
    status: 'InProcurement',
    hasNdr: false,
    hasEscalation: false,
    items: [
      {
        id: 'ITEM-401',
        orderId: 'ORD-98213',
        productId: 'PRD-SLK-40',
        productName: 'Tussar Georgette Handwoven Dupatta',
        sku: 'VY-TUS-DUP-40',
        quantity: 2,
        unitPrice: 3200,
        totalPrice: 6400,
        proportionalCodAmount: 0,
        photoUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        packageId: 'PKG-98213-1'
      }
    ],
    packages: [
      {
        id: 'PKG-98213-1',
        packageNumber: 1,
        orderId: 'ORD-98213',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        fulfillmentPath: 'ProcureToShip',
        items: [],
        itemCount: 2,
        packageValue: 6400,
        codAmount: 0,
        weightKg: 0.6,
        dimensionsCm: { length: 28, width: 22, height: 4 },
        procurementStage: 'Inbound',
        procurementInboundAwb: 'BLUEDART-CHN-77123',
        procurementInboundCourier: 'BlueDart',
        procurementDispatchedAt: '2026-08-31T16:00:00Z',
        currentTrackingStatus: 'In Transit to Central Hub via BlueDart (BLUEDART-CHN-77123)',
        isNdr: false,
        escalations: [],
        createdAt: '2026-08-29T11:30:00Z',
        updatedAt: '2026-08-31T16:00:00Z'
      }
    ]
  },
  {
    id: 'ORD-98214',
    orderNumber: 'VY-2026-98214',
    customerName: 'Ritu Agarwal',
    customerPhone: '+919811223344',
    shippingAddress: 'C-4/18, Safdarjung Development Area (SDA), Hauz Khas',
    shippingCity: 'New Delhi',
    shippingState: 'Delhi',
    shippingPincode: '110016',
    source: 'Instagram',
    sourceHandle: '@ritu_delhi',
    paymentMode: 'COD',
    totalOrderValue: 8900,
    totalCodBalance: 8900,
    orderDate: '2026-08-26T18:00:00Z',
    status: 'Delivered',
    hasNdr: false,
    hasEscalation: false,
    items: [
      {
        id: 'ITEM-501',
        orderId: 'ORD-98214',
        productId: 'PRD-LHN-01',
        productName: 'Bridal Velvet Lehenga - Wine Red',
        sku: 'VY-VEL-WIN-01',
        quantity: 1,
        unitPrice: 8900,
        totalPrice: 8900,
        proportionalCodAmount: 8900,
        photoUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&q=80',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        packageId: 'PKG-98214-1'
      }
    ],
    packages: [
      {
        id: 'PKG-98214-1',
        packageNumber: 1,
        orderId: 'ORD-98214',
        vendorId: 'VND-SRT-01',
        vendorName: 'Surat Heritage Silks',
        vendorPhone: '+919825012345',
        fulfillmentPath: 'ProcureToShip',
        items: [],
        itemCount: 1,
        packageValue: 8900,
        codAmount: 8900,
        weightKg: 2.1,
        dimensionsCm: { length: 40, width: 32, height: 12 },
        procurementStage: 'ReceivedAtHub',
        delhiveryAwbNumber: '14829103851001',
        delhiveryLabelPdfUrl: 'https://cdn.vayyari.com/labels/14829103851001.pdf',
        delhiveryRoutingCode: 'DEL/HKH/01',
        delhiveryStatus: 'Delivered (Cash Collected: ₹8,900)',
        currentTrackingStatus: 'Delivered on Aug 29. COD Collected ₹8,900',
        isNdr: false,
        escalations: [],
        createdAt: '2026-08-26T18:30:00Z',
        updatedAt: '2026-08-29T17:10:00Z'
      }
    ]
  }
];

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

// In-memory state store for interactive development
let ordersStore = SAMPLE_MOCK_ORDERS.map(attachItemsToPackages);

export const logisticsService = {
  /**
   * List all logistics orders with optional search and filter
   */
  listOrders: async (filter?: OrderFulfillmentStatus | 'All', query?: string): Promise<LogisticsOrder[]> => {
    try {
      const res = await productMgmtApiClient.get<LogisticsOrder[]>(API_ROUTES.LOGISTICS.ORDERS_LIST, {
        params: { status: filter !== 'All' ? filter : undefined, q: query }
      });
      if (res && Array.isArray(res) && res.length > 0) {
        return res.map(attachItemsToPackages);
      }
    } catch {
      // Fall back to local store
    }

    let list = [...ordersStore];
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

    // Create dynamic placeholder if not in sample
    const newOrder: LogisticsOrder = {
      id: orderId,
      orderNumber: orderId.startsWith('VY-') ? orderId : `VY-2026-${orderId}`,
      customerName: 'Customer',
      customerPhone: '+919876543210',
      shippingAddress: 'Delivery Address',
      shippingCity: 'Bengaluru',
      shippingState: 'Karnataka',
      shippingPincode: '560001',
      source: 'WhatsApp',
      paymentMode: 'COD',
      totalOrderValue: 2500,
      totalCodBalance: 2500,
      orderDate: new Date().toISOString(),
      status: 'PendingFulfillment',
      hasNdr: false,
      hasEscalation: false,
      items: [
        {
          id: `ITEM-${orderId}-1`,
          orderId,
          productId: 'PRD-DEFAULT',
          productName: 'Order Item 1',
          quantity: 1,
          unitPrice: 2500,
          totalPrice: 2500,
          proportionalCodAmount: 2500,
          vendorId: 'VND-DEFAULT',
          vendorName: 'Default Vendor',
          packageId: `PKG-${orderId}-1`
        }
      ],
      packages: [
        {
          id: `PKG-${orderId}-1`,
          packageNumber: 1,
          orderId,
          vendorId: 'VND-DEFAULT',
          vendorName: 'Default Vendor',
          fulfillmentPath: 'ProcureToShip',
          items: [],
          itemCount: 1,
          packageValue: 2500,
          codAmount: 2500,
          weightKg: 0.5,
          dimensionsCm: { length: 25, width: 20, height: 5 },
          procurementStage: 'Pending',
          currentTrackingStatus: 'Pending Vendor Dispatch',
          isNdr: false,
          escalations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
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
   * Generate Delhivery COD AWB & Thermal Label
   */
  generateDelhiveryAwb: async (request: GenerateDelhiveryAwbRequest): Promise<GenerateDelhiveryAwbResponse> => {
    try {
      const res = await productMgmtApiClient.post<GenerateDelhiveryAwbResponse>(
        API_ROUTES.LOGISTICS.GENERATE_DELHIVERY_AWB(request.orderId, request.packageId),
        request
      );
      if (res && res.awbNumber) return res;
    } catch {
      // Fallback generator
    }

    const awbNumber = `1482910${Math.floor(1000000 + Math.random() * 9000000)}`;
    const routingCode = `BLR/HUB/${Math.floor(10 + Math.random() * 90)}`;
    const labelPdfUrl = `https://cdn.vayyari.com/labels/${awbNumber}.pdf`;
    const barcodeData = `DELHIVERY:${awbNumber}:${request.codAmount}`;

    ordersStore = ordersStore.map(order => {
      if (order.id !== request.orderId) return order;
      const updatedPackages = order.packages.map(pkg => {
        if (pkg.id === request.packageId) {
          return {
            ...pkg,
            delhiveryAwbNumber: awbNumber,
            delhiveryRoutingCode: routingCode,
            delhiveryLabelPdfUrl: labelPdfUrl,
            weightKg: request.weightKg,
            dimensionsCm: request.dimensionsCm,
            codAmount: request.codAmount,
            delhiveryStatus: 'AWB Generated - Manifest Ready',
            currentTrackingStatus: `Delhivery AWB Generated (${awbNumber})`,
            updatedAt: new Date().toISOString()
          };
        }
        return pkg;
      });
      return { ...order, packages: updatedPackages, status: 'InTransit' as OrderFulfillmentStatus };
    });

    return {
      awbNumber,
      routingCode,
      labelPdfUrl,
      barcodeData,
      estimatedDeliveryDate: new Date(Date.now() + 3 * 86400000).toLocaleDateString()
    };
  },

  /**
   * Schedule Delhivery Pickup
   */
  schedulePickup: async (request: SchedulePickupRequest): Promise<{ success: boolean; pickupToken: string }> => {
    try {
      await productMgmtApiClient.post(
        API_ROUTES.LOGISTICS.SCHEDULE_PICKUP(request.orderId, request.packageId),
        request
      );
    } catch {
      // Fallback simulation
    }

    const pickupToken = `PU-DLV-${Date.now().toString().slice(-6)}`;
    ordersStore = ordersStore.map(order => {
      if (order.id !== request.orderId) return order;
      const updatedPackages = order.packages.map(pkg => {
        if (pkg.id === request.packageId) {
          return {
            ...pkg,
            delhiveryPickupDate: request.pickupDate,
            delhiveryPickupTimeSlot: request.timeSlot,
            delhiveryPickupScheduled: true,
            delhiveryStatus: `Pickup Scheduled for ${request.pickupDate} (${request.timeSlot})`,
            updatedAt: new Date().toISOString()
          };
        }
        return pkg;
      });
      return { ...order, packages: updatedPackages };
    });

    return { success: true, pickupToken };
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
  }
};
