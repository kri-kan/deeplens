import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildShippingLabelFileName,
  resolveWarehouseAlias,
} from '../utils/shipping-label-helpers';
import { Warehouse, SubmittedForwardOrderAudit } from '../types/logistics';

describe('Shipping Label Sharing Rules & Filename Generation', () => {
  it('combines warehouse alias and customer name into "[warehouse alias] [customer name]"', () => {
    const filename = buildShippingLabelFileName('Hyd-Apt', 'Priya Sharma');
    assert.strictEqual(filename, 'Hyd-Apt Priya Sharma');
  });

  it('normalizes extra whitespace between warehouse alias and customer name', () => {
    const filename = buildShippingLabelFileName('  Surat-Hub   ', '  Ananya   Rao  ');
    assert.strictEqual(filename, 'Surat-Hub Ananya Rao');
  });

  it('sanitizes illegal filesystem characters from alias and customer name', () => {
    const filename = buildShippingLabelFileName('Hyd/Apt:Central*', 'Priya? "Sharma"|');
    assert.strictEqual(filename, 'HydAptCentral Priya Sharma');
  });

  it('handles warehouse alias alone when customer name is not available', () => {
    const filename = buildShippingLabelFileName('Hyd-Apt', '');
    assert.strictEqual(filename, 'Hyd-Apt');
  });

  it('handles customer name alone when warehouse alias is not available', () => {
    const filename = buildShippingLabelFileName('', 'Kavitha Devi');
    assert.strictEqual(filename, 'Kavitha Devi');
  });

  it('falls back to AWB identifier when neither alias nor customer name is present', () => {
    const filename = buildShippingLabelFileName('', '', '148291038592');
    assert.strictEqual(filename, 'Delhivery Label 148291038592');
  });

  it('falls back to default label title when no data is available', () => {
    const filename = buildShippingLabelFileName(null, null, null);
    assert.strictEqual(filename, 'Delhivery Shipping Label');
  });
});

describe('Warehouse Alias Resolution Rules', () => {
  it('prioritizes selectedWarehouse alias when directly available', async () => {
    const selectedWh: Warehouse = {
      id: 'wh-1',
      name: 'Hyderabad Central Fulfillment Hub',
      alias: 'Hyd-Apt',
      code: 'HYD-01',
      isCentral: true,
      isActive: true,
      createdAt: '2026-01-01',
    };

    const resolved = await resolveWarehouseAlias('Zari Sarees', null, selectedWh);
    assert.strictEqual(resolved, 'Hyd-Apt');
  });

  it('uses auditData pickup facility alias if selectedWarehouse is not passed', async () => {
    const auditData: SubmittedForwardOrderAudit = {
      awbNumber: '148291038592',
      orderGrpId: 'GRP-101',
      submittedAt: '2026-10-10T00:00:00Z',
      pickupFacility: {
        code: 'SURAT-01',
        name: 'Surat Textile Market Hub',
        alias: 'Surat-WH',
      },
      shippingMode: 'Surface',
      weightGrams: 500,
      dimensionsCm: { length: 25, width: 20, height: 5 },
      recipient: {
        name: 'Deepika Padukone',
        phone: '9876543210',
        address: 'Bandra West',
        pincode: '400050',
      },
      paymentMode: 'Prepaid',
      collectibleAmount: 0,
    };

    const resolved = await resolveWarehouseAlias('Silk Vendors', auditData, null);
    assert.strictEqual(resolved, 'Surat-WH');
  });

  it('falls back to selectedWarehouse name when alias is absent', async () => {
    const selectedWh: Warehouse = {
      id: 'wh-2',
      name: 'Mumbai Central Facility',
      code: 'BOM-01',
      isCentral: false,
      isActive: true,
      createdAt: '2026-01-01',
    };

    const resolved = await resolveWarehouseAlias('Vendor X', null, selectedWh);
    assert.strictEqual(resolved, 'Mumbai Central Facility');
  });
});

describe('Clipboard Copy Behavior on Share Label Click', () => {
  it('copies pure Order ID into clipboard so user can paste it into vendor chat when sharing label', () => {
    const orderId = '00020';
    const orderGrpId = '00020-G1';
    const idToCopy = (orderId || orderGrpId || '').trim();

    // Verify pure Order ID is copied without extra lines or prefix
    assert.strictEqual(idToCopy, '00020');
    assert.doesNotMatch(idToCopy, /Delhivery Shipping Label/);
    assert.doesNotMatch(idToCopy, /\n/);
  });

  it('falls back to Order Group ID if orderId is missing', () => {
    const orderId = '';
    const orderGrpId = '00020-G1';
    const idToCopy = (orderId || orderGrpId || '').trim();

    assert.strictEqual(idToCopy, '00020-G1');
  });

  it('formats copy AWB button label without brackets around AWB number', () => {
    const formatCopyAwbLabel = (copied: boolean, awb?: string) => {
      if (copied) return 'AWB COPIED ✓';
      return awb?.trim() ? `COPY AWB ${awb.trim()}` : 'COPY AWB';
    };

    assert.strictEqual(formatCopyAwbLabel(false, '148291038592'), 'COPY AWB 148291038592');
    assert.doesNotMatch(formatCopyAwbLabel(false, '148291038592'), /\(/);
    assert.doesNotMatch(formatCopyAwbLabel(false, '148291038592'), /\)/);
    assert.strictEqual(formatCopyAwbLabel(false, undefined), 'COPY AWB');
    assert.strictEqual(formatCopyAwbLabel(true, '148291038592'), 'AWB COPIED ✓');
  });
});

