/**
 * Commercial calculation rules for Store & Admin Curation
 */

/**
 * Calculate discount percentage given MRP and Sale Price
 * Clamped to 0 if sale price is greater than or equal to MRP, or if MRP <= 0
 */
export function calculateDiscountPercent(mrp: number, salePrice: number): number {
  if (mrp <= 0 || salePrice <= 0 || mrp <= salePrice) {
    return 0;
  }
  return Math.round(((mrp - salePrice) / mrp) * 100);
}

/**
 * Calculate gross margin in currency amount
 * Gross Margin = Sale Price - Base Cost
 */
export function calculateGrossMargin(salePrice: number, baseCost: number): number {
  return salePrice - baseCost;
}

/**
 * Calculate gross margin percentage
 * Margin % = (Gross Margin / Sale Price) * 100
 * Clamped to 0 if sale price <= 0
 */
export function calculateMarginPercent(salePrice: number, baseCost: number): number {
  if (salePrice <= 0) return 0;
  const gross = calculateGrossMargin(salePrice, baseCost);
  return Math.round((gross / salePrice) * 100);
}

/**
 * Format currency in Indian numbering format (₹1,23,456)
 */
export function formatIndianCurrency(amount: number): string {
  return amount.toLocaleString('en-IN');
}
