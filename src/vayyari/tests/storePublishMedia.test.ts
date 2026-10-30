import test, { describe } from 'node:test';
import assert from 'node:assert';

(globalThis as any).__DEV__ = true;

import {
  resolvePublishMediaUrls,
  isFullProductFetchNeededForPublish,
  buildStorePublishItem,
  RawPublishMediaItem,
} from '../utils/publishDeltaRules';

describe('Store Publish Media Resolution & Payload Integrity Rules', () => {
  describe('resolvePublishMediaUrls', () => {
    test('resolves all media items into URLs without truncating to first item', () => {
      const mediaList: RawPublishMediaItem[] = [
        { id: '11111111-1111-1111-1111-111111111111', storagePath: 'general/p1/img1.jpg' },
        { id: '22222222-2222-2222-2222-222222222222', storagePath: 'general/p1/img2.jpg' },
        { id: '33333333-3333-3333-3333-333333333333', storagePath: 'general/p1/img3.jpg' },
        { id: '44444444-4444-4444-4444-444444444444', storagePath: 'general/p1/img4.jpg' },
      ];

      const urls = resolvePublishMediaUrls(mediaList);

      assert.strictEqual(urls.length, 4, 'Must return all 4 media URLs, not truncate to 1');
      assert.strictEqual(urls[0], '/api/v1/catalog/media/11111111-1111-1111-1111-111111111111/thumbnail?spec=large');
      assert.strictEqual(urls[1], '/api/v1/catalog/media/22222222-2222-2222-2222-222222222222/thumbnail?spec=large');
      assert.strictEqual(urls[2], '/api/v1/catalog/media/33333333-3333-3333-3333-333333333333/thumbnail?spec=large');
      assert.strictEqual(urls[3], '/api/v1/catalog/media/44444444-4444-4444-4444-444444444444/thumbnail?spec=large');
    });

    test('resolves storagePath fallback when media id is nil UUID or missing', () => {
      const mediaList: RawPublishMediaItem[] = [
        { id: '00000000-0000-0000-0000-000000000000', storagePath: 'general/product_abc/img1.jpg' },
        { storagePath: 'general/product_abc/img2.jpg' },
      ];

      const urls = resolvePublishMediaUrls(mediaList);

      assert.strictEqual(urls.length, 2);
      assert.ok(urls[0].includes('thumbnail-by-path?path=general%2Fproduct_abc%2Fimg1.jpg'));
      assert.ok(urls[1].includes('thumbnail-by-path?path=general%2Fproduct_abc%2Fimg2.jpg'));
    });

    test('supports custom urlResolver function (e.g. productService.getThumbnailUrl)', () => {
      const mediaList: RawPublishMediaItem[] = [
        { id: 'media-001', storagePath: 'p1.jpg' },
        { id: 'media-002', storagePath: 'p2.jpg' },
      ];

      const customResolver = (m: RawPublishMediaItem) => `https://adminapi.vayyarifashions.com/media/${m.id}`;
      const urls = resolvePublishMediaUrls(mediaList, { urlResolver: customResolver });

      assert.strictEqual(urls.length, 2);
      assert.strictEqual(urls[0], 'https://adminapi.vayyarifashions.com/media/media-001');
      assert.strictEqual(urls[1], 'https://adminapi.vayyarifashions.com/media/media-002');
    });

    test('falls back to placeholder image when mediaList is empty or null', () => {
      const emptyUrls = resolvePublishMediaUrls([]);
      assert.strictEqual(emptyUrls.length, 1);
      assert.strictEqual(emptyUrls[0], 'https://picsum.photos/seed/saree/600/800');

      const nullUrls = resolvePublishMediaUrls(null);
      assert.strictEqual(nullUrls.length, 1);
      assert.strictEqual(nullUrls[0], 'https://picsum.photos/seed/saree/600/800');
    });

    test('respects custom fallbackUrl when provided', () => {
      const urls = resolvePublishMediaUrls([], { fallbackUrl: 'https://cdn.vayyari.com/placeholder.jpg' });
      assert.strictEqual(urls.length, 1);
      assert.strictEqual(urls[0], 'https://cdn.vayyari.com/placeholder.jpg');
    });
  });

  describe('isFullProductFetchNeededForPublish', () => {
    test('returns true when mediaCount exceeds preloaded preview count', () => {
      // Catalog API queries cap MediaJson at 15
      assert.strictEqual(isFullProductFetchNeededForPublish(76, 15), true);
      assert.strictEqual(isFullProductFetchNeededForPublish(20, 15), true);
      assert.strictEqual(isFullProductFetchNeededForPublish(5, 1), true);
    });

    test('returns false when all media are already preloaded', () => {
      assert.strictEqual(isFullProductFetchNeededForPublish(10, 10), false);
      assert.strictEqual(isFullProductFetchNeededForPublish(5, 15), false);
      assert.strictEqual(isFullProductFetchNeededForPublish(0, 0), false);
      assert.strictEqual(isFullProductFetchNeededForPublish(undefined, 5), false);
    });
  });

  describe('buildStorePublishItem', () => {
    test('builds a complete StorePublishItemInput preserving all resolved media URLs', () => {
      const product = {
        id: '9f128726-0c08-4f66-ae42-a7664836b52a',
        productCode: 'VF1FC22',
        title: 'KIDS TISSUE GOWNS WITH HANDWORK COAT MODEL🌸',
        category: 'Kids',
        fabric: 'Tissue',
        vendorPrice: 8500,
      };

      const resolvedMediaUrls = Array.from({ length: 76 }, (_, i) => `https://adminapi.vayyari.com/img_${i + 1}.jpg`);

      const payload = buildStorePublishItem(product, resolvedMediaUrls);

      assert.strictEqual(payload.vayyariProductId, '9f128726-0c08-4f66-ae42-a7664836b52a');
      assert.strictEqual(payload.productCode, 'VF1FC22');
      assert.strictEqual(payload.title, 'KIDS TISSUE GOWNS WITH HANDWORK COAT MODEL🌸');
      assert.strictEqual(payload.categoryName, 'Kids');
      assert.strictEqual(payload.fabric, 'Tissue');
      assert.strictEqual(payload.baseCost, 8500);
      assert.strictEqual(payload.mediaUrls.length, 76, 'Payload must retain all 76 media URLs without loss');
      assert.strictEqual(payload.mediaUrls[0], 'https://adminapi.vayyari.com/img_1.jpg');
      assert.strictEqual(payload.mediaUrls[75], 'https://adminapi.vayyari.com/img_76.jpg');
    });

    test('uses safe defaults for missing attributes while enforcing non-empty mediaUrls', () => {
      const minimalProduct = {
        id: 'prod-min-01',
      };

      const payload = buildStorePublishItem(minimalProduct, []);

      assert.strictEqual(payload.vayyariProductId, 'prod-min-01');
      assert.strictEqual(payload.productCode, 'PROD');
      assert.strictEqual(payload.title, 'Product');
      assert.strictEqual(payload.categoryName, 'Saree');
      assert.strictEqual(payload.fabric, 'Silk');
      assert.strictEqual(payload.baseCost, 8000);
      assert.strictEqual(payload.mediaUrls.length, 1);
      assert.strictEqual(payload.mediaUrls[0], 'https://picsum.photos/seed/saree/600/800');
    });
  });

  describe('Batch Publish Expansion Workflow Simulation', () => {
    test('simulates batch publish: skips extra fetch for fully loaded items, expands truncated items', async () => {
      // Mock catalog items in the publish queue
      const queueItems = [
        {
          id: 'item-1',
          productCode: 'VF01',
          mediaCount: 3,
          allMediaUris: ['url1', 'url2', 'url3'],
          title: 'Silk Saree',
          category: 'Saree',
          fabric: 'Silk',
          price: 5000,
        },
        {
          id: 'item-2',
          productCode: 'VF1FC22',
          mediaCount: 76,
          allMediaUris: Array.from({ length: 15 }, (_, i) => `preview_url_${i}`), // Only 15 preloaded
          title: 'Kids Gown',
          category: 'Kids',
          fabric: 'Tissue',
          price: 8000,
        },
      ];

      // Mock getProductById service
      const mockGetProductById = async (id: string) => {
        if (id === 'item-2') {
          return {
            id: 'item-2',
            productCode: 'VF1FC22',
            media: Array.from({ length: 76 }, (_, i) => ({
              id: `full-media-${i + 1}`,
              storagePath: `general/p2/full_${i + 1}.jpg`,
            })),
          };
        }
        return null;
      };

      // Execute simulated batch expansion logic matching publish.tsx
      const payload = await Promise.all(
        queueItems.map(async (p) => {
          let mediaUrls = p.allMediaUris;
          if (isFullProductFetchNeededForPublish(p.mediaCount, mediaUrls.length)) {
            const fullProd = await mockGetProductById(p.id);
            if (fullProd?.media) {
              mediaUrls = resolvePublishMediaUrls(fullProd.media, {
                urlResolver: (m) => `/media/${m.id}`,
              });
            }
          }
          return buildStorePublishItem(p, mediaUrls);
        })
      );

      // Verify item 1 (was not truncated, used preloaded 3 items)
      assert.strictEqual(payload[0].productCode, 'VF01');
      assert.strictEqual(payload[0].mediaUrls.length, 3);
      assert.deepStrictEqual(payload[0].mediaUrls, ['url1', 'url2', 'url3']);

      // Verify item 2 (was truncated at 15, expanded to all 76 full media items)
      assert.strictEqual(payload[1].productCode, 'VF1FC22');
      assert.strictEqual(payload[1].mediaUrls.length, 76, 'Expanded item must contain all 76 media URLs');
      assert.strictEqual(payload[1].mediaUrls[0], '/media/full-media-1');
      assert.strictEqual(payload[1].mediaUrls[75], '/media/full-media-76');
    });
  });
});