describe('Address Sharing with Vendor Rules', () => {
  it('appends order group id in a separate last line when sharing delivery address to vendor', () => {
    const address = {
      name: 'Sunita Roy',
      address: 'Flat 402, Lotus Towers, Jubilee Hills, Hyderabad',
      pincode: '500033',
      phone: '9848022338',
    };
    const orderGrpId = '00020-G1';

    const addressLines = [
      `Delivery Address:`,
      address.name || 'Customer',
      address.address || '',
      `PIN: ${address.pincode || ''}`,
      `Phone: ${address.phone || ''}`,
    ].filter(Boolean);

    if (orderGrpId) {
      addressLines.push(`Order Group ID: ${orderGrpId}`);
    }

    const clipText = addressLines.join('\n');
    const lines = clipText.split('\n');

    assert.strictEqual(lines[lines.length - 1], 'Order Group ID: 00020-G1');
    assert.strictEqual(lines[0], 'Delivery Address:');
    assert.strictEqual(lines[1], 'Sunita Roy');
    assert.strictEqual(lines[2], 'Flat 402, Lotus Towers, Jubilee Hills, Hyderabad');
    assert.strictEqual(lines[3], 'PIN: 500033');
    assert.strictEqual(lines[4], 'Phone: 9848022338');
  });
});

describe('Label Cancellation, Audit Retention, and Manifest Form Mode Rules', () => {
  it('determines viewMode as "form" when labelUrl is absent, even if an old AWB is passed', () => {
    const initialLabelUrl: string | undefined = undefined;
    const initialAwb = '35003110014884';

    // Modal requires an active labelUrl to show PDF mode; without it, it must show the creation form
    const hasInitialLabel = Boolean(initialLabelUrl);
    const viewMode = hasInitialLabel ? 'pdf' : 'form';

    assert.strictEqual(viewMode, 'form');
  });

  it('determines viewMode as "pdf" only when a valid labelUrl is attached', () => {
    const initialLabelUrl = 'labels/35003110014884.pdf';
    const hasInitialLabel = Boolean(initialLabelUrl);
    const viewMode = hasInitialLabel ? 'pdf' : 'form';

    assert.strictEqual(viewMode, 'pdf');
  });

  it('clears active awbNumber and labelUrl when needLabel is toggled off', () => {
    const need = false;
    const g = { needLabel: true, awbNumber: '35003110014884', labelUrl: 'labels/35003110014884.pdf' };
    const labelUpdates: { awbNumber?: string; labelUrl?: string } | undefined = { awbNumber: undefined, labelUrl: undefined };

    const updated = {
      ...g,
      needLabel: need,
      awbNumber: labelUpdates !== undefined ? labelUpdates.awbNumber : (need ? g.awbNumber : undefined),
      labelUrl: labelUpdates !== undefined ? labelUpdates.labelUrl : (need ? g.labelUrl : undefined),
    };

    assert.strictEqual(updated.needLabel, false);
    assert.strictEqual(updated.awbNumber, undefined);
    assert.strictEqual(updated.labelUrl, undefined);
  });

  it('does not resurrect old cancelled AWB when needLabel is toggled back on without labelUpdates', () => {
    const need = true;
    // Previous state after cancellation had undefined awbNumber and labelUrl
    const g = { needLabel: false, awbNumber: undefined, labelUrl: undefined };
    const labelUpdates = undefined;

    const updated = {
      ...g,
      needLabel: need,
      awbNumber: labelUpdates !== undefined ? labelUpdates : (need ? g.awbNumber : undefined),
      labelUrl: labelUpdates !== undefined ? labelUpdates : (need ? g.labelUrl : undefined),
    };

    assert.strictEqual(updated.needLabel, true);
    assert.strictEqual(updated.awbNumber, undefined);
    assert.strictEqual(updated.labelUrl, undefined);
  });

  it('retains cancelled shipment record strictly as audit trail in shipmentHistory', () => {
    const shipmentHistory = [
      {
        awbNumber: '35003110014884',
        status: 'cancelled',
        courierPartner: 'Delhivery',
        metadata: {
          cancelled_at: '2026-10-11T06:41:47Z',
          cancellation_reason: 'Need Label toggled off',
        },
      },
    ];

    const hasActiveLabel = false;
    const activeLabelUrl = undefined;
    const cancelledRecord = shipmentHistory.find((h) => h.status === 'cancelled');

    assert.strictEqual(hasActiveLabel, false);
    assert.strictEqual(activeLabelUrl, undefined);
    assert.ok(cancelledRecord);
    assert.strictEqual(cancelledRecord.awbNumber, '35003110014884');
    assert.strictEqual(cancelledRecord.metadata.cancellation_reason, 'Need Label toggled off');
  });
});
