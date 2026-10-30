import test, { describe } from 'node:test';
import assert from 'node:assert';

(globalThis as any).__DEV__ = true;

import {
  normalizeMediaUrl,
  normalizeStoreMediaItem,
  StoreMediaItem,
  getStoreApiUrl,
} from '../services/storeAdminService';
import { StoreCurationMediaItem } from '../types/curation';
import { getMediaDisplayUri } from '../utils/curationMediaRules';

describe('Store Media URL Normalization & Display URI Rules', () => {
  describe('normalizeMediaUrl', () => {
    test('rewrites legacy media.vayyarifashions.com to active store API host', () => {
      const legacyUrl = 'http://media.vayyarifashions.com/store-assets/products/vf2b58/1_03ecc5fe.jpg';
      const normalized = normalizeMediaUrl(legacyUrl);
      const expectedHost = getStoreApiUrl();

      assert.ok(!normalized.includes('media.vayyarifashions.com'), 'Must not contain unresolvable domain');
      assert.strictEqual(normalized, `${expectedHost}/store-assets/products/vf2b58/1_03ecc5fe.jpg`);
    });

    test('rewrites localhost:9000 to store API /store-assets gateway proxy', () => {
      const localUrl = 'http://localhost:9000/store-assets/products/vf2b58/1_thumb.jpg';
      const normalized = normalizeMediaUrl(localUrl);
      const expectedHost = getStoreApiUrl();

      assert.strictEqual(normalized, `${expectedHost}/store-assets/products/vf2b58/1_thumb.jpg`);
    });

    test('rewrites 127.0.0.1:9000 and 192.168.0.170:9000 hostnames', () => {
      const ipUrl = 'http://127.0.0.1:9000/store-assets/image.png';
      const lanUrl = 'http://192.168.0.170:9000/store-assets/image.png';
      const expectedHost = getStoreApiUrl();

      assert.strictEqual(normalizeMediaUrl(ipUrl), `${expectedHost}/store-assets/image.png`);
      assert.strictEqual(normalizeMediaUrl(lanUrl), `${expectedHost}/store-assets/image.png`);
    });

    test('preserves already normalized URLs and clean relative paths', () => {
      const validUrl = 'http://adminapi.vayyarifashions.com/store-assets/products/abc.jpg';
      const relativeUrl = '/api/v1/catalog/media/123/thumbnail';

      assert.strictEqual(normalizeMediaUrl(validUrl), validUrl);
      assert.strictEqual(normalizeMediaUrl(relativeUrl), relativeUrl);
    });

    test('handles null, undefined and empty string gracefully', () => {
      assert.strictEqual(normalizeMediaUrl(null), '');
      assert.strictEqual(normalizeMediaUrl(undefined), '');
      assert.strictEqual(normalizeMediaUrl(''), '');
    });
  });

  describe('normalizeStoreMediaItem', () => {
    test('normalizes url, originalUrl and modifiedUrl in StoreMediaItem', () => {
      const item: StoreMediaItem = {
        id: 'media-1',
        url: 'http://media.vayyarifashions.com/store-assets/1.jpg',
        originalUrl: 'http://localhost:9000/store-assets/1_orig.jpg',
        modifiedUrl: 'http://127.0.0.1:9000/store-assets/1_mod.jpg',
        mediaType: 1,
        order: 1,
        dwellSeconds: 5,
        isCover: true,
      };

      const normalized = normalizeStoreMediaItem(item);
      const expectedHost = getStoreApiUrl();

      assert.strictEqual(normalized.url, `${expectedHost}/store-assets/1.jpg`);
      assert.strictEqual(normalized.originalUrl, `${expectedHost}/store-assets/1_orig.jpg`);
      assert.strictEqual(normalized.modifiedUrl, `${expectedHost}/store-assets/1_mod.jpg`);
    });

    test('falls back originalUrl to normalized url if originalUrl is null', () => {
      const item: StoreMediaItem = {
        id: 'media-2',
        url: 'http://media.vayyarifashions.com/store-assets/2.jpg',
        mediaType: 1,
        order: 2,
        dwellSeconds: 5,
        isCover: false,
      };

      const normalized = normalizeStoreMediaItem(item);
      const expectedHost = getStoreApiUrl();

      assert.strictEqual(normalized.originalUrl, `${expectedHost}/store-assets/2.jpg`);
      assert.strictEqual(normalized.modifiedUrl, null);
    });
  });

  describe('getMediaDisplayUri', () => {
    test('returns normalized modifiedUri when activeDisplaySource is modified', () => {
      const item: StoreCurationMediaItem = {
        id: 'item-1',
        uri: 'http://media.vayyarifashions.com/store-assets/orig.jpg',
        modifiedUri: 'http://localhost:9000/store-assets/modified.jpg',
        activeDisplaySource: 'modified',
        isQualified: true,
        sortOrder: 1,
        mediaType: 'image',
        isHero: false,
        isCommon: false,
      };

      const displayUri = getMediaDisplayUri(item);
      const expectedHost = getStoreApiUrl();

      assert.strictEqual(displayUri, `${expectedHost}/store-assets/modified.jpg`);
    });

    test('falls back to uri when activeDisplaySource is original even if modifiedUri exists', () => {
      const item: StoreCurationMediaItem = {
        id: 'item-2',
        uri: 'http://media.vayyarifashions.com/store-assets/orig.jpg',
        modifiedUri: 'http://localhost:9000/store-assets/modified.jpg',
        activeDisplaySource: 'original',
        isQualified: true,
        sortOrder: 1,
        mediaType: 'image',
        isHero: false,
        isCommon: false,
      };

      const displayUri = getMediaDisplayUri(item);
      const expectedHost = getStoreApiUrl();

      assert.strictEqual(displayUri, `${expectedHost}/store-assets/orig.jpg`);
    });

    test('falls back to thumbnailUri when uri is missing or empty', () => {
      const item: StoreCurationMediaItem = {
        id: 'item-3',
        uri: '',
        thumbnailUri: 'http://media.vayyarifashions.com/store-assets/thumb.jpg',
        isQualified: true,
        sortOrder: 1,
        mediaType: 'image',
        isHero: false,
        isCommon: false,
      };

      const displayUri = getMediaDisplayUri(item);
      const expectedHost = getStoreApiUrl();

      assert.strictEqual(displayUri, `${expectedHost}/store-assets/thumb.jpg`);
    });

    test('returns empty string when item is null or undefined', () => {
      assert.strictEqual(getMediaDisplayUri(null), '');
      assert.strictEqual(getMediaDisplayUri(undefined), '');
    });
  });
});
