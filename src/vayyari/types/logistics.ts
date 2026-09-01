export type OrderFulfillmentStatus = 
  | 'PendingFulfillment'
  | 'InProcurement'
  | 'InTransit'
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
  status: OrderFulfillmentStatus;
  items: FulfillmentItem[];
  packages: FulfillmentPackage[];
  hasNdr: boolean;
  hasEscalation: boolean;
  notes?: string;
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
