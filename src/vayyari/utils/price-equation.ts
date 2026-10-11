/**
 * Formats line item price or COD equation for order package display.
 * 
 * Rules:
 * - Prepaid orders: Displays base price (e.g. ₹800, ₹1,000)
 * - COD orders: Displays equation `price + COD - paid = total` (e.g. 800 + 50 - 0 = 850)
 */
export function formatItemPriceEquation(
  item: { costPerPiece?: number; quantity?: number; codChargePerPiece?: number; amountPaid?: number },
  isCod?: boolean
): string {
  const itemQty = item.quantity || 1;
  const itemPrice = (item.costPerPiece || 0) * itemQty;
  if (!isCod) {
    return `₹${itemPrice.toLocaleString('en-IN')}`;
  }
  const codPerPiece = item.codChargePerPiece ?? 50;
  const itemCod = codPerPiece * itemQty;
  const itemPaid = item.amountPaid || 0;
  const itemTotal = Math.max(0, itemPrice + itemCod - itemPaid);
  return `${itemPrice} + ${itemCod} - ${itemPaid} = ${itemTotal}`;
}
