import test, { describe } from 'node:test';
import assert from 'node:assert';

(globalThis as any).__DEV__ = true;

import {
  hasPendingStoreUpdates,
  getMediaDeltaCount,
  formatMediaDeltaBadge,
  filterPublishUpdatesQueue,
  ProductDeltaCheckable,
} from '../utils/publishDeltaRules';

describe('Publish Updates Delta & Queue Hardening Rules (ADO #1341 / VF1FC22)', () => {
  describe('hasPendingStoreUpdates - Delta Detection Logic', () => {
    test('returns false when product is undefined, null, or empty', () => {
      assert.strictEqual(hasPendingStoreUpdates(undefined), false);
      assert.strictEqual(hasPendingStoreUpdates(null), false);
      assert.strictEqual(hasPendingStoreUpdates({}), false);
    });

    test('returns false when product is unpublished regardless of media count changes', () => {
      // Even if media count changed or timestamps differ, unpublished products do NOT belong in "Publish Updates"
      const unpublishedProduct: ProductDeltaCheckable = {
        id: 'unpub-1',
        isPublished: false,
        isPublishedToStore: false,
        is_published: false,
        mediaCount: 15,
        syncedMediaCount: 5,
        mediaUpdatedAt: '2026-10-29T15:00:00Z',
        storePublishUpdatedAt: '2026-10-29T10:00:00Z',
      };
      assert.strictEqual(hasPendingStoreUpdates(unpublishedProduct), false);
    });

    test('detects media DELETION (splits/unmerges): currentCount < syncedCount (VF1FC22 case)', () => {
      // Product VF1FC22 had 76 media in store, but was split in catalog down to 45 media
      const splitProduct: ProductDeltaCheckable = {
        id: '9f128726-0c08-4f66-ae42-a7664836b52a',
        isPublished: true,
        mediaCount: 45,
        syncedMediaCount: 76,
        mediaUpdatedAt: '2026-10-29T14:00:00Z',
        storePublishUpdatedAt: '2026-10-29T12:00:00Z',
      };
      assert.strictEqual(hasPendingStoreUpdates(splitProduct), true);
    });

    test('detects media ADDITION (merges): currentCount > syncedCount', () => {
      const mergedProduct: ProductDeltaCheckable = {
        id: 'prod-merged-1',
        isPublishedToStore: true,
        mediaCount: 25,
        syncedMediaCount: 18,
      };
      assert.strictEqual(hasPendingStoreUpdates(mergedProduct), true);
    });

    test('returns false when media count is unchanged and no timestamps changed', () => {
      const syncedProduct: ProductDeltaCheckable = {
        id: 'prod-synced-1',
        isPublished: true,
        mediaCount: 12,
        syncedMediaCount: 12,
        mediaUpdatedAt: '2026-10-29T10:00:00Z',
        storePublishUpdatedAt: '2026-10-29T10:00:00Z',
      };
      assert.strictEqual(hasPendingStoreUpdates(syncedProduct), false);
    });

    test('detects timestamp modification when counts are identical (photo replaced or reordered)', () => {
      const editedPhotoProduct: ProductDeltaCheckable = {
        id: 'prod-edited-1',
        is_published: true,
        mediaCount: 10,
        syncedMediaCount: 10,
        // Media updated 2 hours after store publish
        mediaUpdatedAt: '2026-10-29T14:30:00Z',
        storePublishUpdatedAt: '2026-10-29T12:30:00Z',
      };
      assert.strictEqual(hasPendingStoreUpdates(editedPhotoProduct), true);
    });

    test('returns false when mediaUpdatedAt <= storePublishUpdatedAt and counts match', () => {
      const olderMediaProduct: ProductDeltaCheckable = {
        id: 'prod-older-1',
        isPublished: true,
        mediaCount: 8,
        syncedMediaCount: 8,
        mediaUpdatedAt: '2026-10-29T11:00:00Z',
        storePublishUpdatedAt: '2026-10-29T12:00:00Z',
      };
      assert.strictEqual(hasPendingStoreUpdates(olderMediaProduct), false);
    });

    test('detects unassignedMedia array when present', () => {
      const unassignedProduct: ProductDeltaCheckable = {
        id: 'prod-unassigned-1',
        isPublished: true,
        mediaCount: 5,
        syncedMediaCount: 5,
        unassignedMedia: [{ id: 'media-new-1' }, { id: 'media-new-2' }],
      };
      assert.strictEqual(hasPendingStoreUpdates(unassignedProduct), true);
    });

    test('supports media array length fallback when mediaCount property is absent', () => {
      const productWithMediaArray: ProductDeltaCheckable = {
        id: 'prod-arr-1',
        isPublished: true,
        syncedMediaCount: 4,
        media: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }, { id: 'm4' }, { id: 'm5' }, { id: 'm6' }],
      };
      assert.strictEqual(hasPendingStoreUpdates(productWithMediaArray), true);
    });
  });

  describe('getMediaDeltaCount - Exact Delta Calculations', () => {
    test('returns 0 for null/undefined or products with zero delta', () => {
      assert.strictEqual(getMediaDeltaCount(null), 0);
      assert.strictEqual(getMediaDeltaCount(undefined), 0);
      assert.strictEqual(
        getMediaDeltaCount({
          isPublished: true,
          mediaCount: 10,
          syncedMediaCount: 10,
        }),
        0
      );
    });

    test('returns positive count delta for added photos', () => {
      const product = {
        isPublished: true,
        mediaCount: 20,
        syncedMediaCount: 15,
      };
      assert.strictEqual(getMediaDeltaCount(product), 5);
    });

    test('returns negative count delta for deleted photos (VF1FC22: 45 - 76 = -31)', () => {
      const product = {
        isPublished: true,
        mediaCount: 45,
        syncedMediaCount: 76,
      };
      assert.strictEqual(getMediaDeltaCount(product), -31);
    });

    test('prefers unassignedMedia length when available', () => {
      const product = {
        isPublished: true,
        mediaCount: 10,
        syncedMediaCount: 10,
        unassignedMedia: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
      };
      assert.strictEqual(getMediaDeltaCount(product), 3);
    });

    test('returns 1 as fallback when count matches but timestamp indicates update', () => {
      const product = {
        isPublished: true,
        mediaCount: 10,
        syncedMediaCount: 10,
        mediaUpdatedAt: '2026-10-29T15:00:00Z',
        storePublishUpdatedAt: '2026-10-29T12:00:00Z',
      };
      assert.strictEqual(getMediaDeltaCount(product), 1);
    });
  });

  describe('formatMediaDeltaBadge - UI Badge Rendering', () => {
    test('returns empty string for 0 delta', () => {
      assert.strictEqual(formatMediaDeltaBadge(0), '');
    });

    test('formats positive single photo badge (+1 new photo)', () => {
      assert.strictEqual(formatMediaDeltaBadge(1), '+1 new photo');
    });

    test('formats positive multiple photos badge (+N new photos)', () => {
      assert.strictEqual(formatMediaDeltaBadge(5), '+5 new photos');
      assert.strictEqual(formatMediaDeltaBadge(12), '+12 new photos');
    });

    test('formats negative single photo deletion badge (-1 photo)', () => {
      assert.strictEqual(formatMediaDeltaBadge(-1), '-1 photo');
    });

    test('formats negative multiple photos deletion badge (-N photos, e.g. -31 photos for VF1FC22)', () => {
      assert.strictEqual(formatMediaDeltaBadge(-31), '-31 photos');
      assert.strictEqual(formatMediaDeltaBadge(-5), '-5 photos');
    });
  });

  describe('filterPublishUpdatesQueue & Tab Queue Isolation', () => {
    test('correctly isolates published products with updates from unpublished starred products', () => {
      const catalogBatch: ProductDeltaCheckable[] = [
        // Published with deletion (VF1FC22) -> MUST be in Publish Updates
        {
          id: '9f128726-0c08-4f66-ae42-a7664836b52a',
          productCode: 'VF1FC22',
          isPublished: true,
          mediaCount: 45,
          syncedMediaCount: 76,
        },
        // Published with addition -> MUST be in Publish Updates
        {
          id: 'prod-update-add',
          productCode: 'VF2B58',
          isPublished: true,
          mediaCount: 16,
          syncedMediaCount: 12,
        },
        // Published with no delta -> MUST NOT be in Publish Updates
        {
          id: 'prod-synced-clean',
          productCode: 'VF2B56',
          isPublished: true,
          mediaCount: 20,
          syncedMediaCount: 20,
          mediaUpdatedAt: '2026-10-29T10:00:00Z',
          storePublishUpdatedAt: '2026-10-29T10:00:00Z',
        },
        // Published with timestamp edit -> MUST be in Publish Updates
        {
          id: 'prod-update-timestamp',
          productCode: 'VF2D2B',
          isPublished: true,
          mediaCount: 15,
          syncedMediaCount: 15,
          mediaUpdatedAt: '2026-10-29T14:00:00Z',
          storePublishUpdatedAt: '2026-10-29T11:00:00Z',
        },
        // Unpublished Starred Product -> MUST NOT be in Publish Updates (belongs in All Starred)
        {
          id: 'prod-new-starred',
          productCode: 'VF3001',
          isPublished: false,
          isStarred: true,
          mediaCount: 10,
          syncedMediaCount: 0,
        },
        // Unpublished Non-starred Product -> MUST NOT be in Publish Updates
        {
          id: 'prod-unstarred-raw',
          productCode: 'VF3002',
          isPublished: false,
          isStarred: false,
          mediaCount: 6,
          syncedMediaCount: 0,
        },
      ];

      const updatesQueue = filterPublishUpdatesQueue(catalogBatch);

      assert.strictEqual(updatesQueue.length, 3, 'Exactly 3 products must have pending updates');
      const updateCodes = updatesQueue.map((p) => p.productCode);
      assert.ok(updateCodes.includes('VF1FC22'), 'VF1FC22 must be in updates queue');
      assert.ok(updateCodes.includes('VF2B58'), 'VF2B58 must be in updates queue');
      assert.ok(updateCodes.includes('VF2D2B'), 'VF2D2B must be in updates queue');
      assert.ok(!updateCodes.includes('VF2B56'), 'Fully synced product must NOT be in updates queue');
      assert.ok(!updateCodes.includes('VF3001'), 'Unpublished starred product must NOT be in updates queue');
      assert.ok(!updateCodes.includes('VF3002'), 'Unpublished unstarred product must NOT be in updates queue');

      // Verify All Starred queue count partition logic matching AdminVayyariStorePublishPage.tsx:
      const allStarredCount = catalogBatch.filter((p) => !p.isPublishedToStore && !p.isPublished).length;
      assert.strictEqual(allStarredCount, 2, 'Unpublished items must be partitioned to All Starred count');
    });
  });

  describe('In-Store Reconciled Unstarred Product Workflow (VF1FC22 E2E Simulation)', () => {
    test('reconciles catalog data for an unstarred in-store product and preserves update visibility', () => {
      // 1. In-store query returns VF1FC22 from Store.Api (published with 76 images)
      const storeProducts = [
        {
          vayyariProductId: '9f128726-0c08-4f66-ae42-a7664836b52a',
          productCode: 'VF1FC22',
          title: 'KIDS TISSUE GOWNS',
          mediaUrls: Array.from({ length: 76 }, (_, i) => `https://img.vayyari.com/photo_${i}.jpg`),
          updatedAt: '2026-10-29T10:00:00Z',
        },
      ];

      // 2. DeepLens catalog product details (after listing split, isStarred was false, media count is now 45)
      const catalogDetail = {
        id: '9f128726-0c08-4f66-ae42-a7664836b52a',
        productCode: 'VF1FC22',
        title: 'KIDS TISSUE GOWNS WITH HANDWORK COAT MODEL🌸',
        category: 'Kids',
        fabric: 'Tissue',
        vendorPrice: 8500,
        mediaCount: 45,
        isStarred: false, // operator unstarred it or split it
        isPublished: true, // synced from store publish
        mediaUpdatedAt: '2026-10-29T14:30:00Z',
        storePublishUpdatedAt: '2026-10-29T10:00:00Z',
      };

      // 3. Simulated publish.tsx mapping
      const mappedStarredItem = {
        id: catalogDetail.id,
        productCode: catalogDetail.productCode,
        title: catalogDetail.title,
        category: catalogDetail.category,
        fabric: catalogDetail.fabric,
        price: catalogDetail.vendorPrice,
        mediaCount: catalogDetail.mediaCount,
        allMediaUris: Array.from({ length: 15 }, (_, i) => `preview_${i}.jpg`),
        isPublishedToStore: true,
        syncedMediaCount: storeProducts[0].mediaUrls.length, // 76
        mediaUpdatedAt: catalogDetail.mediaUpdatedAt,
        storePublishUpdatedAt: catalogDetail.storePublishUpdatedAt,
      };

      // Verify that delta is detected
      assert.strictEqual(hasPendingStoreUpdates(mappedStarredItem), true);
      assert.strictEqual(getMediaDeltaCount(mappedStarredItem), -31);
      assert.strictEqual(formatMediaDeltaBadge(getMediaDeltaCount(mappedStarredItem)), '-31 photos');

      // Verify queue filtering includes it in Publish Updates
      const filtered = filterPublishUpdatesQueue([mappedStarredItem]);
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].productCode, 'VF1FC22');
    });
  });

  describe('Publish Updates Queue & Pagination Decoupling Guards', () => {
    test('onEndReached is strictly undefined when activeQueue is not "all"', () => {
      // Simulates AdminVayyariStorePublishPage.tsx onEndReached condition:
      // onEndReached={activeQueue === 'all' && hasMore ? onLoadMore : undefined}
      const getOnEndReached = (activeQueue: string, hasMore: boolean, onLoadMore: () => void) => {
        return activeQueue === 'all' && hasMore ? onLoadMore : undefined;
      };

      const dummyLoadMore = () => {};

      assert.strictEqual(getOnEndReached('publish_updates', true, dummyLoadMore), undefined);
      assert.strictEqual(getOnEndReached('publish_updates', false, dummyLoadMore), undefined);
      assert.strictEqual(getOnEndReached('starred', true, dummyLoadMore), undefined);
      assert.strictEqual(getOnEndReached('all', false, dummyLoadMore), undefined);
      assert.strictEqual(getOnEndReached('all', true, dummyLoadMore), dummyLoadMore);
    });

    test('footer loader is suppressed when in publish_updates queue', () => {
      // Simulates AdminVayyariStorePublishPage.tsx ListFooterComponent guard:
      // if (activeQueue !== 'all') return null;
      const shouldRenderFooter = (activeQueue: string, hasMore: boolean) => {
        if (activeQueue !== 'all') return false;
        return hasMore;
      };

      assert.strictEqual(shouldRenderFooter('publish_updates', true), false);
      assert.strictEqual(shouldRenderFooter('publish_updates', false), false);
      assert.strictEqual(shouldRenderFooter('all', true), true);
      assert.strictEqual(shouldRenderFooter('all', false), false);
    });
  });

  describe('Publish Timestamp Synchronization & Delta Clearance', () => {
    test('Math.max correctly resolves newer timestamp when store publishedAt is older', () => {
      // VF1FC22 scenario: Store DB publishedAt was 04:07:20Z, Platform was 13:00:23Z, Media updated at 06:43:19Z
      const storePublishedAt = '2026-10-29T04:07:20.000Z';
      const platformPublishAt = '2026-10-29T13:00:23.000Z';
      const mediaUpdatedAt = '2026-10-29T06:43:19.000Z';

      const resolvedTimestamp =
        storePublishedAt && platformPublishAt
          ? new Date(Math.max(new Date(storePublishedAt).getTime(), new Date(platformPublishAt).getTime())).toISOString()
          : storePublishedAt || platformPublishAt;

      assert.strictEqual(resolvedTimestamp, platformPublishAt);

      const product = {
        isPublished: true,
        mediaCount: 45,
        syncedMediaCount: 45,
        mediaUpdatedAt,
        storePublishUpdatedAt: resolvedTimestamp,
      };

      // Since resolved timestamp (13:00) > mediaUpdatedAt (06:43), delta MUST be false!
      assert.strictEqual(hasPendingStoreUpdates(product), false);
    });

    test('optimistic publish batch state transition immediately clears product from updates queue', () => {
      const pendingProduct: ProductDeltaCheckable = {
        id: 'vf1fc22-id',
        productCode: 'VF1FC22',
        isPublished: true,
        mediaCount: 45,
        syncedMediaCount: 76, // older count
        mediaUpdatedAt: '2026-10-29T06:43:19Z',
        storePublishUpdatedAt: '2026-10-29T04:07:20Z',
      };

      // Before publish: hasPendingStoreUpdates is true
      assert.strictEqual(hasPendingStoreUpdates(pendingProduct), true);
      assert.strictEqual(filterPublishUpdatesQueue([pendingProduct]).length, 1);

      // Simulates publish.tsx handlePublishBatch optimistic mutation
      const publishTimeIso = new Date('2026-10-29T13:00:23Z').toISOString();
      const publishedProduct: ProductDeltaCheckable = {
        ...pendingProduct,
        isPublished: true,
        isPublishedToStore: true,
        publishedAt: publishTimeIso,
        storePublishUpdatedAt: publishTimeIso,
        syncedMediaCount: pendingProduct.mediaCount, // now synchronized to 45
      };

      // After publish: delta is 0 and timestamps are synchronized
      assert.strictEqual(hasPendingStoreUpdates(publishedProduct), false);
      assert.strictEqual(filterPublishUpdatesQueue([publishedProduct]).length, 0);
    });
  });
});

