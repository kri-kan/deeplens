import { Warehouse, SubmittedForwardOrderAudit } from '@/types/logistics';

let cachedWarehouses: Warehouse[] | null = null;
let cachedVendors: any[] | null = null;

export interface WarehouseLookupFetchers {
  getWarehouses?: () => Promise<Warehouse[]>;
  getVendors?: () => Promise<any[]>;
}

/**
 * Builds the sanitized PDF file name for a shipping label.
 * Format: "[warehouse alias] [customer name]" (e.g., "Hyd-Apt Priya Sharma")
 */
export function buildShippingLabelFileName(
  warehouseAlias?: string | null,
  customerName?: string | null,
  fallbackAwb?: string | null
): string {
  const cleanAlias = (warehouseAlias || '')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim();
  const cleanCustomer = (customerName || '')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim();

  const parts = [cleanAlias, cleanCustomer].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  const cleanAwb = (fallbackAwb || '')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim();
  return cleanAwb ? `Delhivery Label ${cleanAwb}` : 'Delhivery Shipping Label';
}

/**
 * Resolves the warehouse alias for an order/vendor from audit data, selected warehouse,
 * or the logistics/vendor registry.
 */
export async function resolveWarehouseAlias(
  vendorName?: string | null,
  auditData?: SubmittedForwardOrderAudit | null,
  selectedWarehouse?: Warehouse | null,
  fetchers?: WarehouseLookupFetchers
): Promise<string> {
  // 1. Direct selected warehouse alias
  if (selectedWarehouse?.alias?.trim()) {
    return selectedWarehouse.alias.trim();
  }

  // 2. Previously submitted forward order audit facility alias
  if (auditData?.pickupFacility?.alias?.trim()) {
    return auditData.pickupFacility.alias.trim();
  }

  // 3. Fallback to direct selected warehouse name if available
  if (selectedWarehouse?.name?.trim()) {
    return selectedWarehouse.name.trim();
  }

  // 4. Look up in vendor registry & warehouse registry
  try {
    if (!cachedWarehouses || !cachedVendors) {
      if (fetchers?.getWarehouses && fetchers?.getVendors) {
        const [whList, vList] = await Promise.all([
          fetchers.getWarehouses(),
          fetchers.getVendors(),
        ]);
        cachedWarehouses = whList || [];
        cachedVendors = vList || [];
      } else {
        const { logisticsService } = await import('@/services/logistics.service');
        const { vendorService } = await import('@/services/vendorService');
        const [whList, vendorsData] = await Promise.all([
          logisticsService.getWarehouses().catch(() => []),
          vendorService.listVendors(1, 100).catch(() => ({ vendors: [] })),
        ]);
        cachedWarehouses = whList || [];
        cachedVendors = vendorsData?.vendors || [];
      }
    }

    const isVendorAssigned =
      vendorName && !vendorName.toLowerCase().includes('unassigned');
    const matchedVendor = isVendorAssigned
      ? cachedVendors.find(
          (v: any) =>
            v.vendorName?.trim().toLowerCase() === vendorName?.trim().toLowerCase()
        )
      : null;

    if (matchedVendor?.defaultWarehouseAlias?.trim()) {
      return matchedVendor.defaultWarehouseAlias.trim();
    }

    if (matchedVendor?.defaultWarehouseId) {
      const wh = cachedWarehouses.find(
        (w: Warehouse) => w.id === matchedVendor.defaultWarehouseId
      );
      if (wh?.alias?.trim()) return wh.alias.trim();
      if (wh?.name?.trim()) return wh.name.trim();
    }

    // Default pickup to Hyderabad facility or starred/central warehouse
    const hydWh = cachedWarehouses.find(
      (w: Warehouse) =>
        w.name?.toLowerCase().includes('hyd') ||
        w.code?.toLowerCase().includes('hyd') ||
        w.city?.toLowerCase().includes('hyderabad') ||
        w.pincode === '502325'
    );
    const starredWh = cachedWarehouses.find((w: Warehouse) => w.isStarred);
    const centralWh = cachedWarehouses.find((w: Warehouse) => w.isCentral);
    const defaultWh = hydWh || starredWh || centralWh || cachedWarehouses[0];

    return defaultWh?.alias?.trim() || defaultWh?.name?.trim() || '';
  } catch (err) {
    console.warn('[resolveWarehouseAlias] Failed to resolve warehouse alias:', err);
    return '';
  }
}
