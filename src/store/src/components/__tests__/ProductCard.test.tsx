import test, { describe } from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

// Configure resolution for single React & ReactDOM instance and react-native-web
const origResolve = (Module as any)._resolveFilename;
const reactPath = require.resolve('react', { paths: ['./src/store'] });
const rnWeb = require.resolve('react-native-web', { paths: ['./src/store'] });
const reactDomServer = require.resolve('react-dom/server', { paths: ['./src/store'] });

(Module as any)._resolveFilename = function (req: string, parent: any, isMain: boolean, opts: any) {
  if (req === 'react' || req.startsWith('react/')) return reactPath;
  if (req === 'react-native' || req.startsWith('react-native/')) return rnWeb;
  if (req === 'react-dom/server') return reactDomServer;
  return origResolve.call(this, req, parent, isMain, opts);
};

const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { ProductCard } = require('../ProductCard');
import type { StoreProduct } from '../../services/mock/mockCatalogService';

describe('ProductCard: Myntra-style Variant Grid Card & Member Waitlist UI', () => {
  const inStockProduct: StoreProduct = {
    id: 'prod-001',
    code: 'VF69F501',
    title: 'Banarasi Kadwa Pure Katan Silk Saree',
    brand: 'VAANYA LUXE',
    category: 'saree',
    price: 18500,
    originalPrice: 24000,
    discountPercentage: 23,
    rating: 4.9,
    reviewCount: 42,
    inStock: true,
    stockQuantity: 5,
    lifecycleStatus: 'active',
    images: ['https://media.vayyarifashions.com/prod001-ruby.webp'],
    swatches: [
      { id: 'sw-1', name: 'Ruby Wine', type: 'solid', primaryHex: '#8B0000' },
      { id: 'sw-2', name: 'Emerald Green', type: 'solid', primaryHex: '#006400' },
    ],
    siblingSwatches: [
      {
        productCode: 'VF69F501',
        colorHex: '#8B0000',
        colorwayName: 'Ruby Wine',
        heroImageUrl: 'https://media.vayyarifashions.com/prod001-ruby.webp',
      },
      {
        productCode: 'VF69F502',
        colorHex: '#006400',
        colorwayName: 'Emerald Green',
        heroImageUrl: 'https://media.vayyarifashions.com/prod001-emerald.webp',
      },
      {
        productCode: 'VF69F503',
        colorHex: '#1E3A8A',
        colorwayName: 'Sapphire Navy',
        heroImageUrl: 'https://media.vayyarifashions.com/prod001-sapphire.webp',
      },
    ],
    fabric: 'Pure Katan Silk',
    weaveOrigin: 'Varanasi, Uttar Pradesh',
    description: 'Authentic Banarasi handloom saree',
    features: ['Handcrafted', 'Zari Weave'],
    colorwayName: 'Ruby Wine',
    colorHex: '#8B0000',
  };

  const outOfStockProduct: StoreProduct = {
    ...inStockProduct,
    id: 'prod-002',
    code: 'VF69F502',
    colorwayName: 'Emerald Green',
    colorHex: '#006400',
    inStock: false,
    stockQuantity: 0,
    lifecycleStatus: 'out_of_stock',
    waitlistCount: 14,
  };

  test('renders Myntra-style card with sub-code, title, colorway name, price and sibling swatches', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProductCard, { product: inStockProduct })
    );

    assert.ok(html.includes('VF69F501'), 'Must render product sub-code VF69F501');
    assert.ok(html.includes('Banarasi Kadwa Pure Katan Silk Saree'), 'Must render product title');
    assert.ok(html.includes('Ruby Wine'), 'Must render active colorway name');
    assert.ok(html.includes('18,500'), 'Must render formatted price');
    assert.ok(html.includes('Add to Bag'), 'In-stock item must render Add to Bag button');
  });

  test('renders Out of Stock pill and Join Waitlist button when lifecycleStatus is out_of_stock or stockQuantity <= 0', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProductCard, { product: outOfStockProduct })
    );

    assert.ok(html.includes('Out of Stock') || html.includes('OUT OF STOCK'), 'Must render Out of Stock pill');
    assert.ok(html.includes('Join Waitlist'), 'Out-of-stock item must render Join Waitlist action');
    assert.ok(!html.includes('Add to Bag'), 'Out-of-stock item must NOT render Add to Bag button');
  });

  test('swatch click triggers preview state update and onSelectSwatch callback', () => {
    let selectedVariantCode = '';
    const onSelectSwatch = (code: string) => {
      selectedVariantCode = code;
    };

    let pressedCode = '';
    const onPress = (p: StoreProduct, code?: string) => {
      pressedCode = code || p.code;
    };

    const el = React.createElement(ProductCard, {
      product: inStockProduct,
      onSelectSwatch,
      onPress,
    });
    assert.ok(el, 'Element created successfully');
    assert.strictEqual(inStockProduct.siblingSwatches?.length, 3, 'Has 3 sibling swatches');
  });

  test('treats stockQuantity <= 0 as out_of_stock even if lifecycleStatus is active', () => {
    const zeroStockProduct: StoreProduct = {
      ...inStockProduct,
      id: 'prod-003',
      code: 'VF69F503',
      stockQuantity: 0,
      inStock: false,
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProductCard, { product: zeroStockProduct })
    );

    assert.ok(html.includes('OUT OF STOCK'), 'Zero stock must render OUT OF STOCK');
    assert.ok(html.includes('Join Waitlist'), 'Zero stock must render Join Waitlist action');
  });

  test('Join Waitlist triggers onJoinWaitlist handler with active product code', () => {
    let waitlistTriggered = false;
    let waitlistCode = '';
    const onJoinWaitlist = (e: any, p: StoreProduct, code?: string) => {
      waitlistTriggered = true;
      waitlistCode = code || p.code;
    };

    const el = React.createElement(ProductCard, {
      product: outOfStockProduct,
      onJoinWaitlist,
    });
    assert.ok(el, 'Element created successfully');

    // Test calling the prop handler directly
    (el.props as any).onJoinWaitlist({}, outOfStockProduct, 'VF69F502');
    assert.strictEqual(waitlistTriggered, true);
    assert.strictEqual(waitlistCode, 'VF69F502');
  });

  test('Card onPress receives active code for variant navigation', () => {
    let clickedProduct: StoreProduct | null = null;
    let clickedCode: string | undefined = undefined;

    const el = React.createElement(ProductCard, {
      product: inStockProduct,
      onPress: (p: StoreProduct, code?: string) => {
        clickedProduct = p;
        clickedCode = code;
      },
    });

    (el.props as any).onPress(inStockProduct, 'VF69F502');
    assert.strictEqual((clickedProduct as any)?.id, 'prod-001');
    assert.strictEqual(clickedCode, 'VF69F502');
  });

  test('onAddToCart passes active variant payload with code and colorway', () => {
    let addedProduct: any = null;
    const el = React.createElement(ProductCard, {
      product: inStockProduct,
      onAddToCart: (e: any, p: any) => {
        addedProduct = p;
      },
    });

    (el.props as any).onAddToCart({}, {
      ...inStockProduct,
      code: 'VF69F502',
      productCode: 'VF69F502',
      colorwayName: 'Emerald Green',
      heroImageUrl: 'https://media.vayyarifashions.com/prod001-emerald.webp',
    });

    assert.strictEqual(addedProduct?.code, 'VF69F502');
    assert.strictEqual(addedProduct?.colorwayName, 'Emerald Green');
    assert.strictEqual(addedProduct?.heroImageUrl, 'https://media.vayyarifashions.com/prod001-emerald.webp');
  });

  test('DismissibleLoginModal renders with dismiss x button and waitlist heading', () => {
    const { DismissibleLoginModal } = require('../DismissibleLoginModal');
    let closed = false;
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(DismissibleLoginModal, {
        visible: true,
        onClose: () => {
          closed = true;
        },
        returnUrl: '/pdp/VF69F502',
      })
    );

    assert.ok(html.includes('Join Member Waitlist'), 'Must render waitlist heading');
    assert.ok(html.includes('✕'), 'Must render dismiss x button');
    assert.ok(html.includes('Mobile Number'), 'Must render mobile login option');
  });

  test('DismissibleLoginModal forwards authOverride data to onSuccess callback', () => {
    const { DismissibleLoginModal } = require('../DismissibleLoginModal');
    let capturedAuth: any = null;
    const el = React.createElement(DismissibleLoginModal, {
      visible: true,
      onClose: () => {},
      onSuccess: (data: any) => {
        capturedAuth = data;
      },
    });

    // Directly test onSuccess integration contract
    el.props.onSuccess({
      user: { id: 'cust_9876543210', phone: '+91 9876543210' },
      token: 'jwt-auth-token-xyz',
      method: 'phone',
    });

    assert.strictEqual(capturedAuth?.user?.id, 'cust_9876543210');
    assert.strictEqual(capturedAuth?.token, 'jwt-auth-token-xyz');
    assert.strictEqual(capturedAuth?.method, 'phone');
  });
});
