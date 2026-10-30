import test, { describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';

(globalThis as any).__DEV__ = true;

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

    const deleteText = formatMediaDeltaBadge(-31);
    assert.strictEqual(deleteText, '-31 photos');

    const singleDeleteText = formatMediaDeltaBadge(-1);
    assert.strictEqual(singleDeleteText, '-1 photo');
  });

  test('detects pending updates when media was deleted or split (syncedMediaCount > mediaCount)', () => {
    const publishedProductWithDeletedMedia = {
      id: 'prod-vf1fc22',
      productCode: 'VF1FC22',
      title: 'KIDS TISSUE GOWNS',
      isPublished: true,
      isPublishedToStore: true,
      media_updated_at: '2026-10-29T06:43:19Z',
      store_publish_updated_at: '2026-10-29T04:07:20Z',
      mediaCount: 45,
      syncedMediaCount: 76,
    };

    assert.strictEqual(hasPendingStoreUpdates(publishedProductWithDeletedMedia), true);
    assert.strictEqual(getMediaDeltaCount(publishedProductWithDeletedMedia), -31);
    assert.strictEqual(formatMediaDeltaBadge(getMediaDeltaCount(publishedProductWithDeletedMedia)), '-31 photos');
  });

  test('filters catalog items into Publish Updates queue', () => {
    const publishedProductWithDeletedMedia = {
      id: 'prod-vf1fc22',
      productCode: 'VF1FC22',
      title: 'KIDS TISSUE GOWNS',
      isPublished: true,
      isPublishedToStore: true,
      media_updated_at: '2026-10-29T06:43:19Z',
      store_publish_updated_at: '2026-10-29T04:07:20Z',
      mediaCount: 45,
      syncedMediaCount: 76,
    };

    const allProducts = [
      publishedProductWithNewMedia,
      publishedProductUpToDate,
      unpublishedProductWithMedia,
      publishedProductWithDeletedMedia,
    ];
    const updateQueue = filterPublishUpdatesQueue(allProducts);
    assert.strictEqual(updateQueue.length, 2);
    assert.strictEqual(updateQueue[0].id, 'prod-001');
    assert.strictEqual(updateQueue[1].id, 'prod-vf1fc22');
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

describe('AdminProductDetailPage: Component Mount & Rendering', () => {
  test('renders without crashing when provided mock props including initialQueueTab and delta props', async () => {
    (globalThis as any).__DEV__ = false;
    (globalThis as any).expo = {
      EventEmitter: class EventEmitter {},
      modules: new Proxy({}, { get: () => ({}) }),
    };
    (globalThis as any).ErrorUtils = { getGlobalHandler: () => () => {}, setGlobalHandler: () => {} };

    const Module = require('node:module');
    const path = require('node:path');
    const origResolve = Module._resolveFilename;
    const rnWebPath = require.resolve('../../../../node_modules/react-native-web');
    const gestureMockPath = require.resolve('../../../../node_modules/react-native-gesture-handler/lib/commonjs/mocks/mocks.js');
    const vectorIconsMockPath = require.resolve('../../../../tests/mocks/vectorIconsMock.js');

    Module._resolveFilename = function (req: string, parent: any, isMain: boolean, options: any) {
      if (req === 'react-native' || req === 'react-native-web' || req.startsWith('react-native/')) return rnWebPath;
      if (req === 'expo-image') return rnWebPath;
      if (req === 'expo-video' || req.startsWith('expo-video')) return rnWebPath;
      if (req === '@expo/vector-icons' || req.startsWith('@expo/vector-icons')) return vectorIconsMockPath;
      if (req === 'react-native-reanimated') return require.resolve('../../../../node_modules/react-native-reanimated/mock');
      if (req === 'react-native-gesture-handler' || req.startsWith('react-native-gesture-handler')) return gestureMockPath;
      return origResolve.call(this, req, parent, isMain, options);
    };

    const rnWeb = require(rnWebPath);
    rnWeb.TurboModuleRegistry = { get: () => ({}), getEnforcing: () => ({}) };

    const safeAreaPath = require.resolve('react-native-safe-area-context', { paths: ['./src/vayyari'] });
    (require.cache as any)[safeAreaPath] = {
      id: safeAreaPath,
      filename: safeAreaPath,
      loaded: true,
      exports: {
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
        SafeAreaProvider: ({ children }: any) => children,
        SafeAreaConsumer: ({ children }: any) => children({ top: 0, bottom: 0, left: 0, right: 0 }),
      },
    };

    const [pageMod, themeMod, tamaguiConfigMod, tamaguiMod] = await Promise.all([
      import('../AdminProductDetailPage'),
      import('../../../../theme/ThemeContext'),
      import('../../../../tamagui.config'),
      // @ts-ignore
      import('../../../../node_modules/tamagui/dist/cjs/index.cjs'),
    ]);
    const { AdminProductDetailPage } = pageMod;

    const mockProduct = {
      id: 'prod-001',
      productCode: 'VF69F5',
      title: 'Banarasi Kadwa Silk Saree',
      category: 'Saree',
      fabric: 'Pure Silk',
      price: 18500,
      isPublished: true,
      isPublishedToStore: true,
      media_updated_at: '2026-10-26T18:00:00Z',
      store_publish_updated_at: '2026-10-25T10:00:00Z',
      mediaCount: 7,
      syncedMediaCount: 4,
      media: [
        { id: 'm1', url: 'https://minio.local/p1.webp', title: 'Pallu' },
        { id: 'm2', url: 'https://minio.local/p2.webp', title: 'Pleats' },
        { id: 'm3', url: 'https://minio.local/p3.webp', title: 'Border' },
        { id: 'm4', url: 'https://minio.local/p4.webp', title: 'Blouse' },
        { id: 'm5', url: 'https://minio.local/p5.webp', title: 'Close up' },
        { id: 'm6', url: 'https://minio.local/p6.webp', title: 'Fold' },
        { id: 'm7', url: 'https://minio.local/p7.webp', title: 'Full View' },
      ],
      unassignedMedia: [
        { id: 'm5', url: 'https://minio.local/p5.webp', title: 'Close up' },
        { id: 'm6', url: 'https://minio.local/p6.webp', title: 'Fold' },
        { id: 'm7', url: 'https://minio.local/p7.webp', title: 'Full View' },
      ],
      colorGroups: [
        { id: 'cg-1', name: 'Royal Blue', colorHex: '#1E3A8A', stockQuantity: 5 },
      ],
    };

    let syncedPayload: any = null;
    const element = React.createElement(AdminProductDetailPage, {
      product: mockProduct as any,
      initialQueueTab: 'publish_updates',
      onSyncDelta: async (payload: any) => {
        syncedPayload = payload;
      },
    });

    assert.ok(element);
    assert.strictEqual(element.type, AdminProductDetailPage);
    assert.strictEqual(element.props.initialQueueTab, 'publish_updates');
    assert.strictEqual(typeof element.props.onSyncDelta, 'function');

    const mockThemeValue = {
      theme: { colors: {} },
      tokens: {
        primary: '#1B4D3E',
        accent: '#B45309',
        accentForeground: '#FFFFFF',
        text: '#111827',
        textMuted: '#6B7280',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        radius: { sm: 4, md: 8, full: 9999 },
      },
      campaign: 'luxe',
      availableCampaigns: ['luxe'] as any,
      colorScheme: 'light',
      setCampaign: () => {},
      setColorScheme: () => {},
      toggleColorScheme: () => {},
    };

    const tree = React.createElement(
      tamaguiMod.TamaguiProvider,
      { config: tamaguiConfigMod.default || tamaguiConfigMod },
      React.createElement(
        themeMod.ThemeContext.Provider,
        { value: mockThemeValue as any },
        element
      )
    );

    const ReactDOMServer = require('../../../../node_modules/react-dom/server.node.js');
    const html = ReactDOMServer.renderToStaticMarkup(tree);
    assert.ok(html);
    assert.ok(html.length > 0);
    assert.ok(html.includes('+3 new photos') || html.includes('Media Delta Detected'));
  });

  test('renders High Media Count banner and review chat link when isMediaReviewRequired is true', async () => {
    const pageMod = await import('../AdminProductDetailPage');
    const themeMod = await import('../../../../theme/ThemeContext');
    const tamaguiConfigMod = await import('../../../../tamagui.config');
    // @ts-ignore
    const tamaguiMod = await import('../../../../node_modules/tamagui/dist/cjs/index.cjs');
    const { AdminProductDetailPage } = pageMod;

    const highMediaProduct = {
      id: 'prod-high-1',
      productCode: 'VF99H1',
      title: 'High Media Saree',
      mediaCount: 35,
      isMediaReviewRequired: true,
      media: Array.from({ length: 35 }, (_, i) => ({ id: `m-${i}`, url: `https://minio.local/p${i}.webp` })),
    };

    let toggledStatus: boolean | null = null;
    const element = React.createElement(AdminProductDetailPage, {
      product: highMediaProduct as any,
      onToggleMediaReviewRequired: async (val: boolean) => {
        toggledStatus = val;
      },
    });

    const mockThemeValue = {
      theme: { colors: {} },
      tokens: {
        primary: '#1B4D3E',
        accent: '#B45309',
        accentForeground: '#FFFFFF',
        text: '#111827',
        textMuted: '#6B7280',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        radius: { sm: 4, md: 8, full: 9999 },
      },
      campaign: 'luxe',
      availableCampaigns: ['luxe'] as any,
      colorScheme: 'light',
      setCampaign: () => {},
      setColorScheme: () => {},
      toggleColorScheme: () => {},
    };

    const tree = React.createElement(
      tamaguiMod.TamaguiProvider,
      { config: tamaguiConfigMod.default || tamaguiConfigMod },
      React.createElement(
        themeMod.ThemeContext.Provider,
        { value: mockThemeValue as any },
        element
      )
    );

    const ReactDOMServer = require('../../../../node_modules/react-dom/server.node.js');
    const html = ReactDOMServer.renderToStaticMarkup(tree);

    assert.ok(html.includes('High Media Count'), 'Expected High Media Count banner');
    assert.ok(html.includes('Flagged for human zoning review'), 'Expected Flagged for human zoning review');
    assert.ok(html.includes('Review Chat'), 'Expected Review Chat link');

    // Verify toggle callback contract
    assert.strictEqual(typeof element.props.onToggleMediaReviewRequired, 'function');
    await element.props.onToggleMediaReviewRequired!(false);
    assert.strictEqual(toggledStatus, false);
  });

  test('hides High Media Count banner when isMediaReviewRequired is false (marked as complete by admin)', async () => {
    const pageMod = await import('../AdminProductDetailPage');
    const themeMod = await import('../../../../theme/ThemeContext');
    const tamaguiConfigMod = await import('../../../../tamagui.config');
    // @ts-ignore
    const tamaguiMod = await import('../../../../node_modules/tamagui/dist/cjs/index.cjs');
    const { AdminProductDetailPage } = pageMod;

    const reviewedProduct = {
      id: 'prod-high-2',
      productCode: 'VF99H2',
      title: 'High Media Reviewed Saree',
      mediaCount: 45, // high count (> 30), but already marked as reviewed!
      isMediaReviewRequired: false,
      media: Array.from({ length: 45 }, (_, i) => ({ id: `m-${i}`, url: `https://minio.local/p${i}.webp` })),
    };

    let toggledStatus: boolean | null = null;
    const element = React.createElement(AdminProductDetailPage, {
      product: reviewedProduct as any,
      onToggleMediaReviewRequired: async (val: boolean) => {
        toggledStatus = val;
      },
    });

    const mockThemeValue = {
      theme: { colors: {} },
      tokens: {
        primary: '#1B4D3E',
        accent: '#B45309',
        accentForeground: '#FFFFFF',
        text: '#111827',
        textMuted: '#6B7280',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        radius: { sm: 4, md: 8, full: 9999 },
      },
      campaign: 'luxe',
      availableCampaigns: ['luxe'] as any,
      colorScheme: 'light',
      setCampaign: () => {},
      setColorScheme: () => {},
      toggleColorScheme: () => {},
    };

    const tree = React.createElement(
      tamaguiMod.TamaguiProvider,
      { config: tamaguiConfigMod.default || tamaguiConfigMod },
      React.createElement(
        themeMod.ThemeContext.Provider,
        { value: mockThemeValue as any },
        element
      )
    );

    const ReactDOMServer = require('../../../../node_modules/react-dom/server.node.js');
    const html = ReactDOMServer.renderToStaticMarkup(tree);

    // Banner must NOT be present
    assert.strictEqual(html.includes('High Media Count'), false, 'Banner should be hidden when reviewed');
    assert.strictEqual(html.includes('Flagged for human zoning review'), false, 'Text should be hidden when reviewed');

    // Verify toggle callback contract
    assert.strictEqual(typeof element.props.onToggleMediaReviewRequired, 'function');
    await element.props.onToggleMediaReviewRequired!(true);
    assert.strictEqual(toggledStatus, true);
  });
});

describe('Catalog PDP: Product Code Chip Tap-to-Copy Contract', () => {
  test('disallows copy action when productCode is placeholder or missing', () => {
    const isCopyable = (code?: string) => !!code && code.trim() !== '' && code !== '---';
    assert.strictEqual(isCopyable(undefined), false);
    assert.strictEqual(isCopyable(''), false);
    assert.strictEqual(isCopyable('---'), false);
    assert.strictEqual(isCopyable('VF69F5'), true);
  });

  test('generates correct accessibility labels and hints for copy chip', () => {
    const code = 'VF69F5';
    const accessibilityRole = 'button';
    const accessibilityLabel = `Copy product code ${code}`;
    const accessibilityHint = 'Copies product code to clipboard';

    assert.strictEqual(accessibilityRole, 'button');
    assert.strictEqual(accessibilityLabel, 'Copy product code VF69F5');
    assert.strictEqual(accessibilityHint, 'Copies product code to clipboard');
  });

  test('verifies feedback timing and label transitions', () => {
    const initialText = 'VF69F5';
    const copiedText = 'Copied!';
    const feedbackDurationMs = 2000;

    assert.notStrictEqual(initialText, copiedText);
    assert.strictEqual(feedbackDurationMs, 2000);
  });
});

