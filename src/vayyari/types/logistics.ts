export type OrderFulfillmentStatus = 
  | 'PendingFulfillment'
  | 'ReadyToShip'
  | 'ReadyForPickup'
  | 'PickupScheduled'
  | 'InProcurement'
  | 'InTransit'
  | 'OutForDelivery'
  | 'NdrActionNeeded'
  | 'Delivered'
  | 'RTO'
  | 'Cancelled';

export type FulfillmentPath = 
  | 'DirectVendor'    // Path A: Vendor dropships directly to customer
  | 'ProcureToShip'   // Path B: Vendor ships to Central Hub, Hub inspects & dispatches
  | 'CentralHubStock'; // In-stock at Central Hub, direct Delhivery dispatch

export type ProcurementStage = 
  | 'Pending'        // Waiting for vendor to accept / dispatch to Hub
  | 'Inbound'        // Dispatched by vendor to Central Hub (in transit to hub)
  | 'ReceivedAtHub'; // Received & QC'd at Hub (ready for Delhivery COD AWB creation)

export type CourierName = 
  | 'Delhivery'
  | 'BlueDart'
  | 'DTDC'
  | 'IndiaPost'
  | 'ShreeMaruti'
  | 'Custom';

export type NdrExceptionReason = 
  | 'CustomerUnavailable'
  | 'WrongIncompleteAddress'
  | 'CustomerRefused'
  | 'CodNotReady'
  | 'CustomerRequestedFutureDelivery'
  | 'RestrictedEntry'
  | 'DeliveryLocationPincodeIssue'
  | 'Other';

export type NdrActionStatus = 
  | 'Pending'
  | 'ReattemptScheduled'
  | 'AddressUpdated'
  | 'BuyerContacted'
  | 'RTORequested'
  | 'Delivered';

export type EscalationStatus = 
  | 'Open'
  | 'Investigating'
  | 'UnderCourierReview'
  | 'ClaimApproved'
  | 'Resolved'
  | 'Closed';

export type EscalationIssueType = 
  | 'FakeDeliveryAttempt'
  | 'LostInTransit'
  | 'DamagedGoods'
  | 'WeightDiscrepancy'
  | 'CodRemittanceDelay'
  | 'CourierMisbehavior'
  | 'Other';

export interface FulfillmentItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  proportionalCodAmount: number;
  photoUrl?: string;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  packageId?: string;
}

export interface NdrHistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  notes?: string;
  actor: string;
}

export interface NdrException {
  id: string;
  orderId: string;
  packageId: string;
  awbNumber: string;
  courier: CourierName;
  reason: NdrExceptionReason;
  reasonText: string;
  attemptNumber: number;
  attemptedAt: string;
  buyerFeedback?: string;
  status: NdrActionStatus;
  scheduledReattemptDate?: string;
  correctedAddress?: string;
  correctedPhone?: string;
  remarks?: string;
  history: NdrHistoryEntry[];
}

export interface LogisticsEscalation {
  id: string;
  orderId: string;
  packageId: string;
  awbNumber: string;
  courier: CourierName;
  issueType: EscalationIssueType;
  title: string;
  description: string;
  status: EscalationStatus;
  delhiveryCrmTicketId?: string;
  claimAmount?: number;
  createdAt: string;
  updatedAt: string;
  resolutionNotes?: string;
}

export interface FulfillmentPackage {
  id: string;
  packageNumber: number;
  orderId: string;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  fulfillmentPath: FulfillmentPath;
  items: FulfillmentItem[];
  itemCount: number;
  packageValue: number;
  codAmount: number; // Proportional COD allocation for this package
  weightKg: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  
  // Path B: Procure-to-Ship tracking
  procurementStage: ProcurementStage;
  procurementInboundAwb?: string;
  procurementInboundCourier?: string;
  procurementDispatchedAt?: string;
  procurementReceivedAt?: string;

  // Path A: Direct Vendor Fulfillment tracking
  vendorAwbNumber?: string;
  vendorCourierName?: string;
  vendorLabelAttachmentUrl?: string;
  vendorTrackingUrl?: string;
  vendorSharedOnWhatsAppAt?: string;
  trackingSharedWithCustomerAt?: string;

  // Delhivery Direct Dispatch details
  delhiveryAwbNumber?: string;
  delhiveryLabelPdfUrl?: string;
  delhiveryRoutingCode?: string;
  delhiveryPickupDate?: string;
  delhiveryPickupLocation?: string;
  pickupLocation?: string;
  delhiveryPickupTimeSlot?: string;
  delhiveryPickupScheduled?: boolean;
  delhiveryStatus?: string;

  // Current operational tracking status
  currentTrackingStatus: string;
  isNdr: boolean;
  ndrException?: NdrException;
  escalations: LogisticsEscalation[];
  createdAt: string;
  updatedAt: string;
}

