export type NoLabelSlaViolationType = 'DISPATCH_OVERDUE' | 'DELIVERY_OVERDUE';

export interface NoLabelSlaResult {
  isOverdue: boolean;
  type?: NoLabelSlaViolationType;
  daysElapsed?: number;
  thresholdDays?: number;
}

export interface SlaCheckableOrder {
  status?: string;
  orderDate?: string | Date;
  placedAt?: string | Date;
  hasLabel?: boolean;
  packages?: Array<{
    delhiveryAwbNumber?: string;
    delhiveryLabelPdfUrl?: string;
    awbNumber?: string;
  }>;
}

/**
 * Evaluates whether a no-label order has breached dispatch or delivery SLAs:
 * 1. Dispatch SLA: >= 3 days since placed, still in Ready to Ship / Pending.
 * 2. Delivery SLA: >= 12 days since placed, still In Transit.
 */
export function evaluateNoLabelSla(order: SlaCheckableOrder): NoLabelSlaResult {
  if (!order) return { isOverdue: false };

  // If order explicitly has a Delhivery label or package has Delhivery tracking, SLA does not apply
  const hasDelhiveryLabel =
    order.hasLabel === true ||
    (Array.isArray(order.packages) &&
      order.packages.some((p) => !!p.delhiveryAwbNumber || !!p.delhiveryLabelPdfUrl));

  if (hasDelhiveryLabel) {
    return { isOverdue: false };
  }

  const anchorDate = order.placedAt || order.orderDate;
  if (!anchorDate) return { isOverdue: false };

  const placedTime = new Date(anchorDate).getTime();
  if (isNaN(placedTime)) return { isOverdue: false };

  const now = Date.now();
  const diffDays = Math.max(0, Math.floor((now - placedTime) / (1000 * 60 * 60 * 24)));

  const statusNorm = (order.status || '').toLowerCase().replace(/[\s_-]+/g, '');

  // 1. Ready to Ship for >= 3 days since order placed
  const isReadyToShip =
    statusNorm === 'readytoship' ||
    statusNorm === 'pendingfulfillment' ||
    statusNorm === 'inprocurement' ||
    statusNorm === 'placed';

  if (isReadyToShip && diffDays >= 3) {
    return {
      isOverdue: true,
      type: 'DISPATCH_OVERDUE',
      daysElapsed: diffDays,
      thresholdDays: 3,
    };
  }

  // 2. In Transit for >= 12 days since order placed
  const isInTransit = statusNorm === 'intransit';

  if (isInTransit && diffDays >= 12) {
    return {
      isOverdue: true,
      type: 'DELIVERY_OVERDUE',
      daysElapsed: diffDays,
      thresholdDays: 12,
    };
  }

  return { isOverdue: false };
}
