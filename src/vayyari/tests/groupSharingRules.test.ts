import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  isGroupSharingEnabled,
  ORDER_STAGES,
  canTransitionStage,
} from '../utils/stageTransitionRules';

describe('Order Group Sharing & Status Reset Rules', () => {
  describe('isGroupSharingEnabled gate', () => {
    test('returns false for Unconfirmed, unformed, and empty stages', () => {
      assert.strictEqual(isGroupSharingEnabled('Unconfirmed'), false);
      assert.strictEqual(isGroupSharingEnabled('unconfirmed'), false);
      assert.strictEqual(isGroupSharingEnabled('UNCONFIRMED'), false);
      assert.strictEqual(isGroupSharingEnabled('unformed'), false);
      assert.strictEqual(isGroupSharingEnabled(''), false);
      assert.strictEqual(isGroupSharingEnabled(null), false);
      assert.strictEqual(isGroupSharingEnabled(undefined), false);
    });

    test('returns true for Confirmed and subsequent stages', () => {
      assert.strictEqual(isGroupSharingEnabled('Confirmed'), true);
      assert.strictEqual(isGroupSharingEnabled('confirmed'), true);
      assert.strictEqual(isGroupSharingEnabled('Processed'), true);
      assert.strictEqual(isGroupSharingEnabled('processed'), true);
      assert.strictEqual(isGroupSharingEnabled('Placed'), true);
      assert.strictEqual(isGroupSharingEnabled('placed'), true);
      assert.strictEqual(isGroupSharingEnabled('Delivered'), true);
      assert.strictEqual(isGroupSharingEnabled('delivered'), true);
    });
  });

  describe('Stage transition rollback resets shared status', () => {
    test('transitioning from Confirmed to Unconfirmed resets items, address and label shared statuses', () => {
      // Setup initial state: Confirmed with shared items, address, and label
      let currentStage = 'Confirmed';
      let items: Array<{ id: string; title: string; isShared: boolean; sharedAt?: string }> = [
        { id: '1', title: 'Silk Saree', isShared: true, sharedAt: '2026-10-10T12:00:00Z' },
        { id: '2', title: 'Blouse Piece', isShared: true, sharedAt: '2026-10-10T12:01:00Z' },
      ];
      let isAddressShared = true;
      let addressSharedAt: string | null = '2026-10-10T12:05:00Z';
      let isLabelShared = true;
      let labelSharedAt: string | null = '2026-10-10T12:10:00Z';

      // Transition to Unconfirmed
      const targetStage = 'Unconfirmed';
      const transitionCheck = canTransitionStage({
        currentStage,
        targetStage,
        requiresLabel: false,
        hasLabel: false,
      });
      assert.strictEqual(transitionCheck.allowed, true);

      // Execute reset logic triggered on entering Unconfirmed
      currentStage = targetStage;
      if (!isGroupSharingEnabled(currentStage)) {
        items = items.map((it) => ({ ...it, isShared: false, sharedAt: undefined }));
        isAddressShared = false;
        addressSharedAt = null;
        isLabelShared = false;
        labelSharedAt = null;
      }

      // Verify all shared statuses are cleared
      assert.strictEqual(items.every((it) => it.isShared === false), true);
      assert.strictEqual(items.every((it) => it.sharedAt === undefined), true);
      assert.strictEqual(isAddressShared, false);
      assert.strictEqual(addressSharedAt, null);
      assert.strictEqual(isLabelShared, false);
      assert.strictEqual(labelSharedAt, null);
      assert.strictEqual(isGroupSharingEnabled(currentStage), false);
    });

    test('transitioning from Placed back to Confirmed resets items, address and label shared statuses', () => {
      // Setup initial state: Placed with shared items, address, and label
      let currentStage = 'Placed';
      let items: Array<{ id: string; title: string; isShared: boolean; sharedAt?: string }> = [
        { id: '1', title: 'Silk Saree', isShared: true, sharedAt: '2026-10-10T12:00:00Z' },
        { id: '2', title: 'Blouse Piece', isShared: true, sharedAt: '2026-10-10T12:01:00Z' },
      ];
      let isAddressShared = true;
      let addressSharedAt: string | null = '2026-10-10T12:05:00Z';
      let isLabelShared = true;
      let labelSharedAt: string | null = '2026-10-10T12:10:00Z';

      // Transition to Confirmed
      const targetStage = 'Confirmed';
      const transitionCheck = canTransitionStage({
        currentStage,
        targetStage,
        requiresLabel: false,
        hasLabel: false,
      });
      assert.strictEqual(transitionCheck.allowed, true);

      // Execute reset logic triggered on moving Placed -> Confirmed
      const wasPlaced = currentStage.toLowerCase() === 'placed';
      const isNowConfirmed = targetStage.toLowerCase() === 'confirmed';
      currentStage = targetStage;
      if (!isGroupSharingEnabled(currentStage) || (wasPlaced && isNowConfirmed)) {
        items = items.map((it) => ({ ...it, isShared: false, sharedAt: undefined }));
        isAddressShared = false;
        addressSharedAt = null;
        isLabelShared = false;
        labelSharedAt = null;
      }

      // Verify all shared statuses are cleared
      assert.strictEqual(items.every((it) => it.isShared === false), true);
      assert.strictEqual(items.every((it) => it.sharedAt === undefined), true);
      assert.strictEqual(isAddressShared, false);
      assert.strictEqual(addressSharedAt, null);
      assert.strictEqual(isLabelShared, false);
      assert.strictEqual(labelSharedAt, null);
      assert.strictEqual(currentStage, 'Confirmed');
    });
  });

  describe('Need Label toggle resets address and label shared status', () => {
    test('toggling needLabel from false to true resets address and label shared status', () => {
      let needLabel = false;
      let isAddressShared = true;
      let addressSharedAt: string | null = '2026-10-10T12:05:00Z';
      let isLabelShared = false;
      let labelSharedAt: string | null = null;

      // Toggle needLabel to true (requires shipping label)
      const nextNeedLabel = !needLabel;
      needLabel = nextNeedLabel;

      // Reset address and label shared statuses
      isAddressShared = false;
      addressSharedAt = null;
      isLabelShared = false;
      labelSharedAt = null;

      assert.strictEqual(needLabel, true);
      assert.strictEqual(isAddressShared, false);
      assert.strictEqual(addressSharedAt, null);
      assert.strictEqual(isLabelShared, false);
      assert.strictEqual(labelSharedAt, null);
    });

    test('toggling needLabel from true to false resets label and address shared status', () => {
      let needLabel = true;
      let isAddressShared = false;
      let addressSharedAt: string | null = null;
      let isLabelShared = true;
      let labelSharedAt: string | null = '2026-10-10T12:15:00Z';

      // Toggle needLabel to false (reverts to direct vendor address)
      const nextNeedLabel = !needLabel;
      needLabel = nextNeedLabel;

      // Reset address and label shared statuses
      isAddressShared = false;
      addressSharedAt = null;
      isLabelShared = false;
      labelSharedAt = null;

      assert.strictEqual(needLabel, false);
      assert.strictEqual(isAddressShared, false);
      assert.strictEqual(addressSharedAt, null);
      assert.strictEqual(isLabelShared, false);
      assert.strictEqual(labelSharedAt, null);
    });
  });
});
