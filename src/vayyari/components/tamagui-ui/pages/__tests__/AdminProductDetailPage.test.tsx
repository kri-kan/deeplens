import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  hasPendingStoreUpdates,
  getMediaDeltaCount,
  formatMediaDeltaBadge,
  filterPublishUpdatesQueue,
  allocateMediaToExistingColor,
  allocateMediaToNewColor,
  allocateMediaToSharedPool,
  buildDeltaSyncPayload,
  validateNewColorGroupStock,
} from '../../../../utils/publishDeltaRules';
import { storeAdminService } from '../../../../services/storeAdminService';

describe('AdminProductDetailPage: Media Delta Detection & Delta Badge', () => {
  const publishedProductWithNewMedia = {
    id: 'prod-001',
    productCode: 'VF69F5',
    title: 'Banarasi Kadwa Silk Saree',
    isPublished: true,
    isPublishedToStore: true,
    media_updated_at: '2026-10-26T18:00:00Z',
    store_publish_updated_at: '2026-10-25T10:00:00Z',
    mediaCount: 7,
    syncedMediaCount: 4,
    media: [
      { id: 'm1', url: 'https://minio.local/p1.webp' },
      { id: 'm2', url: 'https://minio.local/p2.webp' },
      { id: 'm3', url: 'https://minio.local/p3.webp' },
      { id: 'm4', url: 'https://minio.local/p4.webp' },
      { id: 'm5', url: 'https://minio.local/p5.webp' },
      { id: 'm6', url: 'https://minio.local/p6.webp' },
      { id: 'm7', url: 'https://minio.local/p7.webp' },
    ],
  };

  const publishedProductUpToDate = {
    id: 'prod-002',
    productCode: 'VF70A1',
    title: 'Kanjivaram Silk Saree',
    isPublished: true,
    isPublishedToStore: true,
    media_updated_at: '2026-10-24T12:00:00Z',
    store_publish_updated_at: '2026-10-25T10:00:00Z',
    mediaCount: 5,
    syncedMediaCount: 5,
  };

  const unpublishedProductWithMedia = {
    id: 'prod-003',
    productCode: 'VF80B2',
    title: 'Chanderi Zari Cotton Saree',
    isPublished: false,
    isPublishedToStore: false,
    media_updated_at: '2026-10-26T18:00:00Z',
    store_publish_updated_at: null,
    mediaCount: 6,
    syncedMediaCount: 0,
  };

  test('detects pending store updates when media_updated_at > store_publish_updated_at', () => {
    assert.strictEqual(hasPendingStoreUpdates(publishedProductWithNewMedia), true);
  });

  test('returns false when product is already up-to-date with store publish', () => {
    assert.strictEqual(hasPendingStoreUpdates(publishedProductUpToDate), false);
  });

  test('returns false when product is not yet published to store', () => {
    assert.strictEqual(hasPendingStoreUpdates(unpublishedProductWithMedia), false);
  });

  test('computes media delta count correctly', () => {
    const delta = getMediaDeltaCount(publishedProductWithNewMedia);
    assert.strictEqual(delta, 3);
  });

  test('formats visual media delta badge string', () => {
    const badgeText = formatMediaDeltaBadge(3);
    assert.strictEqual(badgeText, '+3 new photos');

    const singleText = formatMediaDeltaBadge(1);
    assert.strictEqual(singleText, '+1 new photo');
  });

  test('filters catalog items into Publish Updates queue', () => {
    const allProducts = [
      publishedProductWithNewMedia,
      publishedProductUpToDate,
      unpublishedProductWithMedia,
    ];
    const updateQueue = filterPublishUpdatesQueue(allProducts);
    assert.strictEqual(updateQueue.length, 1);
    assert.strictEqual(updateQueue[0].id, 'prod-001');
  });
});

