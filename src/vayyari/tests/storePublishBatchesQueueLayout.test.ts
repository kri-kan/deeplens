import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatBatchTimestamp,
  formatBatchTime,
  getBatchStatusBadge,
  getBatchTileLayout,
  PublishBatchTileJob,
} from '../utils/publishBatchTileRules';

describe('Publish Batches Queue Layout & Hierarchy Rules', () => {
  describe('Timestamp formatting (dd mmm yy hh mm)', () => {
    it('formats ISO timestamp into dd mmm yy hh mm with 2-digit day and 2-digit year', () => {
      // Create a known UTC date and format it
      const date = new Date(2026, 10, 6, 10, 9, 30); // Nov 6, 2026 10:09
      const formatted = formatBatchTimestamp(date.toISOString());

      // Expected pattern: 06 Nov 26 10:09
      const parts = formatted.split(' ');
      assert.strictEqual(parts[0], '06');
      assert.strictEqual(parts[1], 'Nov');
      assert.strictEqual(parts[2], '26');
      assert.strictEqual(parts[3], '10:09');
    });

    it('formats single-digit hours and minutes with leading zero', () => {
      const date = new Date(2025, 0, 5, 4, 7, 0); // Jan 05, 2025 04:07
      const formatted = formatBatchTimestamp(date.toISOString());

      const parts = formatted.split(' ');
      assert.strictEqual(parts[0], '05');
      assert.strictEqual(parts[1], 'Jan');
      assert.strictEqual(parts[2], '25');
      assert.strictEqual(parts[3], '04:07');
    });

    it('gracefully handles empty, null or undefined input', () => {
      assert.strictEqual(formatBatchTimestamp(null), '');
      assert.strictEqual(formatBatchTimestamp(undefined), '');
      assert.strictEqual(formatBatchTimestamp(''), '');
    });

    it('formatBatchTime delegates to formatBatchTimestamp', () => {
      const date = new Date(2026, 8, 20, 15, 30); // Sep 20, 2026 15:30
      const formattedTs = formatBatchTimestamp(date.toISOString());
      const formattedTime = formatBatchTime(date.toISOString());

      assert.strictEqual(formattedTime, formattedTs);
      assert.ok(formattedTime.includes('20 Sep 26'));
      assert.ok(formattedTime.includes('15:30'));
    });
  });

  describe('Batch Tile Label Hierarchy (Timestamp First Class, GUID Secondary)', () => {
    const mockJob: PublishBatchTileJob = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      action: 'publish',
      status: 'completed',
      totalCount: 15,
      processedCount: 14,
      failedCount: 1,
      createdAt: new Date(2026, 10, 6, 10, 9).toISOString(),
      updatedAt: new Date(2026, 10, 6, 10, 11).toISOString(),
    };

    it('designates timestamp as primary/first-class label', () => {
      const layout = getBatchTileLayout(mockJob);

      assert.strictEqual(layout.primaryLabel.type, 'timestamp');
      assert.ok(layout.primaryLabel.value.includes('06 Nov 26'));
      assert.strictEqual(layout.primaryLabel.rawDate, mockJob.createdAt);
    });

    it('designates guid as secondary label', () => {
      const layout = getBatchTileLayout(mockJob);

      assert.strictEqual(layout.secondaryLabel.type, 'guid');
      assert.strictEqual(layout.secondaryLabel.value, '#a1b2c3d4');
      assert.strictEqual(layout.secondaryLabel.fullGuid, mockJob.id);
    });

    it('configures grid layout for 3 per row vertical tiles', () => {
      const layout = getBatchTileLayout(mockJob);

      assert.strictEqual(layout.grid.numColumns, 3);
      assert.strictEqual(layout.grid.isVerticalTile, true);
    });

    it('retains batch execution metrics on the tile', () => {
      const layout = getBatchTileLayout(mockJob);

      assert.strictEqual(layout.metrics.totalCount, 15);
      assert.strictEqual(layout.metrics.processedCount, 14);
      assert.strictEqual(layout.metrics.failedCount, 1);
    });

    it('resolves correct badge colors for completed status', () => {
      const badge = getBatchStatusBadge('completed');
      assert.strictEqual(badge.label, 'Completed');
      assert.strictEqual(badge.text, '#15803D');
    });

    it('resolves correct badge colors for running and failed status', () => {
      const runningBadge = getBatchStatusBadge('in_progress');
      assert.strictEqual(runningBadge.label, 'Running');

      const failedBadge = getBatchStatusBadge('failed');
      assert.strictEqual(failedBadge.label, 'Failed');
    });
  });
});
