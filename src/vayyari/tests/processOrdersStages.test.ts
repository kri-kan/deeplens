import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  STAGES,
  statusToTab,
  stageRank,
  leastStage,
  getStatusIntent,
  ARCHIVE_THRESHOLD_MS,
  ProcessStage,
} from '../utils/processOrderRules';

describe('Process Orders Top Stage Tabs and Mapping Rules', () => {
  it('defines the 5 top tabs in exact sequential order without processed and with unconfirmed', () => {
    const stageKeys = STAGES.map((s) => s.key);
    assert.deepStrictEqual(stageKeys, [
      'unconfirmed',
      'confirmed',
      'placed',
      'delivered',
      'archived',
    ]);

    const stageLabels = STAGES.map((s) => s.label);
    assert.deepStrictEqual(stageLabels, [
      'Unconfirmed',
      'Confirmed',
      'Placed',
      'Delivered',
      'Archived',
    ]);
  });

  it('maps unconfirmed and unformed raw statuses to unconfirmed tab', () => {
    assert.strictEqual(statusToTab('unconfirmed'), 'unconfirmed');
    assert.strictEqual(statusToTab('Unconfirmed'), 'unconfirmed');
    assert.strictEqual(statusToTab('unformed'), 'unconfirmed');
    assert.strictEqual(statusToTab(''), 'unconfirmed');
    assert.strictEqual(statusToTab(undefined as any), 'unconfirmed');
  });

  it('maps confirmed, processed, and processing statuses to confirmed tab', () => {
    assert.strictEqual(statusToTab('confirmed'), 'confirmed');
    assert.strictEqual(statusToTab('Confirmed'), 'confirmed');
    // Legacy processed / processing statuses map cleanly to confirmed tab
    assert.strictEqual(statusToTab('processed'), 'confirmed');
    assert.strictEqual(statusToTab('Processed'), 'confirmed');
    assert.strictEqual(statusToTab('processing'), 'confirmed');
  });

  it('maps placed and dispatched statuses to placed tab', () => {
    assert.strictEqual(statusToTab('placed'), 'placed');
    assert.strictEqual(statusToTab('Placed'), 'placed');
    assert.strictEqual(statusToTab('dispatched'), 'placed');
    assert.strictEqual(statusToTab('Dispatched'), 'placed');
  });

  it('maps recent delivered to delivered tab and old delivered to archived tab', () => {
    const now = Date.now();
    const recentDate = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const oldDate = new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days ago

    assert.strictEqual(statusToTab('delivered', recentDate, undefined, now), 'delivered');
    assert.strictEqual(statusToTab('delivered', oldDate, undefined, now), 'archived');
    assert.strictEqual(statusToTab('archived', recentDate, undefined, now), 'delivered');
    assert.strictEqual(statusToTab('archived', oldDate, undefined, now), 'archived');
  });

  it('correctly ranks stages where unconfirmed is lowest rank', () => {
    assert.strictEqual(stageRank('unconfirmed'), 0);
    assert.strictEqual(stageRank('unformed'), 0);
    assert.strictEqual(stageRank('confirmed'), 1);
    assert.strictEqual(stageRank('processed'), 1);
    assert.strictEqual(stageRank('placed'), 2);
    assert.strictEqual(stageRank('delivered'), 3);
    assert.strictEqual(stageRank('archived'), 4);
    assert.strictEqual(stageRank('unknown'), 0);
  });

  it('derives least stage for mixed orders', () => {
    // If any group is unconfirmed, leastStage is unconfirmed
    assert.strictEqual(
      leastStage([{ status: 'confirmed' }, { status: 'unconfirmed' }]),
      'unconfirmed'
    );

    // If all groups are confirmed or placed, least stage is confirmed
    assert.strictEqual(
      leastStage([{ status: 'placed' }, { status: 'confirmed' }]),
      'confirmed'
    );

    // Empty groups array defaults to unconfirmed
    assert.strictEqual(leastStage([]), 'unconfirmed');
  });

  it('provides appropriate status intent for badges', () => {
    assert.strictEqual(getStatusIntent('unconfirmed'), 'attention');
    assert.strictEqual(getStatusIntent('confirmed'), 'info');
    assert.strictEqual(getStatusIntent('placed'), 'info');
    assert.strictEqual(getStatusIntent('delivered'), 'positive');
    assert.strictEqual(getStatusIntent('archived'), 'attention');
  });
});