describe('Media Delta Allocation: Existing Color, New Color & Shared Pool', () => {
  const sampleMediaItem = {
    id: 'm-new-1',
    url: 'https://minio.local/p-merged-new.webp',
  };

  test('allocates newly merged photo to an existing color group', () => {
    const allocated = allocateMediaToExistingColor(sampleMediaItem, 'cg-emerald');
    assert.strictEqual(allocated.colorGroupId, 'cg-emerald');
    assert.strictEqual(allocated.isCommon, false);
    assert.strictEqual(allocated.allocationType, 'existing_color');
  });

  test('allocates newly merged photo to a brand new color group with mandatory initial stock', () => {
    const newGroupConfig = {
      id: 'cg-ruby-red',
      name: 'Ruby Red & Antique Gold',
      colorHex: '#C0392B',
      stockQuantity: 12,
    };
    const allocated = allocateMediaToNewColor(sampleMediaItem, newGroupConfig);
    assert.strictEqual(allocated.colorGroupId, 'cg-ruby-red');
    assert.strictEqual(allocated.isCommon, false);
    assert.strictEqual(allocated.allocationType, 'new_color');
    assert.strictEqual(allocated.newColorGroup?.stockQuantity, 12);
  });

  test('enforces mandatory per-color stock quantity for new color group allocation', () => {
    assert.throws(
      () => {
        validateNewColorGroupStock(0);
      },
      /Initial stock quantity is mandatory and must be greater than 0/
    );

    assert.throws(
      () => {
        validateNewColorGroupStock(-5);
      },
      /Initial stock quantity is mandatory and must be greater than 0/
    );

    assert.throws(
      () => {
        validateNewColorGroupStock(NaN);
      },
      /Initial stock quantity is mandatory and must be greater than 0/
    );

    assert.strictEqual(validateNewColorGroupStock(15), 15);
  });

  test('allocates newly merged photo to shared group photos pool (common across all variants)', () => {
    const allocated = allocateMediaToSharedPool(sampleMediaItem);
    assert.strictEqual(allocated.isCommon, true);
    assert.strictEqual(allocated.colorGroupId, undefined);
    assert.strictEqual(allocated.allocationType, 'shared_pool');
  });

  test('builds complete delta sync batch payload with validated stock quantities', () => {
    const allocations = [
      allocateMediaToExistingColor({ id: 'm1' }, 'cg-emerald'),
      allocateMediaToNewColor({ id: 'm2' }, { id: 'cg-sapphire', name: 'Sapphire Blue', colorHex: '#1E3A8A', stockQuantity: 20 }),
      allocateMediaToSharedPool({ id: 'm3' }),
    ];

    const payload = buildDeltaSyncPayload('prod-001', allocations);
    assert.strictEqual(payload.productId, 'prod-001');
    assert.strictEqual(payload.mediaAllocations.length, 3);
    assert.strictEqual(payload.mediaAllocations[1].newColorGroup?.stockQuantity, 20);
  });
});

describe('StoreAdminService: Delta Sync and Timestamp Tracking', () => {
  test('triggerDeltaSync calls sync and updates store_publish_updated_at', async () => {
    const allocations = [
      allocateMediaToExistingColor({ id: 'm1', url: 'https://minio.local/p1.webp' }, 'cg-emerald'),
      allocateMediaToSharedPool({ id: 'm2', url: 'https://minio.local/p2.webp' }),
    ];
    const payload = buildDeltaSyncPayload('prod-001', allocations);

    const result = await storeAdminService.triggerDeltaSync('prod-001', payload);
    assert.strictEqual(result.success, true);
    assert.ok(result.storePublishUpdatedAt);
    assert.ok(new Date(result.storePublishUpdatedAt).getTime() <= Date.now());
  });

  test('updateStorePublishTimestamp returns updated ISO timestamp', async () => {
    const res = await storeAdminService.updateStorePublishTimestamp('prod-001');
    assert.ok(res.store_publish_updated_at);
    assert.ok(new Date(res.store_publish_updated_at).getTime() <= Date.now());
  });
});
