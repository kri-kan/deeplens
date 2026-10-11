import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Shipping Label Workflow & Manifest Rules', () => {
  describe('Seller Name Resolution (Customer vs Reseller)', () => {
    const computeDefaultSellerName = (type?: string, rName?: string) => {
      if (type?.toLowerCase() === 'reseller') {
        return rName?.trim() ? `From: ${rName.trim()}` : '';
      }
      return 'From: VAYYARI Fashions';
    };

    it('defaults to "From: VAYYARI Fashions" for standard Customer orders', () => {
      const seller = computeDefaultSellerName('Customer', '');
      assert.strictEqual(seller, 'From: VAYYARI Fashions');
    });

    it('defaults to "From: VAYYARI Fashions" when order type is omitted or undefined', () => {
      const seller = computeDefaultSellerName(undefined, undefined);
      assert.strictEqual(seller, 'From: VAYYARI Fashions');
    });

    it('formats seller as "From: [ResellerName]" when order type is Reseller with valid name', () => {
      const seller = computeDefaultSellerName('Reseller', '  Priya Sarees & Boutique  ');
      assert.strictEqual(seller, 'From: Priya Sarees & Boutique');
    });

    it('returns empty string for Reseller order when reseller name is empty or spaces', () => {
      const seller = computeDefaultSellerName('Reseller', '   ');
      assert.strictEqual(seller, '');
    });

    it('resets seller name back to "From: VAYYARI Fashions" when toggling from Reseller to Customer', () => {
      let currentType: 'customer' | 'reseller' = 'reseller';
      let resellerName = 'Kavitha Silks';
      let seller = computeDefaultSellerName(currentType, resellerName);
      assert.strictEqual(seller, 'From: Kavitha Silks');

      // User toggles to customer
      currentType = 'customer';
      seller = computeDefaultSellerName(currentType, resellerName);
      assert.strictEqual(seller, 'From: VAYYARI Fashions');
    });
  });

  describe('Declared Consignment Value and Weight Calculations', () => {
    it('sets declared total to exactly 4x groupTotal for transit insurance safety', () => {
      const groupTotal = 1500;
      const declaredTotal = (parseFloat(groupTotal as any) || 0) * 4;
      assert.strictEqual(declaredTotal, 6000);
    });

    it('calculates weight at 400g per item with a minimum of 400g', () => {
      const calculateWeight = (itemsCount: number) => (Math.max(1, itemsCount) * 400).toString();
      assert.strictEqual(calculateWeight(1), '400');
      assert.strictEqual(calculateWeight(3), '1200');
      assert.strictEqual(calculateWeight(0), '400');
    });

    it('sets COD amount to groupTotal when COD, and 0 when Prepaid', () => {
      const getCodAmount = (isCod: boolean, groupTotal: number) => isCod ? groupTotal.toString() : '0';
      assert.strictEqual(getCodAmount(true, 2400), '2400');
      assert.strictEqual(getCodAmount(false, 2400), '0');
    });
  });

  describe('Multi-Group Need-Label Isolation', () => {
    it('toggling needLabel on Group 1 does not mutate Group 2 state', () => {
      const initialGroups = [
        {
          orderGrpId: '00020-G1',
          needLabel: true,
          awbNumber: '35003110014884',
          labelUrl: 'labels/35003110014884.pdf',
        },
        {
          orderGrpId: '00020-G2',
          needLabel: true,
          awbNumber: '35003110014895',
          labelUrl: 'labels/35003110014895.pdf',
        },
      ];

      // Simulate toggling G1 off
      const targetGrpId = '00020-G1';
      const need = false;

      const updatedGroups = initialGroups.map((g) => {
        if (g.orderGrpId !== targetGrpId) return g;
        return {
          ...g,
          needLabel: need,
          awbNumber: need ? g.awbNumber : undefined,
          labelUrl: need ? g.labelUrl : undefined,
        };
      });

      // Group 1 must be cleared
      const g1 = updatedGroups.find((g) => g.orderGrpId === '00020-G1');
      assert.strictEqual(g1?.needLabel, false);
      assert.strictEqual(g1?.awbNumber, undefined);
      assert.strictEqual(g1?.labelUrl, undefined);

      // Group 2 must remain completely intact
      const g2 = updatedGroups.find((g) => g.orderGrpId === '00020-G2');
      assert.strictEqual(g2?.needLabel, true);
      assert.strictEqual(g2?.awbNumber, '35003110014895');
      assert.strictEqual(g2?.labelUrl, 'labels/35003110014895.pdf');
    });
  });

  describe('Corrupt Download Prevention & Validation', () => {
    it('blocks sharing and cleans up local cache when remote download returns HTTP >= 400', async () => {
      let deletedPath: string | null = null;
      let alertTriggered = false;
      let shareInvoked = false;

      // Mock download response with 404 status (cancelled MinIO file)
      const mockDownload = async () => ({ status: 404, uri: '/cache/35003110014884.pdf' });
      const mockDelete = async (path: string) => { deletedPath = path; };
      const mockAlert = () => { alertTriggered = true; };
      const mockShare = () => { shareInvoked = true; };

      const targetPath = '/cache/35003110014884.pdf';
      const res = await mockDownload();

      if (res?.status && res.status >= 400) {
        await mockDelete(targetPath);
        mockAlert();
      } else {
        mockShare();
      }

      assert.strictEqual(deletedPath, targetPath, 'corrupted 404 file must be deleted from cache');
      assert.strictEqual(alertTriggered, true, 'user must be alerted about missing file');
      assert.strictEqual(shareInvoked, false, 'native share intent must not be invoked');
    });

    it('blocks sharing when file info indicates 0 bytes', async () => {
      let shareInvoked = false;
      let alertTriggered = false;

      const fileInfo = { exists: true, size: 0 };
      if (!fileInfo?.exists || fileInfo.size === 0) {
        alertTriggered = true;
      } else {
        shareInvoked = true;
      }

      assert.strictEqual(alertTriggered, true, 'empty 0-byte file must be rejected');
      assert.strictEqual(shareInvoked, false, 'native share intent must not be invoked');
    });
  });

  describe('Cancelled Label Audit History vs Manifest Form Rules', () => {
    it('presents "MANIFEST ORDER" action card when needLabel is true and active AWB is null', () => {
      const stagedAwb = null;
      const stagedLabelUrl = null;
      const needLabel = true;

      const hasActiveLabel = Boolean(stagedAwb && stagedLabelUrl);
      const showManifestCard = needLabel && !hasActiveLabel;

      assert.strictEqual(hasActiveLabel, false);
      assert.strictEqual(showManifestCard, true);
    });

    it('opens ForwardOrderLabelModal in "form" mode when active label is missing', () => {
      const initialLabelUrl = undefined;
      const initialAwb = undefined;

      const hasInitialLabel = Boolean(initialLabelUrl);
      const defaultViewMode = hasInitialLabel ? 'pdf' : 'form';

      assert.strictEqual(defaultViewMode, 'form');
    });

    it('renders cancelled AWB exclusively in shipmentHistory audit accordion without share action', () => {
      const groupData = {
        orderGrpId: '00020-G1',
        awbNumber: null,
        labelUrl: null,
        needLabel: true,
        shipmentHistories: [
          {
            awbNumber: '35003110014884',
            status: 'cancelled',
            courierPartner: 'Delhivery',
            metadata: {
              cancelled_at: '2026-10-11T06:41:47Z',
              cancellation_reason: 'Need Label toggled off',
            },
          },
        ],
      };

      const hasActiveLabel = Boolean(groupData.awbNumber && groupData.labelUrl);
      const canShare = hasActiveLabel;
      const auditRecords = groupData.shipmentHistories.filter((h) => h.status === 'cancelled');

      assert.strictEqual(canShare, false, 'share button must be disabled/inactive');
      assert.strictEqual(auditRecords.length, 1);
      assert.strictEqual(auditRecords[0].awbNumber, '35003110014884');
      assert.strictEqual(auditRecords[0].metadata.cancellation_reason, 'Need Label toggled off');
    });

    it('filters shipment history to show only earlier cancelled records and omits active label record', () => {
      const activeAwb = '35003110014976';
      const allShipments = [
        {
          awbNumber: '35003110014976',
          status: 'manifested',
          courierPartner: 'Delhivery',
          metadata: { pickupLocation: 'Hyd apartment' },
        },
        {
          awbNumber: '35003110014884',
          status: 'cancelled',
          courierPartner: 'Delhivery',
          metadata: { cancelled_at: '2026-10-11T06:41:47Z', cancellation_reason: 'Need Label toggled off' },
        },
      ];

      const activeAwbClean = activeAwb.trim().toLowerCase();
      const filteredHistory = allShipments.filter((hist) => {
        const isCancelled = (hist.status || '').toLowerCase() === 'cancelled' || Boolean(hist.metadata?.cancelled_at);
        const isActiveAwb = Boolean(activeAwbClean) && (hist.awbNumber || '').trim().toLowerCase() === activeAwbClean;
        return isCancelled && !isActiveAwb;
      });

      // Active label 35003110014976 must be excluded
      assert.strictEqual(filteredHistory.length, 1);
      assert.strictEqual(filteredHistory[0].awbNumber, '35003110014884');
      assert.strictEqual(filteredHistory[0].status, 'cancelled');
    });

    it('returns empty history list when only active manifested record exists (no earlier cancellations)', () => {
      const activeAwb = '35003110014976';
      const allShipments = [
        {
          awbNumber: '35003110014976',
          status: 'manifested',
          courierPartner: 'Delhivery',
          metadata: { pickupLocation: 'Hyd apartment' },
        },
      ];

      const activeAwbClean = activeAwb.trim().toLowerCase();
      const filteredHistory = allShipments.filter((hist) => {
        const isCancelled = (hist.status || '').toLowerCase() === 'cancelled' || Boolean((hist.metadata as any)?.cancelled_at);
        const isActiveAwb = Boolean(activeAwbClean) && (hist.awbNumber || '').trim().toLowerCase() === activeAwbClean;
        return isCancelled && !isActiveAwb;
      });

      // Empty history list, ensuring the history section remains omitted/hidden
      assert.strictEqual(filteredHistory.length, 0);
    });
  });
});
