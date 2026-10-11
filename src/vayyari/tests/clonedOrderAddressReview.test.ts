import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Helper simulating the backend cloning comment sanitization logic
 * in IdGeneratorService.cs
 */
function sanitizeClonedComments(rawComments: string | null | undefined): string | null {
  if (!rawComments) return null;
  try {
    const parsed = JSON.parse(rawComments);
    if (typeof parsed === 'object' && parsed !== null) {
      delete parsed.isShared;
      delete parsed.sharedAt;
      delete parsed.isAddressShared;
      delete parsed.addressSharedAt;
      delete parsed.isLabelShared;
      delete parsed.labelSharedAt;
      delete parsed.status;
      delete parsed.awbNumber;
      delete parsed.trackingNumber;
      delete parsed.labelUrl;
      delete parsed.shipmentId;

      if (parsed['cod/pc'] !== undefined && parsed.codChargePerPiece === undefined) {
        parsed.codChargePerPiece = parsed['cod/pc'];
      } else if (parsed.codChargePerPiece !== undefined && parsed['cod/pc'] === undefined) {
        parsed['cod/pc'] = parsed.codChargePerPiece;
      }

      return JSON.stringify(parsed);
    }
  } catch {
    // If not JSON, leave as is
  }
  return rawComments;
}

/**
 * Helper simulating order cloning defaults
 */
function createClonedOrderDefaults(sourceOrder: {
  orderId: string;
  comments?: string | null;
  address?: any;
}) {
  return {
    sourceOrderId: sourceOrder.orderId,
    status: 'Unconfirmed',
    isAddressReviewed: false,
    address: sourceOrder.address ? { ...sourceOrder.address } : null,
    comments: sanitizeClonedComments(sourceOrder.comments),
  };
}

/**
 * State machine simulating AddressCard warning display and dismissal
 */
class AddressReviewStateController {
  private _isAddressReviewed: boolean;
  private _address: any;
  private _apiCalls: Array<{ url: string; body: any }> = [];

  constructor(initialAddress: any, initialIsReviewed: boolean = true) {
    this._address = initialAddress;
    this._isAddressReviewed = initialIsReviewed;
  }

  get isAddressReviewed() {
    return this._isAddressReviewed;
  }

  get shouldShowWarning() {
    return this._isAddressReviewed === false;
  }

  get address() {
    return this._address;
  }

  get apiCalls() {
    return this._apiCalls;
  }

  /**
   * Invoked when user opens edit address sheet and saves modifications
   */
  async handleSaveAddress(orderId: string, updatedAddress: any) {
    this._address = updatedAddress;
    this._isAddressReviewed = true;
    this._apiCalls.push({
      url: `/api/orders/${orderId}`,
      body: {
        address: updatedAddress,
        isAddressReviewed: true,
      },
    });
  }

  /**
   * Invoked when user opens edit address sheet and clicks DISCARD or close (X)
   * The user has inspected/reviewed the address, so the warning clears!
   */
  async handleDiscardOrCloseAddress(orderId: string) {
    if (this._isAddressReviewed === false) {
      this._isAddressReviewed = true;
      this._apiCalls.push({
        url: `/api/orders/${orderId}`,
        body: {
          isAddressReviewed: true,
        },
      });
    }
  }
}

describe('Cloned Order Sharing Status & Comment Sanitization', () => {
  it('strips all status and fulfillment keys from item comments when cloning', () => {
    const originalComments = JSON.stringify({
      vendor: 'Surat Handlooms',
      isShared: true,
      sharedAt: '2026-10-09T14:30:00Z',
      isAddressShared: true,
      addressSharedAt: '2026-10-09T14:32:00Z',
      isLabelShared: true,
      labelSharedAt: '2026-10-09T14:35:00Z',
      status: 'manifested',
      awbNumber: 'DEL12345678',
      labelUrl: 'https://cdn.example.com/labels/123.pdf',
      notes: 'Customer requested fast delivery',
    });

    const sanitized = sanitizeClonedComments(originalComments);
    assert.ok(sanitized);
    const parsed = JSON.parse(sanitized);

    assert.strictEqual(parsed.isShared, undefined, 'isShared must be stripped');
    assert.strictEqual(parsed.sharedAt, undefined, 'sharedAt must be stripped');
    assert.strictEqual(parsed.isAddressShared, undefined, 'isAddressShared must be stripped');
    assert.strictEqual(parsed.addressSharedAt, undefined, 'addressSharedAt must be stripped');
    assert.strictEqual(parsed.isLabelShared, undefined, 'isLabelShared must be stripped');
    assert.strictEqual(parsed.labelSharedAt, undefined, 'labelSharedAt must be stripped');
    assert.strictEqual(parsed.status, undefined, 'status must be stripped');
    assert.strictEqual(parsed.awbNumber, undefined, 'awbNumber must be stripped');
    assert.strictEqual(parsed.labelUrl, undefined, 'labelUrl must be stripped');
    assert.strictEqual(parsed.vendor, 'Surat Handlooms', 'vendor must be preserved');
    assert.strictEqual(parsed.notes, 'Customer requested fast delivery', 'notes must be preserved');
  });

  it('handles null or plain text comments gracefully during clone', () => {
    assert.strictEqual(sanitizeClonedComments(null), null);
    assert.strictEqual(sanitizeClonedComments(undefined), null);
    assert.strictEqual(sanitizeClonedComments('plain text note'), 'plain text note');
  });

  it('sets initial clone status to Unconfirmed and isAddressReviewed to false', () => {
    const sourceOrder = {
      orderId: 'ORD-1001',
      comments: JSON.stringify({ isShared: true, sharedAt: '2026-10-10T12:00:00Z' }),
      address: {
        name: 'Priya Sharma',
        phone: '9876543210',
        address: 'MG Road, Hyderabad',
        pincode: '500001',
      },
    };

    const cloned = createClonedOrderDefaults(sourceOrder);
    assert.strictEqual(cloned.status, 'Unconfirmed');
    assert.strictEqual(cloned.isAddressReviewed, false, 'Cloned order must flag address as not reviewed');
    assert.deepStrictEqual(cloned.address, sourceOrder.address, 'Address details must be copied');
    assert.strictEqual(JSON.parse(cloned.comments || '{}').isShared, undefined);
  });
});

