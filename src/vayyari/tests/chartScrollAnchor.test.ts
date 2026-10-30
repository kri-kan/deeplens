import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * ChartScrollAnchorCoordinator models the scroll anchor state machine implemented in:
 * 1. DailyAcquisitionsGraph (src/vayyari/components/tamagui-ui/molecules/DailyAcquisitionsGraph/DailyAcquisitionsGraph.tsx)
 * 2. ShopperActivityBarChart (src/vayyari/components/tamagui-ui/molecules/ShopperActivityBarChart/ShopperActivityBarChart.tsx)
 */
export class ChartScrollAnchorCoordinator {
  lastContentKey: string = '';
  scrollInvocations = 0;
  lastScrollAnimated: boolean | null = null;

  scrollToEnd(animated = false) {
    this.scrollInvocations++;
    this.lastScrollAnimated = animated;
  }

  handleContentSizeChange(contentKey: string) {
    if (this.lastContentKey !== contentKey) {
      this.lastContentKey = contentKey;
      this.scrollToEnd(false);
      return true;
    }
    return false;
  }

  reset() {
    this.lastContentKey = '';
    this.scrollInvocations = 0;
    this.lastScrollAnimated = null;
  }
}

/**
 * Helper to compute the swipe indicator label based on bar count vs viewport threshold (7 bars).
 */
export function getChartFooterNote(barCount: number): string {
  return barCount > 7 ? '← Swipe for earlier • Tap bar to inspect' : 'Tap bar to inspect period';
}

/**
 * Helper to compute the content key for DailyAcquisitionsGraph
 */
export function buildGrowthContentKey(
  granularity: 'day' | 'week' | 'month',
  range: number,
  recordCount: number,
  latestDate?: string
): string {
  return `${granularity}_${range}_${recordCount}_${latestDate ?? ''}`;
}

/**
 * Helper to compute the data key for ShopperActivityBarChart
 */
export function buildHourlyActivityDataKey(
  distLength: number,
  latestEvents?: number,
  peakHour?: number
): string {
  return `${distLength}_${latestEvents ?? ''}_${peakHour ?? -1}`;
}

describe('Chart Horizontal Scroll Anchor & Indicator Rules', () => {
  describe('DailyAcquisitionsGraph Scroll Anchor Coordinator', () => {
    test('anchors to the right end on initial render (content size change)', () => {
      const coordinator = new ChartScrollAnchorCoordinator();
      const key = buildGrowthContentKey('day', 10, 10, '2026-10-28');

      const triggered = coordinator.handleContentSizeChange(key);
      assert.strictEqual(triggered, true);
      assert.strictEqual(coordinator.scrollInvocations, 1);
      assert.strictEqual(coordinator.lastScrollAnimated, false);
      assert.strictEqual(coordinator.lastContentKey, key);
    });

    test('ignores duplicate content size events for unchanged data', () => {
      const coordinator = new ChartScrollAnchorCoordinator();
      const key = buildGrowthContentKey('day', 10, 10, '2026-10-28');

      coordinator.handleContentSizeChange(key);
      assert.strictEqual(coordinator.scrollInvocations, 1);

      // Re-trigger with exact same key
      const duplicateTriggered = coordinator.handleContentSizeChange(key);
      assert.strictEqual(duplicateTriggered, false);
      assert.strictEqual(coordinator.scrollInvocations, 1, 'Should not fire duplicate scroll');
    });

    test('re-anchors to the right end when user switches projection (day -> week)', () => {
      const coordinator = new ChartScrollAnchorCoordinator();
      const dayKey = buildGrowthContentKey('day', 10, 10, '2026-10-28');
      coordinator.handleContentSizeChange(dayKey);

      // Switch to week view
      const weekKey = buildGrowthContentKey('week', 10, 10, '2026-10-26');
      const triggered = coordinator.handleContentSizeChange(weekKey);

      assert.strictEqual(triggered, true);
      assert.strictEqual(coordinator.scrollInvocations, 2);
      assert.strictEqual(coordinator.lastContentKey, weekKey);
    });

    test('re-anchors to the right end when user switches range filter (10D -> 30D)', () => {
      const coordinator = new ChartScrollAnchorCoordinator();
      const initialKey = buildGrowthContentKey('day', 10, 10, '2026-10-28');
      coordinator.handleContentSizeChange(initialKey);

      const expandedKey = buildGrowthContentKey('day', 30, 30, '2026-10-28');
      const triggered = coordinator.handleContentSizeChange(expandedKey);

      assert.strictEqual(triggered, true);
      assert.strictEqual(coordinator.scrollInvocations, 2);
      assert.strictEqual(coordinator.lastContentKey, expandedKey);
    });
  });

  describe('ShopperActivityBarChart 24-Hour Scroll Anchor', () => {
    test('anchors to the latest hours (right end, 23:00) on initial load', () => {
      const coordinator = new ChartScrollAnchorCoordinator();
      const dataKey = buildHourlyActivityDataKey(24, 45, 14);

      const triggered = coordinator.handleContentSizeChange(dataKey);
      assert.strictEqual(triggered, true);
      assert.strictEqual(coordinator.scrollInvocations, 1);
      assert.strictEqual(coordinator.lastScrollAnimated, false);
    });

    test('re-anchors when hourly activity updates with new peak hour or traffic rollups', () => {
      const coordinator = new ChartScrollAnchorCoordinator();
      const initialKey = buildHourlyActivityDataKey(24, 10, 12);
      coordinator.handleContentSizeChange(initialKey);

      const updatedKey = buildHourlyActivityDataKey(24, 55, 18);
      const triggered = coordinator.handleContentSizeChange(updatedKey);

      assert.strictEqual(triggered, true);
      assert.strictEqual(coordinator.scrollInvocations, 2);
    });
  });

  describe('Chart Footer Swipe Guidance Rules', () => {
    test('displays swipe guidance when bars exceed standard mobile viewport width (> 7 bars)', () => {
      assert.strictEqual(getChartFooterNote(10), '← Swipe for earlier • Tap bar to inspect');
      assert.strictEqual(getChartFooterNote(14), '← Swipe for earlier • Tap bar to inspect');
      assert.strictEqual(getChartFooterNote(30), '← Swipe for earlier • Tap bar to inspect');
      assert.strictEqual(getChartFooterNote(8), '← Swipe for earlier • Tap bar to inspect');
    });

    test('displays standard tap note when all bars fit within viewport (<= 7 bars)', () => {
      assert.strictEqual(getChartFooterNote(7), 'Tap bar to inspect period');
      assert.strictEqual(getChartFooterNote(6), 'Tap bar to inspect period');
      assert.strictEqual(getChartFooterNote(3), 'Tap bar to inspect period');
      assert.strictEqual(getChartFooterNote(0), 'Tap bar to inspect period');
    });
  });
});