export interface LogisticsOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  source: 'WhatsApp' | 'Instagram' | 'Web' | 'Manual';
  sourceHandle?: string;
  paymentMode: 'COD' | 'Prepaid';
  totalOrderValue: number;
  totalCodBalance: number;
  orderDate: string;
  placedAt?: string;
  hasLabel?: boolean;
  status: OrderFulfillmentStatus;
  items: FulfillmentItem[];
  packages: FulfillmentPackage[];
  hasNdr: boolean;
  hasEscalation: boolean;
  notes?: string;
}

export interface MarkInTransitPayload {
  orderId: string;
  packageId?: string;
  courierName?: string;
  awbNumber?: string;
  labelAttachmentUrl?: string;
  notes?: string;
}

export interface SelectedPickupFacility {
  displayName: string;     // e.g. "Hyd apartment (hyd)"
  alias: string;           // e.g. "hyd"
  canonicalName: string;   // e.g. "Hyd apartment" (registered with Delhivery)
  code: string;            // e.g. "HYD-APT"
  id: string;              // UUID
  pincode: string;
}

export interface GenerateDelhiveryAwbRequest {
  orderId: string;
  packageId: string;
  weightKg: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  codAmount: number;
  pickupLocationName?: string;
  warehouseId?: string;
  warehouseCode?: string;
  canonicalPickupLocation?: string;
}

export interface GenerateDelhiveryAwbResponse {
  awbNumber: string;
  routingCode: string;
  labelPdfUrl: string;
  barcodeData: string;
  estimatedDeliveryDate?: string;
}

export interface SchedulePickupRequest {
  orderId: string;
  packageId: string;
  pickupDate: string;
  timeSlot: string;
  pickupLocation: string;
  expectedPackageCount: number;
}

export interface NdrActionRequest {
  ndrId: string;
  action: 'Reattempt' | 'UpdateAddress' | 'RequestRTO' | 'BuyerContacted';
  scheduledDate?: string;
  updatedAddress?: string;
  updatedPhone?: string;
  notes?: string;
}

export interface CreateEscalationRequest {
  orderId: string;
  packageId: string;
  awbNumber: string;
  courier: CourierName;
  issueType: EscalationIssueType;
  title: string;
  description: string;
  claimAmount?: number;
}

// --- Warehouse / Facility Types ---

export interface Warehouse {
  id: string;
  name: string;
  alias?: string;
  code: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  contactPerson?: string;
  isCentral: boolean;
  isStarred?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateWarehouseRequest {
  name: string;
  alias?: string;
  code: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  contactPerson?: string;
  isCentral: boolean;
  registerWithDelhivery?: boolean;
}

export interface UpdateWarehouseRequest {
  name?: string;
  alias?: string;
  code?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  contactPerson?: string;
  isCentral?: boolean;
  isActive?: boolean;
  updateDelhivery?: boolean;
}

export interface WarehouseSyncResponse {
  success: boolean;
  message: string;
  warehouses: Warehouse[];
  syncedAt: string;
}

export interface ShippingEstimateRequest {
  originPincode?: string;
  destinationPincode: string;
  shippingMode: 'Surface' | 'Express';
  weightGrams: number;
  paymentMode: 'Prepaid' | 'COD';
  codAmount?: number;
}

export interface ShippingEstimateResponse {
  estimatedCost: number;
  estimatedCostFormatted: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  estimatedDaysFormatted: string;
  zone: string;
  isServiceable: boolean;
}

export interface SubmittedForwardOrderAudit {
  awbNumber: string;
  orderGrpId: string;
  orderId?: string;
  quantity?: number;
  productsDesc?: string;
  totalAmount?: number;
  submittedAt: string;
  pickupFacility: {
    code: string;
    name: string;
    alias?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  shippingMode: 'Surface' | 'Express';
  weightGrams: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    city?: string;
    state?: string;
  };
  paymentMode: 'COD' | 'Prepaid';
  collectibleAmount: number;
}

export interface GroupShipmentHistoryItem {
  id?: string;
  orderGrpId?: string;
  awbNumber: string;
  status: string;
  courierPartner?: string;
  shippingMode?: string;
  metadata?: {
    cancelled_at?: string;
    cancellation_reason?: string;
    manifestedAt?: string;
    orderGrpId?: string;
    pickupLocation?: string;
    pickupAddress?: string;
    pickupCity?: string;
    pickupPin?: string;
    pickupPhone?: string;
    shippingMode?: string;
    weightGrams?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    paymentMode?: string;
    codAmount?: number;
    totalAmount?: number;
    quantity?: number;
    productsDesc?: string;
    sellerName?: string;
    sellerAddress?: string;
    resellerName?: string;
    orderType?: string;
    [key: string]: any;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PickupRequestDto {
  pickupLocation: string;
  pickupDate?: string;
  pickupTime?: string;
  expectedPackageCount?: number;
  orderGrpId?: string;
  awbNumber?: string;
  warehouseId?: string;
  warehouseCode?: string;
}

export interface PickupResponseDto {
  success: boolean;
  pickupId?: string;
  pickupToken?: string;
  pickupDate?: string;
  pickupTime?: string;
  pickupSlot?: string;
  pickupLocation?: string;
  message?: string;
  prExist?: boolean;
}
