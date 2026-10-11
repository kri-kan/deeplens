/**
 * Formats raw Delhivery API responses and exceptions into user-friendly messages for UI alerts.
 * Strips internal stack traces and technical wrappers for both known rules and unhandled scenarios.
 */
export function formatDelhiveryErrorMessage(rawError?: string | null): string {
  if (!rawError || !rawError.trim()) {
    return 'Shipment manifestation failed with Delhivery. Please check order details and try again.';
  }

  let trimmed = rawError.trim();

  // Strip prefix "Delhivery manifestation failed:"
  if (trimmed.toLowerCase().startsWith('delhivery manifestation failed:')) {
    trimmed = trimmed.substring('delhivery manifestation failed:'.length).trim();
  }

  // If JSON payload is embedded e.g. {"status": "Fail", "remarks": ["..."]} or {"error": "..."}
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    const jsonCandidate = trimmed.substring(jsonStart, jsonEnd + 1);
    try {
      const parsed = JSON.parse(jsonCandidate);
      if (parsed.error && typeof parsed.error === 'string' && parsed.error.trim()) {
        trimmed = parsed.error.trim();
      } else if (parsed.message && typeof parsed.message === 'string' && parsed.message.trim()) {
        trimmed = parsed.message.trim();
      } else if (Array.isArray(parsed.remarks) && parsed.remarks.length > 0 && typeof parsed.remarks[0] === 'string') {
        trimmed = parsed.remarks[0].trim();
      } else if (typeof parsed.remarks === 'string' && parsed.remarks.trim()) {
        trimmed = parsed.remarks.trim();
      }
    } catch {
      // Keep as-is if JSON parse fails
    }
  }

  // Extract inner message if wrapped in Delhivery exception quotes:
  // "Crashing while saving package due to exception '...'. Package might have been partially saved."
  const exceptionMatch = trimmed.match(/exception\s+['"]([\s\S]*?)('(?:\.\s*Package might have been partially saved|\s*$))/i);
  let innerMessage = exceptionMatch ? exceptionMatch[1].trim() : trimmed;

  if (!innerMessage) {
    innerMessage = trimmed;
  }

  const lower = innerMessage.toLowerCase();

  // ── 1. Known Domain Categories ──

  // (A) Insufficient Wallet Balance
  if (
    lower.includes('insufficient balance') ||
    lower.includes('manifest charge api failed') ||
    lower.includes('prepaid client manifest charge')
  ) {
    return 'Delhivery prepaid wallet balance is insufficient. Please recharge your Delhivery wallet on the Delhivery client panel (one.delhivery.com).';
  }

  // (B) Warehouse / Pickup Location Issues
  if (
    lower.includes('client warehouse') &&
    (lower.includes("doesn't exist") || lower.includes('does not exist') || lower.includes('not found'))
  ) {
    const whMatch = innerMessage.match(/Client Warehouse\s+([^\s]+)\s+doesn/i);
    const whName = whMatch ? ` '${whMatch[1]}'` : '';
    return `Pickup facility/warehouse${whName} is not registered or active with Delhivery. Please verify your warehouse configuration in Delhivery panel.`;
  }
  if (
    lower.includes('pickup location') &&
    (lower.includes('not found') || lower.includes('invalid'))
  ) {
    return 'Pickup facility is not recognized by Delhivery. Please check the warehouse code.';
  }

  // (C) Pincode Serviceability & Shipping Mode
  if (lower.includes('not serviceable')) {
    return 'Destination pincode is not serviceable by Delhivery for the selected shipping mode.';
  }
  if (lower.includes('pincode is invalid') || lower.includes('invalid pin')) {
    return 'Delivery pincode is invalid. Please verify the 6-digit postal code.';
  }

  // (D) Phone / Mobile Number
  if (
    (lower.includes('mobile') && lower.includes('invalid')) ||
    (lower.includes('phone') && lower.includes('invalid'))
  ) {
    return 'Customer phone number is invalid. Delhivery requires a valid 10-digit mobile number.';
  }

  // (E) Duplicate Order / Waybill
  if (lower.includes('already exists') || lower.includes('duplicate')) {
    return 'This order reference or waybill has already been manifested on Delhivery.';
  }

  // (F) Address Missing
  if (
    lower.includes('address') &&
    (lower.includes('required') || lower.includes('empty'))
  ) {
    return 'Customer delivery address cannot be empty.';
  }

  // (G) Weight / Dimension Limits
  if (lower.includes('weight limit') || lower.includes('dimensions exceed')) {
    return 'Shipment weight or dimensions exceed Delhivery limits.';
  }

  // ── 2. Unhandled Scenarios: Clean up noisy technical wrappers ──
  let clean = innerMessage;

  // Remove prefix: "Crashing while saving package due to "
  if (clean.toLowerCase().startsWith('crashing while saving package due to ')) {
    clean = clean.substring('crashing while saving package due to '.length).trim();
  }

  // Remove suffix: ". Package might have been partially saved."
  clean = clean.replace(/\.?\s*Package might have been partially saved\.?/i, '').trim();

  // Remove leading "Delhivery CMU API error: \d+ - " or "Delhivery API error: "
  clean = clean.replace(/^Delhivery(\s+CMU)?\s+API\s+error:\s*\d*\s*-?\s*/i, '').trim();

  // Remove leading "Error: "
  if (clean.toLowerCase().startsWith('error:')) {
    clean = clean.substring('error:'.length).trim();
  }

  clean = clean.trim().replace(/\.+$/, '');
  if (!clean) {
    return 'Shipment manifestation failed with Delhivery. Please verify order details.';
  }

  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  // If clean already begins with "Delhivery", don't double prefix
  if (clean.toLowerCase().startsWith('delhivery:')) {
    return `${clean}.`;
  }

  return `Delhivery: ${clean}.`;
}
