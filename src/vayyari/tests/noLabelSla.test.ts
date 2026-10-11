import test, { describe } from 'node:test';
import assert from 'node:assert';
import { evaluateNoLabelSla, SlaCheckableOrder } from '../utils/noLabelSla';

describe('No-Label Order SLA Monitoring Rules', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  test('Ready to Ship within 2 days is NOT overdue', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * ONE_DAY_MS).toISOString();
    const order: SlaCheckableOrder = {
      status: 'ReadyToShip',
      placedAt: twoDaysAgo,
      hasLabel: false,
    };
    const result = evaluateNoLabelSla(order);
    assert.strictEqual(result.isOverdue, false);
  });

  test('Ready to Ship at 3 days IS overdue (DISPATCH_OVERDUE)', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * ONE_DAY_MS - 1000).toISOString();
    const order: SlaCheckableOrder = {
      status: 'ReadyToShip',
      placedAt: threeDaysAgo,
      hasLabel: false,
    };
    const result = evaluateNoLabelSla(order);
    assert.strictEqual(result.isOverdue, true);
    assert.strictEqual(result.type, 'DISPATCH_OVERDUE');
    assert.strictEqual(result.thresholdDays, 3);
    assert.ok((result.daysElapsed ?? 0) >= 3);
  });

  test('Ready to Ship legacy aliases (PendingFulfillment, InProcurement, Placed) trigger dispatch overdue after 3 days', () => {
    const fourDaysAgo = new Date(Date.now() - 4 * ONE_DAY_MS).toISOString();
    ['PendingFulfillment', 'InProcurement', 'placed'].forEach((status) => {
      const order: SlaCheckableOrder = {
        status,
        placedAt: fourDaysAgo,
        hasLabel: false,
      };
      const result = evaluateNoLabelSla(order);
      assert.strictEqual(result.isOverdue, true, `Expected overdue for status ${status}`);
      assert.strictEqual(result.type, 'DISPATCH_OVERDUE');
    });
  });

  test('Orders with Delhivery label are exempted from manual SLA', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * ONE_DAY_MS).toISOString();
    const orderWithLabelFlag: SlaCheckableOrder = {
      status: 'ReadyToShip',
      placedAt: fiveDaysAgo,
      hasLabel: true,
    };
    assert.strictEqual(evaluateNoLabelSla(orderWithLabelFlag).isOverdue, false);

    const orderWithAwbPackage: SlaCheckableOrder = {
      status: 'ReadyToShip',
      placedAt: fiveDaysAgo,
      packages: [{ delhiveryAwbNumber: '123456789' }],
    };
    assert.strictEqual(evaluateNoLabelSla(orderWithAwbPackage).isOverdue, false);
  });

  test('In Transit within 11 days is NOT overdue', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * ONE_DAY_MS).toISOString();
    const order: SlaCheckableOrder = {
      status: 'InTransit',
      placedAt: tenDaysAgo,
      hasLabel: false,
    };
    const result = evaluateNoLabelSla(order);
    assert.strictEqual(result.isOverdue, false);
  });

  test('In Transit at 12 days IS overdue (DELIVERY_OVERDUE)', () => {
    const twelveDaysAgo = new Date(Date.now() - 12 * ONE_DAY_MS - 1000).toISOString();
    const order: SlaCheckableOrder = {
      status: 'InTransit',
      placedAt: twelveDaysAgo,
      hasLabel: false,
    };
    const result = evaluateNoLabelSla(order);
    assert.strictEqual(result.isOverdue, true);
    assert.strictEqual(result.type, 'DELIVERY_OVERDUE');
    assert.strictEqual(result.thresholdDays, 12);
    assert.ok((result.daysElapsed ?? 0) >= 12);
  });

  test('Delivered order is NOT overdue even after 20 days', () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * ONE_DAY_MS).toISOString();
    const order: SlaCheckableOrder = {
      status: 'Delivered',
      placedAt: twentyDaysAgo,
      hasLabel: false,
    };
    const result = evaluateNoLabelSla(order);
    assert.strictEqual(result.isOverdue, false);
  });
});
