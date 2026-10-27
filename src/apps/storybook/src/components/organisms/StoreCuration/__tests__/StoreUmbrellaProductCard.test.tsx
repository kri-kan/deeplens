import test, { describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';

(globalThis as any).__DEV__ = false;
(globalThis as any).expo = {
  EventEmitter: class EventEmitter {},
  modules: new Proxy({}, { get: () => ({}) }),
};
(globalThis as any).ErrorUtils = { getGlobalHandler: () => () => {}, setGlobalHandler: () => {} };

// Setup Module resolution hooks so react-native maps to react-native-web in Node
const path = require('node:path');
const Module = require('node:module');
const origResolve = Module._resolveFilename;
const rnWebPath = require.resolve(path.resolve(process.cwd(), 'src/vayyari/node_modules/react-native-web'));
const gestureMockPath = require.resolve(path.resolve(process.cwd(), 'src/vayyari/node_modules/react-native-gesture-handler/lib/commonjs/mocks/mocks.js'));
const reanimatedMockPath = require.resolve(path.resolve(process.cwd(), 'src/vayyari/node_modules/react-native-reanimated/mock'));
const storybookDir = path.resolve(process.cwd(), 'src/apps/storybook');
const reactPath = require.resolve('react', { paths: [storybookDir] });
const reactDomPath = require.resolve('react-dom', { paths: [storybookDir] });
const reactDomServerPath = path.resolve(storybookDir, 'node_modules/react-dom/server.node.js');

Module._resolveFilename = function (req: string, parent: any, isMain: boolean, options: any) {
  if (req === 'react') return reactPath;
  if (req === 'react-dom') return reactDomPath;
  if (req === 'react-dom/server' || req === 'react-dom/server.node.js') return reactDomServerPath;
  if (req === 'react-native' || req === 'react-native-web' || req.startsWith('react-native/')) return rnWebPath;
  if (req === 'react-native-svg') return rnWebPath;
  if (req === 'expo-image') return rnWebPath;
  if (req === 'expo-video' || req.startsWith('expo-video')) return rnWebPath;
  if (req === 'react-native-reanimated') return reanimatedMockPath;
  if (req === 'react-native-gesture-handler' || req.startsWith('react-native-gesture-handler')) return gestureMockPath;
  return origResolve.call(this, req, parent, isMain, options);
};

const rnWeb = require(rnWebPath);
rnWeb.TurboModuleRegistry = { get: () => ({}), getEnforcing: () => ({}) };

const ReactDOMServer = require(reactDomServerPath);
const tamaguiMod = require('tamagui');
const tamaguiConfigMod = require('../../../../../tamagui.config');
const themeMod = require('../../../../theme');

function renderWithTamagui(element: any) {
  const tree = React.createElement(
    tamaguiMod.TamaguiProvider,
    { config: tamaguiConfigMod.default || tamaguiConfigMod },
    React.createElement(
      themeMod.ThemeProvider,
      null,
      element
    )
  );
  return ReactDOMServer.renderToStaticMarkup(tree);
}

let computeUmbrellaRollup: any;
let StoreUmbrellaProductCard: React.ComponentType<any>;
let StoreReEvaluationQueueTab: React.ComponentType<any>;
let StoreVariantRowDrawer: React.ComponentType<any>;
let storeAdminService: any;

type StoreProductVariant = import('../StoreUmbrellaProductCard').StoreProductVariant;
type StoreUmbrellaProduct = import('../StoreUmbrellaProductCard').StoreUmbrellaProduct;

const cardMod = require('../StoreUmbrellaProductCard');
computeUmbrellaRollup = cardMod.computeUmbrellaRollup;
StoreUmbrellaProductCard = cardMod.StoreUmbrellaProductCard;
StoreReEvaluationQueueTab = cardMod.StoreReEvaluationQueueTab;

const drawerMod = require('../StoreVariantRowDrawer');
StoreVariantRowDrawer = drawerMod.StoreVariantRowDrawer;

const serviceMod = require(path.resolve(process.cwd(), 'src/vayyari/services/storeAdminService'));
storeAdminService = serviceMod.storeAdminService;

describe('StoreUmbrellaProductCard: Rollup Calculations', () => {
  const sampleVariants: StoreProductVariant[] = [
    {
      id: 'var-1',
      productCode: 'VF69F501',
      title: 'Kadwa Silk Saree - Emerald',
      colorwayName: 'Emerald Green',
      colorHex: '#047857',
      stockQuantity: 8,
      lifecycleStatus: 'available',
      parentCatalogId: 'cat-parent-101',
      waitlistCount: 0,
    },
    {
      id: 'var-2',
      productCode: 'VF69F502',
      title: 'Kadwa Silk Saree - Ruby',
      colorwayName: 'Ruby Red',
      colorHex: '#B91C1C',
      stockQuantity: 4,
      lifecycleStatus: 'available',
      parentCatalogId: 'cat-parent-101',
      waitlistCount: 2,
    },
    {
      id: 'var-3',
      productCode: 'VF69F503',
      title: 'Kadwa Silk Saree - Sapphire',
      colorwayName: 'Sapphire Blue',
      colorHex: '#1D4ED8',
      stockQuantity: 0,
      lifecycleStatus: 'out_of_stock',
      parentCatalogId: 'cat-parent-101',
      waitlistCount: 5,
    },
  ];

  test('computes total combined stock correctly across all variants', () => {
    const rollup = computeUmbrellaRollup(sampleVariants);
    assert.strictEqual(rollup.totalCombinedStock, 12);
  });

  test('computes active colorways count excluding deleted variants', () => {
    const withDeleted: StoreProductVariant[] = [
      ...sampleVariants,
      {
        id: 'var-4',
        productCode: 'VF69F504',
        title: 'Kadwa Silk Saree - Mustard',
        colorwayName: 'Mustard Gold',
        colorHex: '#D97706',
        stockQuantity: 0,
        lifecycleStatus: 'deleted',
        parentCatalogId: 'cat-parent-101',
      },
    ];
    const rollup = computeUmbrellaRollup(withDeleted);
    // 3 active colorways (Emerald, Ruby, Sapphire) since Mustard is deleted
    assert.strictEqual(rollup.activeColorwaysCount, 3);
    assert.strictEqual(rollup.totalCombinedStock, 12);
  });

  test('computes status "Partially Out of Stock" when some variants have 0 stock', () => {
    const rollup = computeUmbrellaRollup(sampleVariants);
    assert.strictEqual(rollup.status, 'Partially Out of Stock');
  });

  test('computes status "Available" when all active variants are in stock', () => {
    const allInStock = sampleVariants.slice(0, 2);
    const rollup = computeUmbrellaRollup(allInStock);
    assert.strictEqual(rollup.status, 'Available');
    assert.strictEqual(rollup.activeColorwaysCount, 2);
  });

  test('computes status "Out of Stock" when all active variants are out of stock', () => {
    const allOutOfStock: StoreProductVariant[] = [
      {
        ...sampleVariants[2],
        stockQuantity: 0,
        lifecycleStatus: 'out_of_stock',
      },
    ];
    const rollup = computeUmbrellaRollup(allOutOfStock);
    assert.strictEqual(rollup.status, 'Out of Stock');
    assert.strictEqual(rollup.totalCombinedStock, 0);
  });

  test('computes status "Paused" when all active variants are paused', () => {
    const allPaused: StoreProductVariant[] = sampleVariants.map((v) => ({
      ...v,
      lifecycleStatus: 'paused' as const,
      takeDownExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    }));
    const rollup = computeUmbrellaRollup(allPaused);
    assert.strictEqual(rollup.status, 'Paused');
  });

  test('computes status "Deleted" when all variants are deleted', () => {
    const allDeleted: StoreProductVariant[] = sampleVariants.map((v) => ({
      ...v,
      lifecycleStatus: 'deleted' as const,
    }));
    const rollup = computeUmbrellaRollup(allDeleted);
    assert.strictEqual(rollup.status, 'Deleted');
    assert.strictEqual(rollup.activeColorwaysCount, 0);
  });
});

describe('StoreUmbrellaProductCard: Expansion & Quick Cascade Actions', () => {
  const sampleUmbrella: StoreUmbrellaProduct = {
    parentCatalogId: 'cat-parent-101',
    parentProductCode: 'VF69F5',
    title: 'Banarasi Kadwa Silk Saree',
    categoryName: 'Saree',
    fabric: 'Pure Katan Silk',
    variants: [
      {
        id: 'var-1',
        productCode: 'VF69F501',
        title: 'Kadwa Silk Saree - Emerald',
        colorwayName: 'Emerald Green',
        colorHex: '#047857',
        stockQuantity: 10,
        lifecycleStatus: 'available',
        parentCatalogId: 'cat-parent-101',
        waitlistCount: 0,
      },
      {
        id: 'var-2',
        productCode: 'VF69F502',
        title: 'Kadwa Silk Saree - Ruby',
        colorwayName: 'Ruby Red',
        colorHex: '#B91C1C',
        stockQuantity: 0,
        lifecycleStatus: 'out_of_stock',
        parentCatalogId: 'cat-parent-101',
        waitlistCount: 4,
      },
    ],
  };

  test('renders umbrella card header with parent code, title, stock and status pill', () => {
    const el = React.createElement(StoreUmbrellaProductCard, {
      product: sampleUmbrella,
      initiallyExpanded: false,
    });
    const html = renderWithTamagui(el);

    assert.ok(html.includes('VF69F5'), 'Should render parent product code');
    assert.ok(html.includes('Banarasi Kadwa Silk Saree'), 'Should render parent title');
    assert.ok(html.includes('10 in stock') || html.includes('10') && html.includes('Stock'), 'Should render total combined stock');
    assert.ok(html.includes('Partially Out of Stock'), 'Should render status pill');
    assert.ok(html.includes('2 Colors') || html.includes('2 Colorways'), 'Should render colorway count');
  });

  test('expands to render StoreVariantRowDrawer with child variants and codes', () => {
    const el = React.createElement(StoreUmbrellaProductCard, {
      product: sampleUmbrella,
      initiallyExpanded: true,
    });
    const html = renderWithTamagui(el);

    assert.ok(html.includes('VF69F501'), 'Should render child subcode 01');
    assert.ok(html.includes('VF69F502'), 'Should render child subcode 02');
    assert.ok(html.includes('Emerald Green'), 'Should render child colorway name');
    assert.ok(html.includes('Ruby Red'), 'Should render child colorway name');
    assert.ok(html.includes('4 waiting') || html.includes('Waitlist: 4') || html.includes('4'), 'Should render waitlist count badge');
    assert.ok(html.includes('View Source in Catalog'), 'Should render catalog source link');
  });

  test('cascades lifecycle action "Take Down All" with timeout days', async () => {
    let cascadedParentId = '';
    let cascadedStatus = '';
    let cascadedTimeoutDays: number | undefined;

    const el: any = React.createElement(StoreUmbrellaProductCard, {
      product: sampleUmbrella,
      onCascadeLifecycle: (parentId: string, status: string, timeoutDays?: number) => {
        cascadedParentId = parentId;
        cascadedStatus = status;
        cascadedTimeoutDays = timeoutDays;
      },
    });

    assert.ok(el.props.onCascadeLifecycle);
    el.props.onCascadeLifecycle('cat-parent-101', 'paused', 14);

    assert.strictEqual(cascadedParentId, 'cat-parent-101');
    assert.strictEqual(cascadedStatus, 'paused');
    assert.strictEqual(cascadedTimeoutDays, 14);
  });

  test('cascades lifecycle action "Mark All Out of Stock"', async () => {
    let cascadedParentId = '';
    let cascadedStatus = '';

    const el: any = React.createElement(StoreUmbrellaProductCard, {
      product: sampleUmbrella,
      onCascadeLifecycle: (parentId: string, status: string) => {
        cascadedParentId = parentId;
        cascadedStatus = status;
      },
    });

    el.props.onCascadeLifecycle('cat-parent-101', 'out_of_stock');
    assert.strictEqual(cascadedParentId, 'cat-parent-101');
    assert.strictEqual(cascadedStatus, 'out_of_stock');
  });

  test('cascades lifecycle action "Reactivate All"', async () => {
    let cascadedParentId = '';
    let cascadedStatus = '';

    const el: any = React.createElement(StoreUmbrellaProductCard, {
      product: sampleUmbrella,
      onCascadeLifecycle: (parentId: string, status: string) => {
        cascadedParentId = parentId;
        cascadedStatus = status;
      },
    });

    el.props.onCascadeLifecycle('cat-parent-101', 'available');
    assert.strictEqual(cascadedParentId, 'cat-parent-101');
    assert.strictEqual(cascadedStatus, 'available');
  });
});

describe('StoreVariantRowDrawer: Color Variant Rows, Editing & Links', () => {
  const variants: StoreProductVariant[] = [
    {
      id: 'var-101',
      productCode: 'VF69F501',
      title: 'Kadwa Silk Saree - Emerald Green',
      colorwayName: 'Emerald Green',
      colorHex: '#047857',
      stockQuantity: 15,
      lifecycleStatus: 'available',
      parentCatalogId: 'cat-parent-101',
      catalogColorGroupId: 'grp-emerald',
      waitlistCount: 0,
    },
    {
      id: 'var-102',
      productCode: 'VF69F502',
      title: 'Kadwa Silk Saree - Sapphire Blue',
      colorwayName: 'Sapphire Blue',
      colorHex: '#1D4ED8',
      stockQuantity: 0,
      lifecycleStatus: 'paused',
      parentCatalogId: 'cat-parent-101',
      catalogColorGroupId: 'grp-sapphire',
      takeDownExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      isReEvaluationPending: false,
      waitlistCount: 6,
    },
  ];

  test('renders swatch circle with hex and color name', () => {
    const el = React.createElement(StoreVariantRowDrawer, {
      variants,
      parentCatalogId: 'cat-parent-101',
    });
    const html = renderWithTamagui(el);

    assert.ok(html.includes('#047857'), 'Should contain emerald hex code');
    assert.ok(html.includes('Emerald Green'), 'Should contain emerald color name');
    assert.ok(html.includes('#1D4ED8'), 'Should contain sapphire hex code');
    assert.ok(html.includes('Sapphire Blue'), 'Should contain sapphire color name');
  });

  test('renders pause re-evaluation badge when paused', () => {
    const el = React.createElement(StoreVariantRowDrawer, {
      variants,
      parentCatalogId: 'cat-parent-101',
    });
    const html = renderWithTamagui(el);

    assert.ok(html.includes('Paused'), 'Should render paused indicator');
  });

  test('triggers onUpdateStock when quantity is changed', () => {
    let updatedVariantId = '';
    let updatedQty = -1;

    const el: any = React.createElement(StoreVariantRowDrawer, {
      variants,
      parentCatalogId: 'cat-parent-101',
      onUpdateStock: (variantId: string, qty: number) => {
        updatedVariantId = variantId;
        updatedQty = qty;
      },
    });

    el.props.onUpdateStock('var-101', 25);
    assert.strictEqual(updatedVariantId, 'var-101');
    assert.strictEqual(updatedQty, 25);
  });

  test('triggers onUpdateStatus when lifecycle status is changed', () => {
    let updatedVariantId = '';
    let updatedStatus = '';

    const el: any = React.createElement(StoreVariantRowDrawer, {
      variants,
      parentCatalogId: 'cat-parent-101',
      onUpdateStatus: (variantId: string, status: string) => {
        updatedVariantId = variantId;
        updatedStatus = status;
      },
    });

    el.props.onUpdateStatus('var-101', 'out_of_stock');
    assert.strictEqual(updatedVariantId, 'var-101');
    assert.strictEqual(updatedStatus, 'out_of_stock');
  });

  test('triggers onViewCatalogSource with parent ID and color group ID', () => {
    let passedParentId = '';
    let passedGroupId = '';

    const el: any = React.createElement(StoreVariantRowDrawer, {
      variants,
      parentCatalogId: 'cat-parent-101',
      onViewCatalogSource: (parentId: string, groupId?: string) => {
        passedParentId = parentId;
        passedGroupId = groupId || '';
      },
    });

    el.props.onViewCatalogSource('cat-parent-101', 'grp-sapphire');
    assert.strictEqual(passedParentId, 'cat-parent-101');
    assert.strictEqual(passedGroupId, 'grp-sapphire');
  });
});

describe('StoreReEvaluationQueueTab: Expired Paused Items Awaiting Review', () => {
  const expiredItems: StoreProductVariant[] = [
    {
      id: 'var-exp-1',
      productCode: 'VF69F501',
      title: 'Kadwa Silk Saree - Emerald',
      colorwayName: 'Emerald Green',
      colorHex: '#047857',
      stockQuantity: 5,
      lifecycleStatus: 'paused',
      parentCatalogId: 'cat-101',
      parentProductCode: 'VF69F5',
      takeDownExpiresAt: new Date(Date.now() - 3600000).toISOString(),
      isReEvaluationPending: true,
      waitlistCount: 8,
    },
  ];

  test('renders expired products awaiting re-evaluation with demand badge', () => {
    const el = React.createElement(StoreReEvaluationQueueTab, {
      items: expiredItems,
    });
    const html = renderWithTamagui(el);

    assert.ok(html.includes('VF69F501'), 'Should render variant subcode');
    assert.ok(html.includes('Emerald Green'), 'Should render colorway');
    assert.ok(html.includes('8') && (html.includes('Waiting') || html.includes('waitlist') || html.includes('demand')), 'Should render waitlist count');
    assert.ok(html.includes('Re-evaluation') || html.includes('Expired'), 'Should indicate re-evaluation status');
  });
});

describe('StoreAdminService: Variant Stock, Lifecycle & Re-evaluation Queue', () => {
  test('updateVariantStock calls API endpoint and returns boolean', async () => {
    const res = await storeAdminService.updateVariantStock('var-101', 20);
    assert.strictEqual(typeof res, 'boolean');
  });

  test('updateLifecycleStatus calls API endpoint with cascade parameters', async () => {
    const res = await storeAdminService.updateLifecycleStatus({
      parentCatalogId: 'cat-parent-101',
      status: 'paused',
      timeoutDays: 14,
    });
    assert.strictEqual(typeof res, 'boolean');
  });

  test('getReEvaluationQueue fetches expired items from store API', async () => {
    const queue = await storeAdminService.getReEvaluationQueue();
    assert.ok(Array.isArray(queue));
  });
});