describe('Edit Order Address Review Warning State Transitions', () => {
  it('shows warning when isAddressReviewed is false on cloned order', () => {
    const controller = new AddressReviewStateController(
      { name: 'Kavitha', phone: '9123456780', address: 'Banjara Hills', pincode: '500034' },
      false // cloned order
    );

    assert.strictEqual(controller.shouldShowWarning, true);
    assert.strictEqual(controller.isAddressReviewed, false);
  });

  it('does NOT show warning for regular new orders where isAddressReviewed is true', () => {
    const controller = new AddressReviewStateController(
      { name: 'Kavitha', phone: '9123456780', address: 'Banjara Hills', pincode: '500034' },
      true // standard order
    );

    assert.strictEqual(controller.shouldShowWarning, false);
    assert.strictEqual(controller.isAddressReviewed, true);
  });

  it('clears warning and persists isAddressReviewed=true when user clicks DISCARD / close', async () => {
    const controller = new AddressReviewStateController(
      { name: 'Priya', phone: '9876543210', address: 'Indiranagar', pincode: '560038' },
      false
    );

    assert.strictEqual(controller.shouldShowWarning, true);

    // User opens AddressSheet, reviews it, and clicks DISCARD
    await controller.handleDiscardOrCloseAddress('ORD-999');

    assert.strictEqual(controller.shouldShowWarning, false);
    assert.strictEqual(controller.isAddressReviewed, true);
    assert.strictEqual(controller.apiCalls.length, 1);
    assert.deepStrictEqual(controller.apiCalls[0], {
      url: '/api/orders/ORD-999',
      body: { isAddressReviewed: true },
    });
  });

  it('clears warning and saves address with isAddressReviewed=true when user clicks SAVE ADDRESS', async () => {
    const initialAddr = { name: 'Priya', phone: '9876543210', address: 'Old Address', pincode: '560038' };
    const updatedAddr = { name: 'Priya M', phone: '9876543210', address: 'New Flat 101, Indiranagar', pincode: '560038' };

    const controller = new AddressReviewStateController(initialAddr, false);
    assert.strictEqual(controller.shouldShowWarning, true);

    // User opens AddressSheet, modifies address, and clicks SAVE ADDRESS
    await controller.handleSaveAddress('ORD-999', updatedAddr);

    assert.strictEqual(controller.shouldShowWarning, false);
    assert.strictEqual(controller.isAddressReviewed, true);
    assert.deepStrictEqual(controller.address, updatedAddr);
    assert.strictEqual(controller.apiCalls.length, 1);
    assert.deepStrictEqual(controller.apiCalls[0], {
      url: '/api/orders/ORD-999',
      body: {
        address: updatedAddr,
        isAddressReviewed: true,
      },
    });
  });

  it('preserves codChargePerPiece and cod/pc field values when cloning items', () => {
    const rawComments = JSON.stringify({
      size: 'XL',
      vendor: 'Surat Vendor',
      isShared: true,
      sharedAt: '2026-10-10T12:00:00Z',
      codChargePerPiece: 70,
    });

    const sanitized = sanitizeClonedComments(rawComments);
    assert.ok(sanitized);
    const parsed = JSON.parse(sanitized);

    // Sharing flags stripped
    assert.strictEqual(parsed.isShared, undefined);
    assert.strictEqual(parsed.sharedAt, undefined);

    // COD / pc field value strictly preserved
    assert.strictEqual(parsed.codChargePerPiece, 70);
    assert.strictEqual(parsed['cod/pc'], 70);
    assert.strictEqual(parsed.size, 'XL');
    assert.strictEqual(parsed.vendor, 'Surat Vendor');
  });

  it('preserves cod/pc key if formatted with slash from raw inputs', () => {
    const rawComments = JSON.stringify({
      size: 'Free Size',
      'cod/pc': 50,
      isLabelShared: true,
    });

    const sanitized = sanitizeClonedComments(rawComments);
    assert.ok(sanitized);
    const parsed = JSON.parse(sanitized);

    assert.strictEqual(parsed.isLabelShared, undefined);
    assert.strictEqual(parsed['cod/pc'], 50);
    assert.strictEqual(parsed.codChargePerPiece, 50);
  });
});
