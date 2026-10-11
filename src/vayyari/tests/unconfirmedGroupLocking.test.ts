import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Unconfirmed Group Unlocking and Item Editability Rules', () => {
  it('excludes unconfirmed and unformed groups from lockedVendorKeys regardless of label presence', () => {
    const distinctGroupKeys = ['Unassigned', 'VendorA'];
    const groupStages: Record<string, string> = {
      Unassigned: 'Unconfirmed',
      VendorA: 'Placed',
    };
    const groupLabelInfo: Record<string, any> = {
      Unassigned: { needLabel: true, awbNumber: '35003110014991', labelUrl: 'labels/35003110014991.pdf' },
      VendorA: { needLabel: true, awbNumber: '35003110014992', labelUrl: 'labels/35003110014992.pdf' },
    };
    const paymentType = 'cod';

    const lockedVendorKeys = distinctGroupKeys.filter((groupKey) => {
      const stage = (groupStages[groupKey] || 'Unconfirmed').toLowerCase();
      if (stage === 'unconfirmed' || stage === 'unformed') {
        return false;
      }
      const info = groupLabelInfo[groupKey];
      const isLabelNeeded = info?.needLabel ?? (paymentType === 'cod');
      const hasLabel = Boolean(info?.labelUrl || info?.awbNumber);

      if (isLabelNeeded) {
        return hasLabel;
      } else {
        return stage === 'placed' || stage === 'delivered';
      }
    });

    // Unassigned is Unconfirmed, so it must NOT be locked!
    assert.strictEqual(lockedVendorKeys.includes('Unassigned'), false, 'Unconfirmed group must not be locked');
    // VendorA is Placed with a label, so it must be locked!
    assert.strictEqual(lockedVendorKeys.includes('VendorA'), true, 'Placed group with label must be locked');
  });

  it('determines isGroupConfirmed purely based on currentStage and readOnly without order-level override', () => {
    const computeIsGroupConfirmed = (currentStage: string, readOnly = false) => {
      return (
        Boolean(readOnly) ||
        (currentStage.toLowerCase() !== 'unconfirmed' && currentStage.toLowerCase() !== 'unformed')
      );
    };

    assert.strictEqual(computeIsGroupConfirmed('Unconfirmed'), false, 'Unconfirmed stage must not be confirmed');
    assert.strictEqual(computeIsGroupConfirmed('unconfirmed'), false);
    assert.strictEqual(computeIsGroupConfirmed('Confirmed'), true, 'Confirmed stage must be confirmed');
    assert.strictEqual(computeIsGroupConfirmed('Placed'), true, 'Placed stage must be confirmed');
    assert.strictEqual(computeIsGroupConfirmed('Unconfirmed', true), true, 'readOnly forces confirmed/locked');
  });

  it('determines isActiveItemConfirmed based strictly on the item group stage, permitting edit on unconfirmed groups even in mixed orders', () => {
    const groupStages: Record<string, string> = {
      VendorA: 'Confirmed',
      Unassigned: 'Unconfirmed',
    };

    const computeIsActiveItemConfirmed = (item: { vendor?: string } | null) => {
      if (!item) return false;
      const vName = item.vendor || '';
      const isUn = !vName || vName.toLowerCase() === 'unassigned' || vName.toLowerCase() === 'none';
      const k = isUn ? 'Unassigned' : vName;
      const gStage = (groupStages[k] || 'Unconfirmed').toLowerCase();
      return gStage !== 'unconfirmed' && gStage !== 'unformed';
    };

    const itemInUnconfirmedGroup = { vendor: '' }; // Unassigned
    const itemInConfirmedGroup = { vendor: 'VendorA' };

    assert.strictEqual(
      computeIsActiveItemConfirmed(itemInUnconfirmedGroup),
      false,
      'Item in unconfirmed group must be editable'
    );
    assert.strictEqual(
      computeIsActiveItemConfirmed(itemInConfirmedGroup),
      true,
      'Item in confirmed group must be locked'
    );
  });

  it('derives order-level stage as Unconfirmed at order inception when no items/groups exist', () => {
    const computeDerivedStageTag = (products: any[], distinctGroupKeys: string[], groupStages: Record<string, string>) => {
      if (products.length === 0 || distinctGroupKeys.length === 0) {
        return 'Unconfirmed';
      }
      if (distinctGroupKeys.length === 1) {
        return groupStages[distinctGroupKeys[0]] || 'Unconfirmed';
      }
      return 'Multi';
    };

    const computeIsOrderConfirmed = (products: any[], distinctGroupKeys: string[], groupStages: Record<string, string>) => {
      if (products.length === 0 || distinctGroupKeys.length === 0) {
        return false;
      }
      return distinctGroupKeys.every((k) => {
        const st = (groupStages[k] || 'Unconfirmed').toLowerCase();
        return st !== 'unconfirmed' && st !== 'unformed';
      });
    };

    // At order inception: 0 items, 0 groups
    assert.strictEqual(computeDerivedStageTag([], [], {}), 'Unconfirmed');
    assert.strictEqual(computeIsOrderConfirmed([], [], {}), false);
  });

  it('marks all item groups as confirmed when confirm action is triggered and derives order level confirmation', () => {
    const distinctGroupKeys = ['Unassigned', 'Saree Vendor'];
    let groupStages: Record<string, string> = {
      Unassigned: 'Unconfirmed',
      'Saree Vendor': 'Unconfirmed',
    };

    const computeIsOrderConfirmed = (distinctKeys: string[], stages: Record<string, string>) => {
      if (distinctKeys.length === 0) return false;
      return distinctKeys.every((k) => {
        const st = (stages[k] || 'Unconfirmed').toLowerCase();
        return st !== 'unconfirmed' && st !== 'unformed';
      });
    };

    // Before clicking CONFIRM:
    assert.strictEqual(computeIsOrderConfirmed(distinctGroupKeys, groupStages), false);

    // User clicks CONFIRM (confirmAll = true)
    distinctGroupKeys.forEach((k) => {
      groupStages[k] = 'Confirmed';
    });

    // After clicking CONFIRM: all groups confirmed -> order derived as confirmed
    assert.strictEqual(computeIsOrderConfirmed(distinctGroupKeys, groupStages), true);

    // If one group transitions back to Unconfirmed:
    groupStages['Unassigned'] = 'Unconfirmed';
    assert.strictEqual(computeIsOrderConfirmed(distinctGroupKeys, groupStages), false, 'Order must not be confirmed if any group is unconfirmed');
  });
});
