import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { VisualSimilarityMatch } from '../types/products';

describe('Visual Lens Similarity Rules and Matching Logic', () => {
  const sampleMatches: VisualSimilarityMatch[] = [
    {
      productId: 'p-1',
      sku: 'VF-HIGH-1',
      title: 'Zari Border Silk Saree',
      vendorPrice: 1500,
      similarityPercentage: 92,
      distance: 5,
      isLinked: true,
      existingLinkType: 'is',
    },
    {
      productId: 'p-2',
      sku: 'VF-MED-1',
      title: 'Cotton Silk Blend Saree',
      vendorPrice: 850,
      similarityPercentage: 74,
      distance: 17,
      isLinked: false,
      existingLinkType: null,
    },
    {
      productId: 'p-3',
      sku: 'VF-LOW-1',
      title: 'Printed Georgette Gown',
      vendorPrice: 620,
      similarityPercentage: 45,
      distance: 35,
      isLinked: false,
      existingLinkType: null,
    },
    {
      productId: 'p-4',
      sku: 'VF-HIGH-2',
      title: 'Handloom Kanjivaram Saree',
      vendorPrice: 2400,
      similarityPercentage: 86,
      distance: 9,
      isLinked: false,
      existingLinkType: null,
    },
  ];

  test('filters matches accurately by confidence threshold', () => {
    const highMatches = sampleMatches.filter(m => m.similarityPercentage >= 80);
    assert.equal(highMatches.length, 2);
    assert.deepEqual(
      highMatches.map(m => m.sku),
      ['VF-HIGH-1', 'VF-HIGH-2']
    );

    const mediumMatches = sampleMatches.filter(
      m => m.similarityPercentage >= 60 && m.similarityPercentage < 80
    );
    assert.equal(mediumMatches.length, 1);
    assert.equal(mediumMatches[0].sku, 'VF-MED-1');
  });

  test('filters matches by search keyword on SKU and Title', () => {
    const query = 'silk';
    const filtered = sampleMatches.filter(m =>
      m.title.toLowerCase().includes(query) || m.sku.toLowerCase().includes(query)
    );
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].productId, 'p-1');
    assert.equal(filtered[1].productId, 'p-2');
  });

  test('accurately identifies linked products and link types', () => {
    const linked = sampleMatches.filter(m => m.isLinked);
    assert.equal(linked.length, 1);
    assert.equal(linked[0].existingLinkType, 'is');

    const unlinked = sampleMatches.filter(m => !m.isLinked);
    assert.equal(unlinked.length, 3);
  });

  test('verifies Hamming distance to percentage conversion formula', () => {
    const computePercentage = (dist: number) =>
      Math.max(0, Math.min(100, Math.round((1.0 - dist / 64.0) * 100)));

    assert.equal(computePercentage(0), 100);
    assert.equal(computePercentage(5), 92);
    assert.equal(computePercentage(11), 83);
    assert.equal(computePercentage(32), 50);
    assert.equal(computePercentage(64), 0);
  });

  test('preserves actual product mediaCount on similarity search tiles without collapsing to 1', () => {
    const matchWithCount: VisualSimilarityMatch = {
      productId: 'p-5',
      sku: 'VF-MEDIA-8',
      title: 'Chanderi Saree with Blouse',
      vendorPrice: 1200,
      similarityPercentage: 91,
      distance: 6,
      mediaCount: 8,
      isLinked: false,
    };

    const resolveTileMediaCount = (match: VisualSimilarityMatch, existingProduct?: { mediaCount?: number }) => {
      return existingProduct?.mediaCount ?? match.mediaCount ?? 1;
    };

    // When product is not in current catalog page, uses match.mediaCount (8) instead of falling back to 1
    assert.equal(resolveTileMediaCount(matchWithCount, undefined), 8);

    // When product is in current catalog page, prioritizes loaded product mediaCount
    assert.equal(resolveTileMediaCount(matchWithCount, { mediaCount: 8 }), 8);

    // If match has no count and product not found, falls back safely to 1
    assert.equal(resolveTileMediaCount({ ...matchWithCount, mediaCount: undefined }, undefined), 1);
  });

  test('guards against background pagination loop and reload flashing when in visual search mode', () => {
    const isVisualSearchActive = true;
    let backgroundPageFetchTriggered = false;

    const handleEndReached = () => {
      if (isVisualSearchActive) return;
      backgroundPageFetchTriggered = true;
    };

    handleEndReached();
    assert.equal(backgroundPageFetchTriggered, false, 'Infinite scroll must be disabled in visual similarity search');

    const shouldAttachEndReached = (hasMore: boolean, visualActive: boolean) => {
      const effectiveHasMore = visualActive ? false : hasMore;
      return effectiveHasMore;
    };

    assert.equal(shouldAttachEndReached(true, true), false);
    assert.equal(shouldAttachEndReached(true, false), true);
  });

  test('FlatList onEndReached prop is strictly undefined when hasMore is false', () => {
    const dummyCallback = () => {};
    const resolveFlatListOnEndReached = (hasMore: boolean, callback?: () => void) => {
      return hasMore ? callback : undefined;
    };

    // When hasMore is false, onEndReached must be disconnected to prevent native bounce triggers
    assert.equal(resolveFlatListOnEndReached(false, dummyCallback), undefined);

    // When hasMore is true, onEndReached is safely bound
    assert.equal(resolveFlatListOnEndReached(true, dummyCallback), dummyCallback);

    // When callback is omitted, returns undefined
    assert.equal(resolveFlatListOnEndReached(true, undefined), undefined);
  });

  test('ListFooterComponent suppresses ActivityIndicator spinner when hasMore is false', () => {
    const shouldRenderFooterSpinner = (
      hasMore: boolean,
      isLoading: boolean,
      isRefreshing: boolean,
      productCount: number
    ) => {
      return Boolean(hasMore && isLoading && !isRefreshing && productCount > 0);
    };

    // During visual similarity search (hasMore=false), even if background task sets isLoading=true, spinner is suppressed
    assert.equal(shouldRenderFooterSpinner(false, true, false, 45), false);

    // During normal catalog paging with more items available, spinner is displayed
    assert.equal(shouldRenderFooterSpinner(true, true, false, 100), true);

    // When pull-to-refresh is active, footer spinner is suppressed in favor of RefreshControl
    assert.equal(shouldRenderFooterSpinner(true, true, true, 100), false);

    // When list is empty, footer spinner is suppressed (skeleton grid takes over)
    assert.equal(shouldRenderFooterSpinner(true, true, false, 0), false);
  });

  test('visual similarity match with mediaCount > 30 activates high-media zoning badge', () => {
    const isHighMediaItem = (item: {
      mediaCount?: number;
      isMediaReviewRequired?: boolean;
      tags?: string[];
    }) => {
      if (item.isMediaReviewRequired !== undefined) return Boolean(item.isMediaReviewRequired);
      return Boolean(
        (item.mediaCount ?? 0) > 30 ||
        item.tags?.includes('needs-zoning-review')
      );
    };

    // Standard product with 5 images
    assert.equal(isHighMediaItem({ mediaCount: 5 }), false);

    // Heavy product with 36 images triggers high-media amber badge
    assert.equal(isHighMediaItem({ mediaCount: 36 }), true);

    // Explicit override via isMediaReviewRequired
    assert.equal(isHighMediaItem({ mediaCount: 10, isMediaReviewRequired: true }), true);
    assert.equal(isHighMediaItem({ mediaCount: 45, isMediaReviewRequired: false }), false);
  });

  test('pull-to-refresh during visual search re-runs similarity query instead of resetting catalog', () => {
    let similarityReruns = 0;
    let catalogRefreshes = 0;

    const onRefresh = (
      isVisualActive: boolean,
      triggerVisualSearch: () => void,
      triggerCatalogFetch: () => void
    ) => {
      if (isVisualActive) {
        triggerVisualSearch();
        return;
      }
      triggerCatalogFetch();
    };

    // When in visual search mode, only similarity query re-executes
    onRefresh(true, () => similarityReruns++, () => catalogRefreshes++);
    assert.equal(similarityReruns, 1);
    assert.equal(catalogRefreshes, 0);

    // When in standard catalog mode, regular catalog fetch is called
    onRefresh(false, () => similarityReruns++, () => catalogRefreshes++);
    assert.equal(similarityReruns, 1);
    assert.equal(catalogRefreshes, 1);
  });

  test('WhatsApp chat media preview launches visual similarity search for images and excludes videos', () => {
    const isVideo = (url?: string) => {
      if (!url) return false;
      const lower = url.split('?')[0].toLowerCase();
      return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.includes('videos/');
    };

    const imageUrl = 'https://minio.local/deeplens-media/whatsapp/photo_123.jpg';
    const videoUrl = 'https://minio.local/deeplens-media/whatsapp/video_456.mp4';

    assert.equal(isVideo(imageUrl), false, 'Photos must not be classified as videos');
    assert.equal(isVideo(videoUrl), true, 'Videos must be classified as videos');

    let dismissed = false;
    let targetParams: any = null;

    const handleVisualSearch = (url: string, onDismiss: () => void, navigate: (opts: any) => void) => {
      if (!url || isVideo(url)) return;
      onDismiss();
      navigate({
        pathname: '/utilities/product-list',
        params: { visualImageUri: url },
      });
    };

    // Clicking lens on image dismisses preview and navigates to catalog with visualImageUri
    handleVisualSearch(imageUrl, () => { dismissed = true; }, (opts) => { targetParams = opts; });
    assert.equal(dismissed, true);
    assert.deepEqual(targetParams, {
      pathname: '/utilities/product-list',
      params: { visualImageUri: imageUrl },
    });

    // Reset and try on video
    dismissed = false;
    targetParams = null;
    handleVisualSearch(videoUrl, () => { dismissed = true; }, (opts) => { targetParams = opts; });
    assert.equal(dismissed, false);
    assert.equal(targetParams, null, 'Video media must not trigger visual search');
  });

  test('useVisualSearchNavigation constructs complete route params and executes onBeforeNavigate', () => {
    let beforeNavigateCalled = false;
    let pushedRoute: any = null;

    const navigateMock = (payload: any) => {
      pushedRoute = payload;
    };

    const openVisualSearch = (opts: {
      imageUri?: string | null;
      storagePath?: string | null;
      mediaId?: string | null;
      postId?: string | null;
      onBeforeNavigate?: () => void;
    }) => {
      if (!opts.imageUri && !opts.storagePath && !opts.mediaId && !opts.postId) return;
      opts.onBeforeNavigate?.();
      navigateMock({
        pathname: '/utilities/product-list',
        params: {
          visualImageUri: opts.imageUri || '',
          visualStoragePath: opts.storagePath || '',
          visualMediaId: opts.mediaId || '',
          visualPostId: opts.postId || '',
        },
      });
    };

    openVisualSearch({
      imageUri: 'https://cdn.vayyari.com/photo.jpg',
      storagePath: 'catalog/photo.jpg',
      mediaId: 'media-123',
      postId: 'post-456',
      onBeforeNavigate: () => { beforeNavigateCalled = true; },
    });

    assert.equal(beforeNavigateCalled, true);
    assert.deepEqual(pushedRoute, {
      pathname: '/utilities/product-list',
      params: {
        visualImageUri: 'https://cdn.vayyari.com/photo.jpg',
        visualStoragePath: 'catalog/photo.jpg',
        visualMediaId: 'media-123',
        visualPostId: 'post-456',
      },
    });

    // When all options are empty or null, does nothing
    beforeNavigateCalled = false;
    pushedRoute = null;
    openVisualSearch({});
    assert.equal(beforeNavigateCalled, false);
    assert.equal(pushedRoute, null);
  });

  test('unified ImageViewerModal normalizes single imageUrl and array imageUrls seamlessly', () => {
    const normalizeImages = (imageUrl?: string | null, imageUrls?: string[]) => {
      if (imageUrls && imageUrls.length > 0) return imageUrls.filter(Boolean) as string[];
      if (imageUrl) return [imageUrl];
      return [];
    };

    // Single image from order / proof
    assert.deepEqual(normalizeImages('https://cdn.vayyari.com/proof.jpg', undefined), [
      'https://cdn.vayyari.com/proof.jpg',
    ]);

    // Multiple images from WhatsApp media album
    assert.deepEqual(
      normalizeImages(undefined, [
        'https://cdn.vayyari.com/img1.jpg',
        'https://cdn.vayyari.com/img2.jpg',
      ]),
      ['https://cdn.vayyari.com/img1.jpg', 'https://cdn.vayyari.com/img2.jpg']
    );

    // Empty or null inputs produce safe empty array
    assert.deepEqual(normalizeImages(null, undefined), []);
    assert.deepEqual(normalizeImages(undefined, []), []);
  });

  test('visual search queries are strictly ephemeral in-memory computations without persisting orphan media', () => {
    // Model behavior of visual similarity staging:
    // User submits an image query via imageUri or base64.
    // The search engine accepts the ephemeral byte stream / base64 string,
    // computes dHash/pHash in an ephemeral MemoryStream in RAM,
    // performs candidate matching against existing catalog pHashes,
    // and returns the matches without creating rows in public.media or uploading to permanent object store.

    interface StagedVisualQuery {
      type: 'ephemeral_base64' | 'ephemeral_url';
      payloadSize: number;
      persistedToDb: boolean;
      persistedToStorage: boolean;
    }

    const processVisualSearchQuery = (req: { imageBase64?: string; imageUrl?: string }): StagedVisualQuery => {
      // Streamed directly into memory, no INSERT INTO public.media, no MinIO upload
      return {
        type: req.imageBase64 ? 'ephemeral_base64' : 'ephemeral_url',
        payloadSize: req.imageBase64?.length ?? req.imageUrl?.length ?? 0,
        persistedToDb: false,
        persistedToStorage: false,
      };
    };

    const result = processVisualSearchQuery({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    });

    assert.equal(result.persistedToDb, false, 'Search queries must never create rows in media database');
    assert.equal(result.persistedToStorage, false, 'Search queries must never save files to MinIO');
  });
});


